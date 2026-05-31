namespace AqlanDental.Domain.Entities;

public class JournalLine
{
    public Guid Id { get; set; }
    public Guid JournalEntryId { get; set; }
    public JournalAccountType AccountType { get; set; }
    public Guid? AccountId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Description { get; set; }
    public Guid? BranchId { get; set; }
    public bool IsActive { get; set; } = true;

    public JournalEntry JournalEntry { get; set; } = null!;
}
