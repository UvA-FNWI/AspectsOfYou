using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class AddDisplaySlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DisplaySlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SlotName = table.Column<string>(type: "text", nullable: false),
                    SurveyId = table.Column<Guid>(type: "uuid", nullable: true),
                    ViewId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisplaySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DisplaySlots_Surveys_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "Surveys",
                        principalColumn: "SurveyId");
                    table.ForeignKey(
                        name: "FK_DisplaySlots_ViewSurveys_ViewId",
                        column: x => x.ViewId,
                        principalTable: "ViewSurveys",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DisplaySlots_SurveyId",
                table: "DisplaySlots",
                column: "SurveyId");

            migrationBuilder.CreateIndex(
                name: "IX_DisplaySlots_ViewId",
                table: "DisplaySlots",
                column: "ViewId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DisplaySlots");
        }
    }
}
