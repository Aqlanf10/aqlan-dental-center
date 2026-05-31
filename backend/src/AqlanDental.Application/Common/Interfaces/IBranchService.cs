namespace AqlanDental.Application.Common.Interfaces;

// ─── Branch DTOs ───────────────────────────────────────────────────

public record BranchDto(
    Guid Id,
    string Name,
    string? Address,
    string? Phone,
    bool IsMain,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateBranchRequest(
    string Name,
    string? Address,
    string? Phone,
    bool IsMain
);

public record UpdateBranchRequest(
    string? Name,
    string? Address,
    string? Phone,
    bool? IsMain
);

// ─── Interface ──────────────────────────────────────────────────────

public interface IBranchService
{
    Task<List<BranchDto>> GetBranchesAsync();
    Task<BranchDto?> GetBranchByIdAsync(Guid id);
    Task<BranchDto> CreateBranchAsync(CreateBranchRequest request, string userId);
    Task<BranchDto?> UpdateBranchAsync(Guid id, UpdateBranchRequest request, string userId);
}
