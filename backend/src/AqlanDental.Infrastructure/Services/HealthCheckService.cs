using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Infrastructure.Persistence;

namespace AqlanDental.Infrastructure.Services;

public class HealthCheckService : IHealthCheckService
{
    private readonly AqlanDentalDbContext _context;

    public HealthCheckService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync()
    {
        var dbConnected = await CheckDatabaseConnectionAsync();

        return new HealthCheckResult(
            dbConnected ? "Healthy" : "Degraded",
            DateTime.UtcNow,
            "1.0.0",
            new Dictionary<string, string>
            {
                { "Database", dbConnected ? "Connected" : "Disconnected" }
            }
        );
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
