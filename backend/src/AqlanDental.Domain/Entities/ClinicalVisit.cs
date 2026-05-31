namespace AqlanDental.Domain.Entities;

public class ClinicalVisit
{
    public Guid Id { get; set; }
    public Guid DailyVisitId { get; set; }
    public Guid? ClinicQueueItemId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public DateOnly VisitDate { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public ClinicalVisitStatus Status { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? ClinicalFindings { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatmentNotes { get; set; }
    public string? DoctorRecommendations { get; set; }
    public bool NextVisitRecommended { get; set; }
    public DateOnly? NextVisitDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public DailyVisit DailyVisit { get; set; } = null!;
    public ClinicQueueItem? ClinicQueueItem { get; set; }
    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<ClinicalProcedure> Procedures { get; set; } = new List<ClinicalProcedure>();
}

public enum ClinicalVisitStatus
{
    Open = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}
