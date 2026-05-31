namespace AqlanDental.Domain.Entities;

public enum PaymentMethod
{
    Cash = 0,
    Card = 1,
    BankTransfer = 2,
    Check = 3,
    Other = 99,
}

public class Payment
{
    public Guid Id { get; set; }
    public Guid? ContractId { get; set; }
    public Guid? InvoiceId { get; set; }
    public Guid PatientId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? ServiceDescription { get; set; }
    public Guid? DoctorId { get; set; }
    public string? ReceivedBy { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public Contract? Contract { get; set; }
    public Invoice? Invoice { get; set; }
    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
}
