using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using UvA.AspectsOfYou.Endpoint.Entities;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    [DbContext(typeof(AspectContext))]
    [Migration("20260110100000_AddFunkySettingsToViewSurvey")]
    /// <inheritdoc />
    public partial class AddFunkySettingsToViewSurvey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FunkyBackground",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FunkyColors",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FunkyFont",
                table: "ViewSurveys",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FunkyBackground",
                table: "ViewSurveys");

            migrationBuilder.DropColumn(
                name: "FunkyColors",
                table: "ViewSurveys");

            migrationBuilder.DropColumn(
                name: "FunkyFont",
                table: "ViewSurveys");
        }
    }
}
