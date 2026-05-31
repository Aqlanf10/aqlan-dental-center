using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicalProcedureService : IClinicalProcedureService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] ProcedureTypeDisplay = {
        "استشارة", "حشوة", "خلع", "تنظيف", "علاج عصب", "تلبيسة", "تعويضات"
    };

    private static readonly string[] StatusDisplay = { "مخطط", "قيد التنفيذ", "مكتمل", "ملغي" };

    private static readonly HashSet<ClinicalVisitStatus> EditableVisitStatuses = new()
    { ClinicalVisitStatus.Open, ClinicalVisitStatus.InProgress };

    private static readonly HashSet<ClinicalProcedureStatus> EditableProcedureStatuses = new()
    { ClinicalProcedureStatus.Planned, ClinicalProcedureStatus.InProgress };

    public ClinicalProcedureService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClinicalProcedureDto>> GetProceduresByClinicalVisitAsync(Guid clinicalVisitId)
    {
        var procedures = await _context.ClinicalProcedures
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Where(p => p.ClinicalVisitId == clinicalVisitId && p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return procedures.Select(MapToDto).ToList();
    }

    public async Task<ClinicalProcedureDto?> GetProcedureByIdAsync(Guid id)
    {
        var procedure = await _context.ClinicalProcedures
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

        return procedure is null ? null : MapToDto(procedure);
    }

    public async Task<ClinicalProcedureDto> CreateProcedureAsync(
        Guid clinicalVisitId, CreateClinicalProcedureRequest request, string userId)
    {
        var visit = await _context.ClinicalVisits.FindAsync(clinicalVisitId);
        if (visit is null || !visit.IsActive)
            throw new DomainException("CLINICAL_VISIT_NOT_FOUND", "الزيارة السريرية غير موجودة");

        if (!EditableVisitStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن إضافة إجراء لزيارة سريرية مكتملة أو ملغية");

        if (!Enum.IsDefined(typeof(ClinicalProcedureType), request.ProcedureType))
            throw new DomainException("INVALID_PROCEDURE_TYPE", "نوع الإجراء غير صالح");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new DomainException("PROCEDURE_TITLE_REQUIRED", "عنوان الإجراء مطلوب");

        var status = ClinicalProcedureStatus.Planned;
        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(ClinicalProcedureStatus), request.Status.Value))
                throw new DomainException("INVALID_PROCEDURE_STATUS", "حالة الإجراء غير صالحة");
            status = (ClinicalProcedureStatus)request.Status.Value;
        }

        var procedure = new ClinicalProcedure
        {
            Id = Guid.NewGuid(),
            ClinicalVisitId = clinicalVisitId,
            PatientId = visit.PatientId,
            DoctorId = visit.DoctorId,
            ProcedureType = (ClinicalProcedureType)request.ProcedureType,
            ToothNumber = request.ToothNumber?.Trim(),
            ToothSurface = request.ToothSurface?.Trim(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            ClinicalNotes = request.ClinicalNotes?.Trim(),
            Status = status,
            StartedAt = status == ClinicalProcedureStatus.InProgress ? DateTime.UtcNow : null,
            CompletedAt = status == ClinicalProcedureStatus.Completed ? DateTime.UtcNow : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ClinicalProcedures.Add(procedure);
        await _context.SaveChangesAsync();

        return (await GetProcedureByIdAsync(procedure.Id))!;
    }

    public async Task<ClinicalProcedureDto?> UpdateProcedureAsync(
        Guid procedureId, UpdateClinicalProcedureRequest request, string userId)
    {
        var procedure = await _context.ClinicalProcedures.FindAsync(procedureId);
        if (procedure is null || !procedure.IsActive) return null;

        if (!EditableProcedureStatuses.Contains(procedure.Status))
            throw new DomainException("PROCEDURE_NOT_EDITABLE",
                "لا يمكن تعديل إجراء مكتمل أو ملغي");

        var visit = await _context.ClinicalVisits.FindAsync(procedure.ClinicalVisitId);
        if (visit is not null && !EditableVisitStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن تعديل إجراء لزيارة سريرية مكتملة أو ملغية");

        if (request.ProcedureType.HasValue)
        {
            if (!Enum.IsDefined(typeof(ClinicalProcedureType), request.ProcedureType.Value))
                throw new DomainException("INVALID_PROCEDURE_TYPE", "نوع الإجراء غير صالح");
            procedure.ProcedureType = (ClinicalProcedureType)request.ProcedureType.Value;
        }

        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new DomainException("PROCEDURE_TITLE_REQUIRED", "عنوان الإجراء لا يمكن أن يكون فارغاً");
            procedure.Title = request.Title.Trim();
        }

        if (request.ToothNumber is not null) procedure.ToothNumber = request.ToothNumber.Trim();
        if (request.ToothSurface is not null) procedure.ToothSurface = request.ToothSurface.Trim();
        if (request.Description is not null) procedure.Description = request.Description.Trim();
        if (request.ClinicalNotes is not null) procedure.ClinicalNotes = request.ClinicalNotes.Trim();

        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(ClinicalProcedureStatus), request.Status.Value))
                throw new DomainException("INVALID_PROCEDURE_STATUS", "حالة الإجراء غير صالحة");
            ValidateStatusTransition(procedure.Status, (ClinicalProcedureStatus)request.Status.Value);
            procedure.Status = (ClinicalProcedureStatus)request.Status.Value;
            if (procedure.Status == ClinicalProcedureStatus.InProgress && !procedure.StartedAt.HasValue)
                procedure.StartedAt = DateTime.UtcNow;
            if (procedure.Status == ClinicalProcedureStatus.Completed && !procedure.CompletedAt.HasValue)
                procedure.CompletedAt = DateTime.UtcNow;
        }

        procedure.UpdatedAt = DateTime.UtcNow;
        procedure.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetProcedureByIdAsync(procedureId);
    }

    public async Task<ClinicalProcedureDto?> UpdateProcedureStatusAsync(
        Guid procedureId, UpdateClinicalProcedureStatusRequest request, string userId)
    {
        var procedure = await _context.ClinicalProcedures.FindAsync(procedureId);
        if (procedure is null || !procedure.IsActive) return null;

        var visit = await _context.ClinicalVisits.FindAsync(procedure.ClinicalVisitId);
        if (visit is null || !visit.IsActive)
            throw new DomainException("CLINICAL_VISIT_NOT_FOUND", "الزيارة السريرية غير موجودة");

        if (!EditableVisitStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن تغيير حالة إجراء تابع لزيارة سريرية مكتملة أو ملغية");

        if (!Enum.IsDefined(typeof(ClinicalProcedureStatus), request.Status))
            throw new DomainException("INVALID_PROCEDURE_STATUS", "حالة الإجراء غير صالحة");

        var newStatus = (ClinicalProcedureStatus)request.Status;
        ValidateStatusTransition(procedure.Status, newStatus);

        procedure.Status = newStatus;
        if (newStatus == ClinicalProcedureStatus.InProgress && !procedure.StartedAt.HasValue)
            procedure.StartedAt = DateTime.UtcNow;
        if (newStatus == ClinicalProcedureStatus.Completed && !procedure.CompletedAt.HasValue)
            procedure.CompletedAt = DateTime.UtcNow;

        procedure.UpdatedAt = DateTime.UtcNow;
        procedure.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetProcedureByIdAsync(procedureId);
    }

    public async Task<bool> DeleteProcedureAsync(Guid procedureId, string userId)
    {
        var procedure = await _context.ClinicalProcedures.FindAsync(procedureId);
        if (procedure is null || !procedure.IsActive) return false;

        var visit = await _context.ClinicalVisits.FindAsync(procedure.ClinicalVisitId);
        if (visit is not null && !EditableVisitStatuses.Contains(visit.Status))
            throw new DomainException("CLINICAL_VISIT_NOT_EDITABLE",
                "لا يمكن حذف إجراء لزيارة سريرية مكتملة أو ملغية");

        procedure.IsActive = false;
        procedure.UpdatedAt = DateTime.UtcNow;
        procedure.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateStatusTransition(ClinicalProcedureStatus current, ClinicalProcedureStatus target)
    {
        var blocked = current is ClinicalProcedureStatus.Completed or ClinicalProcedureStatus.Cancelled;
        if (blocked)
            throw new DomainException("PROCEDURE_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة إجراء مكتمل أو ملغي");

        if (current == ClinicalProcedureStatus.Planned &&
            target is not (ClinicalProcedureStatus.InProgress or ClinicalProcedureStatus.Completed or ClinicalProcedureStatus.Cancelled))
            throw new DomainException("PROCEDURE_STATUS_TRANSITION_INVALID",
                "الانتقال من 'مخطط' مسموح فقط إلى 'قيد التنفيذ' أو 'مكتمل' أو 'ملغي'");

        if (current == ClinicalProcedureStatus.InProgress &&
            target is not (ClinicalProcedureStatus.Completed or ClinicalProcedureStatus.Cancelled))
            throw new DomainException("PROCEDURE_STATUS_TRANSITION_INVALID",
                "الانتقال من 'قيد التنفيذ' مسموح فقط إلى 'مكتمل' أو 'ملغي'");
    }

    private static ClinicalProcedureDto MapToDto(ClinicalProcedure p) => new(
        p.Id,
        p.ClinicalVisitId,
        p.PatientId,
        p.Patient?.FullName ?? string.Empty,
        p.Patient?.PatientNumber,
        p.DoctorId,
        p.Doctor?.FullName,
        (int)p.ProcedureType,
        GetProcedureTypeDisplay((int)p.ProcedureType),
        p.ToothNumber,
        p.ToothSurface,
        p.Title,
        p.Description,
        p.ClinicalNotes,
        (int)p.Status,
        GetStatusDisplay((int)p.Status),
        p.StartedAt,
        p.CompletedAt,
        p.IsActive,
        p.CreatedAt,
        p.UpdatedAt
    );

    private static string GetProcedureTypeDisplay(int type)
    {
        if (type == 99) return "أخرى";
        return type >= 0 && type < ProcedureTypeDisplay.Length ? ProcedureTypeDisplay[type] : type.ToString();
    }

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < StatusDisplay.Length ? StatusDisplay[status] : status.ToString();
}
