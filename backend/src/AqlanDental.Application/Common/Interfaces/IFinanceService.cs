using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Contract DTOs ─────────────────────────────────────────────────

public record ContractDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    string? Specialty,
    Guid? RelatedCaseId,
    decimal TotalAmount,
    decimal DownPayment,
    int InstallmentsCount,
    decimal? InstallmentAmount,
    DateOnly? StartDate,
    decimal DiscountAmount,
    string? DiscountReason,
    int Status,
    string StatusDisplay,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateContractRequest(
    Guid PatientId,
    string? Specialty,
    Guid? RelatedCaseId,
    decimal TotalAmount,
    decimal DownPayment,
    int InstallmentsCount,
    decimal? InstallmentAmount,
    DateOnly? StartDate,
    decimal DiscountAmount = 0,
    string? DiscountReason = null,
    string? Notes = null
);

public record UpdateContractStatusRequest(
    int Status
);

// ─── Invoice DTOs ──────────────────────────────────────────────────

public record InvoiceLineItemDto(
    Guid Id,
    Guid InvoiceId,
    Guid? ClinicServiceId,
    string ServiceNameSnapshot,
    string? Description,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    decimal LineDiscountAmount,
    Guid? DoctorId,
    string? DoctorName,
    string? ToothNumber,
    int SortOrder,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record InvoiceDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    Guid? VisitId,
    string InvoiceNumber,
    int Status,
    string StatusDisplay,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<InvoiceLineItemDto> LineItems
);

public record InvoiceListItemDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    string InvoiceNumber,
    int Status,
    string StatusDisplay,
    decimal TotalAmount,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateInvoiceLineItemRequest(
    Guid? ClinicServiceId,
    string ServiceNameSnapshot,
    string? Description,
    int Quantity = 1,
    decimal UnitPrice = 0,
    decimal LineDiscountAmount = 0,
    Guid? DoctorId = null,
    string? ToothNumber = null,
    int SortOrder = 0
);

public record CreateInvoiceRequest(
    Guid PatientId,
    Guid? VisitId,
    List<CreateInvoiceLineItemRequest> LineItems,
    decimal DiscountAmount = 0,
    decimal TaxAmount = 0,
    string? Notes = null
);

public record UpdateInvoiceStatusRequest(
    int Status
);

// ─── Payment DTOs ──────────────────────────────────────────────────

public record PaymentDto(
    Guid Id,
    Guid? ContractId,
    Guid? InvoiceId,
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    decimal Amount,
    DateTime PaymentDate,
    int PaymentMethod,
    string PaymentMethodDisplay,
    string? ServiceDescription,
    Guid? DoctorId,
    string? DoctorName,
    string? ReceivedBy,
    string? ReceiptNumber,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePaymentRequest(
    Guid? ContractId,
    Guid? InvoiceId,
    Guid PatientId,
    decimal Amount,
    DateTime? PaymentDate,
    int PaymentMethod = 0,
    string? ServiceDescription = null,
    Guid? DoctorId = null,
    string? ReceivedBy = null,
    string? Notes = null
);

// ─── Patient Finance Summary ───────────────────────────────────────

public record PatientFinanceSummaryDto(
    Guid PatientId,
    string PatientName,
    string? PatientNumber,
    decimal TotalContractsAmount,
    decimal TotalPaidAmount,
    decimal TotalOutstandingAmount,
    int ActiveContractsCount,
    int TotalPaymentsCount,
    decimal TotalInvoicesAmount,
    decimal TotalInvoicesPaidAmount
);

// ─── Finance Dashboard ─────────────────────────────────────────────

public record FinanceDashboardDto(
    decimal TodayPaymentsTotal,
    int TodayPaymentsCount,
    decimal MonthPaymentsTotal,
    int MonthPaymentsCount,
    decimal ActiveContractsTotal,
    int ActiveContractsCount,
    decimal OutstandingAmount,
    int OverdueContractsCount,
    decimal TotalTreasuryBalance,
    int OpenInvoicesCount,
    decimal OpenInvoicesTotal
);

// ─── CashierSession DTOs ───────────────────────────────────────────

public record CashierSessionDto(
    Guid Id,
    string SessionNumber,
    string CashierId,
    string CashierName,
    DateTime OpeningTime,
    DateTime? ClosingTime,
    decimal OpeningBalance,
    decimal ExpectedClosingCash,
    decimal? ActualClosingCash,
    int Status,
    string StatusDisplay,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record OpenCashierSessionRequest(
    decimal OpeningBalance,
    string? Notes = null
);

public record CloseCashierSessionRequest(
    decimal ActualClosingCash,
    string? Notes = null
);

// ─── Treasury DTOs ─────────────────────────────────────────────────

public record TreasuryDto(
    Guid Id,
    string Name,
    int Type,
    string TypeDisplay,
    decimal Balance,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateTreasuryRequest(
    string Name,
    int Type = 0,
    decimal InitialBalance = 0
);

// ─── Interface ─────────────────────────────────────────────────────

public interface IFinanceService
{
    // Contracts
    Task<PagedResult<ContractDto>> GetContractsAsync(Guid? patientId, int page, int pageSize, int? status);
    Task<ContractDto?> GetContractByIdAsync(Guid id);
    Task<ContractDto> CreateContractAsync(CreateContractRequest request, string userId);
    Task<ContractDto?> UpdateContractStatusAsync(Guid id, UpdateContractStatusRequest request, string userId);
    Task<List<ContractDto>> GetOverdueContractsAsync();

    // Payments
    Task<PagedResult<PaymentDto>> GetPaymentsAsync(Guid? patientId, int page, int pageSize);
    Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest request, string userId);

    // Finance Summary
    Task<PatientFinanceSummaryDto> GetPatientFinanceSummaryAsync(Guid patientId);
    Task<FinanceDashboardDto> GetFinanceDashboardAsync();

    // Invoices
    Task<PagedResult<InvoiceListItemDto>> GetInvoicesAsync(Guid? patientId, int page, int pageSize, int? status);
    Task<InvoiceDto?> GetInvoiceByIdAsync(Guid id);
    Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest request, string userId);
    Task<InvoiceDto?> UpdateInvoiceStatusAsync(Guid id, UpdateInvoiceStatusRequest request, string userId);

    // Cashier Sessions
    Task<CashierSessionDto> OpenCashierSessionAsync(OpenCashierSessionRequest request, string userId);
    Task<CashierSessionDto?> CloseCashierSessionAsync(Guid sessionId, CloseCashierSessionRequest request, string userId);
    Task<CashierSessionDto?> GetActiveCashierSessionAsync();

    // Treasuries
    Task<List<TreasuryDto>> GetTreasuriesAsync();
    Task<TreasuryDto> CreateTreasuryAsync(CreateTreasuryRequest request, string userId);
}
