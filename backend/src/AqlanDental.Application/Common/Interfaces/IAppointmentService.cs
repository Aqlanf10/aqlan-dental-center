using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record AppointmentDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    string ServiceType,
    int Status,
    string StatusDisplay,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateAppointmentRequest(
    Guid PatientId,
    Guid DoctorId,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    string ServiceType,
    string? Notes
);

public record UpdateAppointmentRequest(
    Guid PatientId,
    Guid DoctorId,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly? EndTime,
    string ServiceType,
    string? Notes
);

public record UpdateAppointmentStatusRequest(int Status);

public interface IAppointmentService
{
    Task<PagedResult<AppointmentDto>> GetAppointmentsAsync(int page, int pageSize, string? search, DateOnly? dateFrom, DateOnly? dateTo, Guid? doctorId, Guid? patientId, int? status);
    Task<AppointmentDto?> GetAppointmentByIdAsync(Guid id);
    Task<AppointmentDto> CreateAppointmentAsync(CreateAppointmentRequest request, string userId);
    Task<AppointmentDto?> UpdateAppointmentAsync(Guid id, UpdateAppointmentRequest request, string userId);
    Task<AppointmentDto?> UpdateAppointmentStatusAsync(Guid id, UpdateAppointmentStatusRequest request, string userId);
    Task<bool> SoftDeleteAppointmentAsync(Guid id);
}
