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
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<BookingRequest> BookingRequests => Set<BookingRequest>();
    public DbSet<DailyVisit> DailyVisits => Set<DailyVisit>();
    public DbSet<ClinicRoom> ClinicRooms => Set<ClinicRoom>();
    public DbSet<ClinicQueueItem> ClinicQueueItems => Set<ClinicQueueItem>();

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

        builder.Entity<Appointment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ServiceType).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.AppointmentDate);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<BookingRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PatientName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.ServiceType).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Status).IsRequired();

            entity.HasOne(e => e.PreferredDoctor)
                .WithMany()
                .HasForeignKey(e => e.PreferredDoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LinkedPatient)
                .WithMany()
                .HasForeignKey(e => e.LinkedPatientId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ConvertedAppointment)
                .WithMany()
                .HasForeignKey(e => e.ConvertedAppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.PhoneNumber);
        });

        builder.Entity<DailyVisit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VisitType).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.ChiefComplaint).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Appointment)
                .WithMany()
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.VisitDate);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.AppointmentId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<ClinicRoom>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.RoomNumber).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.CurrentDailyVisit)
                .WithMany()
                .HasForeignKey(e => e.CurrentDailyVisitId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsOccupied);
        });

        builder.Entity<ClinicQueueItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QueueNumber).IsRequired();
            entity.Property(e => e.Priority).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasOne(e => e.DailyVisit)
                .WithMany()
                .HasForeignKey(e => e.DailyVisitId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Room)
                .WithMany()
                .HasForeignKey(e => e.RoomId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.QueueDate);
            entity.HasIndex(e => e.QueueNumber);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Priority);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.RoomId);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => new { e.QueueDate, e.QueueNumber }).IsUnique();
        });

        SeedDefaultClinicSettings(builder);
    }

    private static void SeedDefaultClinicSettings(ModelBuilder builder)
    {
        builder.Entity<ClinicSettings>().HasData(new ClinicSettings
        {
            Id = 1,
            ClinicNameAr = "مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان",
            ClinicNameEn = "Dr. Aqlan Complete Center for Orthodontics, Implants & Cosmetic Dentistry",
            PhoneNumber = "+967-1-200200",
            Address = "صنعاء، شارع الزبيري، بجوار البنك المركزي اليمني",
            CurrencyDefault = "YER",
            UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
