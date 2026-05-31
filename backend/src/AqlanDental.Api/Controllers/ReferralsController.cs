using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/referrals")]
public class ReferralsController : ControllerBase
{
    private readonly IReferralService _referralService;

    public ReferralsController(IReferralService referralService)
    {
        _referralService = referralService;
    }

    [HttpGet]
    [Authorize(Policy = "ReferralsRead")]
    public async Task<ActionResult> GetReferrals(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _referralService.GetReferralsAsync(patientId, status, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "ReferralsRead")]
    public async Task<ActionResult<ReferralDto>> GetReferral(Guid id)
    {
        var referral = await _referralService.GetReferralByIdAsync(id);
        if (referral is null) return NotFound(new { message = "الإحالة غير موجودة" });
        return Ok(referral);
    }

    [HttpPost]
    [Authorize(Policy = "ReferralsWrite")]
    public async Task<ActionResult<ReferralDto>> CreateReferral(CreateReferralRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var referral = await _referralService.CreateReferralAsync(request, userId!);
        return CreatedAtAction(nameof(GetReferral), new { id = referral.Id }, referral);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "ReferralsWrite")]
    public async Task<ActionResult<ReferralDto>> UpdateReferral(
        Guid id, UpdateReferralRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var referral = await _referralService.UpdateReferralAsync(id, request, userId!);
        if (referral is null) return NotFound(new { message = "الإحالة غير موجودة" });
        return Ok(referral);
    }
}
