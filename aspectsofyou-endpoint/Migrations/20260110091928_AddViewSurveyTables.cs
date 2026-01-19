using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UvA.AspectsOfYou.Endpoint.Migrations
{
    /// <inheritdoc />
    public partial class AddViewSurveyTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ViewSurveys",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SurveyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ViewSurveys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ViewSurveys_Surveys_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "Surveys",
                        principalColumn: "SurveyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ViewQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ViewSurveyId = table.Column<int>(type: "integer", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    ExcludedAnswerIds = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ViewQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ViewQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "QuestionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ViewQuestions_ViewSurveys_ViewSurveyId",
                        column: x => x.ViewSurveyId,
                        principalTable: "ViewSurveys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ViewAnswerOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ViewQuestionId = table.Column<int>(type: "integer", nullable: false),
                    AnswerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ViewAnswerOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ViewAnswerOptions_Answers_AnswerId",
                        column: x => x.AnswerId,
                        principalTable: "Answers",
                        principalColumn: "AnswerID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ViewAnswerOptions_ViewQuestions_ViewQuestionId",
                        column: x => x.ViewQuestionId,
                        principalTable: "ViewQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ViewAnswerOptions_AnswerId",
                table: "ViewAnswerOptions",
                column: "AnswerId");

            migrationBuilder.CreateIndex(
                name: "IX_ViewAnswerOptions_ViewQuestionId",
                table: "ViewAnswerOptions",
                column: "ViewQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ViewQuestions_QuestionId",
                table: "ViewQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ViewQuestions_ViewSurveyId",
                table: "ViewQuestions",
                column: "ViewSurveyId");

            migrationBuilder.CreateIndex(
                name: "IX_ViewSurveys_SurveyId",
                table: "ViewSurveys",
                column: "SurveyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ViewAnswerOptions");

            migrationBuilder.DropTable(
                name: "ViewQuestions");

            migrationBuilder.DropTable(
                name: "ViewSurveys");
        }
    }
}
