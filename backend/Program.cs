using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddOpenApi();

// Pick a writable place for the SQLite file. A published host may have a read-only app folder.
static string ResolveDbPath()
{
    var env = Environment.GetEnvironmentVariable("DB_PATH");
    var candidates = new List<string>();
    if (!string.IsNullOrWhiteSpace(env)) candidates.Add(env);
    candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), "eventapp.db"));
    candidates.Add(Path.Combine(AppContext.BaseDirectory, "eventapp.db"));
    candidates.Add(Path.Combine(Path.GetTempPath(), "eventapp.db"));
    foreach (var c in candidates)
    {
        try
        {
            var dir = Path.GetDirectoryName(Path.GetFullPath(c))!;
            Directory.CreateDirectory(dir);
            var probe = Path.Combine(dir, ".write-test-" + Guid.NewGuid().ToString("N"));
            File.WriteAllText(probe, "x");
            File.Delete(probe);
            return c;
        }
        catch { /* try the next location */ }
    }
    return "eventapp.db";
}
var dbPath = ResolveDbPath();
Console.WriteLine($"Using database at {dbPath}");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Older databases were created before donations existed; add the table without touching other data.
static void EnsureDonationsTable(AppDbContext db) =>
    db.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS \"Donations\" (\"Id\" INTEGER NOT NULL CONSTRAINT \"PK_Donations\" PRIMARY KEY AUTOINCREMENT, \"DonorName\" TEXT NOT NULL, \"Amount\" INTEGER NOT NULL, \"DonatedAt\" TEXT NOT NULL)");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.EnsureCreated();
        EnsureDonationsTable(db);
        Seed.Run(db);
    }
    catch (Exception ex)
    {
        // An old database file with an outdated table layout would crash startup. Rebuild it from scratch.
        Console.WriteLine($"Database setup failed ({ex.Message}). Recreating database.");
        db.ChangeTracker.Clear();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
        EnsureDonationsTable(db);
        Seed.Run(db);
    }
}

app.UseRouting();
app.UseCors();

app.MapOpenApi();
app.MapScalarApiReference("/swagger", options =>
{
    options.WithTitle("SoftCo Annual Dinner API");
    options.WithTheme(ScalarTheme.Default);
    options.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});

var api = app.MapGroup("/api");

// ── ATTENDEES ──────────────────────────────────────────────
api.MapGet("/attendees", async (AppDbContext db) =>
    await db.Attendees.OrderByDescending(a => a.Id).ToListAsync());

api.MapPost("/attendees", async (AppDbContext db, AttendeeCreateDto dto) =>
{
    var count = await db.Attendees.CountAsync();
    var ticket = $"ANN2026-{(count + 1):D5}";
    var attendee = new Attendee
    {
        Ticket = ticket,
        Name = dto.Name,
        Email = dto.Email,
        Mobile = dto.Mobile,
        NokName = dto.NokName ?? "",
        NokContact = dto.NokContact ?? "",
        Division = dto.Division,
        FunctionArea = dto.FunctionArea,
        Dietary = dto.Dietary ?? "No Preference",
        Source = "Online",
        CheckedIn = false
    };
    db.Attendees.Add(attendee);
    await db.SaveChangesAsync();
    return Results.Created($"/api/attendees/{attendee.Id}", attendee);
});

api.MapPost("/attendees/{ticket}/checkin", async (AppDbContext db, string ticket, CheckinDto dto) =>
{
    var attendee = await db.Attendees.FirstOrDefaultAsync(a => a.Ticket == ticket);
    if (attendee is null)
    {
        await db.ScanLogs.AddAsync(new ScanLog { Result = "invalid", Ticket = ticket, Gate = dto.Gate ?? "Gate A" });
        await db.SaveChangesAsync();
        return Results.NotFound(new { message = "Invalid QR code" });
    }
    if (attendee.CheckedIn)
    {
        await db.ScanLogs.AddAsync(new ScanLog { Result = "duplicate", Ticket = ticket, Name = attendee.Name, Division = attendee.Division, Gate = dto.Gate ?? "Gate A" });
        await db.SaveChangesAsync();
        return Results.Conflict(new { message = "Already checked in", attendee });
    }
    attendee.CheckedIn = true;
    attendee.CheckedInAt = DateTime.UtcNow;
    attendee.CheckedInGate = dto.Gate ?? "Gate A";
    await db.ScanLogs.AddAsync(new ScanLog { Result = "valid", Ticket = ticket, Name = attendee.Name, Division = attendee.Division, Gate = dto.Gate ?? "Gate A" });
    await db.SaveChangesAsync();
    return Results.Ok(attendee);
});

api.MapPost("/attendees/bulk-import", async (AppDbContext db, List<AttendeeCreateDto> rows) =>
{
    var existingEmails = (await db.Attendees.Select(a => a.Email.ToLower()).ToListAsync()).ToHashSet();
    var count = await db.Attendees.CountAsync();
    var imported = new List<Attendee>();
    var skipped = new List<string>();

    foreach (var dto in rows)
    {
        var name = (dto.Name ?? "").Trim();
        var email = (dto.Email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            skipped.Add("(blank name) — missing required Name");
            continue;
        }
        if (!string.IsNullOrWhiteSpace(email) && existingEmails.Contains(email.ToLower()))
        {
            skipped.Add($"{name} — email already registered");
            continue;
        }
        count++;
        var attendee = new Attendee
        {
            Ticket = $"ANN2026-{count:D5}",
            Name = name,
            Email = email,
            Mobile = dto.Mobile ?? "",
            NokName = dto.NokName ?? "",
            NokContact = dto.NokContact ?? "",
            Division = dto.Division ?? "",
            FunctionArea = dto.FunctionArea ?? "",
            Dietary = string.IsNullOrWhiteSpace(dto.Dietary) ? "No Preference" : dto.Dietary,
            Source = "Imported",
            CheckedIn = false,
        };
        db.Attendees.Add(attendee);
        imported.Add(attendee);
        if (!string.IsNullOrWhiteSpace(email)) existingEmails.Add(email.ToLower());
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { importedCount = imported.Count, skippedCount = skipped.Count, skipped, imported });
});

// Reset every check-in (and the lucky-draw winners, which depend on check-ins).
api.MapPost("/admin/reset-checkins", async (AppDbContext db) =>
{
    var checkedIn = await db.Attendees.Where(a => a.CheckedIn).ToListAsync();
    foreach (var a in checkedIn)
    {
        a.CheckedIn = false;
        a.CheckedInAt = null;
        a.CheckedInGate = null;
    }
    db.ScanLogs.RemoveRange(db.ScanLogs);
    db.DrawWinners.RemoveRange(db.DrawWinners);
    await db.SaveChangesAsync();
    return Results.Ok(new { reset = checkedIn.Count });
});

api.MapGet("/scanlogs", async (AppDbContext db) =>
    await db.ScanLogs.OrderByDescending(s => s.Id).Take(50).ToListAsync());

// ── VOTES ──────────────────────────────────────────────────
api.MapGet("/votes", async (AppDbContext db) =>
    await db.Votes.ToListAsync());

api.MapPost("/votes", async (AppDbContext db, VoteDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.CandidateName))
        return Results.BadRequest(new { message = "A name is required to cast a vote." });
    var already = await db.Votes.AnyAsync(v => v.VoterKey == dto.VoterKey);
    if (already) return Results.Conflict(new { message = "Already voted" });
    var vote = new Vote { VoterKey = dto.VoterKey, CandidateName = dto.CandidateName.Trim() };
    db.Votes.Add(vote);
    await db.SaveChangesAsync();
    return Results.Created($"/api/votes/{vote.Id}", vote);
});

// Clear all Best Dress votes so voting can start fresh.
api.MapPost("/admin/reset-votes", async (AppDbContext db) =>
{
    var count = await db.Votes.CountAsync();
    db.Votes.RemoveRange(db.Votes);
    await db.SaveChangesAsync();
    return Results.Ok(new { reset = count });
});

// ── DRAW WINNERS ───────────────────────────────────────────
api.MapGet("/draw-winners", async (AppDbContext db) =>
    await db.DrawWinners.OrderByDescending(w => w.Id).ToListAsync());

api.MapPost("/draw-winners", async (AppDbContext db, DrawWinnerDto dto) =>
{
    var winner = new DrawWinner
    {
        Name = dto.Name,
        Division = dto.Division,
        Prize = dto.Prize,
        PrizeCategory = dto.PrizeCategory
    };
    db.DrawWinners.Add(winner);
    await db.SaveChangesAsync();
    return Results.Created($"/api/draw-winners/{winner.Id}", winner);
});

api.MapPost("/draw-winners/{id:int}/redeem", async (AppDbContext db, int id) =>
{
    var winner = await db.DrawWinners.FindAsync(id);
    if (winner is null) return Results.NotFound();
    winner.Redeemed = true;
    await db.SaveChangesAsync();
    return Results.Ok(winner);
});

// ── DONATIONS (RM10 = 1 extra lucky draw entry) ─────────────
api.MapGet("/donations", async (AppDbContext db) =>
    await db.Donations.OrderByDescending(d => d.Id).ToListAsync());

api.MapPost("/donations", async (AppDbContext db, DonationDto dto) =>
{
    var name = (dto.DonorName ?? "").Trim();
    if (name.Length < 2 || new[] { "anonymous", "anon", "unknown", "guest", "-", "n/a" }.Contains(name.ToLower()))
        return Results.BadRequest(new { message = "Please enter your real name. Anonymous donations are not accepted." });
    if (dto.Amount < 1 || dto.Amount > 100000)
        return Results.BadRequest(new { message = "Please enter a valid amount." });
    var lower = name.ToLower();
    var attendee = await db.Attendees.FirstOrDefaultAsync(a => a.Name.ToLower() == lower);
    if (attendee is null)
        return Results.BadRequest(new { message = "We couldn't match that name to the guest list. Pick your name from the suggestions." });
    var donation = new Donation { DonorName = attendee.Name, Amount = dto.Amount };
    db.Donations.Add(donation);
    await db.SaveChangesAsync();
    return Results.Created($"/api/donations/{donation.Id}", donation);
});

api.MapDelete("/donations/{id:int}", async (AppDbContext db, int id) =>
{
    var d = await db.Donations.FindAsync(id);
    if (d is null) return Results.NotFound();
    db.Donations.Remove(d);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ── FEEDBACK (Wootric-style NPS) ─────────────────────────────
api.MapGet("/feedback", async (AppDbContext db) =>
    await db.FeedbackResponses.OrderByDescending(f => f.Id).ToListAsync());

api.MapPost("/feedback", async (AppDbContext db, FeedbackDto dto) =>
{
    var fb = new FeedbackResponse
    {
        NpsScore = dto.NpsScore,
        OverallRating = dto.OverallRating,
        FoodRating = dto.FoodRating,
        VenueRating = dto.VenueRating,
        EntertainmentRating = dto.EntertainmentRating,
        Comment = dto.Comment ?? ""
    };
    db.FeedbackResponses.Add(fb);
    await db.SaveChangesAsync();
    return Results.Created($"/api/feedback/{fb.Id}", fb);
});

app.Run();

record AttendeeCreateDto(string Name, string Email, string Mobile, string? NokName, string? NokContact, string Division, string FunctionArea, string? Dietary);
record DonationDto(string DonorName, int Amount);
record CheckinDto(string? Gate);
record VoteDto(string VoterKey, string CandidateName);
record DrawWinnerDto(string Name, string Division, string Prize, string PrizeCategory);
record FeedbackDto(int NpsScore, int OverallRating, int FoodRating, int VenueRating, int EntertainmentRating, string? Comment);

static class Seed
{
    // Loads the real attendee list from Data/attendees.csv (Name,Email) and adds anyone missing on every start.
    public static void Run(AppDbContext db)
    {
        // A published database may still hold the old demo data (@softco.com). Clear it once so the real list loads.
        if (db.Attendees.Any() && db.Attendees.All(a => a.Email.EndsWith("@softco.com")))
        {
            db.ScanLogs.RemoveRange(db.ScanLogs);
            db.Votes.RemoveRange(db.Votes);
            db.DrawWinners.RemoveRange(db.DrawWinners);
            db.FeedbackResponses.RemoveRange(db.FeedbackResponses);
            db.Attendees.RemoveRange(db.Attendees);
            db.SaveChanges();
        }

        var path = Path.Combine(AppContext.BaseDirectory, "Data", "attendees.csv");
        if (!File.Exists(path)) path = Path.Combine(Directory.GetCurrentDirectory(), "Data", "attendees.csv");
        if (!File.Exists(path)) return;

        // Add-only sync: anyone in the CSV who is not yet in the database (matched by email) is added.
        // Existing people, check-ins, votes and draw results are never touched.
        // Rows with no email (e.g. guests listed only by name) are matched by name + occurrence number.
        var seen = new HashSet<string>(db.Attendees.Where(a => a.Email != "").Select(a => a.Email.ToLower()));
        var noEmailCount = new Dictionary<string, int>();
        foreach (var g in db.Attendees.Where(a => a.Email == "").Select(a => a.Name.ToLower()).ToList())
        {
            noEmailCount[g] = noEmailCount.GetValueOrDefault(g) + 1;
            seen.Add($"noemail:{g}#{noEmailCount[g]}");
        }
        var csvNoEmail = new Dictionary<string, int>();
        var n = db.Attendees.Count();
        foreach (var line in File.ReadLines(path).Skip(1))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var idx = line.LastIndexOf(',');
            if (idx < 0) continue;
            var name = line[..idx].Trim().Trim('"');
            var email = line[(idx + 1)..].Trim().Trim('"');
            if (name.Length == 0) continue;
            string key;
            if (email.Length == 0)
            {
                var nk = name.ToLower();
                csvNoEmail[nk] = csvNoEmail.GetValueOrDefault(nk) + 1;
                key = $"noemail:{nk}#{csvNoEmail[nk]}";
            }
            else key = email.ToLower();
            if (!seen.Add(key)) continue;
            n++;
            db.Attendees.Add(new Attendee
            {
                Ticket = $"ANN2026-{n:D5}",
                Name = name,
                Email = email,
                Source = "Imported",
                CheckedIn = false,
            });
        }
        db.SaveChanges();
    }
}
