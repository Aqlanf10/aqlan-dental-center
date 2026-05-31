namespace AqlanDental.Domain.Entities;

public enum TransactionType
{
    Inflow = 0,
    Outflow = 1,
}

public enum FinancialCategory
{
    PatientPayment = 0,
    SupplierPayment = 1,
    SalaryPayment = 2,
    DoctorCommission = 3,
    OperationalExpense = 4,
    Refund = 5,
    GeneralCost = 6,
    InternalTransfer = 7,
    SalaryAdvance = 8,
    Reversal = 9,
    Other = 99,
}

public class CashFlowTransaction
{
    public Guid Id { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public FinancialCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public Guid? ReferenceId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PerformedBy { get; set; }
    public Guid? CashierSessionId { get; set; }
    public Guid? TreasuryId { get; set; }
    public bool IsReversal { get; set; }
    public Guid? ReversalOfTransactionId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public CashierSession? CashierSession { get; set; }
    public Treasury? Treasury { get; set; }
}
