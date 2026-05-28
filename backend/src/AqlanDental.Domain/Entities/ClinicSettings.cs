namespace AqlanDental.Domain.Entities;

public class ClinicSettings
{
    public int Id { get; set; }
    public string ClinicNameAr { get; set; } = "مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان";
    public string ClinicNameEn { get; set; } = "Aqlan Dental Center";
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string CurrencyDefault { get; set; } = "YER";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
