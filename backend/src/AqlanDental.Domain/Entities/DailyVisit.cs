namespace AqlanDental.Domain.Entities;

public class DailyVisit
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? AppointmentId { get; set; }
    public DateOnly VisitDate { get; set; }
    public DailyVisitType VisitType { get; set; }
    public DailyVisitStatus Status { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
    public Appointment? Appointment { get; set; }
}

public enum DailyVisitType
{
    Scheduled = 0,
    WalkIn = 1
}

public enum DailyVisitStatus
{
    Scheduled = 0,
    CheckedIn = 1,
    Waiting = 2,
    ReadyForDoctor = 3,
    InProgress = 4,
    Completed = 5,
    Cancelled = 6,
    NoShow = 7
}
