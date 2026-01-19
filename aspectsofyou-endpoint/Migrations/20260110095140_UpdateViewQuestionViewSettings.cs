using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class UpdateViewQuestionViewSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExcludedResponseIds",
                table: "ViewQuestions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsExcludedFromView",
                table: "ViewQuestions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OrderingId",
                table: "ViewQuestions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ViewType",
                table: "ViewQuestions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExcludedResponseIds",
                table: "ViewQuestions");

            migrationBuilder.DropColumn(
                name: "IsExcludedFromView",
                table: "ViewQuestions");

            migrationBuilder.DropColumn(
                name: "OrderingId",
                table: "ViewQuestions");

            migrationBuilder.DropColumn(
                name: "ViewType",
                table: "ViewQuestions");
        }
    }
}
