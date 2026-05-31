using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClinicRoomsController : ControllerBase
{
    private readonly IClinicRoomService _clinicRoomService;

    public ClinicRoomsController(IClinicRoomService clinicRoomService)
    {
        _clinicRoomService = clinicRoomService;
    }

    [HttpGet]
    [Authorize(Policy = "ClinicRoomsRead")]
    public async Task<ActionResult<List<ClinicRoomDto>>> GetRooms()
    {
        var rooms = await _clinicRoomService.GetRoomsAsync();
        return Ok(rooms);
    }

    [HttpPost]
    [Authorize(Policy = "ClinicRoomsWrite")]
    public async Task<ActionResult<ClinicRoomDto>> CreateRoom(CreateRoomRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var room = await _clinicRoomService.CreateRoomAsync(request, userId!);
        return CreatedAtAction(nameof(GetRooms), new { id = room.Id }, room);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "ClinicRoomsWrite")]
    public async Task<ActionResult<ClinicRoomDto>> UpdateRoom(Guid id, UpdateRoomRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var room = await _clinicRoomService.UpdateRoomAsync(id, request, userId!);
        if (room is null) return NotFound(new { message = "الغرفة غير موجودة" });
        return Ok(room);
    }
}
