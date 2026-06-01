using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class VaultTransferService : IVaultTransferService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] TransferStatusDisplay = {
        "قيد الانتظار", "معتمد", "مرفوض"
    };

    private static readonly string[] DepositSourceDisplay = {
        "رأس مال المالك", "رصيد افتتاحي", "مستحقات أخرى", "مستند إيرادات معتمد"
    };

    public VaultTransferService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<VaultTransferDto>> GetAllAsync(int page, int pageSize, int? status)
    {
        var query = _context.VaultTransfers
            .Include(vt => vt.SourceTreasury)
            .Include(vt => vt.DestinationTreasury)
            .Where(vt => vt.IsActive);

        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(TransferStatus), status.Value))
                throw new DomainException("INVALID_TRANSFER_STATUS", "حالة التحويل غير صالحة");
            query = query.Where(vt => vt.Status == (TransferStatus)status.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(vt => vt.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapVaultTransferToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<VaultTransferDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<VaultTransferDto?> GetByIdAsync(Guid id)
    {
        var transfer = await _context.VaultTransfers
            .Include(vt => vt.SourceTreasury)
            .Include(vt => vt.DestinationTreasury)
            .FirstOrDefaultAsync(vt => vt.Id == id && vt.IsActive);

        return transfer is null ? null : MapVaultTransferToDto(transfer);
    }

    public async Task<VaultTransferDto> CreateAsync(CreateVaultTransferRequest request, string userId)
    {
        if (request.SourceTreasuryId == request.DestinationTreasuryId)
            throw new DomainException("SAME_TREASURY", "لا يمكن التحويل بين نفس الخزنة");

        if (request.Amount <= 0)
            throw new DomainException("INVALID_TRANSFER_AMOUNT", "مبلغ التحويل يجب أن يكون أكبر من صفر");

        var sourceTreasury = await _context.Treasuries.FindAsync(request.SourceTreasuryId);
        if (sourceTreasury is null || !sourceTreasury.IsActive)
            throw new DomainException("SOURCE_TREASURY_NOT_FOUND", "خزنة المصدر غير موجودة");

        var destinationTreasury = await _context.Treasuries.FindAsync(request.DestinationTreasuryId);
        if (destinationTreasury is null || !destinationTreasury.IsActive)
            throw new DomainException("DESTINATION_TREASURY_NOT_FOUND", "خزنة الوجهة غير موجودة");

        if (request.DepositSource.HasValue && !Enum.IsDefined(typeof(DepositSource), request.DepositSource.Value))
            throw new DomainException("INVALID_DEPOSIT_SOURCE", "مصدر الإيداع غير صالح");

        var transferNumber = await GenerateTransferNumberAsync();

        var transfer = new VaultTransfer
        {
            Id = Guid.NewGuid(),
            TransferNumber = transferNumber,
            SourceTreasuryId = request.SourceTreasuryId,
            DestinationTreasuryId = request.DestinationTreasuryId,
            Amount = request.Amount,
            Status = TransferStatus.Pending,
            DepositSource = request.DepositSource.HasValue ? (DepositSource)request.DepositSource.Value : null,
            DepositSourceDescription = request.DepositSourceDescription?.Trim(),
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _context.VaultTransfers.Add(transfer);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(transfer.Id))!;
    }

    public async Task<VaultTransferDto?> ApproveAsync(Guid id, ApproveVaultTransferRequest request, string userId)
    {
        var transfer = await _context.VaultTransfers
            .Include(vt => vt.SourceTreasury)
            .Include(vt => vt.DestinationTreasury)
            .FirstOrDefaultAsync(vt => vt.Id == id && vt.IsActive);

        if (transfer is null) return null;

        if (transfer.Status != TransferStatus.Pending)
            throw new DomainException("TRANSFER_NOT_PENDING", "لا يمكن اعتماد تحويل ليس في حالة الانتظار");

        var sourceTreasury = await _context.Treasuries.FindAsync(transfer.SourceTreasuryId);
        if (sourceTreasury is null || !sourceTreasury.IsActive)
            throw new DomainException("SOURCE_TREASURY_NOT_FOUND", "خزنة المصدر غير موجودة");

        var destinationTreasury = await _context.Treasuries.FindAsync(transfer.DestinationTreasuryId);
        if (destinationTreasury is null || !destinationTreasury.IsActive)
            throw new DomainException("DESTINATION_TREASURY_NOT_FOUND", "خزنة الوجهة غير موجودة");

        // Validate source has sufficient balance
        if (sourceTreasury.Balance < transfer.Amount)
            throw new DomainException("INSUFFICIENT_TREASURY_BALANCE", "رصيد الخزنة المصدر غير كافٍ");

        // Update source treasury balance (decrease)
        sourceTreasury.Balance -= transfer.Amount;
        sourceTreasury.UpdatedAt = DateTime.UtcNow;

        // Update destination treasury balance (increase)
        destinationTreasury.Balance += transfer.Amount;
        destinationTreasury.UpdatedAt = DateTime.UtcNow;

        // Create CashFlowTransaction for the outflow from source
        var transactionNumber = await GenerateTransactionNumberAsync();
        var cashFlowTransaction = new CashFlowTransaction
        {
            Id = Guid.NewGuid(),
            TransactionNumber = transactionNumber,
            Type = TransactionType.Outflow,
            Category = FinancialCategory.InternalTransfer,
            Amount = transfer.Amount,
            PaymentMethod = PaymentMethod.Cash,
            TransactionDate = DateTime.UtcNow,
            ReferenceId = transfer.Id,
            ReferenceNumber = transfer.TransferNumber,
            Description = $"تحويل خزنة: من {sourceTreasury.Name} إلى {destinationTreasury.Name}",
            PerformedBy = userId,
            TreasuryId = transfer.SourceTreasuryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashFlowTransactions.Add(cashFlowTransaction);
        transfer.CashFlowTransactionId = cashFlowTransaction.Id;

        // Update transfer status
        transfer.Status = TransferStatus.Approved;
        transfer.ApprovedBy = userId;
        transfer.ApprovedAt = DateTime.UtcNow;
        transfer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<VaultTransferDto?> RejectAsync(Guid id, RejectVaultTransferRequest request, string userId)
    {
        var transfer = await _context.VaultTransfers.FindAsync(id);
        if (transfer is null || !transfer.IsActive) return null;

        if (transfer.Status != TransferStatus.Pending)
            throw new DomainException("TRANSFER_NOT_PENDING", "لا يمكن رفض تحويل ليس في حالة الانتظار");

        if (string.IsNullOrWhiteSpace(request.RejectionReason))
            throw new DomainException("REJECTION_REASON_REQUIRED", "سبب الرفض مطلوب");

        transfer.Status = TransferStatus.Rejected;
        transfer.RejectionReason = request.RejectionReason.Trim();
        transfer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    // ─── Private helpers ───────────────────────────────────────────

    private async Task<string> GenerateTransferNumberAsync()
    {
        var lastTransfer = await _context.VaultTransfers
            .OrderByDescending(vt => vt.TransferNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastTransfer is not null && lastTransfer.TransferNumber.StartsWith("VT-"))
        {
            if (int.TryParse(lastTransfer.TransferNumber[3..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"VT-{nextNumber:D5}";
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

    private static VaultTransferDto MapVaultTransferToDto(VaultTransfer vt) => new(
        vt.Id,
        vt.TransferNumber,
        vt.SourceTreasuryId,
        vt.SourceTreasury?.Name ?? string.Empty,
        vt.DestinationTreasuryId,
        vt.DestinationTreasury?.Name ?? string.Empty,
        vt.Amount,
        (int)vt.Status,
        GetTransferStatusDisplay((int)vt.Status),
        vt.DepositSource.HasValue ? (int)vt.DepositSource.Value : null,
        vt.DepositSource.HasValue ? GetDepositSourceDisplay((int)vt.DepositSource.Value) : null,
        vt.DepositSourceDescription,
        vt.CashierSessionId,
        vt.ApprovedBy,
        vt.ApprovedAt,
        vt.RejectionReason,
        vt.Notes,
        vt.IsActive,
        vt.CreatedAt,
        vt.UpdatedAt,
        vt.CreatedBy
    );

    private static string GetTransferStatusDisplay(int status) =>
        status >= 0 && status < TransferStatusDisplay.Length
            ? TransferStatusDisplay[status]
            : status.ToString();

    private static string GetDepositSourceDisplay(int source) =>
        source >= 0 && source < DepositSourceDisplay.Length
            ? DepositSourceDisplay[source]
            : source.ToString();
}
