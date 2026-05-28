using AqlanDental.Domain.Constants;
using AqlanDental.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Persistence;

public class AqlanDentalDbContext : IdentityDbContext<ApplicationUser>
{
    public AqlanDentalDbContext(DbContextOptions<AqlanDentalDbContext> options)
        : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ClinicSettings> ClinicSettings => Set<ClinicSettings>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(256);
            entity.Property(e => e.JwtId).IsRequired().HasMaxLength(256);
            entity.Property(e => e.UserId).IsRequired();

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Token).IsUnique();
        });

        builder.Entity<ClinicSettings>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClinicNameAr).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ClinicNameEn).IsRequired().HasMaxLength(300);
            entity.Property(e => e.CurrencyDefault).IsRequired().HasMaxLength(10);
        });

        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PatientNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Gender).IsRequired();
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.WhatsAppNumber).HasMaxLength(20);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.PatientNumber).IsUnique();
            entity.HasIndex(e => e.PhoneNumber);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Doctor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Specialty).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(200);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.HasIndex(e => e.IsActive);
        });

        SeedDefaultClinicSettings(builder);
    }

    private static void SeedDefaultClinicSettings(ModelBuilder builder)
    {
        builder.Entity<ClinicSettings>().HasData(new ClinicSettings
        {
            Id = 1,
            ClinicNameAr = "مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان",
            ClinicNameEn = "Aqlan Dental Center",
            PhoneNumber = "+967-1-234567",
            Address = "صنعاء، اليمن",
            CurrencyDefault = "YER",
            UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
