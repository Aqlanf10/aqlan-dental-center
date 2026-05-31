namespace AqlanDental.Domain.Entities;

public enum TreasuryType
{
    Vault = 0,
    Bank = 1,
}

public class Treasury
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TreasuryType Type { get; set; } = TreasuryType.Vault;
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<CashFlowTransaction> Transactions { get; set; } = new();
}
