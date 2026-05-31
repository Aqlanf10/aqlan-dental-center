namespace AqlanDental.Domain.Entities;

public enum LabOrderStatus
{
    Sent = 0,
    Manufacturing = 1,
    Ready = 2,
    Received = 3,
    Cancelled = 4,
}

public enum LabOrderPriority
{
    Urgent = 0,
    Normal = 1,
    Low = 2,
}

public class LabOrder
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? OrthoCaseId { get; set; }
    public string? OrderNumber { get; set; }
    public string? ApplianceType { get; set; }
    public string? LabName { get; set; }
    public DateOnly? SentDate { get; set; }
    public DateOnly? ExpectedDate { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public LabOrderStatus Status { get; set; } = LabOrderStatus.Sent;
    public LabOrderPriority Priority { get; set; } = LabOrderPriority.Normal;
    public string? Instructions { get; set; }
    public decimal? Cost { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
}
