using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    public partial class AddSurveyEditingFlag : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Editing",
                table: "Surveys",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.Sql("UPDATE \"Surveys\" SET \"Editing\" = FALSE WHERE \"Live\" = TRUE;");
            migrationBuilder.Sql("UPDATE \"Surveys\" SET \"Editing\" = TRUE WHERE \"Live\" = FALSE;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Editing",
                table: "Surveys");
        }
    }
}
