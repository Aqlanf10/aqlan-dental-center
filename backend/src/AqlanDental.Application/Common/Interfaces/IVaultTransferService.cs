using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── VaultTransfer DTOs ────────────────────────────────────────────

public record VaultTransferDto(
    Guid Id,
    string TransferNumber,
    Guid SourceTreasuryId,
    string SourceTreasuryName,
    Guid DestinationTreasuryId,
    string DestinationTreasuryName,
    decimal Amount,
    int Status,
    string StatusDisplay,
    int? DepositSource,
    string? DepositSourceDisplay,
    string? DepositSourceDescription,
    Guid? CashierSessionId,
    string? ApprovedBy,
    DateTime? ApprovedAt,
    string? RejectionReason,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CreatedBy
);

public record CreateVaultTransferRequest(
    Guid SourceTreasuryId,
    Guid DestinationTreasuryId,
    decimal Amount,
    int? DepositSource = null,
    string? DepositSourceDescription = null,
    string? Notes = null
);

public record ApproveVaultTransferRequest(
    Guid? TreasuryId
);

public record RejectVaultTransferRequest(
    string RejectionReason
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IVaultTransferService
{
    Task<PagedResult<VaultTransferDto>> GetAllAsync(int page, int pageSize, int? status);
    Task<VaultTransferDto?> GetByIdAsync(Guid id);
    Task<VaultTransferDto> CreateAsync(CreateVaultTransferRequest request, string userId);
    Task<VaultTransferDto?> ApproveAsync(Guid id, ApproveVaultTransferRequest request, string userId);
    Task<VaultTransferDto?> RejectAsync(Guid id, RejectVaultTransferRequest request, string userId);
}
