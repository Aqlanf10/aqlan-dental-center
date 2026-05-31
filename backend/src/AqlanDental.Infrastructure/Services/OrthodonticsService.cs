using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class OrthodonticsService : IOrthodonticsService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] OrthoCaseStatusDisplay = {
        "نشط", "مكتمل", "معلق", "ملغي"
    };

    private static readonly string[] StageStatusDisplay = {
        "قيد الانتظار", "جارٍ", "مكتمل"
    };

    public OrthodonticsService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── OrthoCase CRUD ──────────────────────────────────────────────

    public async Task<PagedResult<OrthoCaseListItemDto>> GetOrthoCasesAsync(
        Guid? patientId, int? status, int page, int pageSize)
    {
        var query = _context.OrthoCases
            .Include(c => c.Patient)
            .Include(c => c.Doctor)
            .Where(c => c.IsActive);

        if (patientId.HasValue)
            query = query.Where(c => c.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(OrthoCaseStatus), status.Value))
                throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");
            query = query.Where(c => c.Status == (OrthoCaseStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapCaseToListItemDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<OrthoCaseListItemDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<OrthoCaseDto?> GetOrthoCaseByIdAsync(Guid id)
    {
        var orthoCase = await _context.OrthoCases
            .Include(c => c.Patient)
            .Include(c => c.Doctor)
            .Include(c => c.Visits.Where(v => v.IsActive))
            .Include(c => c.Stages.Where(s => s.IsActive))
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        return orthoCase is null ? null : MapCaseToDto(orthoCase);
    }

    public async Task<OrthoCaseDto> CreateOrthoCaseAsync(
        CreateOrthoCaseRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        if (!Enum.IsDefined(typeof(OrthoCaseStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");

        // Auto-generate case number
        var caseNumber = await GenerateOrthoCaseNumberAsync();

        var orthoCase = new OrthoCase
        {
            Id = Guid.NewGuid(),
            CaseNumber = caseNumber,
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            ApplianceType = request.ApplianceType?.Trim(),
            StartDate = request.StartDate,
            ExpectedDurationMonths = request.ExpectedDurationMonths,
            CurrentStage = request.CurrentStage?.Trim(),
            StagePercentage = request.StagePercentage,
            Status = (OrthoCaseStatus)request.Status,
            TotalFee = request.TotalFee,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.OrthoCases.Add(orthoCase);
        await _context.SaveChangesAsync();

        return (await GetOrthoCaseByIdAsync(orthoCase.Id))!;
    }

    public async Task<OrthoCaseDto?> UpdateOrthoCaseAsync(
        Guid id, UpdateOrthoCaseRequest request, string userId)
    {
        var orthoCase = await _context.OrthoCases.FindAsync(id);
        if (orthoCase is null || !orthoCase.IsActive) return null;

        if (orthoCase.Status == OrthoCaseStatus.Cancelled)
            throw new DomainException("ORTHO_CASE_NOT_EDITABLE", "لا يمكن تعديل حالة تقويم ملغاة");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
            orthoCase.DoctorId = request.DoctorId.Value;
        }

        if (request.ApplianceType is not null)
            orthoCase.ApplianceType = request.ApplianceType.Trim();
        if (request.StartDate.HasValue)
            orthoCase.StartDate = request.StartDate.Value;
        if (request.ExpectedDurationMonths.HasValue)
            orthoCase.ExpectedDurationMonths = request.ExpectedDurationMonths.Value;
        if (request.CurrentStage is not null)
            orthoCase.CurrentStage = request.CurrentStage.Trim();
        if (request.StagePercentage.HasValue)
        {
            if (request.StagePercentage.Value < 0 || request.StagePercentage.Value > 100)
                throw new DomainException("INVALID_PERCENTAGE", "النسبة المئوية يجب أن تكون بين 0 و 100");
            orthoCase.StagePercentage = request.StagePercentage.Value;
        }
        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(OrthoCaseStatus), request.Status.Value))
                throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");
            ValidateOrthoCaseStatusTransition(orthoCase.Status, (OrthoCaseStatus)request.Status.Value);
            orthoCase.Status = (OrthoCaseStatus)request.Status.Value;
        }
        if (request.TotalFee.HasValue)
            orthoCase.TotalFee = request.TotalFee.Value;
        if (request.Notes is not null)
            orthoCase.Notes = request.Notes.Trim();

        orthoCase.UpdatedAt = DateTime.UtcNow;
        orthoCase.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetOrthoCaseByIdAsync(id);
    }

    // ─── OrthoVisit ──────────────────────────────────────────────────

    public async Task<OrthoVisitDto> AddOrthoVisitAsync(
        Guid caseId, AddOrthoVisitRequest request, string userId)
    {
        var orthoCase = await _context.OrthoCases
            .Include(c => c.Visits)
            .FirstOrDefaultAsync(c => c.Id == caseId && c.IsActive);

        if (orthoCase is null)
            throw new DomainException("ORTHO_CASE_NOT_FOUND", "حالة التقويم غير موجودة");

        if (orthoCase.Status == OrthoCaseStatus.Cancelled)
            throw new DomainException("ORTHO_CASE_NOT_EDITABLE", "لا يمكن إضافة زيارة لحالة تقويم ملغاة");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        // Auto-assign visit number
        int visitNumber = request.VisitNumber ?? 0;
        if (visitNumber <= 0)
        {
            var maxVisit = orthoCase.Visits.Any()
                ? orthoCase.Visits.Max(v => v.VisitNumber)
                : 0;
            visitNumber = maxVisit + 1;
        }

        var visit = new OrthoVisit
        {
            Id = Guid.NewGuid(),
            OrthoCaseId = caseId,
            VisitNumber = visitNumber,
            VisitDate = request.VisitDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            VisitType = request.VisitType?.Trim(),
            CurrentStage = request.CurrentStage?.Trim(),
            WireUpper = request.WireUpper?.Trim(),
            WireLower = request.WireLower?.Trim(),
            ElasticsType = request.ElasticsType?.Trim(),
            ClinicalNotes = request.ClinicalNotes?.Trim(),
            PatientInstructions = request.PatientInstructions?.Trim(),
            NextAppointmentDate = request.NextAppointmentDate,
            DoctorId = request.DoctorId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.OrthoVisits.Add(visit);

        // Update current stage on the case if provided
        if (!string.IsNullOrWhiteSpace(request.CurrentStage))
        {
            orthoCase.CurrentStage = request.CurrentStage.Trim();
            orthoCase.UpdatedAt = DateTime.UtcNow;
            orthoCase.UpdatedBy = userId;
        }

        await _context.SaveChangesAsync();

        // Re-fetch with includes
        var created = await _context.OrthoVisits
            .Include(v => v.Doctor)
            .FirstAsync(v => v.Id == visit.Id);

        return MapVisitToDto(created);
    }

    // ─── TreatmentStage ──────────────────────────────────────────────

    public async Task<TreatmentStageDto?> UpdateTreatmentStageAsync(
        Guid stageId, UpdateTreatmentStageRequest request, string userId)
    {
        var stage = await _context.TreatmentStages.FindAsync(stageId);
        if (stage is null || !stage.IsActive) return null;

        if (stage.Status == StageStatus.Completed)
            throw new DomainException("STAGE_NOT_EDITABLE", "لا يمكن تعديل مرحلة مكتملة");

        if (request.StageName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.StageName))
                throw new DomainException("STAGE_NAME_REQUIRED", "اسم المرحلة لا يمكن أن يكون فارغاً");
            stage.StageName = request.StageName.Trim();
        }

        if (request.StageOrder.HasValue)
            stage.StageOrder = request.StageOrder.Value;

        if (request.StartedAt.HasValue)
            stage.StartedAt = request.StartedAt.Value;

        if (request.CompletedAt.HasValue)
            stage.CompletedAt = request.CompletedAt.Value;

        if (request.TargetDurationMonths.HasValue)
            stage.TargetDurationMonths = request.TargetDurationMonths.Value;

        if (request.Notes is not null)
            stage.Notes = request.Notes.Trim();

        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(StageStatus), request.Status.Value))
                throw new DomainException("INVALID_STAGE_STATUS", "حالة المرحلة غير صالحة");

            var newStatus = (StageStatus)request.Status.Value;
            ValidateStageStatusTransition(stage.Status, newStatus);
            stage.Status = newStatus;

            if (newStatus == StageStatus.InProgress && stage.StartedAt is null)
                stage.StartedAt = DateTime.UtcNow;

            if (newStatus == StageStatus.Completed)
                stage.CompletedAt = DateTime.UtcNow;
        }

        stage.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapStageToDto(stage);
    }

    // ─── Private helpers ─────────────────────────────────────────────

    private async Task<string> GenerateOrthoCaseNumberAsync()
    {
        var lastCase = await _context.OrthoCases
            .OrderByDescending(c => c.CaseNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastCase is not null && lastCase.CaseNumber.StartsWith("ORT-"))
        {
            if (int.TryParse(lastCase.CaseNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"ORT-{nextNumber:D4}";
    }

    private static void ValidateOrthoCaseStatusTransition(OrthoCaseStatus current, OrthoCaseStatus target)
    {
        if (current == OrthoCaseStatus.Cancelled)
            throw new DomainException("ORTHO_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة حالة تقويم ملغاة");

        if (current == OrthoCaseStatus.Completed && target != OrthoCaseStatus.Cancelled)
            throw new DomainException("ORTHO_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة حالة تقويم مكتملة");

        if (current == OrthoCaseStatus.Active &&
            target is not (OrthoCaseStatus.Completed or OrthoCaseStatus.OnHold or OrthoCaseStatus.Cancelled))
            throw new DomainException("ORTHO_STATUS_TRANSITION_INVALID",
                "الانتقال من 'نشط' غير مسموح بهذه الحالة");

        if (current == OrthoCaseStatus.OnHold &&
            target is not (OrthoCaseStatus.Active or OrthoCaseStatus.Cancelled))
            throw new DomainException("ORTHO_STATUS_TRANSITION_INVALID",
                "الانتقال من 'معلق' مسموح فقط إلى 'نشط' أو 'ملغي'");
    }

    private static void ValidateStageStatusTransition(StageStatus current, StageStatus target)
    {
        if (current == StageStatus.Completed)
            throw new DomainException("STAGE_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة مرحلة مكتملة");

        if (current == StageStatus.Pending &&
            target is not (StageStatus.InProgress or StageStatus.Completed))
            throw new DomainException("STAGE_STATUS_TRANSITION_INVALID",
                "الانتقال من 'قيد الانتظار' مسموح فقط إلى 'جارٍ' أو 'مكتمل'");

        if (current == StageStatus.InProgress && target != StageStatus.Completed)
            throw new DomainException("STAGE_STATUS_TRANSITION_INVALID",
                "الانتقال من 'جارٍ' مسموح فقط إلى 'مكتمل'");
    }

    // ─── Mapping methods ─────────────────────────────────────────────

    private static OrthoCaseDto MapCaseToDto(OrthoCase c) => new(
        c.Id,
        c.CaseNumber,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.DoctorId,
        c.Doctor?.FullName,
        c.ApplianceType,
        c.StartDate,
        c.ExpectedDurationMonths,
        c.CurrentStage,
        c.StagePercentage,
        (int)c.Status,
        GetOrthoStatusDisplay((int)c.Status),
        c.TotalFee,
        c.Notes,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt,
        c.Visits?.Where(v => v.IsActive).Select(MapVisitToDto).ToList(),
        c.Stages?.Where(s => s.IsActive).OrderBy(s => s.StageOrder).Select(MapStageToDto).ToList()
    );

    private static OrthoCaseListItemDto MapCaseToListItemDto(OrthoCase c) => new(
        c.Id,
        c.CaseNumber,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.DoctorId,
        c.Doctor?.FullName,
        c.ApplianceType,
        c.StartDate,
        c.StagePercentage,
        (int)c.Status,
        GetOrthoStatusDisplay((int)c.Status),
        c.TotalFee,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    );

    private static OrthoVisitDto MapVisitToDto(OrthoVisit v) => new(
        v.Id,
        v.OrthoCaseId,
        v.VisitNumber,
        v.VisitDate,
        v.VisitType,
        v.CurrentStage,
        v.WireUpper,
        v.WireLower,
        v.ElasticsType,
        v.ClinicalNotes,
        v.PatientInstructions,
        v.NextAppointmentDate,
        v.DoctorId,
        v.Doctor?.FullName,
        v.IsActive,
        v.CreatedAt,
        v.UpdatedAt
    );

    private static TreatmentStageDto MapStageToDto(TreatmentStage s) => new(
        s.Id,
        s.OrthoCaseId,
        s.StageName,
        s.StageOrder,
        s.StartedAt,
        s.CompletedAt,
        s.TargetDurationMonths,
        s.Notes,
        (int)s.Status,
        GetStageStatusDisplay((int)s.Status),
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static string GetOrthoStatusDisplay(int status) =>
        status >= 0 && status < OrthoCaseStatusDisplay.Length
            ? OrthoCaseStatusDisplay[status]
            : status.ToString();

    private static string GetStageStatusDisplay(int status) =>
        status >= 0 && status < StageStatusDisplay.Length
            ? StageStatusDisplay[status]
            : status.ToString();
}
