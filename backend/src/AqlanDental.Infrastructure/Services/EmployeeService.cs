using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly AqlanDentalDbContext _context;

    public EmployeeService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<EmployeeDto>> GetEmployeesAsync(
        string? position, bool? activeOnly, int page, int pageSize)
    {
        var query = _context.Employees.AsQueryable();

        if (activeOnly.HasValue && activeOnly.Value)
            query = query.Where(e => e.IsActive);

        if (!string.IsNullOrWhiteSpace(position))
            query = query.Where(e => e.Position == position);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<EmployeeDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<EmployeeDto?> GetEmployeeByIdAsync(Guid id)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id);

        return employee is null ? null : MapToDto(employee);
    }

    public async Task<EmployeeDto> CreateEmployeeAsync(
        CreateEmployeeRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new DomainException("NAME_REQUIRED", "اسم الموظف مطلوب");

        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Phone = request.Phone?.Trim(),
            Position = request.Position?.Trim(),
            HireDate = request.HireDate,
            BaseSalary = request.BaseSalary,
            EmergencyContact = request.EmergencyContact?.Trim(),
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return (await GetEmployeeByIdAsync(employee.Id))!;
    }

    public async Task<EmployeeDto?> UpdateEmployeeAsync(
        Guid id, UpdateEmployeeRequest request, string userId)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee is null) return null;

        if (request.FullName is not null)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new DomainException("NAME_REQUIRED", "اسم الموظف لا يمكن أن يكون فارغاً");
            employee.FullName = request.FullName.Trim();
        }
        if (request.Phone is not null)
            employee.Phone = request.Phone.Trim();
        if (request.Position is not null)
            employee.Position = request.Position.Trim();
        if (request.HireDate.HasValue)
            employee.HireDate = request.HireDate.Value;
        if (request.BaseSalary.HasValue)
            employee.BaseSalary = request.BaseSalary.Value;
        if (request.EmergencyContact is not null)
            employee.EmergencyContact = request.EmergencyContact.Trim();
        if (request.Notes is not null)
            employee.Notes = request.Notes.Trim();

        employee.UpdatedAt = DateTime.UtcNow;
        employee.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetEmployeeByIdAsync(id);
    }

    private static EmployeeDto MapToDto(Employee e) => new(
        e.Id,
        e.FullName,
        e.Phone,
        e.Position,
        e.HireDate,
        e.BaseSalary,
        e.EmergencyContact,
        e.Notes,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt
    );
}
