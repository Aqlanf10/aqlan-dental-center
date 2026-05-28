namespace AqlanDental.Application.Common.Interfaces;

public record HealthCheckResult(
    string Status,
    DateTime Timestamp,
    string Version,
    Dictionary<string, string> Services
);

public interface IHealthCheckService
{
    Task<HealthCheckResult> CheckHealthAsync();
}
