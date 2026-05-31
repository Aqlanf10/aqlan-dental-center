namespace AqlanDental.Domain.Entities;

public enum ContractStatus
{
    Active = 0,
    Completed = 1,
    Cancelled = 2,
    Defaulted = 3,
}

public class Contract
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? Specialty { get; set; }
    public Guid? RelatedCaseId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DownPayment { get; set; }
    public int InstallmentsCount { get; set; }
    public decimal? InstallmentAmount { get; set; }
    public DateOnly? StartDate { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Active;
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
}
