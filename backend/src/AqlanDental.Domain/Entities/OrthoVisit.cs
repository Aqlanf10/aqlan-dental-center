namespace AqlanDental.Domain.Entities;

public class OrthoVisit
{
    public Guid Id { get; set; }
    public Guid OrthoCaseId { get; set; }
    public int VisitNumber { get; set; }
    public DateOnly VisitDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public string? VisitType { get; set; }
    public string? CurrentStage { get; set; }
    public string? WireUpper { get; set; }
    public string? WireLower { get; set; }
    public string? ElasticsType { get; set; }
    public string? ClinicalNotes { get; set; }
    public string? PatientInstructions { get; set; }
    public DateOnly? NextAppointmentDate { get; set; }
    public Guid? DoctorId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public OrthoCase OrthoCase { get; set; } = null!;
    public Doctor? Doctor { get; set; }
}
