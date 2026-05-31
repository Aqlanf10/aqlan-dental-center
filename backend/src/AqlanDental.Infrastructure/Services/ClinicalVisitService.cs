using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicalVisitService : IClinicalVisitService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] StatusDisplay = { "مفتوحة", "قيد المعالجة", "مكتملة", "ملغية" };

    private static readonly HashSet<DailyVisitStatus> AllowedStatusesForStart = new()
    { DailyVisitStatus.InProgress, DailyVisitStatus.ReadyForDoctor };

    private static readonly HashSet<ClinicalVisitStatus> EditableStatuses = new()
    { ClinicalVisitStatus.Open, ClinicalVisitStatus.InProgress };

    private static readonly HashSet<QueueStatus> TerminalQueueStatuses = new()
    { QueueStatus.Completed, QueueStatus.Cancelled, QueueStatus.NoShow };

    public ClinicalVisitService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<TodayClinicalVisitsDto> GetTodayClinicalVisitsAsync(DateOnly? date)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var visits = await _context.ClinicalVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Prescriptions.Where(p => p.IsActive))
            .Where(v => v.VisitDate == targetDate && v.IsActive)
            .OrderByDescending(v => v.StartedAt)
            .ToListAsync();

        return new TodayClinicalVisitsDto(
            targetDate,
            visits.Count,
            visits.Count(v => v.Status == ClinicalVisitStatus.Open),
            visits.Count(v => v.Status == ClinicalVisitStatus.InProgress),
            visits.Count(v => v.Status == ClinicalVisitStatus.Completed),
            visits.Count(v => v.Status == ClinicalVisitStatus.Cancelled),
            visits.Select(MapToDto).ToList()
        );
    }

    public async Task<ClinicalVisitDto?> GetClinicalVisitByIdAsync(Guid id)
    {
        var visit = await _context.ClinicalVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Prescriptions.Where(p => p.IsActive))
            .FirstOrDefaultAsync(v => v.Id == id && v.IsActive);

        return visit is null ? null : MapToDto(visit);
    }

    public async Task<ClinicalVisitDto?> GetClinicalVisitByDailyVisitIdAsync(Guid dailyVisitId)
    {
        var visit = await _context.ClinicalVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Prescriptions.Where(p => p.IsActive))
            .FirstOrDefaultAsync(v => v.DailyVisitId == dailyVisitId && v.IsActive &&
                                      v.Status != ClinicalVisitStatus.Cancelled);

        return visit is null ? null : MapToDto(visit);
    }

    public async Task<ClinicalVisitDto> StartClinicalVisitAsync(
        Guid dailyVisitId, StartClinicalVisitRequest request, string userId)
    {
        var dailyVisit = await _context.DailyVisits
            .FirstOrDefaultAsync(v => v.Id == dailyVisitId && v.IsActive);

        if (dailyVisit is null)
            throw new DomainException("VISIT_NOT_FOUND", "الزيارة غير موجودة");

        if (!AllowedStatusesForStart.Contains(dailyVisit.Status))
            throw new DomainException("VISIT_STATUS_NOT_ALLOWED_FOR_CLINICAL",
                "لا يمكن بدء الزيارة السريرية إلا عندما يكون المريض في حالة المعالجة أو جاهز للطبيب");

        if (!dailyVisit.DoctorId.HasValue)
            throw new DomainException("VISIT_NO_DOCTOR", "الزيارة لا تحتوي على طبيب معين");

        // Check for existing active clinical visit
        var existingVisit = await _context.ClinicalVisits
            .AnyAsync(v => v.DailyVisitId == dailyVisitId && v.IsActive &&
                           v.Status != ClinicalVisitStatus.Cancelled);

        if (existingVisit)
            throw new DomainException("CLINICAL_VISIT_ALREADY_EXISTS", "يوجد زيارة سريرية نشطة لهذه الزيارة بالفعل");

        // Find linked queue item
        var queueItem = await _context.ClinicQueueItems
            .FirstOrDefaultAsync(q => q.DailyVisitId == dailyVisitId && q.IsActive &&
                                      !TerminalQueueStatuses.Contains(q.Status));

        Guid? queueItemId = queueItem?.Id;

        var clinicalVisit = new ClinicalVisit
        {
            Id = Guid.NewGuid(),
            DailyVisitId = dailyVisitId,
            ClinicQueueItemId = queueItemId,
            PatientId = dailyVisit.PatientId,
            DoctorId = dailyVisit.DoctorId.Value,
            VisitDate = dailyVisit.VisitDate,
            StartedAt = DateTime.UtcNow,
            Status = ClinicalVisitStatus.InProgress,
            ChiefComplaint = request.ChiefComplaint ?? dailyVisit.ChiefComplaint,
            NextVisitRecommended = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ClinicalVisits.Add(clinicalVisit);

        // Update DailyVisit status to InProgress
        dailyVisit.Status = DailyVisitStatus.InProgress;
        dailyVisit.UpdatedAt = DateTime.UtcNow;
        dailyVisit.UpdatedBy = userId;

        // Update QueueItem status to InProgress if linked
        if (queueItem is not null && queueItem.Status != QueueStatus.InProgress)
        {
            queueItem.Status = QueueStatus.InProgress;
            queueItem.UpdatedAt = DateTime.UtcNow;
            queueItem.UpdatedBy = userId;
        }

        await _context.SaveChangesAsync();

        return (await GetClinicalVisitByIdAsync(clinicalVisit.Id))!;
    }

    public async Task<ClinicalVisitDto?> UpdateClinicalVisitAsync(
        Guid clinicalVisitId, UpdateClinicalVisitRequest request, string userId)
    {
        var visit = await _context.ClinicalVisits.FindAsync(clinicalVisitId);
        if (visit is null || !visit.IsActive) return null;

        if (!EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن تعديل زيارة سريرية مكتملة أو ملغية");

        if (request.ChiefComplaint is not null)
            visit.ChiefComplaint = request.ChiefComplaint;
        if (request.ClinicalFindings is not null)
            visit.ClinicalFindings = request.ClinicalFindings;
        if (request.Diagnosis is not null)
            visit.Diagnosis = request.Diagnosis;
        if (request.TreatmentNotes is not null)
            visit.TreatmentNotes = request.TreatmentNotes;
        if (request.DoctorRecommendations is not null)
            visit.DoctorRecommendations = request.DoctorRecommendations;
        if (request.NextVisitRecommended.HasValue)
            visit.NextVisitRecommended = request.NextVisitRecommended.Value;
        if (request.NextVisitDate.HasValue)
            visit.NextVisitDate = request.NextVisitDate;

        visit.UpdatedAt = DateTime.UtcNow;
        visit.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetClinicalVisitByIdAsync(clinicalVisitId);
    }

    public async Task<ClinicalVisitDto?> CompleteClinicalVisitAsync(
        Guid clinicalVisitId, CompleteClinicalVisitRequest request, string userId)
    {
        var visit = await _context.ClinicalVisits.FindAsync(clinicalVisitId);
        if (visit is null || !visit.IsActive) return null;

        if (!EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_CANNOT_COMPLETE",
                "لا يمكن إكمال زيارة سريرية مكتملة أو ملغية");

        visit.Status = ClinicalVisitStatus.Completed;
        visit.CompletedAt = DateTime.UtcNow;

        if (request.Diagnosis is not null)
            visit.Diagnosis = request.Diagnosis;
        if (request.TreatmentNotes is not null)
            visit.TreatmentNotes = request.TreatmentNotes;
        if (request.DoctorRecommendations is not null)
            visit.DoctorRecommendations = request.DoctorRecommendations;
        if (request.NextVisitRecommended.HasValue)
            visit.NextVisitRecommended = request.NextVisitRecommended.Value;
        if (request.NextVisitDate.HasValue)
            visit.NextVisitDate = request.NextVisitDate;

        visit.UpdatedAt = DateTime.UtcNow;
        visit.UpdatedBy = userId;

        // Update DailyVisit status to Completed
        var dailyVisit = await _context.DailyVisits.FindAsync(visit.DailyVisitId);
        if (dailyVisit is not null)
        {
            dailyVisit.Status = DailyVisitStatus.Completed;
            dailyVisit.UpdatedAt = DateTime.UtcNow;
            dailyVisit.UpdatedBy = userId;
        }

        // Update QueueItem and release room if linked
        if (visit.ClinicQueueItemId.HasValue)
        {
            var queueItem = await _context.ClinicQueueItems
                .Include(q => q.Room)
                .FirstOrDefaultAsync(q => q.Id == visit.ClinicQueueItemId.Value);

            if (queueItem is not null)
            {
                queueItem.Status = QueueStatus.Completed;
                queueItem.CompletedAt = DateTime.UtcNow;
                queueItem.UpdatedAt = DateTime.UtcNow;
                queueItem.UpdatedBy = userId;

                // Release room
                if (queueItem.RoomId.HasValue)
                {
                    var room = await _context.ClinicRooms.FindAsync(queueItem.RoomId.Value);
                    if (room is not null && room.CurrentDailyVisitId == visit.DailyVisitId)
                    {
                        room.IsOccupied = false;
                        room.CurrentDailyVisitId = null;
                        room.UpdatedAt = DateTime.UtcNow;
                        room.UpdatedBy = userId;
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        return await GetClinicalVisitByIdAsync(clinicalVisitId);
    }

    public async Task<ClinicalVisitDto?> CancelClinicalVisitAsync(Guid clinicalVisitId, string userId)
    {
        var visit = await _context.ClinicalVisits.FindAsync(clinicalVisitId);
        if (visit is null || !visit.IsActive) return null;

        if (!EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_CANNOT_CANCEL",
                "لا يمكن إلغاء زيارة سريرية مكتملة أو ملغية");

        visit.Status = ClinicalVisitStatus.Cancelled;
        visit.UpdatedAt = DateTime.UtcNow;
        visit.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetClinicalVisitByIdAsync(clinicalVisitId);
    }

    public async Task<PrescriptionDto> AddPrescriptionAsync(
        Guid clinicalVisitId, AddPrescriptionRequest request, string userId)
    {
        var visit = await _context.ClinicalVisits.FindAsync(clinicalVisitId);
        if (visit is null || !visit.IsActive)
            throw new DomainException("CLINICAL_VISIT_NOT_FOUND", "الزيارة السريرية غير موجودة");

        if (!EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن إضافة وصفة طبية لزيارة سريرية مكتملة أو ملغية");

        if (string.IsNullOrWhiteSpace(request.MedicationName))
            throw new DomainException("MEDICATION_NAME_REQUIRED", "اسم الدواء مطلوب");

        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            ClinicalVisitId = clinicalVisitId,
            PatientId = visit.PatientId,
            DoctorId = visit.DoctorId,
            MedicationName = request.MedicationName.Trim(),
            Dosage = request.Dosage?.Trim(),
            Frequency = request.Frequency?.Trim(),
            Duration = request.Duration?.Trim(),
            Instructions = request.Instructions?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Prescriptions.Add(prescription);
        await _context.SaveChangesAsync();

        return MapPrescriptionToDto(prescription);
    }

    public async Task<PrescriptionDto?> UpdatePrescriptionAsync(
        Guid prescriptionId, UpdatePrescriptionRequest request, string userId)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription is null || !prescription.IsActive) return null;

        // Check parent visit is editable
        var visit = await _context.ClinicalVisits.FindAsync(prescription.ClinicalVisitId);
        if (visit is not null && !EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن تعديل وصفة طبية لزيارة سريرية مكتملة أو ملغية");

        if (string.IsNullOrWhiteSpace(request.MedicationName))
            throw new DomainException("MEDICATION_NAME_REQUIRED", "اسم الدواء مطلوب");

        prescription.MedicationName = request.MedicationName.Trim();
        prescription.Dosage = request.Dosage?.Trim();
        prescription.Frequency = request.Frequency?.Trim();
        prescription.Duration = request.Duration?.Trim();
        prescription.Instructions = request.Instructions?.Trim();
        prescription.UpdatedAt = DateTime.UtcNow;
        prescription.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return MapPrescriptionToDto(prescription);
    }

    public async Task<bool> DeletePrescriptionAsync(Guid prescriptionId, string userId)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription is null || !prescription.IsActive) return false;

        // Check parent visit is editable
        var visit = await _context.ClinicalVisits.FindAsync(prescription.ClinicalVisitId);
        if (visit is not null && !EditableStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن حذف وصفة طبية لزيارة سريرية مكتملة أو ملغية");

        prescription.IsActive = false;
        prescription.UpdatedAt = DateTime.UtcNow;
        prescription.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return true;
    }

    private static ClinicalVisitDto MapToDto(ClinicalVisit v) => new(
        v.Id,
        v.DailyVisitId,
        v.ClinicQueueItemId,
        v.PatientId,
        v.Patient?.FullName ?? string.Empty,
        v.Patient?.PatientNumber,
        v.DoctorId,
        v.Doctor?.FullName,
        v.VisitDate,
        v.StartedAt,
        v.CompletedAt,
        (int)v.Status,
        GetStatusDisplay((int)v.Status),
        v.ChiefComplaint,
        v.ClinicalFindings,
        v.Diagnosis,
        v.TreatmentNotes,
        v.DoctorRecommendations,
        v.NextVisitRecommended,
        v.NextVisitDate,
        v.Prescriptions.Where(p => p.IsActive).Select(MapPrescriptionToDto).ToList(),
        v.CreatedAt,
        v.UpdatedAt
    );

    private static PrescriptionDto MapPrescriptionToDto(Prescription p) => new(
        p.Id,
        p.ClinicalVisitId,
        p.PatientId,
        p.DoctorId,
        p.MedicationName,
        p.Dosage,
        p.Frequency,
        p.Duration,
        p.Instructions,
        p.CreatedAt,
        p.UpdatedAt
    );

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < StatusDisplay.Length ? StatusDisplay[status] : status.ToString();
}
