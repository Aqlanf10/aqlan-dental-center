namespace AqlanDental.Domain.Entities;

public enum PurchaseOrderStatus
{
    Draft = 0,
    Submitted = 1,
    PartiallyReceived = 2,
    Received = 3,
    Cancelled = 4,
}

public class PurchaseOrder
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public Supplier Supplier { get; set; } = null!;
    public List<PurchaseOrderLineItem> LineItems { get; set; } = new();
}
