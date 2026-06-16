namespace AqlanDental.Domain.Entities;

public enum ClinicalPhotoCategory
{
    Intraoral = 0,
    Extraoral = 1,
    Portrait = 2,
    StudyModel = 3,
}

public class ClinicalPhoto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid? OrthoCaseId { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public ClinicalPhotoCategory Category { get; set; }
    public string? PhotoType { get; set; }
    public string? Stage { get; set; }
    public DateTime? PhotoDate { get; set; }
    public string? Caption { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public OrthoCase? OrthoCase { get; set; }
}
