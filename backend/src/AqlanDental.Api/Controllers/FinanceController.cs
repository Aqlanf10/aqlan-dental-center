using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/finance")]
public class FinanceController : ControllerBase
{
    private readonly IFinanceService _financeService;

    public FinanceController(IFinanceService financeService)
    {
        _financeService = financeService;
    }

    // ─── Contracts ──────────────────────────────────────────────────

    [HttpGet("contracts")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult> GetContracts(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _financeService.GetContractsAsync(patientId, page, pageSize, status);
        return Ok(result);
    }

    [HttpGet("contracts/{id:guid}")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult<ContractDto>> GetContract(Guid id)
    {
        var contract = await _financeService.GetContractByIdAsync(id);
        if (contract is null) return NotFound(new { message = "العقد غير موجود" });
        return Ok(contract);
    }

    [HttpPost("contracts")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<ContractDto>> CreateContract(CreateContractRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var contract = await _financeService.CreateContractAsync(request, userId!);
        return CreatedAtAction(nameof(GetContract), new { id = contract.Id }, contract);
    }

    [HttpPut("contracts/{id:guid}/status")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<ContractDto>> UpdateContractStatus(
        Guid id, UpdateContractStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var contract = await _financeService.UpdateContractStatusAsync(id, request, userId!);
        if (contract is null) return NotFound(new { message = "العقد غير موجود" });
        return Ok(contract);
    }

    [HttpGet("contracts/overdue")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult> GetOverdueContracts()
    {
        var result = await _financeService.GetOverdueContractsAsync();
        return Ok(result);
    }

    // ─── Payments ───────────────────────────────────────────────────

    [HttpGet("payments")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult> GetPayments(
        [FromQuery] Guid? patientId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _financeService.GetPaymentsAsync(patientId, page, pageSize);
        return Ok(result);
    }

    [HttpPost("payments")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<PaymentDto>> CreatePayment(CreatePaymentRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var payment = await _financeService.CreatePaymentAsync(request, userId!);
        return CreatedAtAction(nameof(GetPayments), new { }, payment);
    }

    // ─── Finance Summary ────────────────────────────────────────────

    [HttpGet("patients/{patientId:guid}/summary")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult<PatientFinanceSummaryDto>> GetPatientFinanceSummary(Guid patientId)
    {
        var summary = await _financeService.GetPatientFinanceSummaryAsync(patientId);
        return Ok(summary);
    }

    [HttpGet("dashboard")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult<FinanceDashboardDto>> GetFinanceDashboard()
    {
        var dashboard = await _financeService.GetFinanceDashboardAsync();
        return Ok(dashboard);
    }

    // ─── Invoices ───────────────────────────────────────────────────

    [HttpGet("invoices")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult> GetInvoices(
        [FromQuery] Guid? patientId,
        [FromQuery] int? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _financeService.GetInvoicesAsync(patientId, page, pageSize, status);
        return Ok(result);
    }

    [HttpGet("invoices/{id:guid}")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult<InvoiceDto>> GetInvoice(Guid id)
    {
        var invoice = await _financeService.GetInvoiceByIdAsync(id);
        if (invoice is null) return NotFound(new { message = "الفاتورة غير موجودة" });
        return Ok(invoice);
    }

    [HttpPost("invoices")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<InvoiceDto>> CreateInvoice(CreateInvoiceRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var invoice = await _financeService.CreateInvoiceAsync(request, userId!);
        return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, invoice);
    }

    [HttpPut("invoices/{id:guid}/status")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<InvoiceDto>> UpdateInvoiceStatus(
        Guid id, UpdateInvoiceStatusRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var invoice = await _financeService.UpdateInvoiceStatusAsync(id, request, userId!);
        if (invoice is null) return NotFound(new { message = "الفاتورة غير موجودة" });
        return Ok(invoice);
    }

    // ─── Cashier Sessions ───────────────────────────────────────────

    [HttpPost("cashier-sessions/open")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<CashierSessionDto>> OpenCashierSession(OpenCashierSessionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var session = await _financeService.OpenCashierSessionAsync(request, userId!);
        return Ok(session);
    }

    [HttpPost("cashier-sessions/{sessionId:guid}/close")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<CashierSessionDto>> CloseCashierSession(
        Guid sessionId, CloseCashierSessionRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var session = await _financeService.CloseCashierSessionAsync(sessionId, request, userId!);
        if (session is null) return NotFound(new { message = "جلسة الكاشير غير موجودة" });
        return Ok(session);
    }

    [HttpGet("cashier-sessions/active")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult<CashierSessionDto>> GetActiveCashierSession()
    {
        var session = await _financeService.GetActiveCashierSessionAsync();
        if (session is null) return NotFound(new { message = "لا توجد جلسة كاشير مفتوحة" });
        return Ok(session);
    }

    // ─── Treasuries ─────────────────────────────────────────────────

    [HttpGet("treasuries")]
    [Authorize(Policy = "FinanceRead")]
    public async Task<ActionResult> GetTreasuries()
    {
        var result = await _financeService.GetTreasuriesAsync();
        return Ok(result);
    }

    [HttpPost("treasuries")]
    [Authorize(Policy = "FinanceWrite")]
    public async Task<ActionResult<TreasuryDto>> CreateTreasury(CreateTreasuryRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var treasury = await _financeService.CreateTreasuryAsync(request, userId!);
        return CreatedAtAction(nameof(GetTreasuries), new { }, treasury);
    }
}
