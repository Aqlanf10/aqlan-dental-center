using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ReferralService : IReferralService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] ReferralStatusDisplay = {
        "قيد الانتظار", "مقبول", "مرفوض"
    };

    public ReferralService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ReferralDto>> GetReferralsAsync(
        Guid? patientId, int? status, int page, int pageSize)
    {
        var query = _context.Referrals
            .Include(r => r.Patient)
            .Include(r => r.FromDoctor)
            .Include(r => r.ToDoctor)
            .Where(r => r.IsActive);

        if (patientId.HasValue)
            query = query.Where(r => r.PatientId == patientId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(ReferralStatus), status.Value))
                throw new DomainException("INVALID_STATUS", "حالة الإحالة غير صالحة");
            query = query.Where(r => r.Status == (ReferralStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<ReferralDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<ReferralDto?> GetReferralByIdAsync(Guid id)
    {
        var referral = await _context.Referrals
            .Include(r => r.Patient)
            .Include(r => r.FromDoctor)
            .Include(r => r.ToDoctor)
            .FirstOrDefaultAsync(r => r.Id == id && r.IsActive);

        return referral is null ? null : MapToDto(referral);
    }

    public async Task<ReferralDto> CreateReferralAsync(
        CreateReferralRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        var fromDoctor = await _context.Doctors.FindAsync(request.FromDoctorId);
        if (fromDoctor is null || !fromDoctor.IsActive)
            throw new DomainException("FROM_DOCTOR_NOT_FOUND", "الطبيب المُحيل غير موجود");

        var toDoctor = await _context.Doctors.FindAsync(request.ToDoctorId);
        if (toDoctor is null || !toDoctor.IsActive)
            throw new DomainException("TO_DOCTOR_NOT_FOUND", "الطبيب المُحال إليه غير موجود");

        if (request.FromDoctorId == request.ToDoctorId)
            throw new DomainException("SAME_DOCTOR", "لا يمكن إحالة المريض لنفس الطبيب");

        var referral = new Referral
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            FromDoctorId = request.FromDoctorId,
            ToDoctorId = request.ToDoctorId,
            Reason = request.Reason?.Trim(),
            Notes = request.Notes?.Trim(),
            Status = ReferralStatus.Pending,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Referrals.Add(referral);
        await _context.SaveChangesAsync();

        return (await GetReferralByIdAsync(referral.Id))!;
    }

    public async Task<ReferralDto?> UpdateReferralAsync(
        Guid id, UpdateReferralRequest request, string userId)
    {
        var referral = await _context.Referrals.FindAsync(id);
        if (referral is null || !referral.IsActive) return null;

        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(ReferralStatus), request.Status.Value))
                throw new DomainException("INVALID_STATUS", "حالة الإحالة غير صالحة");

            if (referral.Status == ReferralStatus.Accepted || referral.Status == ReferralStatus.Rejected)
                throw new DomainException("REFERRAL_ALREADY_PROCESSED", "تم معالجة هذه الإحالة مسبقاً");

            referral.Status = (ReferralStatus)request.Status.Value;
        }

        if (request.Reason is not null)
            referral.Reason = request.Reason.Trim();
        if (request.Notes is not null)
            referral.Notes = request.Notes.Trim();

        referral.UpdatedAt = DateTime.UtcNow;
        referral.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetReferralByIdAsync(id);
    }

    private static ReferralDto MapToDto(Referral r) => new(
        r.Id,
        r.PatientId,
        r.Patient?.FullName ?? string.Empty,
        r.FromDoctorId,
        r.FromDoctor?.FullName ?? string.Empty,
        r.ToDoctorId,
        r.ToDoctor?.FullName ?? string.Empty,
        r.Reason,
        r.Notes,
        (int)r.Status,
        GetStatusDisplay((int)r.Status),
        r.IsActive,
        r.CreatedAt,
        r.UpdatedAt
    );

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < ReferralStatusDisplay.Length
            ? ReferralStatusDisplay[status]
            : status.ToString();
}
