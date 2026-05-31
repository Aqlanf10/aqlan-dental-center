namespace AqlanDental.Domain.Entities;

public class ClinicQueueItem
{
    public Guid Id { get; set; }
    public Guid DailyVisitId { get; set; }
    public Guid PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? RoomId { get; set; }
    public DateOnly QueueDate { get; set; }
    public int QueueNumber { get; set; }
    public QueuePriority Priority { get; set; }
    public QueueStatus Status { get; set; }
    public DateTime? CalledAt { get; set; }
    public DateTime? EnteredRoomAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public DailyVisit DailyVisit { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
    public ClinicRoom? Room { get; set; }
}

public enum QueuePriority
{
    Normal = 0,
    Urgent = 1,
    VIP = 2,
    Emergency = 3
}

public enum QueueStatus
{
    Waiting = 0,
    Called = 1,
    InRoom = 2,
    InProgress = 3,
    Completed = 4,
    Cancelled = 5,
    NoShow = 6
}
