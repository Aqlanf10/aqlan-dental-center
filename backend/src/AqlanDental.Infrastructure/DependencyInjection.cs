using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Constants;
using AqlanDental.Domain.Entities;
using AqlanDental.Infrastructure.Persistence;
using AqlanDental.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AqlanDental.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")!;
        var useSqlite = connectionString.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<AqlanDentalDbContext>(options =>
        {
            if (useSqlite)
                options.UseSqlite(connectionString);
            else
                options.UseNpgsql(connectionString);
        });

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;

            options.User.RequireUniqueEmail = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddEntityFrameworkStores<AqlanDentalDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IClinicSettingsService, ClinicSettingsService>();
        services.AddScoped<IHealthCheckService, HealthCheckService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IDoctorService, DoctorService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IBookingRequestService, BookingRequestService>();
        services.AddScoped<IDailyVisitService, DailyVisitService>();
        services.AddScoped<IClinicQueueService, ClinicQueueService>();
        services.AddScoped<IClinicRoomService, ClinicRoomService>();
        services.AddScoped<IClinicalVisitService, ClinicalVisitService>();
        services.AddScoped<IClinicalProcedureService, ClinicalProcedureService>();
        services.AddScoped<IDoctorScheduleService, DoctorScheduleService>();
        services.AddScoped<IDoctorAccessService, DoctorAccessService>();
        services.AddScoped<IClinicServiceService, ClinicServiceService>();
        services.AddScoped<InitialSeeder>();

        return services;
    }
}
