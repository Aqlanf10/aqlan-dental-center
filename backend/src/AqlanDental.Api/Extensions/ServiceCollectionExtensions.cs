using System.Text;
using AqlanDental.Application;
using AqlanDental.Domain.Constants;
using AqlanDental.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace AqlanDental.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddApplication();
        services.AddInfrastructure(configuration);

        services.AddControllers();
        services.AddEndpointsApiExplorer();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"],
                ValidAudience = configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!)),
                ClockSkew = TimeSpan.Zero
            };
        });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build())
            .AddPolicy("AdminOnly", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("DoctorOrAbove", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("ReceptionOrAbove", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("AccountantOrAbove", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception, AppRoles.Accountant))
            .AddPolicy("PatientRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception, AppRoles.Accountant))
            .AddPolicy("PatientWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("PatientDelete", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("DoctorRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception, AppRoles.Accountant))
            .AddPolicy("DoctorWrite", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("DoctorDelete", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("AppointmentRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception, AppRoles.Accountant))
            .AddPolicy("AppointmentWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("AppointmentStatusUpdate", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("AppointmentDelete", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("BookingRequestRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("BookingRequestWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("BookingRequestDelete", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("DailyVisitsRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception, AppRoles.Doctor))
            .AddPolicy("DailyVisitsWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("ClinicQueueRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception, AppRoles.Doctor))
            .AddPolicy("ClinicQueueWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception))
            .AddPolicy("ClinicRoomsRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Reception, AppRoles.Doctor))
            .AddPolicy("ClinicRoomsWrite", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("ClinicalVisitsRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("ClinicalVisitsWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("ClinicalVisitsCancel", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("PrescriptionsWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("ClinicalProceduresRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("ClinicalProceduresWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("DoctorScheduleRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("DoctorScheduleWrite", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("ClinicServicesRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception, AppRoles.Accountant))
            .AddPolicy("ClinicServicesWrite", policy =>
                policy.RequireRole(AppRoles.Admin))
            .AddPolicy("GeneralDentistryRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("GeneralDentistryWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("OrthodonticsRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("OrthodonticsWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor))
            .AddPolicy("SurgeryRead", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor, AppRoles.Reception))
            .AddPolicy("SurgeryWrite", policy =>
                policy.RequireRole(AppRoles.Admin, AppRoles.Doctor));

        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Aqlan Dental Center API",
                Version = "v1",
                Description = "نظام إدارة مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان"
            });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header. Example: \"Authorization: Bearer {token}\"",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        services.AddCors(options =>
        {
            options.AddPolicy("DevCors", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });

            options.AddPolicy("ProductionCors", policy =>
            {
                var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? Array.Empty<string>();
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        return services;
    }
}
