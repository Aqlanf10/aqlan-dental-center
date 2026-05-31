using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class DailyVisitService : IDailyVisitService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] VisitTypeDisplay = { "موعد", "بدون موعد" };
    private static readonly string[] StatusDisplay =
        { "مجدول", "وصل", "في الانتظار", "جاهز للطبيب", "قيد المعالجة", "مكتمل", "ملغي", "لم يحضر" };

    private static readonly HashSet<DailyVisitStatus> TerminalStatuses =
        new() { DailyVisitStatus.Completed, DailyVisitStatus.Cancelled, DailyVisitStatus.NoShow };

    public DailyVisitService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<TodayDailyVisitsDto> GetTodayAsync(DateOnly? date)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Get today's appointments
        var todayAppointments = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Where(a => a.AppointmentDate == targetDate && a.IsActive)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        // Get today's visits
        var todayVisits = await _context.DailyVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Appointment)
            .Where(v => v.VisitDate == targetDate && v.IsActive)
            .OrderBy(v => v.ArrivalTime)
            .ToListAsync();

        var appointmentDtos = todayAppointments.Select(MapAppointmentToDto).ToList();
        var visitDtos = todayVisits.Select(MapToDto).ToList();

        return new TodayDailyVisitsDto(
            targetDate,
            todayAppointments.Count,
            todayVisits.Count(v => v.Status == DailyVisitStatus.CheckedIn),
            todayVisits.Count(v => v.Status == DailyVisitStatus.Waiting),
            todayVisits.Count(v => v.Status == DailyVisitStatus.ReadyForDoctor),
            todayVisits.Count(v => v.Status == DailyVisitStatus.InProgress),
            todayVisits.Count(v => v.Status == DailyVisitStatus.Completed),
            todayVisits.Count(v => v.Status == DailyVisitStatus.Cancelled),
            todayVisits.Count(v => v.Status == DailyVisitStatus.NoShow),
            appointmentDtos,
            visitDtos
        );
    }

    public async Task<DailyVisitDto?> GetVisitByIdAsync(Guid id)
    {
        var visit = await _context.DailyVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Appointment)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (visit is null) return null;
        return MapToDto(visit);
    }

    public async Task<DailyVisitDto> CheckInAppointmentAsync(
        Guid appointmentId, CheckInAppointmentRequest request, string userId)
    {
        // Validate appointment exists and is active
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.IsActive);

        if (appointment is null)
            throw new DomainException("APPOINTMENT_NOT_FOUND", "الموعد غير موجود");

        // Validate appointment is not Cancelled or NoShow
        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new DomainException("APPOINTMENT_CANCELLED", "الموعد ملغي ولا يمكن تسجيل الوصول");

        if (appointment.Status == AppointmentStatus.NoShow)
            throw new DomainException("APPOINTMENT_NOSHOW", "الموعد مسجل كلم يحضر ولا يمكن تسجيل الوصول");

        // Validate no DailyVisit already exists for this appointment
        var existingVisit = await _context.DailyVisits
            .AnyAsync(v => v.AppointmentId == appointmentId && v.IsActive);

        if (existingVisit)
            throw new DomainException("ALREADY_CHECKED_IN", "تم تسجيل الوصول لهذا الموعد مسبقًا");

        // Validate patient has no active DailyVisit on the same date
        var patientActiveVisit = await _context.DailyVisits
            .AnyAsync(v => v.PatientId == appointment.PatientId
                        && v.VisitDate == appointment.AppointmentDate
                        && v.IsActive
                        && v.Status != DailyVisitStatus.Cancelled
                        && v.Status != DailyVisitStatus.Completed
                        && v.Status != DailyVisitStatus.NoShow);

        if (patientActiveVisit)
            throw new DomainException("PATIENT_HAS_ACTIVE_VISIT",
                "المريض لديه زيارة نشطة في نفس اليوم ولا يمكن تسجيل وصول آخر");

        var visit = new DailyVisit
        {
            Id = Guid.NewGuid(),
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            AppointmentId = appointmentId,
            VisitDate = appointment.AppointmentDate,
            VisitType = DailyVisitType.Scheduled,
            Status = DailyVisitStatus.CheckedIn,
            ArrivalTime = TimeOnly.FromDateTime(DateTime.UtcNow),
            ChiefComplaint = request.ChiefComplaint,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        // Update appointment status to Confirmed
        appointment.Status = AppointmentStatus.Confirmed;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedBy = userId;

        _context.DailyVisits.Add(visit);
        await _context.SaveChangesAsync();

        return (await GetVisitByIdAsync(visit.Id))!;
    }

    public async Task<DailyVisitDto> CreateWalkInVisitAsync(
        CreateWalkInVisitRequest request, string userId)
    {
        var visitDate = request.VisitDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Validate patient exists and is active
        var patientExists = await _context.Patients
            .AnyAsync(p => p.Id == request.PatientId && p.IsActive);

        if (!patientExists)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        // Validate doctor exists and is active if provided
        if (request.DoctorId.HasValue)
        {
            var doctorExists = await _context.Doctors
                .AnyAsync(d => d.Id == request.DoctorId.Value && d.IsActive);

            if (!doctorExists)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        // Validate patient has no active DailyVisit on the same date
        var patientActiveVisit = await _context.DailyVisits
            .AnyAsync(v => v.PatientId == request.PatientId
                        && v.VisitDate == visitDate
                        && v.IsActive
                        && v.Status != DailyVisitStatus.Cancelled
                        && v.Status != DailyVisitStatus.Completed
                        && v.Status != DailyVisitStatus.NoShow);

        if (patientActiveVisit)
            throw new DomainException("PATIENT_HAS_ACTIVE_VISIT",
                "المريض لديه زيارة نشطة في نفس اليوم ولا يمكن إنشاء زيارة أخرى");

        var visit = new DailyVisit
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            AppointmentId = null,
            VisitDate = visitDate,
            VisitType = DailyVisitType.WalkIn,
            Status = DailyVisitStatus.CheckedIn,
            ArrivalTime = TimeOnly.FromDateTime(DateTime.UtcNow),
            ChiefComplaint = request.ChiefComplaint,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.DailyVisits.Add(visit);
        await _context.SaveChangesAsync();

        return (await GetVisitByIdAsync(visit.Id))!;
    }

    public async Task<DailyVisitDto?> UpdateVisitStatusAsync(
        Guid visitId, UpdateDailyVisitStatusRequest request, string userId)
    {
        if (!Enum.IsDefined(typeof(DailyVisitStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "حالة الزيارة غير صالحة");

        var newStatus = (DailyVisitStatus)request.Status;
        var visit = await _context.DailyVisits.FindAsync(visitId);

        if (visit is null || !visit.IsActive)
            return null;

        // Validate status transition
        ValidateStatusTransition(visit.Status, newStatus);

        visit.Status = newStatus;
        visit.UpdatedAt = DateTime.UtcNow;
        visit.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return await GetVisitByIdAsync(visitId);
    }

    public async Task<DailyVisitDto?> CancelVisitAsync(Guid visitId, string userId)
    {
        var visit = await _context.DailyVisits.FindAsync(visitId);

        if (visit is null || !visit.IsActive)
            return null;

        if (visit.Status == DailyVisitStatus.Cancelled)
            throw new DomainException("ALREADY_CANCELLED", "الزيارة ملغاة بالفعل");

        if (visit.Status == DailyVisitStatus.Completed)
            throw new DomainException("CANNOT_CANCEL_COMPLETED", "لا يمكن إلغاء زيارة مكتملة");

        visit.Status = DailyVisitStatus.Cancelled;
        visit.UpdatedAt = DateTime.UtcNow;
        visit.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return await GetVisitByIdAsync(visitId);
    }

    public async Task<DailyVisitDto?> MarkNoShowAsync(Guid appointmentId, string userId)
    {
        var appointment = await _context.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.IsActive);

        if (appointment is null)
            throw new DomainException("APPOINTMENT_NOT_FOUND", "الموعد غير موجود");

        // Update appointment status to NoShow
        appointment.Status = AppointmentStatus.NoShow;
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.UpdatedBy = userId;

        // Check if DailyVisit exists for this appointment
        var existingVisit = await _context.DailyVisits
            .FirstOrDefaultAsync(v => v.AppointmentId == appointmentId && v.IsActive);

        if (existingVisit is not null)
        {
            existingVisit.Status = DailyVisitStatus.NoShow;
            existingVisit.UpdatedAt = DateTime.UtcNow;
            existingVisit.UpdatedBy = userId;
        }
        else
        {
            // Create a DailyVisit with NoShow status
            var noShowVisit = new DailyVisit
            {
                Id = Guid.NewGuid(),
                PatientId = appointment.PatientId,
                DoctorId = appointment.DoctorId,
                AppointmentId = appointmentId,
                VisitDate = appointment.AppointmentDate,
                VisitType = DailyVisitType.Scheduled,
                Status = DailyVisitStatus.NoShow,
                ArrivalTime = null,
                ChiefComplaint = null,
                Notes = null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.DailyVisits.Add(noShowVisit);
        }

        await _context.SaveChangesAsync();

        // Return the visit
        var visit = await _context.DailyVisits
            .Include(v => v.Patient)
            .Include(v => v.Doctor)
            .Include(v => v.Appointment)
            .FirstOrDefaultAsync(v => v.AppointmentId == appointmentId && v.IsActive);

        return visit is not null ? MapToDto(visit) : null;
    }

    private static void ValidateStatusTransition(DailyVisitStatus current, DailyVisitStatus target)
    {
        // Cannot transition from terminal statuses back to active
        if (TerminalStatuses.Contains(current) && !TerminalStatuses.Contains(target))
        {
            var currentDisplay = GetStatusDisplayInternal((int)current);
            throw new DomainException("INVALID_STATUS_TRANSITION",
                $"لا يمكن تغيير الحالة من '{currentDisplay}' إلى حالة نشطة");
        }

        // Completed should not go back to Waiting
        if (current == DailyVisitStatus.Completed && target == DailyVisitStatus.Waiting)
            throw new DomainException("INVALID_STATUS_TRANSITION",
                "لا يمكن الرجوع من 'مكتمل' إلى 'في الانتظار'");

        // Cancelled should not go back to active statuses
        if (current == DailyVisitStatus.Cancelled && target != DailyVisitStatus.Cancelled)
            throw new DomainException("INVALID_STATUS_TRANSITION",
                "لا يمكن تغيير حالة الزيارة الملغاة");

        // NoShow should not go back to active statuses
        if (current == DailyVisitStatus.NoShow && target != DailyVisitStatus.NoShow)
            throw new DomainException("INVALID_STATUS_TRANSITION",
                "لا يمكن تغيير حالة 'لم يحضر'");
    }

    private static DailyVisitDto MapToDto(DailyVisit v) => new(
        v.Id,
        v.PatientId,
        v.Patient?.FullName ?? string.Empty,
        v.Patient?.PatientNumber,
        v.DoctorId,
        v.Doctor?.FullName,
        v.AppointmentId,
        v.VisitDate,
        (int)v.VisitType,
        GetVisitTypeDisplayInternal((int)v.VisitType),
        (int)v.Status,
        GetStatusDisplayInternal((int)v.Status),
        v.ArrivalTime,
        v.ChiefComplaint,
        v.Notes,
        v.IsActive,
        v.CreatedAt,
        v.UpdatedAt
    );

    private static AppointmentDto MapAppointmentToDto(Appointment a) => new(
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
        GetAppointmentStatusDisplay((int)a.Status),
        a.Notes,
        a.IsActive,
        a.CreatedAt,
        a.UpdatedAt
    );

    private static string GetVisitTypeDisplayInternal(int type) =>
        type >= 0 && type < VisitTypeDisplay.Length
            ? VisitTypeDisplay[type]
            : type.ToString();

    private static string GetStatusDisplayInternal(int status) =>
        status >= 0 && status < StatusDisplay.Length
            ? StatusDisplay[status]
            : status.ToString();

    private static readonly string[] AppointmentStatusDisplay =
        { "مجدول", "مؤكد", "مكتمل", "ملغي", "لم يحضر" };

    private static string GetAppointmentStatusDisplay(int status) =>
        status >= 0 && status < AppointmentStatusDisplay.Length
            ? AppointmentStatusDisplay[status]
            : status.ToString();
}
