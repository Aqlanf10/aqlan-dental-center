using AqlanDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AqlanDentalDbContext _context;

    public HealthController(AqlanDentalDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult> Get()
    {
        var dbConnected = await CheckDatabaseConnectionAsync();

        var result = new
        {
            Status = dbConnected ? "Healthy" : "Degraded",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0",
            Services = new
            {
                Database = dbConnected ? "Connected" : "Disconnected"
            }
        };

        return dbConnected ? Ok(result) : StatusCode(503, result);
    }

    private async Task<bool> CheckDatabaseConnectionAsync()
    {
        try
        {
            return await _context.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }
}
