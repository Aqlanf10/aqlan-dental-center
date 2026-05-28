using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/clinic")]
public class ClinicController : ControllerBase
{
    private readonly IClinicSettingsService _clinicSettingsService;

    public ClinicController(IClinicSettingsService clinicSettingsService)
    {
        _clinicSettingsService = clinicSettingsService;
    }

    [HttpGet("settings")]
    [AllowAnonymous]
    public async Task<ActionResult> GetSettings()
    {
        var settings = await _clinicSettingsService.GetSettingsAsync();

        if (settings is null)
        {
            return NotFound(new { Message = "إعدادات العيادة غير موجودة" });
        }

        return Ok(settings);
    }
}
