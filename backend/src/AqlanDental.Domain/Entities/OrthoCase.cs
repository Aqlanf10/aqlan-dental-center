namespace AqlanDental.Domain.Entities;

public enum OrthoCaseStatus
{
    Active = 0,
    Completed = 1,
    OnHold = 2,
    Cancelled = 3,
}

public class OrthoCase
{
    public Guid Id { get; set; }
    public string CaseNumber { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public string? ApplianceType { get; set; }
    public DateOnly? StartDate { get; set; }
    public int? ExpectedDurationMonths { get; set; }
    public string? CurrentStage { get; set; }
    public int StagePercentage { get; set; } = 0;
    public OrthoCaseStatus Status { get; set; } = OrthoCaseStatus.Active;
    public decimal? TotalFee { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
    public List<OrthoVisit> Visits { get; set; } = new();
    public List<TreatmentStage> Stages { get; set; } = new();
}
