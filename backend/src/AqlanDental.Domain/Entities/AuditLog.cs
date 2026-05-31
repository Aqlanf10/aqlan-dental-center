namespace AqlanDental.Domain.Entities;

public enum AuditAction
{
    Create = 0,
    Read = 1,
    Update = 2,
    Delete = 3,
    Approve = 4,
    Reject = 5,
    Login = 6,
    LoginFailed = 7,
    Logout = 8,
}

public class AuditLog
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public AuditAction Action { get; set; }
    public string Resource { get; set; } = string.Empty;
    public Guid? ResourceId { get; set; }
    public string? IpAddress { get; set; }
    public string? Details { get; set; }
    public string? NewData { get; set; }
    public string? OldData { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
