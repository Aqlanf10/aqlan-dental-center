# Sprint 12+13: Orthodontics + Surgery Modules (Backend)

## Task Summary
Implemented the Orthodontics and Surgery backend modules for the Aqlan Dental Center project.

## Files Created

### Domain Entities
- `backend/src/AqlanDental.Domain/Entities/OrthoCase.cs` - OrthoCase entity with OrthoCaseStatus enum (Active=0, Completed=1, OnHold=2, Cancelled=3)
- `backend/src/AqlanDental.Domain/Entities/OrthoVisit.cs` - OrthoVisit entity for tracking orthodontic visits
- `backend/src/AqlanDental.Domain/Entities/TreatmentStage.cs` - TreatmentStage entity with StageStatus enum (Pending=0, InProgress=1, Completed=2)
- `backend/src/AqlanDental.Domain/Entities/SurgeryCase.cs` - SurgeryCase entity with SurgeryCaseStatus enum (Scheduled=0, InProgress=1, Completed=2, Cancelled=3)

### Application Layer (Interfaces + DTOs)
- `backend/src/AqlanDental.Application/Common/Interfaces/IOrthodonticsService.cs` - Interface with DTOs: OrthoCaseDto, OrthoCaseListItemDto, CreateOrthoCaseRequest, UpdateOrthoCaseRequest, OrthoVisitDto, AddOrthoVisitRequest, TreatmentStageDto, UpdateTreatmentStageRequest
- `backend/src/AqlanDental.Application/Common/Interfaces/ISurgeryService.cs` - Interface with DTOs: SurgeryCaseDto, SurgeryCaseListItemDto, CreateSurgeryCaseRequest, UpdateSurgeryCaseRequest, UpdateSurgeryStatusRequest

### Infrastructure (Service Implementations)
- `backend/src/AqlanDental.Infrastructure/Services/OrthodonticsService.cs` - Full implementation with Arabic status labels, auto case number generation (ORT-XXXX), status transition validation, visit auto-numbering
- `backend/src/AqlanDental.Infrastructure/Services/SurgeryService.cs` - Full implementation with Arabic status labels, auto case number generation (SUR-XXXX), status transition validation

### API Controllers
- `backend/src/AqlanDental.Api/Controllers/OrthodonticsController.cs` - Route: api/ortho-cases
- `backend/src/AqlanDental.Api/Controllers/SurgeryController.cs` - Route: api/surgery-cases

### Migration
- `20260531190219_AddOrthodonticsAndSurgeryModules.cs` - Creates 4 new tables with FKs, indexes, cascades

## Files Modified
- `Patient.cs` - Added OrthoCases, SurgeryCases navigation properties
- `AqlanDentalDbContext.cs` - Added DbSets + Fluent API configurations
- `DependencyInjection.cs` - Registered IOrthodonticsService, ISurgeryService
- `ServiceCollectionExtensions.cs` - Added OrthodonticsRead/Write, SurgeryRead/Write policies

## Build Result
Build succeeded with 0 warnings, 0 errors.
