namespace AqlanDental.Application.Common.Interfaces;

public record ClinicSettingsDto(
    int Id,
    string ClinicNameAr,
    string ClinicNameEn,
    string? PhoneNumber,
    string? Address,
    string? LogoUrl,
    string CurrencyDefault,
    DateTime UpdatedAt
);

public interface IClinicSettingsService
{
    Task<ClinicSettingsDto?> GetSettingsAsync();
}
