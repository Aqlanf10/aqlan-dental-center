using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingRequestsController : ControllerBase
{
    private readonly IBookingRequestService _bookingRequestService;

    public BookingRequestsController(IBookingRequestService bookingRequestService)
    {
        _bookingRequestService = bookingRequestService;
    }

    [HttpGet]
    [Authorize(Policy = "BookingRequestRead")]
    public async Task<ActionResult<PagedResult<BookingRequestDto>>> GetBookingRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? status = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null)
    {
        var result = await _bookingRequestService.GetBookingRequestsAsync(
            page, pageSize, search, status, dateFrom, dateTo);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "BookingRequestRead")]
    public async Task<ActionResult<BookingRequestDto>> GetBookingRequest(Guid id)
    {
        var bookingRequest = await _bookingRequestService.GetBookingRequestByIdAsync(id);
        if (bookingRequest is null) return NotFound(new { message = "طلب الحجز غير موجود" });
        return Ok(bookingRequest);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "BookingRequestWrite")]
    public async Task<ActionResult<BookingRequestDto>> UpdateBookingRequestStatus(
        Guid id, UpdateBookingRequestStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var bookingRequest = await _bookingRequestService
            .UpdateBookingRequestStatusAsync(id, request, userId!);
        if (bookingRequest is null) return NotFound(new { message = "طلب الحجز غير موجود" });
        return Ok(bookingRequest);
    }

    [HttpPost("{id:guid}/convert-to-appointment")]
    [Authorize(Policy = "BookingRequestWrite")]
    public async Task<ActionResult<ConvertToAppointmentResult>> ConvertToAppointment(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var result = await _bookingRequestService.ConvertToAppointmentAsync(id, userId!);
        if (result is null) return NotFound(new { message = "طلب الحجز غير موجود" });
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "BookingRequestDelete")]
    public async Task<ActionResult> DeleteBookingRequest(Guid id)
    {
        var result = await _bookingRequestService.SoftDeleteBookingRequestAsync(id);
        if (!result) return NotFound(new { message = "طلب الحجز غير موجود" });
        return Ok(new { message = "تم حذف طلب الحجز بنجاح" });
    }
}
