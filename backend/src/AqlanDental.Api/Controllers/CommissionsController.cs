using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/commissions")]
public class CommissionsController : ControllerBase
{
    private readonly ICommissionService _service;

    public CommissionsController(ICommissionService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "CommissionRead")]
    public async Task<ActionResult> GetCommissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? doctorId = null,
        [FromQuery] int? status = null)
    {
        if (doctorId.HasValue)
            return Ok(await _service.GetByDoctorAsync(doctorId.Value, page, pageSize, status));
        return Ok(await _service.GetAllAsync(page, pageSize, status));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "CommissionRead")]
    public async Task<ActionResult<DoctorCommissionPaymentDto>> GetCommission(Guid id)
    {
        var commission = await _service.GetByIdAsync(id);
        if (commission is null) return NotFound(new { message = "Commission not found" });
        return Ok(commission);
    }

    [HttpPost("calculate")]
    [Authorize(Policy = "CommissionWrite")]
    public async Task<ActionResult<DoctorCommissionPaymentDto>> CalculateCommission(CalculateCommissionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var commission = await _service.CalculateForInvoiceAsync(request, userId!);
        return Ok(commission);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "CommissionApprove")]
    public async Task<ActionResult<DoctorCommissionPaymentDto>> ApproveCommission(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var commission = await _service.ApproveAsync(id, userId!);
        if (commission is null) return NotFound(new { message = "Commission not found" });
        return Ok(commission);
    }

    [HttpPost("{id:guid}/pay")]
    [Authorize(Policy = "CommissionApprove")]
    public async Task<ActionResult<DoctorCommissionPaymentDto>> PayCommission(Guid id, [FromBody] PayCommissionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var commission = await _service.PayAsync(id, request.TreasuryId, userId!);
        if (commission is null) return NotFound(new { message = "Commission not found" });
        return Ok(commission);
    }

    [HttpGet("service-defaults")]
    [Authorize(Policy = "CommissionRead")]
    public async Task<ActionResult> GetServiceCommissionDefaults()
    {
        var defaults = await _service.GetServiceDefaultsAsync();
        return Ok(defaults);
    }

    [HttpPut("service-defaults/{clinicServiceId:guid}")]
    [Authorize(Policy = "CommissionWrite")]
    public async Task<ActionResult<CommissionServiceDefaultsDto>> UpdateServiceCommissionDefault(
        Guid clinicServiceId, UpdateCommissionServiceDefaultsRequest request)
    {
        request = request with { ClinicServiceId = clinicServiceId };
        var result = await _service.UpdateServiceDefaultsAsync(request);
        return Ok(result);
    }
}

public record PayCommissionRequest(Guid TreasuryId);
