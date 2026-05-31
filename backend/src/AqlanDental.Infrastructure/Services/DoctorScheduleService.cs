using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class DoctorScheduleService : IDoctorScheduleService
{
    private readonly AqlanDentalDbContext _context;

    private static readonly string[] DayOfWeekDisplay =
        { "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة" };

    public DoctorScheduleService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<List<DoctorWeeklyScheduleDto>> GetDoctorWeeklyScheduleAsync(Guid doctorId)
    {
        var doctor = await _context.Doctors.FindAsync(doctorId);
        if (doctor is null || !doctor.IsActive)
            throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");

        var schedules = await _context.DoctorWeeklySchedules
            .Where(s => s.DoctorId == doctorId && s.IsActive)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return schedules.Select(MapToDto).ToList();
    }

    public async Task<DoctorWeeklyScheduleDto> UpsertDoctorWeeklyScheduleAsync(
        Guid doctorId, CreateDoctorWeeklyScheduleRequest request, string userId)
    {
        ValidateDayOfWeek(request.DayOfWeek);
        ValidateTimeRange(request.StartTime, request.EndTime, request.BreakStartTime, request.BreakEndTime);

        var doctor = await _context.Doctors.FindAsync(doctorId);
        if (doctor is null || !doctor.IsActive)
            throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");

        // Check for existing schedule on same day
        var existing = await _context.DoctorWeeklySchedules
            .FirstOrDefaultAsync(s => s.DoctorId == doctorId && s.DayOfWeek == request.DayOfWeek && s.IsActive);

        if (existing is not null)
        {
            // Update existing
            existing.StartTime = request.StartTime;
            existing.EndTime = request.EndTime;
            existing.BreakStartTime = request.BreakStartTime;
            existing.BreakEndTime = request.BreakEndTime;
            existing.DefaultAppointmentDurationMinutes = request.DefaultAppointmentDurationMinutes;
            existing.IsAvailableForBooking = request.IsAvailableForBooking;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return MapToDto(existing);
        }

        // Create new
        var schedule = new DoctorWeeklySchedule
        {
            Id = Guid.NewGuid(),
            DoctorId = doctorId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            BreakStartTime = request.BreakStartTime,
            BreakEndTime = request.BreakEndTime,
            DefaultAppointmentDurationMinutes = request.DefaultAppointmentDurationMinutes,
            IsAvailableForBooking = request.IsAvailableForBooking,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.DoctorWeeklySchedules.Add(schedule);
        await _context.SaveChangesAsync();

        return MapToDto(schedule);
    }

    public async Task<DoctorWeeklyScheduleDto?> UpdateDoctorWeeklyScheduleAsync(
        Guid scheduleId, UpdateDoctorWeeklyScheduleRequest request, string userId)
    {
        var schedule = await _context.DoctorWeeklySchedules.FindAsync(scheduleId);
        if (schedule is null || !schedule.IsActive)
            return null;

        var startTime = request.StartTime ?? schedule.StartTime;
        var endTime = request.EndTime ?? schedule.EndTime;
        var breakStart = request.BreakStartTime ?? schedule.BreakStartTime;
        var breakEnd = request.BreakEndTime ?? schedule.BreakEndTime;

        ValidateTimeRange(startTime, endTime, breakStart, breakEnd);

        schedule.StartTime = startTime;
        schedule.EndTime = endTime;
        schedule.BreakStartTime = breakStart;
        schedule.BreakEndTime = breakEnd;
        if (request.DefaultAppointmentDurationMinutes.HasValue)
            schedule.DefaultAppointmentDurationMinutes = request.DefaultAppointmentDurationMinutes.Value;
        if (request.IsAvailableForBooking.HasValue)
            schedule.IsAvailableForBooking = request.IsAvailableForBooking.Value;
        schedule.UpdatedAt = DateTime.UtcNow;
        schedule.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return MapToDto(schedule);
    }

    public async Task<bool> DeleteDoctorWeeklyScheduleAsync(Guid scheduleId, string userId)
    {
        var schedule = await _context.DoctorWeeklySchedules.FindAsync(scheduleId);
        if (schedule is null || !schedule.IsActive)
            return false;

        schedule.IsActive = false;
        schedule.UpdatedAt = DateTime.UtcNow;
        schedule.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<AvailableDoctorDto>> GetAvailableDoctorsForDayAsync(int dayOfWeek)
    {
        ValidateDayOfWeek(dayOfWeek);

        var schedules = await _context.DoctorWeeklySchedules
            .Include(s => s.Doctor)
            .Where(s => s.DayOfWeek == dayOfWeek && s.IsActive && s.IsAvailableForBooking && s.Doctor.IsActive)
            .OrderBy(s => s.Doctor.FullName)
            .ToListAsync();

        return schedules.Select(s => new AvailableDoctorDto(
            s.DoctorId,
            s.Doctor.FullName,
            s.Doctor.Specialty,
            s.Doctor.Color,
            s.StartTime,
            s.EndTime,
            s.BreakStartTime,
            s.BreakEndTime,
            s.DefaultAppointmentDurationMinutes
        )).ToList();
    }

    private static void ValidateDayOfWeek(int dayOfWeek)
    {
        if (dayOfWeek < 0 || dayOfWeek > 6)
            throw new DomainException("INVALID_DAY_OF_WEEK", "يوم الأسبوع غير صالح. يجب أن يكون بين 0 (السبت) و 6 (الجمعة)");
    }

    private static void ValidateTimeRange(TimeOnly start, TimeOnly end, TimeOnly? breakStart, TimeOnly? breakEnd)
    {
        if (start >= end)
            throw new DomainException("INVALID_TIME_RANGE", "وقت البداية يجب أن يكون قبل وقت النهاية");

        if (breakStart.HasValue && breakEnd.HasValue)
        {
            if (breakStart >= breakEnd)
                throw new DomainException("INVALID_BREAK_TIME", "وقت بداية الاستراحة يجب أن يكون قبل وقت نهاية الاستراحة");
            if (breakStart < start || breakEnd > end)
                throw new DomainException("BREAK_OUTSIDE_WORK_HOURS", "وقت الاستراحة يجب أن يكون ضمن ساعات العمل");
        }
        else if (breakStart.HasValue || breakEnd.HasValue)
        {
            throw new DomainException("INCOMPLETE_BREAK_TIME", "يجب تحديد بداية ونهاية الاستراحة معًا");
        }
    }

    private DoctorWeeklyScheduleDto MapToDto(DoctorWeeklySchedule s) => new(
        s.Id,
        s.DoctorId,
        s.Doctor?.FullName ?? string.Empty,
        s.DayOfWeek,
        GetDayOfWeekDisplay(s.DayOfWeek),
        s.StartTime,
        s.EndTime,
        s.BreakStartTime,
        s.BreakEndTime,
        s.DefaultAppointmentDurationMinutes,
        s.IsAvailableForBooking,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static string GetDayOfWeekDisplay(int day) =>
        day >= 0 && day < DayOfWeekDisplay.Length ? DayOfWeekDisplay[day] : day.ToString();
}
