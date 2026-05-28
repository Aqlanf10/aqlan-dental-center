using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class AppointmentService : IAppointmentService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] AppointmentStatusDisplay =
        { "مجدول", "مؤكد", "مكتمل", "ملغي", "لم يحضر" };

    public AppointmentService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<AppointmentDto>> GetAppointmentsAsync(
        int page, int pageSize, string? search,
        DateOnly? dateFrom, DateOnly? dateTo,
        Guid? doctorId, Guid? patientId, int? status)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Where(a => a.IsActive);

        if (dateFrom.HasValue)
            query = query.Where(a => a.AppointmentDate >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(a => a.AppointmentDate <= dateTo.Value);

        if (doctorId.HasValue)
            query = query.Where(a => a.DoctorId == doctorId.Value);

        if (patientId.HasValue)
            query = query.Where(a => a.PatientId == patientId.Value);

        if (status.HasValue)
            query = query.Where(a => (int)a.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(a =>
                a.Patient.FullName.ToLower().Contains(searchLower));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => MapToDto(a))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<AppointmentDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<AppointmentDto?> GetAppointmentByIdAsync(Guid id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return null;

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CreateAppointmentAsync(
        CreateAppointmentRequest request, string userId)
    {
        await ValidatePatientAndDoctorAsync(request.PatientId, request.DoctorId);
        await CheckTimeConflictAsync(request.DoctorId, request.AppointmentDate,
            request.StartTime, request.EndTime, excludeId: null);

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            AppointmentDate = request.AppointmentDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            ServiceType = request.ServiceType,
            Status = AppointmentStatus.Scheduled,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        return (await GetAppointmentByIdAsync(appointment.Id))!;
    }

    public async Task<AppointmentDto?> UpdateAppointmentAsync(
        Guid id, UpdateAppointmentRequest request, string userId)
    {
        var appointment = await _context.Appointments.FindAsync(id);

        if (appointment is null || !appointment.IsActive)
            return null;

        await ValidatePatientAndDoctorAsync(request.PatientId, request.DoctorId);
        await CheckTimeConflictAsync(request.DoctorId, request.AppointmentDate,
            request.StartTime, request.EndTime, excludeId: id);

        appointment.PatientId = request.PatientId;
        appointment.DoctorId = request.DoctorId;
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.StartTime = request.StartTime;
        appointment.EndTime = request.EndTime;
        appointment.ServiceType = request.ServiceType;
        appointment.Notes = request.Notes;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return await GetAppointmentByIdAsync(id);
    }

    public async Task<AppointmentDto?> UpdateAppointmentStatusAsync(
        Guid id, UpdateAppointmentStatusRequest request, string userId)
    {
        if (!Enum.IsDefined(typeof(AppointmentStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة الموعد غير صالحة");

        var appointment = await _context.Appointments.FindAsync(id);

        if (appointment is null || !appointment.IsActive)
            return null;

        appointment.Status = (AppointmentStatus)request.Status;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return await GetAppointmentByIdAsync(id);
    }

    public async Task<bool> SoftDeleteAppointmentAsync(Guid id)
    {
        var appointment = await _context.Appointments.FindAsync(id);

        if (appointment is null || !appointment.IsActive)
            return false;

        appointment.IsActive = false;
        appointment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task ValidatePatientAndDoctorAsync(Guid patientId, Guid doctorId)
    {
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == patientId && p.IsActive);
        if (!patientExists)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == doctorId && d.IsActive);
        if (!doctorExists)
            throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
    }

    private async Task CheckTimeConflictAsync(
        Guid doctorId, DateOnly date, TimeOnly startTime,
        TimeOnly? endTime, Guid? excludeId)
    {
        var existingAppointments = await _context.Appointments
            .Where(a => a.DoctorId == doctorId
                     && a.AppointmentDate == date
                     && a.Status != AppointmentStatus.Cancelled
                     && a.IsActive
                     && (excludeId == null || a.Id != excludeId.Value))
            .ToListAsync();

        foreach (var existing in existingAppointments)
        {
            bool hasConflict;

            if (endTime.HasValue && existing.EndTime.HasValue)
            {
                // Both have end times: overlap check
                hasConflict = startTime < existing.EndTime.Value
                           && endTime.Value > existing.StartTime;
            }
            else if (endTime.HasValue && !existing.EndTime.HasValue)
            {
                // New has end time, existing doesn't: check if new starts at same time or overlaps
                hasConflict = startTime <= existing.StartTime && endTime.Value > existing.StartTime
                           || existing.StartTime < endTime.Value && startTime < existing.StartTime
                           || startTime == existing.StartTime;
            }
            else if (!endTime.HasValue && existing.EndTime.HasValue)
            {
                // Existing has end time, new doesn't: same start time check
                hasConflict = startTime == existing.StartTime
                           || (startTime >= existing.StartTime && startTime < existing.EndTime.Value);
            }
            else
            {
                // Neither has end time: same start time = conflict
                hasConflict = startTime == existing.StartTime;
            }

            if (hasConflict)
            {
                throw new DomainException("APPOINTMENT_CONFLICT",
                    "يوجد موعد آخر لنفس الطبيب في هذا الوقت");
            }
        }
    }

    private static AppointmentDto MapToDto(Appointment a) => new(
        a.Id,
        a.PatientId,
        a.Patient != null ? a.Patient.FullName : string.Empty,
        a.DoctorId,
        a.Doctor != null ? a.Doctor.FullName : string.Empty,
        a.AppointmentDate,
        a.StartTime,
        a.EndTime,
        a.ServiceType,
        (int)a.Status,
        GetStatusDisplay((int)a.Status),
        a.Notes,
        a.IsActive,
        a.CreatedAt,
        a.UpdatedAt
    );

    private static string GetStatusDisplay(int status) =>
        status >= 0 && status < AppointmentStatusDisplay.Length
            ? AppointmentStatusDisplay[status]
            : status.ToString();
}
