using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly AqlanDentalDbContext _context;

    public InventoryService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<InventoryItemDto>> GetInventoryItemsAsync(
        string? category, bool? lowStock, int page, int pageSize)
    {
        var query = _context.InventoryItems
            .Where(i => i.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(i => i.Category == category);

        if (lowStock.HasValue && lowStock.Value)
            query = query.Where(i => i.Quantity <= i.MinQuantity);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<InventoryItemDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<InventoryItemDto?> GetInventoryItemByIdAsync(Guid id)
    {
        var item = await _context.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == id && i.IsActive);

        return item is null ? null : MapToDto(item);
    }

    public async Task<InventoryItemDto> CreateInventoryItemAsync(
        CreateInventoryItemRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("NAME_REQUIRED", "اسم المادة مطلوب");

        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Category = request.Category?.Trim(),
            Quantity = request.Quantity,
            MinQuantity = request.MinQuantity,
            Unit = request.Unit?.Trim(),
            CostPerUnit = request.CostPerUnit,
            BatchNumber = request.BatchNumber?.Trim(),
            ExpiryDate = request.ExpiryDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();

        return (await GetInventoryItemByIdAsync(item.Id))!;
    }

    public async Task<InventoryItemDto?> UpdateInventoryItemAsync(
        Guid id, UpdateInventoryItemRequest request, string userId)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item is null || !item.IsActive) return null;

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new DomainException("NAME_REQUIRED", "اسم المادة لا يمكن أن يكون فارغاً");
            item.Name = request.Name.Trim();
        }
        if (request.Category is not null)
            item.Category = request.Category.Trim();
        if (request.Quantity.HasValue)
            item.Quantity = request.Quantity.Value;
        if (request.MinQuantity.HasValue)
            item.MinQuantity = request.MinQuantity.Value;
        if (request.Unit is not null)
            item.Unit = request.Unit.Trim();
        if (request.CostPerUnit.HasValue)
            item.CostPerUnit = request.CostPerUnit.Value;
        if (request.BatchNumber is not null)
            item.BatchNumber = request.BatchNumber.Trim();
        if (request.ExpiryDate.HasValue)
            item.ExpiryDate = request.ExpiryDate.Value;

        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetInventoryItemByIdAsync(id);
    }

    private static InventoryItemDto MapToDto(InventoryItem i) => new(
        i.Id,
        i.Name,
        i.Category,
        i.Quantity,
        i.MinQuantity,
        i.Unit,
        i.CostPerUnit,
        i.BatchNumber,
        i.ExpiryDate,
        i.Quantity <= i.MinQuantity,
        i.IsActive,
        i.CreatedAt,
        i.UpdatedAt
    );
}
