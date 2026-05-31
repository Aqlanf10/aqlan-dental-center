namespace AqlanDental.Domain.Entities;

public enum FinancialDocumentType
{
    Invoice = 0,
    Payment = 1,
    Expense = 2,
    SalaryPayment = 3,
    AdvancePayment = 4,
    VaultTransfer = 5,
    SupplierPayment = 6,
    CreditNote = 7,
    CommissionPayment = 8,
}

public enum JournalAccountType
{
    Treasury = 0,
    Expense = 1,
    Revenue = 2,
    Payable = 3,
    OwnerEquity = 4,
    OtherReceivable = 5,
    Patient = 6,
}

public class JournalEntry
{
    public Guid Id { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public FinancialDocumentType DocumentType { get; set; }
    public Guid? FinancialDocumentId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public Guid? BranchId { get; set; }
    public string? PerformedBy { get; set; }
    public Guid? CashierSessionId { get; set; }
    public Guid? TreasuryId { get; set; }
    public bool IsPosted { get; set; }
    public DateTime? PostedAt { get; set; }
    public bool IsReversal { get; set; }
    public Guid? ReversalOfEntryId { get; set; }
    public Guid? ReversedByEntryId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<JournalLine> Lines { get; set; } = new();
    public CashierSession? CashierSession { get; set; }
    public Treasury? Treasury { get; set; }
    public Branch? Branch { get; set; }
}
