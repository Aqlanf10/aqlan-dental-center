using AqlanDental.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AqlanDental.Api.Controllers;

[ApiController]
[Route("api/employees")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet]
    [Authorize(Policy = "EmployeesRead")]
    public async Task<ActionResult> GetEmployees(
        [FromQuery] string? position,
        [FromQuery] bool? activeOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _employeeService.GetEmployeesAsync(position, activeOnly, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "EmployeesRead")]
    public async Task<ActionResult<EmployeeDto>> GetEmployee(Guid id)
    {
        var employee = await _employeeService.GetEmployeeByIdAsync(id);
        if (employee is null) return NotFound(new { message = "الموظف غير موجود" });
        return Ok(employee);
    }

    [HttpPost]
    [Authorize(Policy = "EmployeesWrite")]
    public async Task<ActionResult<EmployeeDto>> CreateEmployee(CreateEmployeeRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var employee = await _employeeService.CreateEmployeeAsync(request, userId!);
        return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, employee);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "EmployeesWrite")]
    public async Task<ActionResult<EmployeeDto>> UpdateEmployee(
        Guid id, UpdateEmployeeRequest request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var employee = await _employeeService.UpdateEmployeeAsync(id, request, userId!);
        if (employee is null) return NotFound(new { message = "الموظف غير موجود" });
        return Ok(employee);
    }
}
