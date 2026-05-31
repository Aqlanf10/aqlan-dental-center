namespace AqlanDental.Application.Common.Interfaces;

public record DoctorWeeklyScheduleDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    int DayOfWeek,
    string DayOfWeekDisplay,
    TimeOnly StartTime,
    TimeOnly EndTime,
    TimeOnly? BreakStartTime,
    TimeOnly? BreakEndTime,
    int DefaultAppointmentDurationMinutes,
    bool IsAvailableForBooking,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateDoctorWeeklyScheduleRequest(
    int DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    TimeOnly? BreakStartTime,
    TimeOnly? BreakEndTime,
    int DefaultAppointmentDurationMinutes = 30,
    bool IsAvailableForBooking = true
);

public record UpdateDoctorWeeklyScheduleRequest(
    TimeOnly? StartTime = null,
    TimeOnly? EndTime = null,
    TimeOnly? BreakStartTime = null,
    TimeOnly? BreakEndTime = null,
    int? DefaultAppointmentDurationMinutes = null,
    bool? IsAvailableForBooking = null
);

public interface IDoctorScheduleService
{
    Task<List<DoctorWeeklyScheduleDto>> GetDoctorWeeklyScheduleAsync(Guid doctorId);
    Task<DoctorWeeklyScheduleDto> UpsertDoctorWeeklyScheduleAsync(Guid doctorId, CreateDoctorWeeklyScheduleRequest request, string userId);
    Task<DoctorWeeklyScheduleDto?> UpdateDoctorWeeklyScheduleAsync(Guid scheduleId, UpdateDoctorWeeklyScheduleRequest request, string userId);
    Task<bool> DeleteDoctorWeeklyScheduleAsync(Guid scheduleId, string userId);
    Task<List<AvailableDoctorDto>> GetAvailableDoctorsForDayAsync(int dayOfWeek);
}

public record AvailableDoctorDto(
    Guid DoctorId,
    string DoctorName,
    string Specialty,
    string? Color,
    TimeOnly StartTime,
    TimeOnly EndTime,
    TimeOnly? BreakStartTime,
    TimeOnly? BreakEndTime,
    int DefaultAppointmentDurationMinutes
);
