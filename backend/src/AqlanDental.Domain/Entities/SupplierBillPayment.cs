namespace AqlanDental.Domain.Entities;

public class SupplierBillPayment
{
    public Guid Id { get; set; }
    public Guid SupplierBillId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public Guid? TreasuryId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SupplierBill Bill { get; set; } = null!;
    public Treasury? Treasury { get; set; }
}
