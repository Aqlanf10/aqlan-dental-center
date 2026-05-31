using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalVisitsAndPrescriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClinicalVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DailyVisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClinicQueueItemId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ChiefComplaint = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ClinicalFindings = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    Diagnosis = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    TreatmentNotes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    DoctorRecommendations = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    NextVisitRecommended = table.Column<bool>(type: "INTEGER", nullable: false),
                    NextVisitDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalVisits_ClinicQueueItems_ClinicQueueItemId",
                        column: x => x.ClinicQueueItemId,
                        principalTable: "ClinicQueueItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClinicalVisits_DailyVisits_DailyVisitId",
                        column: x => x.DailyVisitId,
                        principalTable: "DailyVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalVisits_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicalVisits_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Prescriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClinicalVisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MedicationName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Dosage = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    Frequency = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    Duration = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    Instructions = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prescriptions_ClinicalVisits_ClinicalVisitId",
                        column: x => x.ClinicalVisitId,
                        principalTable: "ClinicalVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prescriptions_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_ClinicQueueItemId",
                table: "ClinicalVisits",
                column: "ClinicQueueItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_DailyVisitId",
                table: "ClinicalVisits",
                column: "DailyVisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_DoctorId",
                table: "ClinicalVisits",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_IsActive",
                table: "ClinicalVisits",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_PatientId",
                table: "ClinicalVisits",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_Status",
                table: "ClinicalVisits",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalVisits_VisitDate",
                table: "ClinicalVisits",
                column: "VisitDate");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_ClinicalVisitId",
                table: "Prescriptions",
                column: "ClinicalVisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_DoctorId",
                table: "Prescriptions",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_IsActive",
                table: "Prescriptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Prescriptions_PatientId",
                table: "Prescriptions",
                column: "PatientId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Prescriptions");

            migrationBuilder.DropTable(
                name: "ClinicalVisits");
        }
    }
}
