using AqlanDental.Application.Common.Models;

namespace AqlanDental.Application.Common.Interfaces;

// ─── Supplier DTOs ─────────────────────────────────────────────────

public record SupplierDto(
    Guid Id,
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    decimal Balance,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateSupplierRequest(
    string Name,
    string? ContactPerson = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null
);

public record UpdateSupplierRequest(
    string Name,
    string? ContactPerson = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null
);

// ─── PurchaseOrder DTOs ────────────────────────────────────────────

public record PurchaseOrderLineItemDto(
    Guid Id,
    Guid PurchaseOrderId,
    Guid? InventoryItemId,
    string ItemName,
    int Quantity,
    int ReceivedQuantity,
    decimal UnitCost,
    decimal TotalCost,
    bool IsActive
);

public record PurchaseOrderDto(
    Guid Id,
    string OrderNumber,
    Guid SupplierId,
    string SupplierName,
    int Status,
    string StatusDisplay,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CreatedBy,
    List<PurchaseOrderLineItemDto> LineItems
);

public record CreatePurchaseOrderLineItemRequest(
    Guid? InventoryItemId,
    string ItemName,
    int Quantity,
    decimal UnitCost
);

public record CreatePurchaseOrderRequest(
    Guid SupplierId,
    List<CreatePurchaseOrderLineItemRequest> LineItems,
    decimal TaxAmount = 0,
    string? Notes = null
);

// ─── SupplierBill DTOs ─────────────────────────────────────────────

public record SupplierBillDto(
    Guid Id,
    string BillNumber,
    Guid SupplierId,
    string SupplierName,
    decimal TotalAmount,
    decimal PaidAmount,
    int Status,
    string StatusDisplay,
    DateTime? DueDate,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateSupplierBillRequest(
    Guid SupplierId,
    decimal TotalAmount,
    DateTime? DueDate = null,
    string? Notes = null
);

public record SupplierBillPaymentDto(
    Guid Id,
    Guid SupplierBillId,
    decimal Amount,
    int PaymentMethod,
    string PaymentMethodDisplay,
    DateTime PaymentDate,
    Guid? TreasuryId,
    string? ReferenceNumber,
    string? Notes,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateSupplierBillPaymentRequest(
    decimal Amount,
    int PaymentMethod = 0,
    Guid? TreasuryId = null,
    string? ReferenceNumber = null,
    string? Notes = null
);

// ─── Supplier Statement ────────────────────────────────────────────

public record SupplierStatementDto(
    SupplierDto Supplier,
    decimal TotalBilled,
    decimal TotalPaid,
    decimal BalanceOwed,
    List<SupplierBillDto> RecentBills
);

// ─── Interface ─────────────────────────────────────────────────────

public interface ISupplierService
{
    // Suppliers
    Task<PagedResult<SupplierDto>> GetSuppliersAsync(int page, int pageSize, string? search);
    Task<SupplierDto?> GetSupplierByIdAsync(Guid id);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, string userId);
    Task<SupplierDto?> UpdateSupplierAsync(Guid id, UpdateSupplierRequest request, string userId);
    Task<bool> DeleteSupplierAsync(Guid id);

    // Purchase Orders
    Task<PagedResult<PurchaseOrderDto>> GetPurchaseOrdersAsync(int page, int pageSize, Guid? supplierId, int? status);
    Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(Guid id);
    Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, string userId);

    // Bills
    Task<PagedResult<SupplierBillDto>> GetSupplierBillsAsync(int page, int pageSize, Guid? supplierId, int? status);
    Task<SupplierBillDto?> GetSupplierBillByIdAsync(Guid id);
    Task<SupplierBillDto> CreateSupplierBillAsync(CreateSupplierBillRequest request, string userId);

    // Bill Payments
    Task<SupplierBillPaymentDto> CreateSupplierBillPaymentAsync(Guid billId, CreateSupplierBillPaymentRequest request, string userId);

    // Statement
    Task<SupplierStatementDto> GetSupplierStatementAsync(Guid supplierId);
}
