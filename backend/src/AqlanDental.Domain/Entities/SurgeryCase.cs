namespace AqlanDental.Domain.Entities;

public enum SurgeryCaseStatus
{
    Scheduled = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
}

public class SurgeryCase
{
    public Guid Id { get; set; }
    public string CaseNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public string SurgeryType { get; set; } = string.Empty;
    public string? TeethInvolved { get; set; }
    public SurgeryCaseStatus Status { get; set; } = SurgeryCaseStatus.Scheduled;
    public DateOnly? SurgeryDate { get; set; }
    public string? SurgeryLocation { get; set; }
    public string? AnesthesiaType { get; set; }
    public string? PreopNotes { get; set; }
    public string? OperativeNotes { get; set; }
    public string? PostopInstructions { get; set; }
    public string? Complications { get; set; }
    public DateOnly? FollowupDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
}
