namespace Backend.Models;

public class Attendee
{
    public int Id { get; set; }
    public string Ticket { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Mobile { get; set; } = "";
    public string NokName { get; set; } = "";
    public string NokContact { get; set; } = "";
    public string Division { get; set; } = "";
    public string FunctionArea { get; set; } = "";
    public string Dietary { get; set; } = "";
    public string Source { get; set; } = "Online";
    public bool CheckedIn { get; set; } = false;
    public DateTime? CheckedInAt { get; set; }
    public string? CheckedInGate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ScanLog
{
    public int Id { get; set; }
    public string Result { get; set; } = ""; // valid | duplicate | invalid
    public string? Ticket { get; set; }
    public string? Name { get; set; }
    public string? Division { get; set; }
    public string Gate { get; set; } = "Gate A";
    public DateTime ScannedAt { get; set; } = DateTime.UtcNow;
}

public class Vote
{
    public int Id { get; set; }
    public string VoterKey { get; set; } = "";
    public string CandidateName { get; set; } = "";
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}

public class DrawWinner
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Division { get; set; } = "";
    public string Prize { get; set; } = "";
    public string PrizeCategory { get; set; } = "";
    public bool Redeemed { get; set; } = false;
    public DateTime WonAt { get; set; } = DateTime.UtcNow;
}

public class FeedbackResponse
{
    public int Id { get; set; }
    public int NpsScore { get; set; } = -1;
    public int OverallRating { get; set; }
    public int FoodRating { get; set; }
    public int VenueRating { get; set; }
    public int EntertainmentRating { get; set; }
    public string Comment { get; set; } = "";
    public string Source { get; set; } = "Wootric";
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

public class Donation
{
    public int Id { get; set; }
    public string DonorName { get; set; } = "";
    public int Amount { get; set; }
    public DateTime DonatedAt { get; set; } = DateTime.UtcNow;
}
