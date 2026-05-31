using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers.Public;

[ApiController]
[Route("api/public/[controller]")]
public class BookingRequestsController : ControllerBase
{
    private readonly IBookingRequestService _bookingRequestService;

    public BookingRequestsController(IBookingRequestService bookingRequestService)
    {
        _bookingRequestService = bookingRequestService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<BookingRequestDto>> Create(CreatePublicBookingRequest request)
    {
        var result = await _bookingRequestService.CreatePublicBookingRequestAsync(request);
        return Ok(result);
    }
}
