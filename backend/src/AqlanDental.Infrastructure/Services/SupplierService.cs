using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;

namespace AqlanDental.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    // Suppliers
    public Task<PagedResult<SupplierDto>> GetSuppliersAsync(int page, int pageSize, string? search)
        => Task.FromResult(new PagedResult<SupplierDto>([], 0, page, pageSize, 0));

    public Task<SupplierDto?> GetSupplierByIdAsync(Guid id)
        => Task.FromResult<SupplierDto?>(null);

    public Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, string userId)
        => throw new NotImplementedException();

    public Task<SupplierDto?> UpdateSupplierAsync(Guid id, UpdateSupplierRequest request, string userId)
        => Task.FromResult<SupplierDto?>(null);

    public Task<bool> DeleteSupplierAsync(Guid id)
        => Task.FromResult(false);

    // Purchase Orders
    public Task<PagedResult<PurchaseOrderDto>> GetPurchaseOrdersAsync(int page, int pageSize, Guid? supplierId, int? status)
        => Task.FromResult(new PagedResult<PurchaseOrderDto>([], 0, page, pageSize, 0));

    public Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(Guid id)
        => Task.FromResult<PurchaseOrderDto?>(null);

    public Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, string userId)
        => throw new NotImplementedException();

    // Bills
    public Task<PagedResult<SupplierBillDto>> GetSupplierBillsAsync(int page, int pageSize, Guid? supplierId, int? status)
        => Task.FromResult(new PagedResult<SupplierBillDto>([], 0, page, pageSize, 0));

    public Task<SupplierBillDto?> GetSupplierBillByIdAsync(Guid id)
        => Task.FromResult<SupplierBillDto?>(null);

    public Task<SupplierBillDto> CreateSupplierBillAsync(CreateSupplierBillRequest request, string userId)
        => throw new NotImplementedException();

    // Bill Payments
    public Task<SupplierBillPaymentDto> CreateSupplierBillPaymentAsync(Guid billId, CreateSupplierBillPaymentRequest request, string userId)
        => throw new NotImplementedException();

    // Statement
    public Task<SupplierStatementDto> GetSupplierStatementAsync(Guid supplierId)
        => throw new NotImplementedException();
}
