namespace AqlanDental.Domain.Entities;

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    Paid = 2,
    Cancelled = 3,
}

public class Invoice
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? VisitId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Patient Patient { get; set; } = null!;
    public ClinicalVisit? Visit { get; set; }
    public List<InvoiceLineItem> LineItems { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();
}
