using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrthodonticsAndSurgeryModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrthoCases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CaseNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ApplianceType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    ExpectedDurationMonths = table.Column<int>(type: "INTEGER", nullable: true),
                    CurrentStage = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    StagePercentage = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalFee = table.Column<decimal>(type: "TEXT", precision: 12, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrthoCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrthoCases_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OrthoCases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SurgeryCases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CaseNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    SurgeryType = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    TeethInvolved = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    SurgeryDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    SurgeryLocation = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AnesthesiaType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    PreopNotes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    OperativeNotes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    PostopInstructions = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    Complications = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    FollowupDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SurgeryCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SurgeryCases_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SurgeryCases_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrthoVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrthoCaseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VisitNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    VisitType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CurrentStage = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    WireUpper = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    WireLower = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ElasticsType = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ClinicalNotes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: true),
                    PatientInstructions = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    NextAppointmentDate = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrthoVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrthoVisits_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OrthoVisits_OrthoCases_OrthoCaseId",
                        column: x => x.OrthoCaseId,
                        principalTable: "OrthoCases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TreatmentStages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrthoCaseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StageName = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    StageOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    TargetDurationMonths = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TreatmentStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TreatmentStages_OrthoCases_OrthoCaseId",
                        column: x => x.OrthoCaseId,
                        principalTable: "OrthoCases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrthoCases_CaseNumber",
                table: "OrthoCases",
                column: "CaseNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrthoCases_DoctorId",
                table: "OrthoCases",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoCases_IsActive",
                table: "OrthoCases",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoCases_PatientId",
                table: "OrthoCases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoCases_Status",
                table: "OrthoCases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoVisits_DoctorId",
                table: "OrthoVisits",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoVisits_IsActive",
                table: "OrthoVisits",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoVisits_OrthoCaseId",
                table: "OrthoVisits",
                column: "OrthoCaseId");

            migrationBuilder.CreateIndex(
                name: "IX_OrthoVisits_VisitDate",
                table: "OrthoVisits",
                column: "VisitDate");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_CaseNumber",
                table: "SurgeryCases",
                column: "CaseNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_DoctorId",
                table: "SurgeryCases",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_IsActive",
                table: "SurgeryCases",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_PatientId",
                table: "SurgeryCases",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_Status",
                table: "SurgeryCases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_SurgeryDate",
                table: "SurgeryCases",
                column: "SurgeryDate");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentStages_IsActive",
                table: "TreatmentStages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentStages_OrthoCaseId",
                table: "TreatmentStages",
                column: "OrthoCaseId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentStages_StageOrder",
                table: "TreatmentStages",
                column: "StageOrder");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentStages_Status",
                table: "TreatmentStages",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrthoVisits");

            migrationBuilder.DropTable(
                name: "SurgeryCases");

            migrationBuilder.DropTable(
                name: "TreatmentStages");

            migrationBuilder.DropTable(
                name: "OrthoCases");
        }
    }
}
