namespace AqlanDental.Domain.Entities;

public enum ExpenseCategory
{
    Rent = 0,
    Utilities = 1,
    LabFees = 2,
    Marketing = 3,
    ClinicSupplies = 4,
    Maintenance = 5,
    Salaries = 6,
    Commissions = 7,
    Taxes = 8,
    Miscellaneous = 99,
}

public enum ExpenseApprovalStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

public class OperationalExpense
{
    public Guid Id { get; set; }
    public string ExpenseNumber { get; set; } = string.Empty;
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? SupplierName { get; set; }
    public Guid? LabOrderId { get; set; }
    public string? ReceiptAttachmentUrl { get; set; }
    public ExpenseApprovalStatus ApprovalStatus { get; set; } = ExpenseApprovalStatus.Pending;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public bool IsPostedToLedger { get; set; }
    public Guid? CashFlowTransactionId { get; set; }
    public Guid? JournalEntryId { get; set; }
    public Guid? CashierSessionId { get; set; }
    public Guid? TreasuryId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public CashFlowTransaction? CashFlowTransaction { get; set; }
    public JournalEntry? JournalEntry { get; set; }
    public CashierSession? CashierSession { get; set; }
    public Treasury? Treasury { get; set; }
    public LabOrder? LabOrder { get; set; }
}
