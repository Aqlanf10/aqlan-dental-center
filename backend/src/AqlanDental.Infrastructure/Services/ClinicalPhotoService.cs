using AqlanDental.Application.Common.Interfaces;
using AqlanDental.Application.Common.Models;
using AqlanDental.Domain.Entities;
using AqlanDental.Domain.Exceptions;
using AqlanDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AqlanDental.Infrastructure.Services;

public class ClinicalPhotoService : IClinicalPhotoService
{
    private readonly AqlanDentalDbContext _context;

    // Arabic display labels for enums
    private static readonly string[] ClinicalPhotoCategoryDisplay = {
        "داخل الفم", "خارج الفم", "صورة شخصية", "نموذج دراسة"
    };

    private static readonly string[] XrayTypeDisplay = {
        "حول السن", "بانورامي", "سيفالومتريك", "CBCT", "عضاضة", "إطباقية"
    };

    private static readonly string[] DocumentTypeDisplay = {
        "موافقة", "إحالة", "تأمين", "تقرير مختبر", "أخرى"
    };

    public ClinicalPhotoService(AqlanDentalDbContext context)
    {
        _context = context;
    }

    // ─── Clinical Photos ───────────────────────────────────────────

    public async Task<ClinicalPhotoDto> UploadPhotoAsync(UploadClinicalPhotoRequest request)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (!Enum.IsDefined(typeof(ClinicalPhotoCategory), request.Category))
            throw new DomainException("INVALID_PHOTO_CATEGORY", "فئة الصورة غير صالحة");

        if (string.IsNullOrWhiteSpace(request.FileUrl))
            throw new DomainException("FILE_URL_REQUIRED", "رابط الملف مطلوب");

        var photo = new ClinicalPhoto
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            OrthoCaseId = request.OrthoCaseId,
            FileUrl = request.FileUrl.Trim(),
            ThumbnailUrl = request.ThumbnailUrl?.Trim(),
            Category = (ClinicalPhotoCategory)request.Category,
            PhotoType = request.PhotoType?.Trim(),
            Stage = request.Stage?.Trim(),
            PhotoDate = request.PhotoDate,
            Caption = request.Caption?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.ClinicalPhotos.Add(photo);
        await _context.SaveChangesAsync();

        return await MapClinicalPhotoToDtoAsync(photo);
    }

    public async Task<PagedResult<ClinicalPhotoDto>> GetPhotosByPatientAsync(Guid patientId, int page, int pageSize, int? category)
    {
        var query = _context.ClinicalPhotos
            .Where(p => p.IsActive && p.PatientId == patientId);

        if (category.HasValue)
        {
            if (!Enum.IsDefined(typeof(ClinicalPhotoCategory), category.Value))
                throw new DomainException("INVALID_PHOTO_CATEGORY", "فئة الصورة غير صالحة");
            query = query.Where(p => p.Category == (ClinicalPhotoCategory)category.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var patient = await _context.Patients.FindAsync(patientId);
        var patientName = patient?.FullName ?? string.Empty;

        var dtos = items.Select(p => MapClinicalPhotoToDtoWithPatient(p, patientName)).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<ClinicalPhotoDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<bool> DeletePhotoAsync(Guid id)
    {
        var photo = await _context.ClinicalPhotos.FindAsync(id);
        if (photo is null || !photo.IsActive) return false;

        photo.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Radiographs ───────────────────────────────────────────────

    public async Task<RadiographDto> UploadRadiographAsync(UploadRadiographRequest request)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (!Enum.IsDefined(typeof(XrayType), request.XrayType))
            throw new DomainException("INVALID_XRAY_TYPE", "نوع الأشعة غير صالح");

        if (string.IsNullOrWhiteSpace(request.FileUrl))
            throw new DomainException("FILE_URL_REQUIRED", "رابط الملف مطلوب");

        var radiograph = new Radiograph
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            FileUrl = request.FileUrl.Trim(),
            XrayType = (XrayType)request.XrayType,
            FileName = request.FileName?.Trim(),
            FileSize = request.FileSize,
            MimeType = request.MimeType?.Trim(),
            ToothRelated = request.ToothRelated?.Trim(),
            DoctorId = request.DoctorId,
            XrayDate = request.XrayDate,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Radiographs.Add(radiograph);
        await _context.SaveChangesAsync();

        return await MapRadiographToDtoAsync(radiograph);
    }

    public async Task<PagedResult<RadiographDto>> GetRadiographsByPatientAsync(Guid patientId, int page, int pageSize, int? xrayType)
    {
        var query = _context.Radiographs
            .Include(r => r.Doctor)
            .Where(r => r.IsActive && r.PatientId == patientId);

        if (xrayType.HasValue)
        {
            if (!Enum.IsDefined(typeof(XrayType), xrayType.Value))
                throw new DomainException("INVALID_XRAY_TYPE", "نوع الأشعة غير صالح");
            query = query.Where(r => r.XrayType == (XrayType)xrayType.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var patient = await _context.Patients.FindAsync(patientId);
        var patientName = patient?.FullName ?? string.Empty;

        var dtos = items.Select(r => MapRadiographToDtoWithPatient(r, patientName)).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<RadiographDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<bool> DeleteRadiographAsync(Guid id)
    {
        var radiograph = await _context.Radiographs.FindAsync(id);
        if (radiograph is null || !radiograph.IsActive) return false;

        radiograph.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    // ─── Patient Documents ─────────────────────────────────────────

    public async Task<PatientDocumentDto> UploadDocumentAsync(UploadPatientDocumentRequest request)
    {
        var patient = await _context.Patients.FindAsync(request.PatientId);
        if (patient is null || !patient.IsActive)
            throw new DomainException("PATIENT_NOT_FOUND", "المريض غير موجود");

        if (!Enum.IsDefined(typeof(DocumentType), request.DocumentType))
            throw new DomainException("INVALID_DOCUMENT_TYPE", "نوع المستند غير صالح");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new DomainException("DOCUMENT_TITLE_REQUIRED", "عنوان المستند مطلوب");

        if (string.IsNullOrWhiteSpace(request.FileUrl))
            throw new DomainException("FILE_URL_REQUIRED", "رابط الملف مطلوب");

        var document = new PatientDocument
        {
            Id = Guid.NewGuid(),
            PatientId = request.PatientId,
            Title = request.Title.Trim(),
            DocumentType = (DocumentType)request.DocumentType,
            FileUrl = request.FileUrl.Trim(),
            FileName = request.FileName?.Trim(),
            FileSize = request.FileSize,
            MimeType = request.MimeType?.Trim(),
            IsSigned = request.IsSigned,
            SignedAt = request.IsSigned ? DateTime.UtcNow : null,
            Notes = request.Notes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.PatientDocuments.Add(document);
        await _context.SaveChangesAsync();

        return await MapPatientDocumentToDtoAsync(document);
    }

    public async Task<PagedResult<PatientDocumentDto>> GetDocumentsByPatientAsync(Guid patientId, int page, int pageSize, int? documentType)
    {
        var query = _context.PatientDocuments
            .Where(d => d.IsActive && d.PatientId == patientId);

        if (documentType.HasValue)
        {
            if (!Enum.IsDefined(typeof(DocumentType), documentType.Value))
                throw new DomainException("INVALID_DOCUMENT_TYPE", "نوع المستند غير صالح");
            query = query.Where(d => d.DocumentType == (DocumentType)documentType.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var patient = await _context.Patients.FindAsync(patientId);
        var patientName = patient?.FullName ?? string.Empty;

        var dtos = items.Select(d => MapPatientDocumentToDtoWithPatient(d, patientName)).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<PatientDocumentDto>(dtos, totalCount, page, pageSize, totalPages);
    }

    public async Task<bool> DeleteDocumentAsync(Guid id)
    {
        var document = await _context.PatientDocuments.FindAsync(id);
        if (document is null || !document.IsActive) return false;

        document.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PatientDocumentDto?> SignDocumentAsync(Guid id)
    {
        var document = await _context.PatientDocuments.FindAsync(id);
        if (document is null || !document.IsActive) return null;

        document.IsSigned = true;
        document.SignedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await MapPatientDocumentToDtoAsync(document);
    }

    // ─── Private helpers / Mapping methods ─────────────────────────

    private async Task<ClinicalPhotoDto> MapClinicalPhotoToDtoAsync(ClinicalPhoto p)
    {
        var patient = await _context.Patients.FindAsync(p.PatientId);
        return MapClinicalPhotoToDtoWithPatient(p, patient?.FullName ?? string.Empty);
    }

    private static ClinicalPhotoDto MapClinicalPhotoToDtoWithPatient(ClinicalPhoto p, string patientName) => new(
        p.Id,
        p.PatientId,
        patientName,
        p.OrthoCaseId,
        p.FileUrl,
        p.ThumbnailUrl,
        (int)p.Category,
        GetClinicalPhotoCategoryDisplay((int)p.Category),
        p.PhotoType,
        p.Stage,
        p.PhotoDate,
        p.Caption,
        p.IsActive,
        p.CreatedAt
    );

    private async Task<RadiographDto> MapRadiographToDtoAsync(Radiograph r)
    {
        var patient = await _context.Patients.FindAsync(r.PatientId);
        var patientName = patient?.FullName ?? string.Empty;
        var doctorName = r.DoctorId.HasValue
            ? (await _context.Doctors.FindAsync(r.DoctorId.Value))?.FullName
            : null;
        return MapRadiographToDtoWithPatientAndDoctor(r, patientName, doctorName);
    }

    private static RadiographDto MapRadiographToDtoWithPatient(Radiograph r, string patientName)
    {
        return new RadiographDto(
            r.Id,
            r.PatientId,
            patientName,
            r.FileUrl,
            (int)r.XrayType,
            GetXrayTypeDisplay((int)r.XrayType),
            r.FileName,
            r.FileSize,
            r.MimeType,
            r.ToothRelated,
            r.DoctorId,
            r.Doctor?.FullName,
            r.XrayDate,
            r.Notes,
            r.IsActive,
            r.CreatedAt
        );
    }

    private static RadiographDto MapRadiographToDtoWithPatientAndDoctor(Radiograph r, string patientName, string? doctorName) => new(
        r.Id,
        r.PatientId,
        patientName,
        r.FileUrl,
        (int)r.XrayType,
        GetXrayTypeDisplay((int)r.XrayType),
        r.FileName,
        r.FileSize,
        r.MimeType,
        r.ToothRelated,
        r.DoctorId,
        doctorName,
        r.XrayDate,
        r.Notes,
        r.IsActive,
        r.CreatedAt
    );

    private async Task<PatientDocumentDto> MapPatientDocumentToDtoAsync(PatientDocument d)
    {
        var patient = await _context.Patients.FindAsync(d.PatientId);
        return MapPatientDocumentToDtoWithPatient(d, patient?.FullName ?? string.Empty);
    }

    private static PatientDocumentDto MapPatientDocumentToDtoWithPatient(PatientDocument d, string patientName) => new(
        d.Id,
        d.PatientId,
        patientName,
        d.Title,
        (int)d.DocumentType,
        GetDocumentTypeDisplay((int)d.DocumentType),
        d.FileUrl,
        d.FileName,
        d.FileSize,
        d.MimeType,
        d.IsSigned,
        d.SignedAt,
        d.Notes,
        d.IsActive,
        d.CreatedAt
    );

    private static string GetClinicalPhotoCategoryDisplay(int category) =>
        category >= 0 && category < ClinicalPhotoCategoryDisplay.Length
            ? ClinicalPhotoCategoryDisplay[category]
            : category.ToString();

    private static string GetXrayTypeDisplay(int type) =>
        type >= 0 && type < XrayTypeDisplay.Length
            ? XrayTypeDisplay[type]
            : type.ToString();

    private static string GetDocumentTypeDisplay(int type)
    {
        if (type == 99) return DocumentTypeDisplay[4]; // Other
        return type >= 0 && type < DocumentTypeDisplay.Length - 1
            ? DocumentTypeDisplay[type]
            : type.ToString();
    }
}
