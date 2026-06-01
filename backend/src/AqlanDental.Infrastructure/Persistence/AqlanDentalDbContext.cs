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
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<ClinicSettings> ClinicSettings => Set<ClinicSettings>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<BookingRequest> BookingRequests => Set<BookingRequest>();
    public DbSet<DailyVisit> DailyVisits => Set<DailyVisit>();
    public DbSet<ClinicRoom> ClinicRooms => Set<ClinicRoom>();
    public DbSet<ClinicQueueItem> ClinicQueueItems => Set<ClinicQueueItem>();
    public DbSet<ClinicalVisit> ClinicalVisits => Set<ClinicalVisit>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<ClinicalProcedure> ClinicalProcedures => Set<ClinicalProcedure>();
    public DbSet<DoctorWeeklySchedule> DoctorWeeklySchedules => Set<DoctorWeeklySchedule>();
    public DbSet<MedicalHistory> MedicalHistories => Set<MedicalHistory>();
    public DbSet<DentalHistory> DentalHistories => Set<DentalHistory>();
    public DbSet<ClinicService> ClinicServices => Set<ClinicService>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<DentalChart> DentalCharts => Set<DentalChart>();
    public DbSet<ToothCondition> ToothConditions => Set<ToothCondition>();
    public DbSet<GeneralTreatment> GeneralTreatments => Set<GeneralTreatment>();
    public DbSet<TreatmentPlanStep> TreatmentPlanSteps => Set<TreatmentPlanStep>();
    public DbSet<OrthoCase> OrthoCases => Set<OrthoCase>();
    public DbSet<OrthoVisit> OrthoVisits => Set<OrthoVisit>();
    public DbSet<TreatmentStage> TreatmentStages => Set<TreatmentStage>();
    public DbSet<SurgeryCase> SurgeryCases => Set<SurgeryCase>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLineItem> InvoiceLineItems => Set<InvoiceLineItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<CashierSession> CashierSessions => Set<CashierSession>();
    public DbSet<Treasury> Treasuries => Set<Treasury>();
    public DbSet<CashFlowTransaction> CashFlowTransactions => Set<CashFlowTransaction>();
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Referral> Referrals => Set<Referral>();
    public DbSet<Branch> Branches => Set<Branch>();

    // ─── Sprint 21 Entities ──────────────────────────────────────────
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalLine> JournalLines => Set<JournalLine>();
    public DbSet<OperationalExpense> OperationalExpenses => Set<OperationalExpense>();
    public DbSet<VaultTransfer> VaultTransfers => Set<VaultTransfer>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLineItem> PurchaseOrderLineItems => Set<PurchaseOrderLineItem>();
    public DbSet<SupplierBill> SupplierBills => Set<SupplierBill>();
    public DbSet<SupplierBillPayment> SupplierBillPayments => Set<SupplierBillPayment>();
    public DbSet<DoctorCommissionPayment> DoctorCommissionPayments => Set<DoctorCommissionPayment>();
    public DbSet<ClinicalPhoto> ClinicalPhotos => Set<ClinicalPhoto>();
    public DbSet<Radiograph> Radiographs => Set<Radiograph>();
    public DbSet<PatientDocument> PatientDocuments => Set<PatientDocument>();
    public DbSet<Notification> Notifications => Set<Notification>();

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

        builder.Entity<ClinicalVisit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.VisitDate).IsRequired();
            entity.Property(e => e.ChiefComplaint).HasMaxLength(1000);
            entity.Property(e => e.ClinicalFindings).HasMaxLength(3000);
            entity.Property(e => e.Diagnosis).HasMaxLength(2000);
            entity.Property(e => e.TreatmentNotes).HasMaxLength(3000);
            entity.Property(e => e.DoctorRecommendations).HasMaxLength(2000);

            entity.HasOne(e => e.DailyVisit)
                .WithMany()
                .HasForeignKey(e => e.DailyVisitId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClinicQueueItem)
                .WithMany()
                .HasForeignKey(e => e.ClinicQueueItemId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Prescriptions)
                .WithOne(p => p.ClinicalVisit)
                .HasForeignKey(p => p.ClinicalVisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Procedures)
                .WithOne(p => p.ClinicalVisit)
                .HasForeignKey(p => p.ClinicalVisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.DailyVisitId);
            entity.HasIndex(e => e.ClinicQueueItemId);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.VisitDate);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MedicationName).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Dosage).HasMaxLength(300);
            entity.Property(e => e.Frequency).HasMaxLength(300);
            entity.Property(e => e.Duration).HasMaxLength(300);
            entity.Property(e => e.Instructions).HasMaxLength(1000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ClinicalVisitId);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<ClinicalProcedure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
            entity.Property(e => e.ToothNumber).HasMaxLength(50);
            entity.Property(e => e.ToothSurface).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.ClinicalNotes).HasMaxLength(3000);
            entity.Property(e => e.ProcedureType).IsRequired();
            entity.Property(e => e.Status).IsRequired();

            entity.HasOne(e => e.ClinicalVisit)
                .WithMany(v => v.Procedures)
                .HasForeignKey(e => e.ClinicalVisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ClinicalVisitId);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.ProcedureType);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<DoctorWeeklySchedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DayOfWeek).IsRequired();
            entity.Property(e => e.StartTime).IsRequired();
            entity.Property(e => e.EndTime).IsRequired();
            entity.Property(e => e.DefaultAppointmentDurationMinutes).IsRequired();

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.DayOfWeek);
            entity.HasIndex(e => e.IsAvailableForBooking);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => new { e.DoctorId, e.DayOfWeek, e.IsActive });
        });

        builder.Entity<MedicalHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ChronicDiseases).HasMaxLength(2000);
            entity.Property(e => e.CurrentMedications).HasMaxLength(2000);
            entity.Property(e => e.DrugAllergies).HasMaxLength(1000);
            entity.Property(e => e.IsPregnant).HasMaxLength(10);
            entity.Property(e => e.PreviousSurgeries).HasMaxLength(2000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithOne(p => p.MedicalHistory)
                .HasForeignKey<MedicalHistory>(e => e.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.PatientId).IsUnique();
        });

        builder.Entity<DentalHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ChiefComplaint).HasMaxLength(2000);
            entity.Property(e => e.PreviousTreatments).HasMaxLength(2000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithOne(p => p.DentalHistory)
                .HasForeignKey<DentalHistory>(e => e.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.PatientId).IsUnique();
        });

        builder.Entity<ClinicService>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ArabicName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EnglishName).HasMaxLength(200);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Category).IsRequired();
            entity.Property(e => e.DefaultPrice).HasPrecision(12, 2);

            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Value).HasMaxLength(2000);
            entity.Property(e => e.Category).HasMaxLength(100);

            entity.HasIndex(e => e.Key).IsUnique();
        });

        builder.Entity<DentalChart>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ChartDate).IsRequired();

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.DentalCharts)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.ToothConditions)
                .WithOne(tc => tc.Chart)
                .HasForeignKey(tc => tc.ChartId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.ChartDate);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<ToothCondition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ToothNumber).IsRequired();
            entity.Property(e => e.Condition).IsRequired();
            entity.Property(e => e.SurfacesAffected).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.TreatmentDone).HasMaxLength(500);

            entity.HasIndex(e => e.ChartId);
            entity.HasIndex(e => new { e.ChartId, e.ToothNumber }).IsUnique();
            entity.HasIndex(e => e.ToothNumber);
            entity.HasIndex(e => e.Condition);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<GeneralTreatment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TreatmentType).IsRequired();
            entity.Property(e => e.MaterialUsed).HasMaxLength(200);
            entity.Property(e => e.AnesthesiaType).HasMaxLength(200);
            entity.Property(e => e.Cost).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.GeneralTreatments)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Visit)
                .WithMany()
                .HasForeignKey(e => e.VisitId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.VisitId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.TreatmentType);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<TreatmentPlanStep>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SequenceNumber).IsRequired();
            entity.Property(e => e.ServiceNameSnapshot).HasMaxLength(200);
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.ToothArea).HasMaxLength(100);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Priority).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.EstimatedCost).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.TreatmentPlanSteps)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClinicService)
                .WithMany()
                .HasForeignKey(e => e.ClinicServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ResponsibleDoctor)
                .WithMany()
                .HasForeignKey(e => e.ResponsibleDoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.ClinicServiceId);
            entity.HasIndex(e => e.ResponsibleDoctorId);
            entity.HasIndex(e => new { e.PatientId, e.SequenceNumber });
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Priority);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<OrthoCase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CaseNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ApplianceType).HasMaxLength(200);
            entity.Property(e => e.CurrentStage).HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.TotalFee).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.OrthoCases)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Visits)
                .WithOne(v => v.OrthoCase)
                .HasForeignKey(v => v.OrthoCaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Stages)
                .WithOne(s => s.OrthoCase)
                .HasForeignKey(s => s.OrthoCaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.CaseNumber).IsUnique();
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<OrthoVisit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VisitType).HasMaxLength(200);
            entity.Property(e => e.CurrentStage).HasMaxLength(200);
            entity.Property(e => e.WireUpper).HasMaxLength(200);
            entity.Property(e => e.WireLower).HasMaxLength(200);
            entity.Property(e => e.ElasticsType).HasMaxLength(200);
            entity.Property(e => e.ClinicalNotes).HasMaxLength(3000);
            entity.Property(e => e.PatientInstructions).HasMaxLength(2000);

            entity.HasOne(e => e.OrthoCase)
                .WithMany(c => c.Visits)
                .HasForeignKey(e => e.OrthoCaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.OrthoCaseId);
            entity.HasIndex(e => e.VisitDate);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<TreatmentStage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StageName).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Status).IsRequired();

            entity.HasOne(e => e.OrthoCase)
                .WithMany(c => c.Stages)
                .HasForeignKey(e => e.OrthoCaseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.OrthoCaseId);
            entity.HasIndex(e => e.StageOrder);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<SurgeryCase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CaseNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SurgeryType).IsRequired().HasMaxLength(300);
            entity.Property(e => e.TeethInvolved).HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.SurgeryLocation).HasMaxLength(200);
            entity.Property(e => e.AnesthesiaType).HasMaxLength(200);
            entity.Property(e => e.PreopNotes).HasMaxLength(3000);
            entity.Property(e => e.OperativeNotes).HasMaxLength(3000);
            entity.Property(e => e.PostopInstructions).HasMaxLength(3000);
            entity.Property(e => e.Complications).HasMaxLength(2000);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.SurgeryCases)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.CaseNumber).IsUnique();
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.SurgeryDate);
            entity.HasIndex(e => e.IsActive);
        });

        // ─── Finance V3 Entities ─────────────────────────────────────────

        builder.Entity<Contract>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Specialty).HasMaxLength(200);
            entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
            entity.Property(e => e.DownPayment).HasPrecision(12, 2);
            entity.Property(e => e.InstallmentAmount).HasPrecision(12, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(12, 2);
            entity.Property(e => e.DiscountReason).HasMaxLength(500);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Contracts)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.StartDate);
        });

        builder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Subtotal).HasPrecision(12, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(12, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(12, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Invoices)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Visit)
                .WithMany()
                .HasForeignKey(e => e.VisitId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.LineItems)
                .WithOne(li => li.Invoice)
                .HasForeignKey(li => li.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.InvoiceNumber).IsUnique();
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.VisitId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<InvoiceLineItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ServiceNameSnapshot).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.UnitPrice).HasPrecision(12, 2);
            entity.Property(e => e.TotalPrice).HasPrecision(12, 2);
            entity.Property(e => e.LineDiscountAmount).HasPrecision(12, 2);
            entity.Property(e => e.ToothNumber).HasMaxLength(50);

            entity.HasOne(e => e.ClinicService)
                .WithMany()
                .HasForeignKey(e => e.ClinicServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.InvoiceId);
            entity.HasIndex(e => e.ClinicServiceId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.PaymentMethod).IsRequired();
            entity.Property(e => e.ServiceDescription).HasMaxLength(500);
            entity.Property(e => e.ReceivedBy).HasMaxLength(200);
            entity.Property(e => e.ReceiptNumber).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Contract)
                .WithMany()
                .HasForeignKey(e => e.ContractId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Payments)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Patient)
                .WithMany(p => p.Payments)
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.ContractId);
            entity.HasIndex(e => e.InvoiceId);
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.PaymentDate);
            entity.HasIndex(e => e.PaymentMethod);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<CashierSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SessionNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CashierId).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.OpeningBalance).HasPrecision(12, 2);
            entity.Property(e => e.ExpectedClosingCash).HasPrecision(12, 2);
            entity.Property(e => e.ActualClosingCash).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Cashier)
                .WithMany()
                .HasForeignKey(e => e.CashierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.SessionNumber).IsUnique();
            entity.HasIndex(e => e.CashierId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OpeningTime);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Treasury>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Balance).HasPrecision(12, 2);

            entity.HasMany(e => e.Transactions)
                .WithOne(t => t.Treasury)
                .HasForeignKey(t => t.TreasuryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<CashFlowTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TransactionNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Category).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.PaymentMethod).IsRequired();
            entity.Property(e => e.ReferenceNumber).HasMaxLength(50);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.PerformedBy).HasMaxLength(200);

            entity.HasOne(e => e.CashierSession)
                .WithMany()
                .HasForeignKey(e => e.CashierSessionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Treasury)
                .WithMany(t => t.Transactions)
                .HasForeignKey(e => e.TreasuryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.TransactionNumber).IsUnique();
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.TransactionDate);
            entity.HasIndex(e => e.CashierSessionId);
            entity.HasIndex(e => e.TreasuryId);
            entity.HasIndex(e => e.IsActive);
        });

        // ─── Sprint 15-20 Entities ──────────────────────────────────────────

        builder.Entity<LabOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).HasMaxLength(50);
            entity.Property(e => e.ApplianceType).HasMaxLength(200);
            entity.Property(e => e.LabName).HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Priority).IsRequired();
            entity.Property(e => e.Instructions).HasMaxLength(2000);
            entity.Property(e => e.Cost).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<InventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.Property(e => e.CostPerUnit).HasPrecision(12, 2);
            entity.Property(e => e.BatchNumber).HasMaxLength(100);

            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Position).HasMaxLength(200);
            entity.Property(e => e.BaseSalary).HasPrecision(12, 2);
            entity.Property(e => e.EmergencyContact).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Referral>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Status).IsRequired();

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FromDoctor)
                .WithMany()
                .HasForeignKey(e => e.FromDoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ToDoctor)
                .WithMany()
                .HasForeignKey(e => e.ToDoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.FromDoctorId);
            entity.HasIndex(e => e.ToDoctorId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Phone).HasMaxLength(20);

            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(256);
            entity.Property(e => e.UserId).IsRequired();

            entity.HasOne(e => e.User)
                .WithMany(u => u.PasswordResetTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt);
        });

        // ─── Sprint 21 Entities ──────────────────────────────────────────

        builder.Entity<JournalEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntryNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DocumentType).IsRequired();
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.PerformedBy).HasMaxLength(200);

            entity.HasOne(e => e.CashierSession)
                .WithMany()
                .HasForeignKey(e => e.CashierSessionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Treasury)
                .WithMany()
                .HasForeignKey(e => e.TreasuryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Lines)
                .WithOne(l => l.JournalEntry)
                .HasForeignKey(l => l.JournalEntryId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.EntryNumber).IsUnique();
            entity.HasIndex(e => e.DocumentType);
            entity.HasIndex(e => e.EntryDate);
            entity.HasIndex(e => e.BranchId);
            entity.HasIndex(e => e.CashierSessionId);
            entity.HasIndex(e => e.TreasuryId);
            entity.HasIndex(e => e.IsPosted);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<JournalLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AccountType).IsRequired();
            entity.Property(e => e.Debit).HasPrecision(12, 2);
            entity.Property(e => e.Credit).HasPrecision(12, 2);
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasIndex(e => e.JournalEntryId);
            entity.HasIndex(e => e.AccountType);
            entity.HasIndex(e => e.BranchId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<OperationalExpense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ExpenseNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Category).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.PaymentMethod).IsRequired();
            entity.Property(e => e.SupplierName).HasMaxLength(200);
            entity.Property(e => e.ReceiptAttachmentUrl).HasMaxLength(500);
            entity.Property(e => e.ApprovalStatus).IsRequired();
            entity.Property(e => e.ApprovedBy).HasMaxLength(200);
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.CashFlowTransaction)
                .WithMany()
                .HasForeignKey(e => e.CashFlowTransactionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.JournalEntry)
                .WithMany()
                .HasForeignKey(e => e.JournalEntryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CashierSession)
                .WithMany()
                .HasForeignKey(e => e.CashierSessionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Treasury)
                .WithMany()
                .HasForeignKey(e => e.TreasuryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LabOrder)
                .WithMany()
                .HasForeignKey(e => e.LabOrderId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.ExpenseNumber).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.ApprovalStatus);
            entity.HasIndex(e => e.CashierSessionId);
            entity.HasIndex(e => e.TreasuryId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<VaultTransfer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TransferNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.DepositSourceDescription).HasMaxLength(500);
            entity.Property(e => e.ApprovedBy).HasMaxLength(200);
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.SourceTreasury)
                .WithMany()
                .HasForeignKey(e => e.SourceTreasuryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DestinationTreasury)
                .WithMany()
                .HasForeignKey(e => e.DestinationTreasuryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CashierSession)
                .WithMany()
                .HasForeignKey(e => e.CashierSessionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CashFlowTransaction)
                .WithMany()
                .HasForeignKey(e => e.CashFlowTransactionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.JournalEntry)
                .WithMany()
                .HasForeignKey(e => e.JournalEntryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.TransferNumber).IsUnique();
            entity.HasIndex(e => e.SourceTreasuryId);
            entity.HasIndex(e => e.DestinationTreasuryId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CashierSessionId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(256);
            entity.Property(e => e.Action).IsRequired();
            entity.Property(e => e.Resource).IsRequired().HasMaxLength(200);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.Details).HasMaxLength(2000);
            entity.Property(e => e.NewData).HasColumnType("TEXT");
            entity.Property(e => e.OldData).HasColumnType("TEXT");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.Resource);
            entity.HasIndex(e => e.ResourceId);
            entity.HasIndex(e => e.Timestamp);
        });

        builder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ContactPerson).HasMaxLength(200);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Balance).HasPrecision(12, 2);

            entity.HasMany(e => e.PurchaseOrders)
                .WithOne(po => po.Supplier)
                .HasForeignKey(po => po.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Bills)
                .WithOne(b => b.Supplier)
                .HasForeignKey(b => b.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Subtotal).HasPrecision(12, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(12, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Supplier)
                .WithMany(s => s.PurchaseOrders)
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.LineItems)
                .WithOne(li => li.PurchaseOrder)
                .HasForeignKey(li => li.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<PurchaseOrderLineItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemName).IsRequired().HasMaxLength(300);
            entity.Property(e => e.UnitCost).HasPrecision(12, 2);
            entity.Property(e => e.TotalCost).HasPrecision(12, 2);

            entity.HasOne(e => e.InventoryItem)
                .WithMany()
                .HasForeignKey(e => e.InventoryItemId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PurchaseOrderId);
            entity.HasIndex(e => e.InventoryItemId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<SupplierBill>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BillNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
            entity.Property(e => e.PaidAmount).HasPrecision(12, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Supplier)
                .WithMany(s => s.Bills)
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Payments)
                .WithOne(p => p.Bill)
                .HasForeignKey(p => p.SupplierBillId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.BillNumber).IsUnique();
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<SupplierBillPayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.PaymentMethod).IsRequired();
            entity.Property(e => e.ReferenceNumber).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Bill)
                .WithMany(b => b.Payments)
                .HasForeignKey(e => e.SupplierBillId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Treasury)
                .WithMany()
                .HasForeignKey(e => e.TreasuryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.SupplierBillId);
            entity.HasIndex(e => e.TreasuryId);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<DoctorCommissionPayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalPrice).HasPrecision(12, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(12, 2);
            entity.Property(e => e.MaterialCost).HasPrecision(12, 2);
            entity.Property(e => e.LabCost).HasPrecision(12, 2);
            entity.Property(e => e.NetCommissionable).HasPrecision(12, 2);
            entity.Property(e => e.CommissionPercentage).HasPrecision(5, 2);
            entity.Property(e => e.CommissionAmount).HasPrecision(12, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.ApprovedBy).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.InvoiceLineItem)
                .WithMany()
                .HasForeignKey(e => e.InvoiceLineItemId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CashFlowTransaction)
                .WithMany()
                .HasForeignKey(e => e.CashFlowTransactionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.InvoiceLineItemId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<ClinicalPhoto>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.Category).IsRequired();
            entity.Property(e => e.PhotoType).HasMaxLength(100);
            entity.Property(e => e.Stage).HasMaxLength(100);
            entity.Property(e => e.Caption).HasMaxLength(500);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.OrthoCase)
                .WithMany()
                .HasForeignKey(e => e.OrthoCaseId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.OrthoCaseId);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Radiograph>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.XrayType).IsRequired();
            entity.Property(e => e.FileName).HasMaxLength(300);
            entity.Property(e => e.MimeType).HasMaxLength(100);
            entity.Property(e => e.ToothRelated).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Doctor)
                .WithMany()
                .HasForeignKey(e => e.DoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DoctorId);
            entity.HasIndex(e => e.XrayType);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<PatientDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
            entity.Property(e => e.DocumentType).IsRequired();
            entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.FileName).HasMaxLength(300);
            entity.Property(e => e.MimeType).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Patient)
                .WithMany()
                .HasForeignKey(e => e.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PatientId);
            entity.HasIndex(e => e.DocumentType);
            entity.HasIndex(e => e.IsActive);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Link).HasMaxLength(500);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsRead);
            entity.HasIndex(e => e.CreatedAt);
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
