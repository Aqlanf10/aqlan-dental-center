namespace AqlanDental.Domain.Entities;

public class InvoiceLineItem
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid? ClinicServiceId { get; set; }
    public string ServiceNameSnapshot { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal LineDiscountAmount { get; set; }
    public Guid? DoctorId { get; set; }
    public string? ToothNumber { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Invoice Invoice { get; set; } = null!;
    public ClinicService? ClinicService { get; set; }
    public Doctor? Doctor { get; set; }
}
