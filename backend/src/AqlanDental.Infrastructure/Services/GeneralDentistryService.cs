using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class GeneralDentistryService : IGeneralDentistryService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] ToothConditionTypeDisplay = {
        "سليم", "تسوس", "حشوة", "تلبيسة", "مفقود", "زراعة", "علاج عصب", "جسر", "قشرة", "أخرى"
    };

    private static readonly string[] GeneralTreatmentTypeDisplay = {
        "فحص", "تنظيف", "حشوة", "خلع", "علاج عصب", "تلبيسة", "جسر", "طقم أسنان", "تبييض", "قشرة", "حشوة وقائية", "فلورايد", "أخرى"
    };

    private static readonly string[] TreatmentStepPriorityDisplay = {
        "منخفض", "عادي", "عالي", "عاجل"
    };

    private static readonly string[] TreatmentStepStatusDisplay = {
        "مخطط", "قيد التنفيذ", "مكتمل", "تم تخطيه", "ملغي"
    };

    public GeneralDentistryService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── Dental Chart ─────────────────────────────────────────────────

    public async Task<DentalChartDto?> GetDentalChartAsync(Guid patientId)
    {
        var chart = await _context.DentalCharts
            .Include(c => c.Patient)
            .Include(c => c.Doctor)
            .Include(c => c.ToothConditions.Where(tc => tc.IsActive))
            .Where(c => c.PatientId == patientId && c.IsActive)
            .OrderByDescending(c => c.ChartDate)
            .FirstOrDefaultAsync();

        return chart is null ? null : MapChartToDto(chart);
    }

    public async Task<DentalChartDto> UpsertDentalChartAsync(
        Guid patientId, UpsertDentalChartRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        var existingChart = await _context.DentalCharts
            .Include(c => c.ToothConditions)
            .FirstOrDefaultAsync(c => c.PatientId == patientId && c.IsActive);

        if (existingChart is not null)
        {
            // Update existing chart
            existingChart.DoctorId = request.DoctorId;
            existingChart.UpdatedAt = DateTime.UtcNow;
            existingChart.UpdatedBy = userId;

            if (request.ToothConditions is not null && request.ToothConditions.Count > 0)
            {
                foreach (var toothReq in request.ToothConditions)
                {
                    ValidateToothNumber(toothReq.ToothNumber);
                    ValidateConditionType(toothReq.Condition);

                    var existingTooth = existingChart.ToothConditions
                        .FirstOrDefault(tc => tc.ToothNumber == toothReq.ToothNumber);

                    if (existingTooth is not null)
                    {
                        existingTooth.Condition = (ToothConditionType)toothReq.Condition;
                        existingTooth.SurfacesAffected = toothReq.SurfacesAffected?.Trim();
                        existingTooth.Notes = toothReq.Notes?.Trim();
                        existingTooth.TreatmentDone = toothReq.TreatmentDone?.Trim();
                        existingTooth.IsActive = true;
                        existingTooth.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        var newTooth = new ToothCondition
                        {
                            Id = Guid.NewGuid(),
                            ChartId = existingChart.Id,
                            ToothNumber = toothReq.ToothNumber,
                            Condition = (ToothConditionType)toothReq.Condition,
                            SurfacesAffected = toothReq.SurfacesAffected?.Trim(),
                            Notes = toothReq.Notes?.Trim(),
                            TreatmentDone = toothReq.TreatmentDone?.Trim(),
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        existingChart.ToothConditions.Add(newTooth);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return (await GetDentalChartAsync(patientId))!;
        }

        // Create new chart
        var chart = new DentalChart
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            ChartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            DoctorId = request.DoctorId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        if (request.ToothConditions is not null && request.ToothConditions.Count > 0)
        {
            foreach (var toothReq in request.ToothConditions)
            {
                ValidateToothNumber(toothReq.ToothNumber);
                ValidateConditionType(toothReq.Condition);

                chart.ToothConditions.Add(new ToothCondition
                {
                    Id = Guid.NewGuid(),
                    ChartId = chart.Id,
                    ToothNumber = toothReq.ToothNumber,
                    Condition = (ToothConditionType)toothReq.Condition,
                    SurfacesAffected = toothReq.SurfacesAffected?.Trim(),
                    Notes = toothReq.Notes?.Trim(),
                    TreatmentDone = toothReq.TreatmentDone?.Trim(),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _context.DentalCharts.Add(chart);
        await _context.SaveChangesAsync();

        return (await GetDentalChartAsync(patientId))!;
    }

    public async Task<ToothConditionDto?> UpdateToothConditionAsync(
        Guid chartId, int toothNumber, UpdateToothConditionRequest request, string userId)
    {
        var chart = await _context.DentalCharts
            .Include(c => c.ToothConditions)
            .FirstOrDefaultAsync(c => c.Id == chartId && c.IsActive);

        if (chart is null)
            throw new DomainException("DENTAL_CHART_NOT_FOUND", "مخطط الأسنان غير موجود");

        var toothCondition = chart.ToothConditions
            .FirstOrDefault(tc => tc.ToothNumber == toothNumber && tc.IsActive);

        if (toothCondition is null)
            return null;

        if (request.Condition.HasValue)
        {
            ValidateConditionType(request.Condition.Value);
            toothCondition.Condition = (ToothConditionType)request.Condition.Value;
        }

        if (request.SurfacesAffected is not null)
            toothCondition.SurfacesAffected = request.SurfacesAffected.Trim();
        if (request.Notes is not null)
            toothCondition.Notes = request.Notes.Trim();
        if (request.TreatmentDone is not null)
            toothCondition.TreatmentDone = request.TreatmentDone.Trim();

        toothCondition.UpdatedAt = DateTime.UtcNow;
        chart.UpdatedAt = DateTime.UtcNow;
        chart.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return MapToothToDto(toothCondition);
    }

    // ─── General Treatments ───────────────────────────────────────────

    public async Task<PagedResult<GeneralTreatmentDto>> GetGeneralTreatmentsAsync(
        Guid patientId, int page, int pageSize)
    {
        var query = _context.GeneralTreatments
            .Include(t => t.Patient)
            .Include(t => t.Doctor)
            .Where(t => t.PatientId == patientId && t.IsActive)
            .OrderByDescending(t => t.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapTreatmentToDto).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<GeneralTreatmentDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<GeneralTreatmentDto> CreateGeneralTreatmentAsync(
        CreateGeneralTreatmentRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (!Enum.IsDefined(typeof(GeneralTreatmentType), request.TreatmentType))
            throw new DomainException("INVALID_TREATMENT_TYPE", "نوع العلاج غير صالح");

        if (request.VisitId.HasValue)
        {
            var visit = await _context.ClinicalVisits.FindAsync(request.VisitId.Value);
            if (visit is null || !visit.IsActive)
                throw new DomainException("CLINICAL_VISIT_NOT_FOUND", "الزيارة السريرية غير موجودة");
        }

        if (request.DoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.DoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        if (request.ToothNumber.HasValue)
            ValidateToothNumber(request.ToothNumber.Value);

        var treatment = new GeneralTreatment
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            VisitId = request.VisitId,
            TreatmentType = (GeneralTreatmentType)request.TreatmentType,
            ToothNumber = request.ToothNumber,
            MaterialUsed = request.MaterialUsed?.Trim(),
            AnesthesiaType = request.AnesthesiaType?.Trim(),
            Cost = request.Cost,
            DoctorId = request.DoctorId,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.GeneralTreatments.Add(treatment);
        await _context.SaveChangesAsync();

        // Re-fetch with includes
        var created = await _context.GeneralTreatments
            .Include(t => t.Patient)
            .Include(t => t.Doctor)
            .FirstAsync(t => t.Id == treatment.Id);

        return MapTreatmentToDto(created);
    }

    // ─── Treatment Plan ───────────────────────────────────────────────

    public async Task<List<TreatmentPlanStepDto>> GetTreatmentPlanAsync(Guid patientId)
    {
        var steps = await _context.TreatmentPlanSteps
            .Include(s => s.Patient)
            .Include(s => s.ClinicService)
            .Include(s => s.ResponsibleDoctor)
            .Where(s => s.PatientId == patientId && s.IsActive)
            .OrderBy(s => s.SequenceNumber)
            .ThenBy(s => s.CreatedAt)
            .ToListAsync();

        return steps.Select(MapStepToDto).ToList();
    }

    public async Task<TreatmentPlanStepDto> AddTreatmentPlanStepAsync(
        AddTreatmentPlanStepRequest request, string userId)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new DomainException("STEP_TITLE_REQUIRED", "عنوان خطة العلاج مطلوب");

        if (!Enum.IsDefined(typeof(TreatmentStepPriority), request.Priority))
            throw new DomainException("INVALID_PRIORITY", "الأولوية غير صالحة");

        if (!Enum.IsDefined(typeof(TreatmentStepStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "الحالة غير صالحة");

        if (request.ClinicServiceId.HasValue)
        {
            var service = await _context.ClinicServices.FindAsync(request.ClinicServiceId.Value);
            if (service is null || !service.IsActive)
                throw new DomainException("CLINIC_SERVICE_NOT_FOUND", "الخدمة غير موجودة");
        }

        if (request.ResponsibleDoctorId.HasValue)
        {
            var doctor = await _context.Doctors.FindAsync(request.ResponsibleDoctorId.Value);
            if (doctor is null || !doctor.IsActive)
                throw new DomainException("DOCTOR_NOT_FOUND", "الطبيب غير موجود");
        }

        if (request.ToothNumber.HasValue)
            ValidateToothNumber(request.ToothNumber.Value);

        // Auto-assign sequence number if not provided
        int sequenceNumber = request.SequenceNumber ?? 0;
        if (sequenceNumber <= 0)
        {
            var maxSeq = await _context.TreatmentPlanSteps
                .Where(s => s.PatientId == request.PatientId && s.IsActive)
                .MaxAsync(s => (int?)s.SequenceNumber) ?? 0;
            sequenceNumber = maxSeq + 1;
        }

        // Snapshot service name if linked
        string? serviceNameSnapshot = request.ServiceNameSnapshot;
        if (request.ClinicServiceId.HasValue && string.IsNullOrWhiteSpace(serviceNameSnapshot))
        {
            var service = await _context.ClinicServices.FindAsync(request.ClinicServiceId.Value);
            serviceNameSnapshot = service?.ArabicName;
        }

        var step = new TreatmentPlanStep
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            SequenceNumber = sequenceNumber,
            ClinicServiceId = request.ClinicServiceId,
            ServiceNameSnapshot = serviceNameSnapshot?.Trim(),
            Department = request.Department?.Trim(),
            ToothNumber = request.ToothNumber,
            ToothArea = request.ToothArea?.Trim(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = (TreatmentStepPriority)request.Priority,
            Status = (TreatmentStepStatus)request.Status,
            ResponsibleDoctorId = request.ResponsibleDoctorId,
            PlannedDate = request.PlannedDate,
            EstimatedCost = request.EstimatedCost,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.TreatmentPlanSteps.Add(step);
        await _context.SaveChangesAsync();

        return (await GetTreatmentPlanStepByIdAsync(step.Id))!;
    }

    public async Task<TreatmentPlanStepDto?> UpdateTreatmentPlanStepAsync(
        Guid stepId, UpdateTreatmentPlanStepRequest request, string userId)
    {
        var step = await _context.TreatmentPlanSteps.FindAsync(stepId);
        if (step is null || !step.IsActive) return null;

        if (step.Status is TreatmentStepStatus.Completed or TreatmentStepStatus.Cancelled)
            throw new DomainException("STEP_NOT_EDITABLE", "لا يمكن تعديل خطوة مكتملة أو ملغاة");

        if (request.SequenceNumber.HasValue)
            step.SequenceNumber = request.SequenceNumber.Value;

        if (request.ClinicServiceId.HasValue)
            step.ClinicServiceId = request.ClinicServiceId.Value;

        if (request.ServiceNameSnapshot is not null)
            step.ServiceNameSnapshot = request.ServiceNameSnapshot.Trim();

        if (request.Department is not null)
            step.Department = request.Department.Trim();

        if (request.ToothNumber.HasValue)
        {
            ValidateToothNumber(request.ToothNumber.Value);
            step.ToothNumber = request.ToothNumber.Value;
        }

        if (request.ToothArea is not null)
            step.ToothArea = request.ToothArea.Trim();

        if (request.Title is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new DomainException("STEP_TITLE_REQUIRED", "عنوان خطوة العلاج لا يمكن أن يكون فارغاً");
            step.Title = request.Title.Trim();
        }

        if (request.Description is not null)
            step.Description = request.Description.Trim();

        if (request.Priority.HasValue)
        {
            if (!Enum.IsDefined(typeof(TreatmentStepPriority), request.Priority.Value))
                throw new DomainException("INVALID_PRIORITY", "الأولوية غير صالحة");
            step.Priority = (TreatmentStepPriority)request.Priority.Value;
        }

        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(TreatmentStepStatus), request.Status.Value))
                throw new DomainException("INVALID_STATUS", "الحالة غير صالحة");
            ValidateStepStatusTransition(step.Status, (TreatmentStepStatus)request.Status.Value);
            step.Status = (TreatmentStepStatus)request.Status.Value;
            if (step.Status == TreatmentStepStatus.Completed)
                step.CompletedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        if (request.ResponsibleDoctorId.HasValue)
            step.ResponsibleDoctorId = request.ResponsibleDoctorId.Value;

        if (request.PlannedDate.HasValue)
            step.PlannedDate = request.PlannedDate.Value;

        if (request.EstimatedCost.HasValue)
            step.EstimatedCost = request.EstimatedCost.Value;

        if (request.Notes is not null)
            step.Notes = request.Notes.Trim();

        step.UpdatedAt = DateTime.UtcNow;
        step.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetTreatmentPlanStepByIdAsync(stepId);
    }

    public async Task<TreatmentPlanStepDto?> UpdateTreatmentStepStatusAsync(
        Guid stepId, UpdateTreatmentStepStatusRequest request, string userId)
    {
        var step = await _context.TreatmentPlanSteps.FindAsync(stepId);
        if (step is null || !step.IsActive) return null;

        if (!Enum.IsDefined(typeof(TreatmentStepStatus), request.Status))
            throw new DomainException("INVALID_STATUS", "الحالة غير صالحة");

        var newStatus = (TreatmentStepStatus)request.Status;
        ValidateStepStatusTransition(step.Status, newStatus);

        step.Status = newStatus;
        if (newStatus == TreatmentStepStatus.Completed)
            step.CompletedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (newStatus == TreatmentStepStatus.InProgress && step.Status == TreatmentStepStatus.Planned)
            step.PlannedDate ??= DateOnly.FromDateTime(DateTime.UtcNow);

        step.UpdatedAt = DateTime.UtcNow;
        step.UpdatedBy = userId;

        await _context.SaveChangesAsync();
        return await GetTreatmentPlanStepByIdAsync(stepId);
    }

    // ─── Private helpers ──────────────────────────────────────────────

    private async Task<TreatmentPlanStepDto?> GetTreatmentPlanStepByIdAsync(Guid stepId)
    {
        var step = await _context.TreatmentPlanSteps
            .Include(s => s.Patient)
            .Include(s => s.ClinicService)
            .Include(s => s.ResponsibleDoctor)
            .FirstOrDefaultAsync(s => s.Id == stepId && s.IsActive);

        return step is null ? null : MapStepToDto(step);
    }

    private static void ValidateToothNumber(int toothNumber)
    {
        // FDI notation: 11-18, 21-28, 31-38, 41-48
        var quadrant = toothNumber / 10;
        var tooth = toothNumber % 10;
        if (quadrant < 1 || quadrant > 4 || tooth < 1 || tooth > 8)
            throw new DomainException("INVALID_TOOTH_NUMBER", "رقم السن غير صالح (يجب أن يكون بنظام FDI: 11-18, 21-28, 31-38, 41-48)");
    }

    private static void ValidateConditionType(int condition)
    {
        if (!Enum.IsDefined(typeof(ToothConditionType), condition))
            throw new DomainException("INVALID_CONDITION_TYPE", "نوع حالة السن غير صالح");
    }

    private static void ValidateStepStatusTransition(TreatmentStepStatus current, TreatmentStepStatus target)
    {
        if (current == TreatmentStepStatus.Cancelled)
            throw new DomainException("STEP_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة خطوة ملغاة");

        if (current == TreatmentStepStatus.Completed && target != TreatmentStepStatus.Cancelled)
            throw new DomainException("STEP_STATUS_TRANSITION_BLOCKED",
                "لا يمكن تغيير حالة خطوة مكتملة");

        if (current == TreatmentStepStatus.Planned &&
            target is not (TreatmentStepStatus.InProgress or TreatmentStepStatus.Completed
                or TreatmentStepStatus.Skipped or TreatmentStepStatus.Cancelled))
            throw new DomainException("STEP_STATUS_TRANSITION_INVALID",
                "الانتقال من 'مخطط' غير مسموح بهذه الحالة");

        if (current == TreatmentStepStatus.InProgress &&
            target is not (TreatmentStepStatus.Completed or TreatmentStepStatus.Skipped or TreatmentStepStatus.Cancelled))
            throw new DomainException("STEP_STATUS_TRANSITION_INVALID",
                "الانتقال من 'قيد التنفيذ' مسموح فقط إلى 'مكتمل' أو 'تم تخطيه' أو 'ملغي'");

        if (current == TreatmentStepStatus.Skipped && target != TreatmentStepStatus.Cancelled)
            throw new DomainException("STEP_STATUS_TRANSITION_INVALID",
                "الانتقال من 'تم تخطيه' مسموح فقط إلى 'ملغي'");
    }

    // ─── Mapping methods ──────────────────────────────────────────────

    private static DentalChartDto MapChartToDto(DentalChart c) => new(
        c.Id,
        c.PatientId,
        c.Patient?.FullName ?? string.Empty,
        c.Patient?.PatientNumber,
        c.ChartDate,
        c.DoctorId,
        c.Doctor?.FullName,
        c.IsActive,
        c.ToothConditions.Where(tc => tc.IsActive).Select(MapToothToDto).ToList(),
        c.CreatedAt,
        c.UpdatedAt
    );

    private static ToothConditionDto MapToothToDto(ToothCondition tc) => new(
        tc.Id,
        tc.ToothNumber,
        (int)tc.Condition,
        GetConditionTypeDisplay((int)tc.Condition),
        tc.SurfacesAffected,
        tc.Notes,
        tc.TreatmentDone,
        tc.IsActive,
        tc.CreatedAt,
        tc.UpdatedAt
    );

    private static GeneralTreatmentDto MapTreatmentToDto(GeneralTreatment t) => new(
        t.Id,
        t.PatientId,
        t.Patient?.FullName ?? string.Empty,
        t.Patient?.PatientNumber,
        t.VisitId,
        (int)t.TreatmentType,
        GetTreatmentTypeDisplay((int)t.TreatmentType),
        t.ToothNumber,
        t.MaterialUsed,
        t.AnesthesiaType,
        t.Cost,
        t.DoctorId,
        t.Doctor?.FullName,
        t.Notes,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt
    );

    private static TreatmentPlanStepDto MapStepToDto(TreatmentPlanStep s) => new(
        s.Id,
        s.PatientId,
        s.Patient?.FullName ?? string.Empty,
        s.Patient?.PatientNumber,
        s.SequenceNumber,
        s.ClinicServiceId,
        s.ServiceNameSnapshot ?? s.ClinicService?.ArabicName,
        s.Department,
        s.ToothNumber,
        s.ToothArea,
        s.Title,
        s.Description,
        (int)s.Priority,
        GetPriorityDisplay((int)s.Priority),
        (int)s.Status,
        GetStepStatusDisplay((int)s.Status),
        s.ResponsibleDoctorId,
        s.ResponsibleDoctor?.FullName,
        s.PlannedDate,
        s.CompletedDate,
        s.EstimatedCost,
        s.Notes,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    private static string GetConditionTypeDisplay(int type)
    {
        if (type == 99) return "أخرى";
        return type >= 0 && type < ToothConditionTypeDisplay.Length
            ? ToothConditionTypeDisplay[type]
            : type.ToString();
    }

    private static string GetTreatmentTypeDisplay(int type)
    {
        if (type == 99) return "أخرى";
        return type >= 0 && type < GeneralTreatmentTypeDisplay.Length
            ? GeneralTreatmentTypeDisplay[type]
            : type.ToString();
    }

    private static string GetPriorityDisplay(int priority) =>
        priority >= 0 && priority < TreatmentStepPriorityDisplay.Length
            ? TreatmentStepPriorityDisplay[priority]
            : priority.ToString();

    private static string GetStepStatusDisplay(int status) =>
        status >= 0 && status < TreatmentStepStatusDisplay.Length
            ? TreatmentStepStatusDisplay[status]
            : status.ToString();
}
