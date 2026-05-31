namespace AqlanDental.Domain.Entities;

public enum StageStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
}

public class TreatmentStage
{
    public Guid Id { get; set; }
    public Guid OrthoCaseId { get; set; }
    public string StageName { get; set; } = string.Empty;
    public int StageOrder { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? TargetDurationMonths { get; set; }
    public string? Notes { get; set; }
    public StageStatus Status { get; set; } = StageStatus.Pending;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public OrthoCase OrthoCase { get; set; } = null!;
}
