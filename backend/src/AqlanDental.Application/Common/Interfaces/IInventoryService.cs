using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── InventoryItem DTOs ────────────────────────────────────────────

public record InventoryItemDto(
    Guid Id,
    string Name,
    string? Category,
    int Quantity,
    int MinQuantity,
    string? Unit,
    decimal? CostPerUnit,
    string? BatchNumber,
    DateOnly? ExpiryDate,
    bool IsLowStock,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateInventoryItemRequest(
    string Name,
    string? Category,
    int Quantity,
    int MinQuantity,
    string? Unit,
    decimal? CostPerUnit,
    string? BatchNumber,
    DateOnly? ExpiryDate
);

public record UpdateInventoryItemRequest(
    string? Name,
    string? Category,
    int? Quantity,
    int? MinQuantity,
    string? Unit,
    decimal? CostPerUnit,
    string? BatchNumber,
    DateOnly? ExpiryDate
);

// ─── Interface ──────────────────────────────────────────────────────

public interface IInventoryService
{
    Task<PagedResult<InventoryItemDto>> GetInventoryItemsAsync(string? category, bool? lowStock, int page, int pageSize);
    Task<InventoryItemDto?> GetInventoryItemByIdAsync(Guid id);
    Task<InventoryItemDto> CreateInventoryItemAsync(CreateInventoryItemRequest request, string userId);
    Task<InventoryItemDto?> UpdateInventoryItemAsync(Guid id, UpdateInventoryItemRequest request, string userId);
}
