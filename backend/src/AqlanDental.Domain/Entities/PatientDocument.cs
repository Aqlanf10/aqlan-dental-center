namespace AqlanDental.Domain.Entities;

public enum DocumentType
{
    Consent = 0,
    Referral = 1,
    Insurance = 2,
    LabReport = 3,
    Other = 99,
}

public class PatientDocument
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DocumentType DocumentType { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public bool IsSigned { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
}
