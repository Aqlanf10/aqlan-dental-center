using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthCheckService _healthCheckService;

    public HealthController(IHealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult> Get()
    {
        var result = await _healthCheckService.CheckHealthAsync();

        return result.Status == "Healthy"
            ? Ok(result)
            : StatusCode(503, result);
    }
}
