using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Expense DTOs ──────────────────────────────────────────────────

public record OperationalExpenseDto(
    Guid Id,
    string ExpenseNumber,
    int Category,
    string CategoryDisplay,
    decimal Amount,
    int PaymentMethod,
    string PaymentMethodDisplay,
    string? SupplierName,
    Guid? LabOrderId,
    string? ReceiptAttachmentUrl,
    int ApprovalStatus,
    string ApprovalStatusDisplay,
    string? ApprovedBy,
    DateTime? ApprovedAt,
    string? RejectionReason,
    bool IsPostedToLedger,
    Guid? TreasuryId,
    string? TreasuryName,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CreatedBy
);

public record CreateExpenseRequest(
    int Category,
    decimal Amount,
    int PaymentMethod = 0,
    string? SupplierName = null,
    Guid? LabOrderId = null,
    string? ReceiptAttachmentUrl = null,
    Guid? TreasuryId = null,
    string? Notes = null
);

public record ApproveExpenseRequest(
    Guid? TreasuryId
);

public record RejectExpenseRequest(
    string RejectionReason
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IExpenseService
{
    Task<OperationalExpenseDto> CreateAsync(CreateExpenseRequest request, string userId);
    Task<PagedResult<OperationalExpenseDto>> GetAllAsync(int page, int pageSize, int? category, int? approvalStatus);
    Task<PagedResult<OperationalExpenseDto>> GetPendingAsync(int page, int pageSize);
    Task<OperationalExpenseDto?> GetByIdAsync(Guid id);
    Task<OperationalExpenseDto?> ApproveAsync(Guid id, ApproveExpenseRequest request, string userId);
    Task<OperationalExpenseDto?> RejectAsync(Guid id, RejectExpenseRequest request, string userId);
    Task<bool> DeleteAsync(Guid id, string userId);
}
