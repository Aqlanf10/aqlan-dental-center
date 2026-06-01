namespace AqlanDental.Domain.Entities;

public enum CommissionStatus
{
    Pending = 0,
    Approved = 1,
    Paid = 2,
    Cancelled = 3,
}

public class DoctorCommissionPayment
{
    public Guid Id { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? InvoiceLineItemId { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal MaterialCost { get; set; }
    public decimal LabCost { get; set; }
    public decimal NetCommissionable { get; set; }
    public decimal CommissionPercentage { get; set; }
    public decimal CommissionAmount { get; set; }
    public CommissionStatus Status { get; set; } = CommissionStatus.Pending;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public Guid? CashFlowTransactionId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public Doctor Doctor { get; set; } = null!;
    public InvoiceLineItem? InvoiceLineItem { get; set; }
    public CashFlowTransaction? CashFlowTransaction { get; set; }
}
