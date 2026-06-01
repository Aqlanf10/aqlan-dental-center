using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class CommissionService : ICommissionService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] CommissionStatusDisplay = {
        "قيد الانتظار", "معتمد", "مدفوعة", "ملغاة"
    };

    public CommissionService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<DoctorCommissionPaymentDto> CalculateForInvoiceAsync(CalculateCommissionRequest request, string userId)
    {
        var doctor = await _context.Doctors.FindAsync(request.DoctorId);
        if (doctor is null || !doctor.IsActive)
            throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");

        InvoiceLineItem? lineItem = null;
        if (request.InvoiceLineItemId != Guid.Empty)
        {
            lineItem = await _context.InvoiceLineItems.FindAsync(request.InvoiceLineItemId);
            if (lineItem is null || !lineItem.IsActive)
                throw new DomainException("INVOICE_LINE_ITEM_NOT_FOUND", "بند الفاتورة غير موجود");
        }

        if (request.CommissionPercentage < 0 || request.CommissionPercentage > 100)
            throw new DomainException("INVALID_COMMISSION_PERCENTAGE", "نسبة العمولة يجب أن تكون بين 0 و 100");

        // Calculate commission
        var totalPrice = lineItem?.TotalPrice ?? 0;
        var discountAmount = lineItem?.LineDiscountAmount ?? 0;
        var materialCost = request.MaterialCost;
        var labCost = request.LabCost;

        var netCommissionable = totalPrice - discountAmount - materialCost - labCost;
        if (netCommissionable < 0) netCommissionable = 0;

        var commissionAmount = netCommissionable * request.CommissionPercentage / 100;

        var commission = new DoctorCommissionPayment
        {
            Id = Guid.NewGuid(),
            DoctorId = request.DoctorId,
            InvoiceLineItemId = request.InvoiceLineItemId,
            TotalPrice = totalPrice,
            DiscountAmount = discountAmount,
            MaterialCost = materialCost,
            LabCost = labCost,
            NetCommissionable = netCommissionable,
            CommissionPercentage = request.CommissionPercentage,
            CommissionAmount = commissionAmount,
            Status = CommissionStatus.Pending,
            Notes = null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.DoctorCommissionPayments.Add(commission);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(commission.Id))!;
    }

    public async Task<PagedResult<DoctorCommissionPaymentDto>> GetByDoctorAsync(Guid doctorId, int page, int pageSize, int? status)
    {
        var query = _context.DoctorCommissionPayments
            .Include(c => c.Doctor)
            .Include(c => c.InvoiceLineItem)
            .Where(c => c.IsActive && c.DoctorId == doctorId);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(CommissionStatus), status.Value))
                throw new DomainException("INVALID_COMMISSION_STATUS", "حالة العمولة غير صالحة");
            query = query.Where(c => c.Status == (CommissionStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapCommissionToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<DoctorCommissionPaymentDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<PagedResult<DoctorCommissionPaymentDto>> GetAllAsync(int page, int pageSize, int? status)
    {
        var query = _context.DoctorCommissionPayments
            .Include(c => c.Doctor)
            .Include(c => c.InvoiceLineItem)
            .Where(c => c.IsActive);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(CommissionStatus), status.Value))
                throw new DomainException("INVALID_COMMISSION_STATUS", "حالة العمولة غير صالحة");
            query = query.Where(c => c.Status == (CommissionStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapCommissionToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<DoctorCommissionPaymentDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<DoctorCommissionPaymentDto?> GetByIdAsync(Guid id)
    {
        var commission = await _context.DoctorCommissionPayments
            .Include(c => c.Doctor)
            .Include(c => c.InvoiceLineItem)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        return commission is null ? null : MapCommissionToDto(commission);
    }

    public async Task<DoctorCommissionPaymentDto?> ApproveAsync(Guid id, string userId)
    {
        var commission = await _context.DoctorCommissionPayments.FindAsync(id);
        if (commission is null || !commission.IsActive) return null;

        if (commission.Status != CommissionStatus.Pending)
            throw new DomainException("COMMISSION_NOT_PENDING", "لا يمكن اعتماد عمولة ليست في حالة الانتظار");

        commission.Status = CommissionStatus.Approved;
        commission.ApprovedBy = userId;
        commission.ApprovedAt = DateTime.UtcNow;
        commission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<DoctorCommissionPaymentDto?> PayAsync(Guid id, Guid treasuryId, string userId)
    {
        var commission = await _context.DoctorCommissionPayments
            .Include(c => c.Doctor)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        if (commission is null) return null;

        if (commission.Status != CommissionStatus.Approved)
            throw new DomainException("COMMISSION_NOT_APPROVED", "لا يمكن دفع عمولة غير معتمدة");

        var treasury = await _context.Treasuries.FindAsync(treasuryId);
        if (treasury is null || !treasury.IsActive)
            throw new DomainException("TREASURY_NOT_FOUND", "الخزنة غير موجودة");

        // Create CashFlowTransaction
        var transactionNumber = await GenerateTransactionNumberAsync();
        var cashFlowTransaction = new CashFlowTransaction
        {
            Id = Guid.NewGuid(),
            TransactionNumber = transactionNumber,
            Type = TransactionType.Outflow,
            Category = FinancialCategory.DoctorCommission,
            Amount = commission.CommissionAmount,
            PaymentMethod = PaymentMethod.Cash,
            TransactionDate = DateTime.UtcNow,
            ReferenceId = commission.Id,
            Description = $"دفع عمولة: {commission.Doctor.FullName} - {commission.CommissionAmount}",
            PerformedBy = userId,
            TreasuryId = treasuryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashFlowTransactions.Add(cashFlowTransaction);
        commission.CashFlowTransactionId = cashFlowTransaction.Id;

        // Update treasury balance (decrease)
        treasury.Balance -= commission.CommissionAmount;
        treasury.UpdatedAt = DateTime.UtcNow;

        // Update commission status
        commission.Status = CommissionStatus.Paid;
        commission.PaidAt = DateTime.UtcNow;
        commission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<List<CommissionServiceDefaultsDto>> GetServiceDefaultsAsync()
    {
        var services = await _context.ClinicServices
            .Where(cs => cs.IsActive)
            .OrderBy(cs => cs.SortOrder)
            .ThenBy(cs => cs.ArabicName)
            .ToListAsync();

        // Get commission percentages from Settings
        var settings = await _context.Settings
            .Where(s => s.Category == "CommissionPercentage")
            .ToListAsync();

        var result = services.Select(cs =>
        {
            var settingKey = $"CommissionPercentage:{cs.Id}";
            var setting = settings.FirstOrDefault(s => s.Key == settingKey);
            var percentage = setting is not null && decimal.TryParse(setting.Value, out var pct) ? pct : 0m;

            return new CommissionServiceDefaultsDto(
                cs.Id,
                cs.ArabicName,
                percentage
            );
        }).ToList();

        return result;
    }

    public async Task<CommissionServiceDefaultsDto> UpdateServiceDefaultsAsync(UpdateCommissionServiceDefaultsRequest request)
    {
        var clinicService = await _context.ClinicServices.FindAsync(request.ClinicServiceId);
        if (clinicService is null || !clinicService.IsActive)
            throw new DomainException("CLINIC_SERVICE_NOT_FOUND", "الخدمة غير موجودة");

        if (request.CommissionPercentage < 0 || request.CommissionPercentage > 100)
            throw new DomainException("INVALID_COMMISSION_PERCENTAGE", "نسبة العمولة يجب أن تكون بين 0 و 100");

        var settingKey = $"CommissionPercentage:{request.ClinicServiceId}";
        var existingSetting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == settingKey);

        if (existingSetting is not null)
        {
            existingSetting.Value = request.CommissionPercentage.ToString();
            existingSetting.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var newSetting = new Setting
            {
                Id = Guid.NewGuid(),
                Key = settingKey,
                Value = request.CommissionPercentage.ToString(),
                Category = "CommissionPercentage",
                UpdatedAt = DateTime.UtcNow
            };
            _context.Settings.Add(newSetting);
        }

        await _context.SaveChangesAsync();

        return new CommissionServiceDefaultsDto(
            request.ClinicServiceId,
            clinicService.ArabicName,
            request.CommissionPercentage
        );
    }

    // ─── Private helpers ───────────────────────────────────────────

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

    private static DoctorCommissionPaymentDto MapCommissionToDto(DoctorCommissionPayment c) => new(
        c.Id,
        c.DoctorId,
        c.Doctor?.FullName ?? string.Empty,
        c.InvoiceLineItemId,
        c.TotalPrice,
        c.DiscountAmount,
        c.MaterialCost,
        c.LabCost,
        c.NetCommissionable,
        c.CommissionPercentage,
        c.CommissionAmount,
        (int)c.Status,
        GetCommissionStatusDisplay((int)c.Status),
        c.ApprovedBy,
        c.ApprovedAt,
        c.PaidAt,
        c.Notes,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt,
        c.CreatedBy
    );

    private static string GetCommissionStatusDisplay(int status) =>
        status >= 0 && status < CommissionStatusDisplay.Length
            ? CommissionStatusDisplay[status]
            : status.ToString();
}
