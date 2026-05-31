using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class BranchService : IBranchService
{
    private readonly AqlanDentalDbContext _context;

    public BranchService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<List<BranchDto>> GetBranchesAsync()
    {
        var branches = await _context.Branches
            .OrderByDescending(b => b.IsMain)
            .ThenBy(b => b.Name)
            .ToListAsync();

        return branches.Select(MapToDto).ToList();
    }

    public async Task<BranchDto?> GetBranchByIdAsync(Guid id)
    {
        var branch = await _context.Branches.FindAsync(id);
        return branch is null ? null : MapToDto(branch);
    }

    public async Task<BranchDto> CreateBranchAsync(
        CreateBranchRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("NAME_REQUIRED", "اسم الفرع مطلوب");

        if (request.IsMain)
        {
            var existingMain = await _context.Branches
                .FirstOrDefaultAsync(b => b.IsMain && b.IsActive);
            if (existingMain is not null)
                throw new DomainException("MAIN_BRANCH_EXISTS", "يوجد فرع رئيسي بالفعل");
        }

        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Address = request.Address?.Trim(),
            Phone = request.Phone?.Trim(),
            IsMain = request.IsMain,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync();

        return (await GetBranchByIdAsync(branch.Id))!;
    }

    public async Task<BranchDto?> UpdateBranchAsync(
        Guid id, UpdateBranchRequest request, string userId)
    {
        var branch = await _context.Branches.FindAsync(id);
        if (branch is null) return null;

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new DomainException("NAME_REQUIRED", "اسم الفرع لا يمكن أن يكون فارغاً");
            branch.Name = request.Name.Trim();
        }
        if (request.Address is not null)
            branch.Address = request.Address.Trim();
        if (request.Phone is not null)
            branch.Phone = request.Phone.Trim();
        if (request.IsMain.HasValue && request.IsMain.Value && !branch.IsMain)
        {
            var existingMain = await _context.Branches
                .FirstOrDefaultAsync(b => b.IsMain && b.IsActive && b.Id != id);
            if (existingMain is not null)
                throw new DomainException("MAIN_BRANCH_EXISTS", "يوجد فرع رئيسي بالفعل");
            branch.IsMain = true;
        }

        branch.UpdatedAt = DateTime.UtcNow;
        branch.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetBranchByIdAsync(id);
    }

    private static BranchDto MapToDto(Branch b) => new(
        b.Id,
        b.Name,
        b.Address,
        b.Phone,
        b.IsMain,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt
    );
}
