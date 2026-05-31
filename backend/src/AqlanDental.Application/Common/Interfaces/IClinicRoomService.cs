namespace AqlanDental.Application.Common.Interfaces;

public record ClinicRoomDto(
    Guid Id,
    string Name,
    string? RoomNumber,
    string? Description,
    bool IsActive,
    bool IsOccupied,
    Guid? CurrentDailyVisitId,
    string? CurrentPatientName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateRoomRequest(
    string Name,
    string? RoomNumber,
    string? Description
);

public record UpdateRoomRequest(
    string Name,
    string? RoomNumber,
    string? Description
);

public interface IClinicRoomService
{
    Task<List<ClinicRoomDto>> GetRoomsAsync();
    Task<ClinicRoomDto> CreateRoomAsync(CreateRoomRequest request, string userId);
    Task<ClinicRoomDto?> UpdateRoomAsync(Guid roomId, UpdateRoomRequest request, string userId);
}
