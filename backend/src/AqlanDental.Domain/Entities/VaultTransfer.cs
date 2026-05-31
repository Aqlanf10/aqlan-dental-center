namespace AqlanDental.Domain.Entities;

public enum TransferStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

public enum DepositSource
{
    OwnerCapital = 0,
    OpeningBalance = 1,
    OtherReceivable = 2,
    AuthorizedRevenueDocument = 3,
}

public class VaultTransfer
{
    public Guid Id { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceTreasuryId { get; set; }
    public Guid DestinationTreasuryId { get; set; }
    public decimal Amount { get; set; }
    public TransferStatus Status { get; set; } = TransferStatus.Pending;
    public DepositSource? DepositSource { get; set; }
    public string? DepositSourceDescription { get; set; }
    public Guid? CashierSessionId { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public Guid? CashFlowTransactionId { get; set; }
    public Guid? JournalEntryId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public Treasury SourceTreasury { get; set; } = null!;
    public Treasury DestinationTreasury { get; set; } = null!;
    public CashierSession? CashierSession { get; set; }
    public CashFlowTransaction? CashFlowTransaction { get; set; }
    public JournalEntry? JournalEntry { get; set; }
}
