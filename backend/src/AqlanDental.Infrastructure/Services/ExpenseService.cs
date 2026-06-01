using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] ExpenseCategoryDisplay = {
        "إيجار", "مرافق", "رسوم مختبر", "تسويق", "مستلزمات عيادة", "صيانة", "رواتب", "عمولات", "ضرائب", "متنوع"
    };

    private static readonly string[] ApprovalStatusDisplay = {
        "قيد الانتظار", "معتمد", "مرفوض"
    };

    private static readonly string[] PaymentMethodDisplay = {
        "نقدي", "بطاقة", "تحويل بنكي", "شيك", "أخرى"
    };

    private static readonly string[] FinancialDocumentTypeDisplay = {
        "فاتورة", "دفعة", "مصروف", "دفع راتب", "سلفة", "تحويل خزنة", "دفع مورد", "إشعار دائن", "دفع عمولة"
    };

    private static readonly string[] JournalAccountTypeDisplay = {
        "خزنة", "مصروف", "إيراد", "مستحق", "حقوق مالك", "مستحقات أخرى", "مريض"
    };

    public ExpenseService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<OperationalExpenseDto> CreateAsync(CreateExpenseRequest request, string userId)
    {
        if (request.Amount <= 0)
            throw new DomainException("INVALID_EXPENSE_AMOUNT", "مبلغ المصروف يجب أن يكون أكبر من صفر");

        if (!Enum.IsDefined(typeof(ExpenseCategory), request.Category))
            throw new DomainException("INVALID_EXPENSE_CATEGORY", "فئة المصروف غير صالحة");

        if (!Enum.IsDefined(typeof(PaymentMethod), request.PaymentMethod))
            throw new DomainException("INVALID_PAYMENT_METHOD", "طريقة الدفع غير صالحة");

        var expenseNumber = await GenerateExpenseNumberAsync();

        var expense = new OperationalExpense
        {
            Id = Guid.NewGuid(),
            ExpenseNumber = expenseNumber,
            Category = (ExpenseCategory)request.Category,
            Amount = request.Amount,
            PaymentMethod = (PaymentMethod)request.PaymentMethod,
            SupplierName = request.SupplierName?.Trim(),
            LabOrderId = request.LabOrderId,
            ReceiptAttachmentUrl = request.ReceiptAttachmentUrl?.Trim(),
            ApprovalStatus = ExpenseApprovalStatus.Pending,
            TreasuryId = request.TreasuryId,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.OperationalExpenses.Add(expense);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(expense.Id))!;
    }

    public async Task<PagedResult<OperationalExpenseDto>> GetAllAsync(int page, int pageSize, int? category, int? approvalStatus)
    {
        var query = _context.OperationalExpenses
            .Include(e => e.Treasury)
            .Where(e => e.IsActive);

        if (category.HasValue)
        {
            if (!Enum.IsDefined(typeof(ExpenseCategory), category.Value))
                throw new DomainException("INVALID_EXPENSE_CATEGORY", "فئة المصروف غير صالحة");
            query = query.Where(e => e.Category == (ExpenseCategory)category.Value);
        }

        if (approvalStatus.HasValue)
        {
            if (!Enum.IsDefined(typeof(ExpenseApprovalStatus), approvalStatus.Value))
                throw new DomainException("INVALID_APPROVAL_STATUS", "حالة الاعتماد غير صالحة");
            query = query.Where(e => e.ApprovalStatus == (ExpenseApprovalStatus)approvalStatus.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapOperationalExpenseToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<OperationalExpenseDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<PagedResult<OperationalExpenseDto>> GetPendingAsync(int page, int pageSize)
    {
        var query = _context.OperationalExpenses
            .Include(e => e.Treasury)
            .Where(e => e.IsActive && e.ApprovalStatus == ExpenseApprovalStatus.Pending);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapOperationalExpenseToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<OperationalExpenseDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<OperationalExpenseDto?> GetByIdAsync(Guid id)
    {
        var expense = await _context.OperationalExpenses
            .Include(e => e.Treasury)
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        return expense is null ? null : MapOperationalExpenseToDto(expense);
    }

    public async Task<OperationalExpenseDto?> ApproveAsync(Guid id, ApproveExpenseRequest request, string userId)
    {
        var expense = await _context.OperationalExpenses.FindAsync(id);
        if (expense is null || !expense.IsActive) return null;

        if (expense.ApprovalStatus != ExpenseApprovalStatus.Pending)
            throw new DomainException("EXPENSE_NOT_PENDING", "لا يمكن اعتماد مصروف ليس في حالة الانتظار");

        // Resolve treasury
        var treasuryId = request.TreasuryId ?? expense.TreasuryId;
        Treasury? treasury = null;
        if (treasuryId.HasValue)
        {
            treasury = await _context.Treasuries.FindAsync(treasuryId.Value);
            if (treasury is null || !treasury.IsActive)
                throw new DomainException("TREASURY_NOT_FOUND", "الخزنة غير موجودة");
        }

        // Update expense
        expense.ApprovalStatus = ExpenseApprovalStatus.Approved;
        expense.ApprovedBy = userId;
        expense.ApprovedAt = DateTime.UtcNow;
        expense.TreasuryId = treasuryId;
        expense.UpdatedAt = DateTime.UtcNow;
        expense.UpdatedBy = userId;

        // Create CashFlowTransaction
        var transactionNumber = await GenerateTransactionNumberAsync();
        var cashFlowTransaction = new CashFlowTransaction
        {
            Id = Guid.NewGuid(),
            TransactionNumber = transactionNumber,
            Type = TransactionType.Outflow,
            Category = FinancialCategory.OperationalExpense,
            Amount = expense.Amount,
            PaymentMethod = expense.PaymentMethod,
            TransactionDate = DateTime.UtcNow,
            ReferenceId = expense.Id,
            ReferenceNumber = expense.ExpenseNumber,
            Description = $"مصروف تشغيلي: {GetExpenseCategoryDisplay((int)expense.Category)} - {expense.ExpenseNumber}",
            PerformedBy = userId,
            TreasuryId = treasuryId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CashFlowTransactions.Add(cashFlowTransaction);
        expense.CashFlowTransactionId = cashFlowTransaction.Id;

        // Create JournalEntry
        var entryNumber = await GenerateEntryNumberAsync();
        var journalEntry = new JournalEntry
        {
            Id = Guid.NewGuid(),
            EntryNumber = entryNumber,
            DocumentType = FinancialDocumentType.Expense,
            FinancialDocumentId = expense.Id,
            Description = $"مصروف: {GetExpenseCategoryDisplay((int)expense.Category)} - {expense.ExpenseNumber}",
            EntryDate = DateTime.UtcNow,
            TreasuryId = treasuryId,
            PerformedBy = userId,
            IsPosted = true,
            PostedAt = DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Debit: Expense account
        journalEntry.Lines.Add(new JournalLine
        {
            Id = Guid.NewGuid(),
            JournalEntryId = journalEntry.Id,
            AccountType = JournalAccountType.Expense,
            AccountId = expense.Id,
            Debit = expense.Amount,
            Credit = 0,
            Description = $"مصروف {GetExpenseCategoryDisplay((int)expense.Category)}",
            IsActive = true
        });

        // Credit: Treasury
        journalEntry.Lines.Add(new JournalLine
        {
            Id = Guid.NewGuid(),
            JournalEntryId = journalEntry.Id,
            AccountType = JournalAccountType.Treasury,
            AccountId = treasuryId,
            Debit = 0,
            Credit = expense.Amount,
            Description = $"سداد من الخزنة",
            IsActive = true
        });

        _context.JournalEntries.Add(journalEntry);
        expense.JournalEntryId = journalEntry.Id;
        expense.IsPostedToLedger = true;

        // Update treasury balance (decrease)
        if (treasury is not null)
        {
            treasury.Balance -= expense.Amount;
            treasury.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<OperationalExpenseDto?> RejectAsync(Guid id, RejectExpenseRequest request, string userId)
    {
        var expense = await _context.OperationalExpenses.FindAsync(id);
        if (expense is null || !expense.IsActive) return null;

        if (expense.ApprovalStatus != ExpenseApprovalStatus.Pending)
            throw new DomainException("EXPENSE_NOT_PENDING", "لا يمكن رفض مصروف ليس في حالة الانتظار");

        if (string.IsNullOrWhiteSpace(request.RejectionReason))
            throw new DomainException("REJECTION_REASON_REQUIRED", "سبب الرفض مطلوب");

        expense.ApprovalStatus = ExpenseApprovalStatus.Rejected;
        expense.RejectionReason = request.RejectionReason.Trim();
        expense.UpdatedAt = DateTime.UtcNow;
        expense.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id, string userId)
    {
        var expense = await _context.OperationalExpenses.FindAsync(id);
        if (expense is null || !expense.IsActive) return false;

        if (expense.ApprovalStatus == ExpenseApprovalStatus.Approved)
            throw new DomainException("CANNOT_DELETE_APPROVED_EXPENSE", "لا يمكن حذف مصروف معتمد");

        expense.IsActive = false;
        expense.UpdatedAt = DateTime.UtcNow;
        expense.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Private helpers ───────────────────────────────────────────

    private async Task<string> GenerateExpenseNumberAsync()
    {
        var lastExpense = await _context.OperationalExpenses
            .OrderByDescending(e => e.ExpenseNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastExpense is not null && lastExpense.ExpenseNumber.StartsWith("EXP-"))
        {
            if (int.TryParse(lastExpense.ExpenseNumber[4..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"EXP-{nextNumber:D5}";
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

    private async Task<string> GenerateEntryNumberAsync()
    {
        var lastEntry = await _context.JournalEntries
            .OrderByDescending(e => e.EntryNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastEntry is not null && lastEntry.EntryNumber.StartsWith("JE-"))
        {
            if (int.TryParse(lastEntry.EntryNumber[3..], out var lastNum))
                nextNumber = lastNum + 1;
        }

        return $"JE-{nextNumber:D5}";
    }

    // ─── Mapping methods ───────────────────────────────────────────

    private static OperationalExpenseDto MapOperationalExpenseToDto(OperationalExpense e) => new(
        e.Id,
        e.ExpenseNumber,
        (int)e.Category,
        GetExpenseCategoryDisplay((int)e.Category),
        e.Amount,
        (int)e.PaymentMethod,
        GetPaymentMethodDisplay((int)e.PaymentMethod),
        e.SupplierName,
        e.LabOrderId,
        e.ReceiptAttachmentUrl,
        (int)e.ApprovalStatus,
        GetApprovalStatusDisplay((int)e.ApprovalStatus),
        e.ApprovedBy,
        e.ApprovedAt,
        e.RejectionReason,
        e.IsPostedToLedger,
        e.TreasuryId,
        e.Treasury?.Name,
        e.Notes,
        e.IsActive,
        e.CreatedAt,
        e.UpdatedAt,
        e.CreatedBy
    );

    private static string GetExpenseCategoryDisplay(int category)
    {
        if (category == 99) return ExpenseCategoryDisplay[9]; // Miscellaneous
        return category >= 0 && category < ExpenseCategoryDisplay.Length - 1
            ? ExpenseCategoryDisplay[category]
            : category.ToString();
    }

    private static string GetApprovalStatusDisplay(int status) =>
        status >= 0 && status < ApprovalStatusDisplay.Length
            ? ApprovalStatusDisplay[status]
            : status.ToString();

    private static string GetPaymentMethodDisplay(int method) =>
        method >= 0 && method < PaymentMethodDisplay.Length
            ? PaymentMethodDisplay[method]
            : method == 99 ? PaymentMethodDisplay[4] : method.ToString();
}
