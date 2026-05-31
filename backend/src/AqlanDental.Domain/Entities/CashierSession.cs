namespace AqlanDental.Domain.Entities;

public enum SessionStatus
{
    Open = 0,
    Closed = 1,
    Reconciled = 2,
}

public class CashierSession
{
    public Guid Id { get; set; }
    public string SessionNumber { get; set; } = string.Empty;
    public string CashierId { get; set; } = string.Empty;
    public DateTime OpeningTime { get; set; } = DateTime.UtcNow;
    public DateTime? ClosingTime { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ExpectedClosingCash { get; set; }
    public decimal? ActualClosingCash { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Open;
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Cashier { get; set; } = null!;
}
