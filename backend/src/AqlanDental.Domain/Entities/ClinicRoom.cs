namespace AqlanDental.Domain.Entities;

public class ClinicRoom
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? RoomNumber { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsOccupied { get; set; }
    public Guid? CurrentDailyVisitId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public DailyVisit? CurrentDailyVisit { get; set; }
}
