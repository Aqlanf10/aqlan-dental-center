using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicSettingsService : IClinicSettingsService
{
    private readonly AqlanDentalDbContext _context;

    public ClinicSettingsService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<ClinicSettingsDto?> GetSettingsAsync()
    {
        var settings = await _context.ClinicSettings.FirstOrDefaultAsync();

        if (settings is null)
            return null;

        return new ClinicSettingsDto(
            settings.Id,
            settings.ClinicNameAr,
            settings.ClinicNameEn,
            settings.PhoneNumber,
            settings.Address,
            settings.LogoUrl,
            settings.CurrencyDefault,
            settings.UpdatedAt
        );
    }
}
