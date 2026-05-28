using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
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
            PhoneNumber = request.PhoneNumber,
            WhatsAppNumber = request.WhatsAppNumber,
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

        patient.FullName = request.FullName;
        patient.Gender = (Gender)request.Gender;
        patient.DateOfBirth = request.DateOfBirth;
        patient.PhoneNumber = request.PhoneNumber;
        patient.WhatsAppNumber = request.WhatsAppNumber;
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
}
