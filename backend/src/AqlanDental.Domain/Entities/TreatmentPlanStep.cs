namespace AqlanDental.Domain.Entities;

public enum TreatmentStepPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
}

public enum TreatmentStepStatus
{
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Skipped = 3,
    Cancelled = 4,
}

public class TreatmentPlanStep
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public int SequenceNumber { get; set; }
    public Guid? ClinicServiceId { get; set; }
    public string? ServiceNameSnapshot { get; set; }
    public string? Department { get; set; }
    public int? ToothNumber { get; set; }
    public string? ToothArea { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TreatmentStepPriority Priority { get; set; } = TreatmentStepPriority.Normal;
    public TreatmentStepStatus Status { get; set; } = TreatmentStepStatus.Planned;
    public Guid? ResponsibleDoctorId { get; set; }
    public DateOnly? PlannedDate { get; set; }
    public DateOnly? CompletedDate { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public ClinicService? ClinicService { get; set; }
    public Doctor? ResponsibleDoctor { get; set; }
}
