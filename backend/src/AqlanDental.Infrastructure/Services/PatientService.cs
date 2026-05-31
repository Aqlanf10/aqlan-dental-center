using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Application.Common.Utilities;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class PatientService : IPatientService
{
    private readonly AqlanDentalDbContext _context;

    public PatientService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<PatientDto>> GetPatientsAsync(int page, int pageSize, string? search)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Patients.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(p =>
                p.PatientNumber.ToLower().Contains(searchLower) ||
                p.FullName.ToLower().Contains(searchLower) ||
                p.PhoneNumber.ToLower().Contains(searchLower));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PatientDto(
                p.Id,
                p.PatientNumber,
                p.FullName,
                (int)p.Gender,
                p.Gender == Gender.Male ? "ذكر" : "أنثى",
                p.DateOfBirth,
                p.PhoneNumber,
                p.WhatsAppNumber,
                p.Address,
                p.Notes,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<PatientDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<PatientDto?> GetPatientByIdAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);

        if (patient is null)
            return null;

        return new PatientDto(
            patient.Id,
            patient.PatientNumber,
            patient.FullName,
            (int)patient.Gender,
            patient.Gender == Gender.Male ? "ذكر" : "أنثى",
            patient.DateOfBirth,
            patient.PhoneNumber,
            patient.WhatsAppNumber,
            patient.Address,
            patient.Notes,
            patient.IsActive,
            patient.CreatedAt,
            patient.UpdatedAt
        );
    }

    public async Task<PatientDto> CreatePatientAsync(CreatePatientRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new DomainException("PATIENT_NAME_REQUIRED", "اسم المريض مطلوب");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new DomainException("PATIENT_PHONE_REQUIRED", "رقم هاتف المريض مطلوب");

        // Normalize phone numbers
        var normalizedPhone = PhoneNormalizer.Normalize(request.PhoneNumber);
        var normalizedWhatsApp = !string.IsNullOrWhiteSpace(request.WhatsAppNumber)
            ? PhoneNormalizer.Normalize(request.WhatsAppNumber)
            : null;

        // Generate PatientNumber
        var maxNumber = await _context.Patients
            .Where(p => p.PatientNumber.StartsWith("P-"))
            .Select(p => p.PatientNumber)
            .ToListAsync();

        int nextNumber = 1;
        if (maxNumber.Any())
        {
            var numericParts = maxNumber
                .Select(pn => pn.Substring(2))
                .Where(s => int.TryParse(s, out _))
                .Select(int.Parse)
                .ToList();

            if (numericParts.Any())
                nextNumber = numericParts.Max() + 1;
        }

        var patientNumber = $"P-{nextNumber:D4}";

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientNumber = patientNumber,
            FullName = request.FullName,
            Gender = (Gender)request.Gender,
            DateOfBirth = request.DateOfBirth,
            PhoneNumber = normalizedPhone,
            WhatsAppNumber = normalizedWhatsApp,
            Address = request.Address,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return new PatientDto(
            patient.Id,
            patient.PatientNumber,
            patient.FullName,
            (int)patient.Gender,
            patient.Gender == Gender.Male ? "ذكر" : "أنثى",
            patient.DateOfBirth,
            patient.PhoneNumber,
            patient.WhatsAppNumber,
            patient.Address,
            patient.Notes,
            patient.IsActive,
            patient.CreatedAt,
            patient.UpdatedAt
        );
    }

    public async Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientRequest request, string userId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new DomainException("PATIENT_NAME_REQUIRED", "اسم المريض مطلوب");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new DomainException("PATIENT_PHONE_REQUIRED", "رقم هاتف المريض مطلوب");

        var patient = await _context.Patients.FindAsync(id);

        if (patient is null || !patient.IsActive)
            return null;

        // Normalize phone numbers
        var normalizedPhone = PhoneNormalizer.Normalize(request.PhoneNumber);
        var normalizedWhatsApp = !string.IsNullOrWhiteSpace(request.WhatsAppNumber)
            ? PhoneNormalizer.Normalize(request.WhatsAppNumber)
            : null;

        patient.FullName = request.FullName;
        patient.Gender = (Gender)request.Gender;
        patient.DateOfBirth = request.DateOfBirth;
        patient.PhoneNumber = normalizedPhone;
        patient.WhatsAppNumber = normalizedWhatsApp;
        patient.Address = request.Address;
        patient.Notes = request.Notes;
        patient.UpdatedAt = DateTime.UtcNow;
        patient.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return new PatientDto(
            patient.Id,
            patient.PatientNumber,
            patient.FullName,
            (int)patient.Gender,
            patient.Gender == Gender.Male ? "ذكر" : "أنثى",
            patient.DateOfBirth,
            patient.PhoneNumber,
            patient.WhatsAppNumber,
            patient.Address,
            patient.Notes,
            patient.IsActive,
            patient.CreatedAt,
            patient.UpdatedAt
        );
    }

    public async Task<bool> SoftDeletePatientAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);

        if (patient is null || !patient.IsActive)
            return false;

        patient.IsActive = false;
        patient.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PatientSummaryDto?> GetPatientSummaryAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient is null) return null;

        var patientDto = MapPatientToDto(patient);

        // Last appointment
        var lastAppointment = await _context.Appointments
            .Where(a => a.PatientId == id && a.IsActive)
            .OrderByDescending(a => a.AppointmentDate)
            .FirstOrDefaultAsync();
        var lastAppointmentDto = lastAppointment is not null ? MapAppointmentToDto(lastAppointment) : null;

        // Clinical visits
        var clinicalVisits = await _context.ClinicalVisits
            .Include(v => v.Prescriptions)
            .Include(v => v.Procedures)
            .Where(v => v.PatientId == id && v.IsActive)
            .OrderByDescending(v => v.StartedAt)
            .Take(10)
            .ToListAsync();

        var lastClinicalVisit = clinicalVisits.FirstOrDefault();
        var lastClinicalVisitDto = lastClinicalVisit is not null ? MapClinicalVisitToDto(lastClinicalVisit) : null;

        // Latest procedures (from all visits)
        var latestProcedures = clinicalVisits
            .SelectMany(v => v.Procedures)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(MapProcedureToDto)
            .ToList();

        // Latest prescriptions
        var latestPrescriptions = clinicalVisits
            .SelectMany(v => v.Prescriptions)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new PrescriptionSummaryDto(p.Id, p.MedicationName, p.Dosage, p.Frequency, p.Duration, p.CreatedAt))
            .ToList();

        return new PatientSummaryDto(
            patientDto,
            lastAppointmentDto,
            lastClinicalVisitDto,
            clinicalVisits.Count,
            latestProcedures,
            latestPrescriptions
        );
    }

    public async Task<PatientTimelineDto> GetPatientTimelineAsync(Guid id)
    {
        var entries = new List<TimelineEntryDto>();

        // Appointments
        var appointments = await _context.Appointments
            .Where(a => a.PatientId == id && a.IsActive)
            .OrderByDescending(a => a.AppointmentDate)
            .Take(20)
            .ToListAsync();

        foreach (var a in appointments)
        {
            entries.Add(new TimelineEntryDto(
                "appointment", a.Id,
                $"موعد - {a.ServiceType}",
                $"د. {a.Doctor?.FullName}",
                a.AppointmentDate.ToDateTime(TimeOnly.Parse("00:00")),
                a.Status.ToString()
            ));
        }

        // Daily visits
        var dailyVisits = await _context.DailyVisits
            .Include(v => v.Doctor)
            .Where(v => v.PatientId == id && v.IsActive)
            .OrderByDescending(v => v.VisitDate)
            .Take(20)
            .ToListAsync();

        foreach (var v in dailyVisits)
        {
            entries.Add(new TimelineEntryDto(
                "dailyVisit", v.Id,
                $"زيارة يومية - {v.VisitType}",
                v.Doctor?.FullName,
                v.VisitDate.ToDateTime(TimeOnly.Parse("00:00")),
                v.Status.ToString()
            ));
        }

        // Clinical visits
        var clinicalVisits = await _context.ClinicalVisits
            .Include(v => v.Doctor)
            .Where(v => v.PatientId == id && v.IsActive)
            .OrderByDescending(v => v.StartedAt)
            .Take(20)
            .ToListAsync();

        foreach (var v in clinicalVisits)
        {
            entries.Add(new TimelineEntryDto(
                "clinicalVisit", v.Id,
                "زيارة سريرية",
                v.Doctor?.FullName,
                v.StartedAt,
                v.Status.ToString()
            ));
        }

        // Procedures
        var procedures = await _context.ClinicalProcedures
            .Where(p => p.PatientId == id && p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .ToListAsync();

        foreach (var p in procedures)
        {
            entries.Add(new TimelineEntryDto(
                "procedure", p.Id,
                p.Title,
                p.ProcedureType.ToString(),
                p.CreatedAt,
                p.Status.ToString()
            ));
        }

        // Prescriptions
        var prescriptions = await _context.Prescriptions
            .Where(p => p.PatientId == id && p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .ToListAsync();

        foreach (var p in prescriptions)
        {
            entries.Add(new TimelineEntryDto(
                "prescription", p.Id,
                $"وصفة - {p.MedicationName}",
                p.Dosage,
                p.CreatedAt,
                null
            ));
        }

        // Sort all by date descending
        return new PatientTimelineDto(entries.OrderByDescending(e => e.Date).ToList());
    }

    public async Task<MedicalHistoryDto?> GetMedicalHistoryAsync(Guid patientId)
    {
        var patient = await _context.Patients
            .Include(p => p.MedicalHistory)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient is null)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (patient.MedicalHistory is null)
            return null;

        var mh = patient.MedicalHistory;
        return new MedicalHistoryDto(
            mh.ChronicDiseases,
            mh.CurrentMedications,
            mh.DrugAllergies,
            mh.BleedingDisorders,
            mh.IsPregnant,
            mh.TmjProblems,
            mh.PreviousSurgeries,
            mh.Notes
        );
    }

    public async Task<MedicalHistoryDto?> UpsertMedicalHistoryAsync(Guid patientId, UpsertMedicalHistoryRequest request, string userId)
    {
        var patient = await _context.Patients
            .Include(p => p.MedicalHistory)
            .Include(p => p.DentalHistory)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient is null)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (patient.MedicalHistory is null)
        {
            var medicalHistory = new MedicalHistory
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                ChronicDiseases = request.ChronicDiseases,
                CurrentMedications = request.CurrentMedications,
                DrugAllergies = request.DrugAllergies,
                BleedingDisorders = request.BleedingDisorders,
                IsPregnant = request.IsPregnant,
                TmjProblems = request.TmjProblems,
                PreviousSurgeries = request.PreviousSurgeries,
                Notes = request.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.MedicalHistories.Add(medicalHistory);
        }
        else
        {
            patient.MedicalHistory.ChronicDiseases = request.ChronicDiseases;
            patient.MedicalHistory.CurrentMedications = request.CurrentMedications;
            patient.MedicalHistory.DrugAllergies = request.DrugAllergies;
            patient.MedicalHistory.BleedingDisorders = request.BleedingDisorders;
            patient.MedicalHistory.IsPregnant = request.IsPregnant;
            patient.MedicalHistory.TmjProblems = request.TmjProblems;
            patient.MedicalHistory.PreviousSurgeries = request.PreviousSurgeries;
            patient.MedicalHistory.Notes = request.Notes;
            patient.MedicalHistory.UpdatedAt = DateTime.UtcNow;
            patient.MedicalHistory.UpdatedBy = userId;
        }

        await _context.SaveChangesAsync();

        return new MedicalHistoryDto(
            request.ChronicDiseases,
            request.CurrentMedications,
            request.DrugAllergies,
            request.BleedingDisorders,
            request.IsPregnant,
            request.TmjProblems,
            request.PreviousSurgeries,
            request.Notes
        );
    }

    public async Task<DentalHistoryDto?> GetDentalHistoryAsync(Guid patientId)
    {
        var patient = await _context.Patients
            .Include(p => p.DentalHistory)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient is null)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (patient.DentalHistory is null)
            return null;

        var dh = patient.DentalHistory;
        return new DentalHistoryDto(
            dh.ChiefComplaint,
            dh.PreviousTreatments,
            dh.MouthBreathing,
            dh.Bruxism,
            dh.ThumbSucking,
            dh.TongueThrusting,
            dh.Notes
        );
    }

    public async Task<DentalHistoryDto?> UpsertDentalHistoryAsync(Guid patientId, UpsertDentalHistoryRequest request, string userId)
    {
        var patient = await _context.Patients
            .Include(p => p.MedicalHistory)
            .Include(p => p.DentalHistory)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient is null)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (patient.DentalHistory is null)
        {
            var dentalHistory = new DentalHistory
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                ChiefComplaint = request.ChiefComplaint,
                PreviousTreatments = request.PreviousTreatments,
                MouthBreathing = request.MouthBreathing,
                Bruxism = request.Bruxism,
                ThumbSucking = request.ThumbSucking,
                TongueThrusting = request.TongueThrusting,
                Notes = request.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.DentalHistories.Add(dentalHistory);
        }
        else
        {
            patient.DentalHistory.ChiefComplaint = request.ChiefComplaint;
            patient.DentalHistory.PreviousTreatments = request.PreviousTreatments;
            patient.DentalHistory.MouthBreathing = request.MouthBreathing;
            patient.DentalHistory.Bruxism = request.Bruxism;
            patient.DentalHistory.ThumbSucking = request.ThumbSucking;
            patient.DentalHistory.TongueThrusting = request.TongueThrusting;
            patient.DentalHistory.Notes = request.Notes;
            patient.DentalHistory.UpdatedAt = DateTime.UtcNow;
            patient.DentalHistory.UpdatedBy = userId;
        }

        await _context.SaveChangesAsync();

        return new DentalHistoryDto(
            request.ChiefComplaint,
            request.PreviousTreatments,
            request.MouthBreathing,
            request.Bruxism,
            request.ThumbSucking,
            request.TongueThrusting,
            request.Notes
        );
    }

    private static PatientDto MapPatientToDto(Patient p) => new(
        p.Id, p.PatientNumber, p.FullName, (int)p.Gender,
        p.Gender == Gender.Male ? "ذكر" : "أنثى",
        p.DateOfBirth, p.PhoneNumber, p.WhatsAppNumber,
        p.Address, p.Notes, p.IsActive, p.CreatedAt, p.UpdatedAt
    );

    private static AppointmentDto? MapAppointmentToDto(Appointment a)
    {
        return new AppointmentDto(
            a.Id, a.PatientId, "", a.DoctorId, "",
            a.AppointmentDate, a.StartTime, a.EndTime,
            a.ServiceType, (int)a.Status, a.Status.ToString(),
            a.Notes, a.IsActive, a.CreatedAt, a.UpdatedAt
        );
    }

    private static ClinicalVisitDto? MapClinicalVisitToDto(ClinicalVisit v)
    {
        return new ClinicalVisitDto(
            v.Id, v.DailyVisitId, v.ClinicQueueItemId,
            v.PatientId, "", null, v.DoctorId, null,
            v.VisitDate, v.StartedAt, v.CompletedAt,
            (int)v.Status, v.Status.ToString(),
            v.ChiefComplaint, v.ClinicalFindings, v.Diagnosis,
            v.TreatmentNotes, v.DoctorRecommendations,
            v.NextVisitRecommended, v.NextVisitDate,
            v.Prescriptions.Select(p => new PrescriptionDto(
                p.Id, p.ClinicalVisitId, p.PatientId, p.DoctorId,
                p.MedicationName, p.Dosage, p.Frequency, p.Duration,
                p.Instructions, p.CreatedAt, p.UpdatedAt
            )).ToList(),
            v.CreatedAt, v.UpdatedAt
        );
    }

    private static ClinicalProcedureDto MapProcedureToDto(ClinicalProcedure p) => new(
        p.Id, p.ClinicalVisitId, p.PatientId, "", null,
        p.DoctorId, null, (int)p.ProcedureType,
        p.ProcedureType.ToString(), p.ToothNumber, p.ToothSurface,
        p.Title, p.Description, p.ClinicalNotes,
        (int)p.Status, p.Status.ToString(), p.StartedAt, p.CompletedAt,
        p.IsActive, p.CreatedAt, p.UpdatedAt
    );
}
