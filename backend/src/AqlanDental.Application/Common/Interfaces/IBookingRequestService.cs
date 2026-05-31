using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

public record BookingRequestDto(
    Guid Id,
    string PatientName,
    string PhoneNumber,
    string ServiceType,
    Guid? PreferredDoctorId,
    string? PreferredDoctorName,
    DateOnly? PreferredDate,
    TimeOnly? PreferredTime,
    string? Notes,
    int Status,
    string StatusDisplay,
    Guid? LinkedPatientId,
    string? LinkedPatientName,
    Guid? ConvertedAppointmentId,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePublicBookingRequest(
    string PatientName,
    string PhoneNumber,
    string ServiceType,
    Guid? PreferredDoctorId,
    DateOnly? PreferredDate,
    TimeOnly? PreferredTime,
    string? Notes
);

public record UpdateBookingRequestStatusRequest(int Status);

public record ConvertToAppointmentResult(
    AppointmentDto Appointment,
    BookingRequestDto BookingRequest,
    bool PatientCreated
);

public interface IBookingRequestService
{
    Task<PagedResult<BookingRequestDto>> GetBookingRequestsAsync(int page, int pageSize, string? search, int? status, DateOnly? dateFrom, DateOnly? dateTo);
    Task<BookingRequestDto?> GetBookingRequestByIdAsync(Guid id);
    Task<BookingRequestDto> CreatePublicBookingRequestAsync(CreatePublicBookingRequest request);
    Task<BookingRequestDto?> UpdateBookingRequestStatusAsync(Guid id, UpdateBookingRequestStatusRequest request, string userId);
    Task<ConvertToAppointmentResult?> ConvertToAppointmentAsync(Guid id, string userId);
    Task<bool> SoftDeleteBookingRequestAsync(Guid id);
}
