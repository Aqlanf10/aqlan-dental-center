namespace AqlanDental.Domain.Entities;

public class ClinicalProcedure
{
    public Guid Id { get; set; }
    public Guid ClinicalVisitId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public ClinicalProcedureType ProcedureType { get; set; }
    public string? ToothNumber { get; set; }
    public string? ToothSurface { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ClinicalNotes { get; set; }
    public ClinicalProcedureStatus Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Navigation
    public ClinicalVisit ClinicalVisit { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
}

public enum ClinicalProcedureType
{
    Consultation = 0,
    Filling = 1,
    Extraction = 2,
    Scaling = 3,
    RootCanal = 4,
    Crown = 5,
    Prosthodontic = 6,
    Other = 99
}

public enum ClinicalProcedureStatus
{
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}
