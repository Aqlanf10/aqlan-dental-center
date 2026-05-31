using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGeneralDentistryModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DentalCharts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ChartDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentalCharts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DentalCharts_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DentalCharts_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GeneralTreatments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VisitId = table.Column<Guid>(type: "TEXT", nullable: true),
                    TreatmentType = table.Column<int>(type: "INTEGER", nullable: false),
                    ToothNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    MaterialUsed = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AnesthesiaType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Cost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeneralTreatments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeneralTreatments_ClinicalVisits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "ClinicalVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GeneralTreatments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GeneralTreatments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TreatmentPlanSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SequenceNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    ClinicServiceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ServiceNameSnapshot = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Department = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ToothNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    ToothArea = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ResponsibleDoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PlannedDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CompletedDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TreatmentPlanSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TreatmentPlanSteps_ClinicServices_ClinicServiceId",
                        column: x => x.ClinicServiceId,
                        principalTable: "ClinicServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TreatmentPlanSteps_Doctors_ResponsibleDoctorId",
                        column: x => x.ResponsibleDoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TreatmentPlanSteps_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ToothConditions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ChartId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ToothNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Condition = table.Column<int>(type: "INTEGER", nullable: false),
                    SurfacesAffected = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    TreatmentDone = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToothConditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToothConditions_DentalCharts_ChartId",
                        column: x => x.ChartId,
                        principalTable: "DentalCharts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DentalCharts_ChartDate",
                table: "DentalCharts",
                column: "ChartDate");

            migrationBuilder.CreateIndex(
                name: "IX_DentalCharts_DoctorId",
                table: "DentalCharts",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_DentalCharts_IsActive",
                table: "DentalCharts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DentalCharts_PatientId",
                table: "DentalCharts",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralTreatments_DoctorId",
                table: "GeneralTreatments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralTreatments_IsActive",
                table: "GeneralTreatments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralTreatments_PatientId",
                table: "GeneralTreatments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralTreatments_TreatmentType",
                table: "GeneralTreatments",
                column: "TreatmentType");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralTreatments_VisitId",
                table: "GeneralTreatments",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ToothConditions_ChartId",
                table: "ToothConditions",
                column: "ChartId");

            migrationBuilder.CreateIndex(
                name: "IX_ToothConditions_ChartId_ToothNumber",
                table: "ToothConditions",
                columns: new[] { "ChartId", "ToothNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToothConditions_Condition",
                table: "ToothConditions",
                column: "Condition");

            migrationBuilder.CreateIndex(
                name: "IX_ToothConditions_IsActive",
                table: "ToothConditions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ToothConditions_ToothNumber",
                table: "ToothConditions",
                column: "ToothNumber");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_ClinicServiceId",
                table: "TreatmentPlanSteps",
                column: "ClinicServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_IsActive",
                table: "TreatmentPlanSteps",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_PatientId",
                table: "TreatmentPlanSteps",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_PatientId_SequenceNumber",
                table: "TreatmentPlanSteps",
                columns: new[] { "PatientId", "SequenceNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_Priority",
                table: "TreatmentPlanSteps",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_ResponsibleDoctorId",
                table: "TreatmentPlanSteps",
                column: "ResponsibleDoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentPlanSteps_Status",
                table: "TreatmentPlanSteps",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GeneralTreatments");

            migrationBuilder.DropTable(
                name: "ToothConditions");

            migrationBuilder.DropTable(
                name: "TreatmentPlanSteps");

            migrationBuilder.DropTable(
                name: "DentalCharts");
        }
    }
}
