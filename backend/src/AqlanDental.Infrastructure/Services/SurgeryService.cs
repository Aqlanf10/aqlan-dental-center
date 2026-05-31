using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class SurgeryService : ISurgeryService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] SurgeryCaseStatusDisplay = {
        "مجدول", "جارٍ", "مكتمل", "ملغي"
    };

    public SurgeryService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── SurgeryCase CRUD ────────────────────────────────────────────

    public async Task<PagedResult<SurgeryCaseListItemDto>> GetSurgeryCasesAsync(
        Guid? patientId, int? status, int page, int pageSize)
    {
        var query = _context.SurgeryCases
            .Include(c => c.Patient)
            .Include(c => c.Doctor)
            .Where(c => c.IsActive);

        if (patientId.HasValue)
            query = query.Where(c => c.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(SurgeryCaseStatus), status.Value))
                throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");
            query = query.Where(c => c.Status == (SurgeryCaseStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapCaseToListItemDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<SurgeryCaseListItemDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<SurgeryCaseDto?> GetSurgeryCaseByIdAsync(Guid id)
    {
        var surgeryCase = await _context.SurgeryCases
            .Include(c => c.Patient)
            .Include(c => c.Doctor)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        return surgeryCase is null ? null : MapCaseToDto(surgeryCase);
    }

    public async Task<SurgeryCaseDto> CreateSurgeryCaseAsync(
        CreateSurgeryCaseRequest request, string userId)
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

        if (string.IsNullOrWhiteSpace(request.SurgeryType))
            throw new DomainException("SURGERY_TYPE_REQUIRED", "نوع العملية الجراحية مطلوب");

        if (!Enum.IsDefined(typeof(SurgeryCaseStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");

        // Auto-generate case number
        var caseNumber = await GenerateSurgeryCaseNumberAsync();

        var surgeryCase = new SurgeryCase
        {
            Id = Guid.NewGuid(),
            CaseNumber = caseNumber,
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            SurgeryType = request.SurgeryType.Trim(),
            TeethInvolved = request.TeethInvolved?.Trim(),
            Status = (SurgeryCaseStatus)request.Status,
            SurgeryDate = request.SurgeryDate,
            SurgeryLocation = request.SurgeryLocation?.Trim(),
            AnesthesiaType = request.AnesthesiaType?.Trim(),
            PreopNotes = request.PreopNotes?.Trim(),
            OperativeNotes = request.OperativeNotes?.Trim(),
            PostopInstructions = request.PostopInstructions?.Trim(),
            Complications = request.Complications?.Trim(),
            FollowupDate = request.FollowupDate,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.SurgeryCases.Add(surgeryCase);
        await _context.SaveChangesAsync();

        return (await GetSurgeryCaseByIdAsync(surgeryCase.Id))!;
    }

    public async Task<SurgeryCaseDto?> UpdateSurgeryCaseAsync(
        Guid id, UpdateSurgeryCaseRequest request, string userId)
    {
        var surgeryCase = await _context.SurgeryCases.FindAsync(id);
        if (surgeryCase is null || !surgeryCase.IsActive) return null;

        if (surgeryCase.Status == SurgeryCaseStatus.Cancelled)
            throw new DomainException("SURGERY_CASE_NOT_EDITABLE", "لا يمكن تعديل عملية جراحية ملغاة");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
            surgeryCase.DoctorId = request.DoctorId.Value;
        }

        if (request.SurgeryType is not null)
        {
            if (string.IsNullOrWhiteSpace(request.SurgeryType))
                throw new DomainException("SURGERY_TYPE_REQUIRED", "نوع العملية الجراحية لا يمكن أن يكون فارغاً");
            surgeryCase.SurgeryType = request.SurgeryType.Trim();
        }

        if (request.TeethInvolved is not null)
            surgeryCase.TeethInvolved = request.TeethInvolved.Trim();
        if (request.SurgeryDate.HasValue)
            surgeryCase.SurgeryDate = request.SurgeryDate.Value;
        if (request.SurgeryLocation is not null)
            surgeryCase.SurgeryLocation = request.SurgeryLocation.Trim();
        if (request.AnesthesiaType is not null)
            surgeryCase.AnesthesiaType = request.AnesthesiaType.Trim();
        if (request.PreopNotes is not null)
            surgeryCase.PreopNotes = request.PreopNotes.Trim();
        if (request.OperativeNotes is not null)
            surgeryCase.OperativeNotes = request.OperativeNotes.Trim();
        if (request.PostopInstructions is not null)
            surgeryCase.PostopInstructions = request.PostopInstructions.Trim();
        if (request.Complications is not null)
            surgeryCase.Complications = request.Complications.Trim();
        if (request.FollowupDate.HasValue)
            surgeryCase.FollowupDate = request.FollowupDate.Value;
        if (request.Notes is not null)
            surgeryCase.Notes = request.Notes.Trim();

        surgeryCase.UpdatedAt = DateTime.UtcNow;
        surgeryCase.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetSurgeryCaseByIdAsync(id);
    }

    public async Task<SurgeryCaseDto?> UpdateSurgeryStatusAsync(
        Guid id, UpdateSurgeryStatusRequest request, string userId)
    {
        var surgeryCase = await _context.SurgeryCases.FindAsync(id);
        if (surgeryCase is null || !surgeryCase.IsActive) return null;

        if (!Enum.IsDefined(typeof(SurgeryCaseStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة الحالة غير صالحة");

        var newStatus = (SurgeryCaseStatus)request.Status;
        ValidateSurgeryStatusTransition(surgeryCase.Status, newStatus);

        surgeryCase.Status = newStatus;
        surgeryCase.UpdatedAt = DateTime.UtcNow;
        surgeryCase.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetSurgeryCaseByIdAsync(id);
    }

    // ─── Private helpers ─────────────────────────────────────────────

    private async Task<string> GenerateSurgeryCaseNumberAsync()
    {
        var lastCase = await _context.SurgeryCases
            .OrderByDescending(c => c.CaseNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastCase is not null && lastCase.CaseNumber.StartsWith("SUR-"))
        {
            if (int.TryParse(lastCase.CaseNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"SUR-{nextNumber:D4}";
    }

    private static void ValidateSurgeryStatusTransition(SurgeryCaseStatus current, SurgeryCaseStatus target)
    {
        if (current == SurgeryCaseStatus.Cancelled)
            throw new DomainException("SURGERY_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة عملية جراحية ملغاة");

        if (current == SurgeryCaseStatus.Completed && target != SurgeryCaseStatus.Cancelled)
            throw new DomainException("SURGERY_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة عملية جراحية مكتملة");

        if (current == SurgeryCaseStatus.Scheduled &&
            target is not (SurgeryCaseStatus.InProgress or SurgeryCaseStatus.Cancelled))
            throw new DomainException("SURGERY_STATUS_TRANSITION_INVALID",
                "الانتقال من 'مجدول' مسموح فقط إلى 'جارٍ' أو 'ملغي'");

        if (current == SurgeryCaseStatus.InProgress &&
            target is not (SurgeryCaseStatus.Completed or SurgeryCaseStatus.Cancelled))
            throw new DomainException("SURGERY_STATUS_TRANSITION_INVALID",
                "الانتقال من 'جارٍ' مسموح فقط إلى 'مكتمل' أو 'ملغي'");
    }

    // ─── Mapping methods ─────────────────────────────────────────────

    private static SurgeryCaseDto MapCaseToDto(SurgeryCase c) => new(
        c.Id,
        c.CaseNumber,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.DoctorId,
        c.Doctor?.FullName,
        c.SurgeryType,
        c.TeethInvolved,
        (int)c.Status,
        GetSurgeryStatusDisplay((int)c.Status),
        c.SurgeryDate,
        c.SurgeryLocation,
        c.AnesthesiaType,
        c.PreopNotes,
        c.OperativeNotes,
        c.PostopInstructions,
        c.Complications,
        c.FollowupDate,
        c.Notes,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    );

    private static SurgeryCaseListItemDto MapCaseToListItemDto(SurgeryCase c) => new(
        c.Id,
        c.CaseNumber,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.DoctorId,
        c.Doctor?.FullName,
        c.SurgeryType,
        c.TeethInvolved,
        (int)c.Status,
        GetSurgeryStatusDisplay((int)c.Status),
        c.SurgeryDate,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
    );

    private static string GetSurgeryStatusDisplay(int status) =>
        status >= 0 && status < SurgeryCaseStatusDisplay.Length
            ? SurgeryCaseStatusDisplay[status]
            : status.ToString();
}
