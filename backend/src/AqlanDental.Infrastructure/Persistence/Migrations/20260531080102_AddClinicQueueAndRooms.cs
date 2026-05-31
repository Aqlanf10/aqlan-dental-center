using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AqlanDental.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicQueueAndRooms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClinicRooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    RoomNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsOccupied = table.Column<bool>(type: "INTEGER", nullable: false),
                    CurrentDailyVisitId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicRooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicRooms_DailyVisits_CurrentDailyVisitId",
                        column: x => x.CurrentDailyVisitId,
                        principalTable: "DailyVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ClinicQueueItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DailyVisitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PatientId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DoctorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    RoomId = table.Column<Guid>(type: "TEXT", nullable: true),
                    QueueDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    QueueNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CalledAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EnteredRoomAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicQueueItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicQueueItems_ClinicRooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "ClinicRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClinicQueueItems_DailyVisits_DailyVisitId",
                        column: x => x.DailyVisitId,
                        principalTable: "DailyVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicQueueItems_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClinicQueueItems_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_DailyVisitId",
                table: "ClinicQueueItems",
                column: "DailyVisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_DoctorId",
                table: "ClinicQueueItems",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_IsActive",
                table: "ClinicQueueItems",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_PatientId",
                table: "ClinicQueueItems",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_Priority",
                table: "ClinicQueueItems",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_QueueDate",
                table: "ClinicQueueItems",
                column: "QueueDate");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_QueueDate_QueueNumber",
                table: "ClinicQueueItems",
                columns: new[] { "QueueDate", "QueueNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_QueueNumber",
                table: "ClinicQueueItems",
                column: "QueueNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_RoomId",
                table: "ClinicQueueItems",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicQueueItems_Status",
                table: "ClinicQueueItems",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicRooms_CurrentDailyVisitId",
                table: "ClinicRooms",
                column: "CurrentDailyVisitId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicRooms_IsActive",
                table: "ClinicRooms",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicRooms_IsOccupied",
                table: "ClinicRooms",
                column: "IsOccupied");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicQueueItems");

            migrationBuilder.DropTable(
                name: "ClinicRooms");
        }
    }
}
