using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Commission DTOs ───────────────────────────────────────────────

public record DoctorCommissionPaymentDto(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    Guid? InvoiceLineItemId,
    decimal TotalPrice,
    decimal DiscountAmount,
    decimal MaterialCost,
    decimal LabCost,
    decimal NetCommissionable,
    decimal CommissionPercentage,
    decimal CommissionAmount,
    int Status,
    string StatusDisplay,
    string? ApprovedBy,
    DateTime? ApprovedAt,
    DateTime? PaidAt,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CreatedBy
);

public record CalculateCommissionRequest(
    Guid DoctorId,
    Guid InvoiceLineItemId,
    decimal CommissionPercentage,
    decimal MaterialCost = 0,
    decimal LabCost = 0
);

public record CommissionServiceDefaultsDto(
    Guid ClinicServiceId,
    string ServiceName,
    decimal CommissionPercentage
);

public record UpdateCommissionServiceDefaultsRequest(
    Guid ClinicServiceId,
    decimal CommissionPercentage
);

// ─── Interface ─────────────────────────────────────────────────────

public interface ICommissionService
{
    Task<DoctorCommissionPaymentDto> CalculateForInvoiceAsync(CalculateCommissionRequest request, string userId);
    Task<PagedResult<DoctorCommissionPaymentDto>> GetByDoctorAsync(Guid doctorId, int page, int pageSize, int? status);
    Task<PagedResult<DoctorCommissionPaymentDto>> GetAllAsync(int page, int pageSize, int? status);
    Task<DoctorCommissionPaymentDto?> GetByIdAsync(Guid id);
    Task<DoctorCommissionPaymentDto?> ApproveAsync(Guid id, string userId);
    Task<DoctorCommissionPaymentDto?> PayAsync(Guid id, Guid treasuryId, string userId);
    Task<List<CommissionServiceDefaultsDto>> GetServiceDefaultsAsync();
    Task<CommissionServiceDefaultsDto> UpdateServiceDefaultsAsync(UpdateCommissionServiceDefaultsRequest request);
}
