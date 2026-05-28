using AqlanDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/clinic")]
public class ClinicController : ControllerBase
{
    private readonly AqlanDentalDbContext _context;

    public ClinicController(AqlanDentalDbContext context)
    {
        _context = context;
    }

    [HttpGet("settings")]
    [AllowAnonymous]
    public async Task<ActionResult> GetSettings()
    {
        var settings = await _context.ClinicSettings.FirstOrDefaultAsync();

        if (settings is null)
        {
            return NotFound(new { Message = "إعدادات العيادة غير موجودة" });
        }

        return Ok(new
        {
            settings.Id,
            settings.ClinicNameAr,
            settings.ClinicNameEn,
            settings.PhoneNumber,
            settings.Address,
            settings.LogoUrl,
            settings.CurrencyDefault,
            settings.UpdatedAt
        });
    }
}
