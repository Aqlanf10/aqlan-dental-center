namespace AqlanDental.Domain.Entities;

public enum BillStatus
{
    Unpaid = 0,
    PartiallyPaid = 1,
    FullyPaid = 2,
    Cancelled = 3,
}

public class SupplierBill
{
    public Guid Id { get; set; }
    public string BillNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Unpaid;
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Supplier Supplier { get; set; } = null!;
    public List<SupplierBillPayment> Payments { get; set; } = new();
}
