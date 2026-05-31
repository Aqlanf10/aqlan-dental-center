using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/expenses")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _service;

    public ExpensesController(IExpenseService service) => _service = service;

    [HttpGet]
    [Authorize(Policy = "ExpenseRead")]
    public async Task<ActionResult> GetExpenses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? category = null,
        [FromQuery] int? approvalStatus = null)
    {
        var result = await _service.GetAllAsync(page, pageSize, category, approvalStatus);
        return Ok(result);
    }

    [HttpGet("pending")]
    [Authorize(Policy = "ExpenseRead")]
    public async Task<ActionResult> GetPendingExpenses([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _service.GetPendingAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "ExpenseRead")]
    public async Task<ActionResult<OperationalExpenseDto>> GetExpense(Guid id)
    {
        var expense = await _service.GetByIdAsync(id);
        if (expense is null) return NotFound(new { message = "Expense not found" });
        return Ok(expense);
    }

    [HttpPost]
    [Authorize(Policy = "ExpenseWrite")]
    public async Task<ActionResult<OperationalExpenseDto>> CreateExpense(CreateExpenseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var expense = await _service.CreateAsync(request, userId!);
        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "ExpenseApprove")]
    public async Task<ActionResult<OperationalExpenseDto>> ApproveExpense(Guid id, ApproveExpenseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var expense = await _service.ApproveAsync(id, request, userId!);
        if (expense is null) return NotFound(new { message = "Expense not found" });
        return Ok(expense);
    }

    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "ExpenseApprove")]
    public async Task<ActionResult<OperationalExpenseDto>> RejectExpense(Guid id, RejectExpenseRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var expense = await _service.RejectAsync(id, request, userId!);
        if (expense is null) return NotFound(new { message = "Expense not found" });
        return Ok(expense);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "ExpenseWrite")]
    public async Task<ActionResult> DeleteExpense(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var result = await _service.DeleteAsync(id, userId!);
        if (!result) return NotFound(new { message = "Expense not found" });
        return NoContent();
    }
}
