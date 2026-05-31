using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers.Public;

[ApiController]
[Route("api/public/clinic-display")]
public class ClinicDisplayController : ControllerBase
{
    private readonly IClinicQueueService _clinicQueueService;

    public ClinicDisplayController(IClinicQueueService clinicQueueService)
    {
        _clinicQueueService = clinicQueueService;
    }

    /// <summary>
    /// Public read-only endpoint for waiting room TV display.
    /// Returns only safe fields — no phone numbers, addresses, clinical notes, or financial data.
    /// </summary>
    [HttpGet("today")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicClinicDisplayDto>> GetTodayDisplay([FromQuery] DateOnly? date)
    {
        var result = await _clinicQueueService.GetPublicDisplayAsync(date);
        return Ok(result);
    }
}
