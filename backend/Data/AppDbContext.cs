using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Attendee> Attendees => Set<Attendee>();
    public DbSet<ScanLog> ScanLogs => Set<ScanLog>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<DrawWinner> DrawWinners => Set<DrawWinner>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<FeedbackResponse> FeedbackResponses => Set<FeedbackResponse>();
}
