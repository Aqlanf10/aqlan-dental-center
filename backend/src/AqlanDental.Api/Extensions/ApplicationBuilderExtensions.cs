using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Api.Extensions;

public static class ApplicationBuilderExtensions
{
    public static async Task UseInfrastructureSeedAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        try
        {
            var context = services.GetRequiredService<AqlanDentalDbContext>();
            await context.Database.MigrateAsync();

            var seeder = services.GetRequiredService<InitialSeeder>();
            await seeder.SeedAsync();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "حدث خطأ أثناء تهيئة قاعدة البيانات");
        }
    }
}
