using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicRoomService : IClinicRoomService
{
    private readonly AqlanDentalDbContext _context;

    public ClinicRoomService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClinicRoomDto>> GetRoomsAsync()
    {
        var rooms = await _context.ClinicRooms
            .Include(r => r.CurrentDailyVisit)
                .ThenInclude(v => v!.Patient)
            .Where(r => r.IsActive)
            .OrderBy(r => r.Name)
            .ToListAsync();

        return rooms.Select(MapToDto).ToList();
    }

    public async Task<ClinicRoomDto> CreateRoomAsync(CreateRoomRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("NAME_REQUIRED", "اسم الغرفة مطلوب");

        var room = new ClinicRoom
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            RoomNumber = request.RoomNumber,
            Description = request.Description,
            IsActive = true,
            IsOccupied = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ClinicRooms.Add(room);
        await _context.SaveChangesAsync();

        return MapToDto(room);
    }

    public async Task<ClinicRoomDto?> UpdateRoomAsync(Guid roomId, UpdateRoomRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("NAME_REQUIRED", "اسم الغرفة مطلوب");

        var room = await _context.ClinicRooms.FindAsync(roomId);
        if (room is null || !room.IsActive) return null;

        room.Name = request.Name;
        room.RoomNumber = request.RoomNumber;
        room.Description = request.Description;
        room.UpdatedAt = DateTime.UtcNow;
        room.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return MapToDto(room);
    }

    private static ClinicRoomDto MapToDto(ClinicRoom r) => new(
        r.Id,
        r.Name,
        r.RoomNumber,
        r.Description,
        r.IsActive,
        r.IsOccupied,
        r.CurrentDailyVisitId,
        r.CurrentDailyVisit?.Patient?.FullName,
        r.CreatedAt,
        r.UpdatedAt
    );
}
