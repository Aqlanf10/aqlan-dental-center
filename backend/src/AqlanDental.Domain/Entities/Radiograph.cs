namespace AqlanDental.Domain.Entities;

public enum XrayType
{
    Periapical = 0,
    Panoramic = 1,
    Cephalometric = 2,
    CBCT = 3,
    Bitewing = 4,
    Occlusal = 5,
}

public class Radiograph
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public XrayType XrayType { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public string? ToothRelated { get; set; }
    public Guid? DoctorId { get; set; }
    public DateTime? XrayDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public Doctor? Doctor { get; set; }
}
