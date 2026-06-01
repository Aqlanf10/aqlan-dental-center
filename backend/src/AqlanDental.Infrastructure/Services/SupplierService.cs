using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] BillStatusDisplay = {
        "غير مدفوعة", "مدفوعة جزئياً", "مدفوعة بالكامل", "ملغاة"
    };

    private static readonly string[] PurchaseOrderStatusDisplay = {
        "مسودة", "مقدم", "مستلم جزئياً", "مستلم", "ملغي"
    };

    private static readonly string[] PaymentMethodDisplay = {
        "نقدي", "بطاقة", "تحويل بنكي", "شيك", "أخرى"
    };

    public SupplierService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── Suppliers ─────────────────────────────────────────────────

    public async Task<PagedResult<SupplierDto>> GetSuppliersAsync(int page, int pageSize, string? search)
    {
        var query = _context.Suppliers.Where(s => s.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(term)) ||
                (s.Phone != null && s.Phone.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapSupplierToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<SupplierDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<SupplierDto?> GetSupplierByIdAsync(Guid id)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.PurchaseOrders)
            .Include(s => s.Bills)
            .FirstOrDefaultAsync(s => s.Id == id && s.IsActive);

        return supplier is null ? null : MapSupplierToDto(supplier);
    }

    public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("SUPPLIER_NAME_REQUIRED", "اسم المورد مطلوب");

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            Balance = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return (await GetSupplierByIdAsync(supplier.Id))!;
    }

    public async Task<SupplierDto?> UpdateSupplierAsync(Guid id, UpdateSupplierRequest request, string userId)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier is null || !supplier.IsActive) return null;

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainException("SUPPLIER_NAME_REQUIRED", "اسم المورد مطلوب");

        supplier.Name = request.Name.Trim();
        supplier.ContactPerson = request.ContactPerson?.Trim();
        supplier.Phone = request.Phone?.Trim();
        supplier.Email = request.Email?.Trim();
        supplier.Address = request.Address?.Trim();
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetSupplierByIdAsync(id);
    }

    public async Task<bool> DeleteSupplierAsync(Guid id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier is null || !supplier.IsActive) return false;

        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Purchase Orders ───────────────────────────────────────────

    public async Task<PagedResult<PurchaseOrderDto>> GetPurchaseOrdersAsync(int page, int pageSize, Guid? supplierId, int? status)
    {
        var query = _context.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.LineItems.Where(li => li.IsActive))
            .Where(po => po.IsActive);

        if (supplierId.HasValue)
            query = query.Where(po => po.SupplierId == supplierId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(PurchaseOrderStatus), status.Value))
                throw new DomainException("INVALID_PO_STATUS", "حالة أمر الشراء غير صالحة");
            query = query.Where(po => po.Status == (PurchaseOrderStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(po => po.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapPurchaseOrderToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<PurchaseOrderDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(Guid id)
    {
        var po = await _context.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.LineItems.Where(li => li.IsActive))
            .FirstOrDefaultAsync(po => po.Id == id && po.IsActive);

        return po is null ? null : MapPurchaseOrderToDto(po);
    }

    public async Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, string userId)
    {
        var supplier = await _context.Suppliers.FindAsync(request.SupplierId);
        if (supplier is null || !supplier.IsActive)
            throw new DomainException("SUPPLIER_NOT_FOUND", "المورد غير موجود");

        if (request.LineItems is null || request.LineItems.Count == 0)
            throw new DomainException("PO_LINE_ITEMS_REQUIRED", "أمر الشراء يجب أن يحتوي على عنصر واحد على الأقل");

        var orderNumber = await GenerateOrderNumberAsync();

        var subtotal = request.LineItems.Sum(li => li.Quantity * li.UnitCost);
        var totalAmount = subtotal + request.TaxAmount;

        var purchaseOrder = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            SupplierId = request.SupplierId,
            Status = PurchaseOrderStatus.Draft,
            Subtotal = subtotal,
            TaxAmount = request.TaxAmount,
            TotalAmount = totalAmount,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        foreach (var liRequest in request.LineItems)
        {
            var lineItem = new PurchaseOrderLineItem
            {
                Id = Guid.NewGuid(),
                PurchaseOrderId = purchaseOrder.Id,
                InventoryItemId = liRequest.InventoryItemId,
                ItemName = liRequest.ItemName.Trim(),
                Quantity = liRequest.Quantity,
                ReceivedQuantity = 0,
                UnitCost = liRequest.UnitCost,
                TotalCost = liRequest.Quantity * liRequest.UnitCost,
                IsActive = true
            };
            purchaseOrder.LineItems.Add(lineItem);
        }

        _context.PurchaseOrders.Add(purchaseOrder);
        await _context.SaveChangesAsync();

        return (await GetPurchaseOrderByIdAsync(purchaseOrder.Id))!;
    }

    // ─── Supplier Bills ────────────────────────────────────────────

    public async Task<PagedResult<SupplierBillDto>> GetSupplierBillsAsync(int page, int pageSize, Guid? supplierId, int? status)
    {
        var query = _context.SupplierBills
            .Include(b => b.Supplier)
            .Where(b => b.IsActive);

        if (supplierId.HasValue)
            query = query.Where(b => b.SupplierId == supplierId.Value);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(BillStatus), status.Value))
                throw new DomainException("INVALID_BILL_STATUS", "حالة الفاتورة غير صالحة");
            query = query.Where(b => b.Status == (BillStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapSupplierBillToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<SupplierBillDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<SupplierBillDto?> GetSupplierBillByIdAsync(Guid id)
    {
        var bill = await _context.SupplierBills
            .Include(b => b.Supplier)
            .Include(b => b.Payments.Where(p => p.IsActive))
            .FirstOrDefaultAsync(b => b.Id == id && b.IsActive);

        return bill is null ? null : MapSupplierBillToDto(bill);
    }

    public async Task<SupplierBillDto> CreateSupplierBillAsync(CreateSupplierBillRequest request, string userId)
    {
        var supplier = await _context.Suppliers.FindAsync(request.SupplierId);
        if (supplier is null || !supplier.IsActive)
            throw new DomainException("SUPPLIER_NOT_FOUND", "المورد غير موجود");

        if (request.TotalAmount <= 0)
            throw new DomainException("INVALID_BILL_AMOUNT", "مبلغ الفاتورة يجب أن يكون أكبر من صفر");

        var billNumber = await GenerateBillNumberAsync();

        var bill = new SupplierBill
        {
            Id = Guid.NewGuid(),
            BillNumber = billNumber,
            SupplierId = request.SupplierId,
            TotalAmount = request.TotalAmount,
            PaidAmount = 0,
            Status = BillStatus.Unpaid,
            DueDate = request.DueDate,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SupplierBills.Add(bill);

        // Update supplier balance (increase what is owed)
        supplier.Balance += request.TotalAmount;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return (await GetSupplierBillByIdAsync(bill.Id))!;
    }

    // ─── Bill Payments ─────────────────────────────────────────────

    public async Task<SupplierBillPaymentDto> CreateSupplierBillPaymentAsync(Guid billId, CreateSupplierBillPaymentRequest request, string userId)
    {
        var bill = await _context.SupplierBills
            .Include(b => b.Supplier)
            .FirstOrDefaultAsync(b => b.Id == billId && b.IsActive);

        if (bill is null)
            throw new DomainException("BILL_NOT_FOUND", "فاتورة المورد غير موجودة");

        if (bill.Status == BillStatus.FullyPaid)
            throw new DomainException("BILL_ALREADY_PAID", "الفاتورة مدفوعة بالكامل");

        if (bill.Status == BillStatus.Cancelled)
            throw new DomainException("BILL_CANCELLED", "لا يمكن الدفع على فاتورة ملغاة");

        if (request.Amount <= 0)
            throw new DomainException("INVALID_PAYMENT_AMOUNT", "مبلغ الدفع يجب أن يكون أكبر من صفر");

        if (!Enum.IsDefined(typeof(PaymentMethod), request.PaymentMethod))
            throw new DomainException("INVALID_PAYMENT_METHOD", "طريقة الدفع غير صالحة");

        Treasury? treasury = null;
        if (request.TreasuryId.HasValue)
        {
            treasury = await _context.Treasuries.FindAsync(request.TreasuryId.Value);
            if (treasury is null || !treasury.IsActive)
                throw new DomainException("TREASURY_NOT_FOUND", "الخزنة غير موجودة");
        }

        var payment = new SupplierBillPayment
        {
            Id = Guid.NewGuid(),
            SupplierBillId = billId,
            Amount = request.Amount,
            PaymentMethod = (PaymentMethod)request.PaymentMethod,
            PaymentDate = DateTime.UtcNow,
            TreasuryId = request.TreasuryId,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupplierBillPayments.Add(payment);

        // Update bill paid amount and status
        bill.PaidAmount += request.Amount;
        bill.UpdatedAt = DateTime.UtcNow;

        if (bill.PaidAmount >= bill.TotalAmount)
            bill.Status = BillStatus.FullyPaid;
        else if (bill.PaidAmount > 0)
            bill.Status = BillStatus.PartiallyPaid;

        // Update supplier balance (decrease what is owed)
        bill.Supplier.Balance -= request.Amount;
        bill.Supplier.UpdatedAt = DateTime.UtcNow;

        // Create CashFlowTransaction
        var transactionNumber = await GenerateTransactionNumberAsync();
        var cashFlowTransaction = new CashFlowTransaction
        {
            Id = Guid.NewGuid(),
            TransactionNumber = transactionNumber,
            Type = TransactionType.Outflow,
            Category = FinancialCategory.SupplierPayment,
            Amount = request.Amount,
            PaymentMethod = (PaymentMethod)request.PaymentMethod,
            TransactionDate = payment.PaymentDate,
            ReferenceId = payment.Id,
            ReferenceNumber = bill.BillNumber,
            Description = $"دفع مورد: {bill.Supplier.Name} - فاتورة {bill.BillNumber}",
            PerformedBy = userId,
            TreasuryId = request.TreasuryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashFlowTransactions.Add(cashFlowTransaction);

        // Update treasury balance (decrease)
        if (treasury is not null)
        {
            treasury.Balance -= request.Amount;
            treasury.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return MapSupplierBillPaymentToDto(payment);
    }

    // ─── Statement ─────────────────────────────────────────────────

    public async Task<SupplierStatementDto> GetSupplierStatementAsync(Guid supplierId)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.Bills.Where(b => b.IsActive))
                .ThenInclude(b => b.Payments.Where(p => p.IsActive))
            .FirstOrDefaultAsync(s => s.Id == supplierId && s.IsActive);

        if (supplier is null)
            throw new DomainException("SUPPLIER_NOT_FOUND", "المورد غير موجود");

        var totalBilled = supplier.Bills.Sum(b => b.TotalAmount);
        var totalPaid = supplier.Bills.Sum(b => b.PaidAmount);
        var balanceOwed = totalBilled - totalPaid;

        var recentBills = supplier.Bills
            .OrderByDescending(b => b.CreatedAt)
            .Take(20)
            .Select(MapSupplierBillToDto)
            .ToList();

        return new SupplierStatementDto(
            MapSupplierToDto(supplier),
            totalBilled,
            totalPaid,
            balanceOwed,
            recentBills
        );
    }

    // ─── Private helpers ───────────────────────────────────────────

    private async Task<string> GenerateOrderNumberAsync()
    {
        var lastPo = await _context.PurchaseOrders
            .OrderByDescending(po => po.OrderNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastPo is not null && lastPo.OrderNumber.StartsWith("PO-"))
        {
            if (int.TryParse(lastPo.OrderNumber[3..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"PO-{nextNumber:D5}";
    }

    private async Task<string> GenerateBillNumberAsync()
    {
        var lastBill = await _context.SupplierBills
            .OrderByDescending(b => b.BillNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastBill is not null && lastBill.BillNumber.StartsWith("BIL-"))
        {
            if (int.TryParse(lastBill.BillNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"BIL-{nextNumber:D5}";
    }

    private async Task<string> GenerateTransactionNumberAsync()
    {
        var lastTxn = await _context.CashFlowTransactions
            .OrderByDescending(t => t.TransactionNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastTxn is not null && lastTxn.TransactionNumber.StartsWith("TXN-"))
        {
            if (int.TryParse(lastTxn.TransactionNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"TXN-{nextNumber:D5}";
    }

    // ─── Mapping methods ───────────────────────────────────────────

    private static SupplierDto MapSupplierToDto(Supplier s) => new(
        s.Id,
        s.Name,
        s.ContactPerson,
        s.Phone,
        s.Email,
        s.Address,
        s.Balance,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static PurchaseOrderDto MapPurchaseOrderToDto(PurchaseOrder po) => new(
        po.Id,
        po.OrderNumber,
        po.SupplierId,
        po.Supplier?.Name ?? string.Empty,
        (int)po.Status,
        GetPurchaseOrderStatusDisplay((int)po.Status),
        po.Subtotal,
        po.TaxAmount,
        po.TotalAmount,
        po.Notes,
        po.IsActive,
        po.CreatedAt,
        po.UpdatedAt,
        po.CreatedBy,
        po.LineItems.Where(li => li.IsActive).Select(MapPurchaseOrderLineItemToDto).ToList()
    );

    private static PurchaseOrderLineItemDto MapPurchaseOrderLineItemToDto(PurchaseOrderLineItem li) => new(
        li.Id,
        li.PurchaseOrderId,
        li.InventoryItemId,
        li.ItemName,
        li.Quantity,
        li.ReceivedQuantity,
        li.UnitCost,
        li.TotalCost,
        li.IsActive
    );

    private static SupplierBillDto MapSupplierBillToDto(SupplierBill b) => new(
        b.Id,
        b.BillNumber,
        b.SupplierId,
        b.Supplier?.Name ?? string.Empty,
        b.TotalAmount,
        b.PaidAmount,
        (int)b.Status,
        GetBillStatusDisplay((int)b.Status),
        b.DueDate,
        b.Notes,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt
    );

    private static SupplierBillPaymentDto MapSupplierBillPaymentToDto(SupplierBillPayment p) => new(
        p.Id,
        p.SupplierBillId,
        p.Amount,
        (int)p.PaymentMethod,
        GetPaymentMethodDisplay((int)p.PaymentMethod),
        p.PaymentDate,
        p.TreasuryId,
        p.ReferenceNumber,
        p.Notes,
        p.IsActive,
        p.CreatedAt
    );

    private static string GetBillStatusDisplay(int status) =>
        status >= 0 && status < BillStatusDisplay.Length
            ? BillStatusDisplay[status]
            : status.ToString();

    private static string GetPurchaseOrderStatusDisplay(int status) =>
        status >= 0 && status < PurchaseOrderStatusDisplay.Length
            ? PurchaseOrderStatusDisplay[status]
            : status.ToString();

    private static string GetPaymentMethodDisplay(int method) =>
        method >= 0 && method < PaymentMethodDisplay.Length
            ? PaymentMethodDisplay[method]
            : method == 99 ? PaymentMethodDisplay[4] : method.ToString();
}
