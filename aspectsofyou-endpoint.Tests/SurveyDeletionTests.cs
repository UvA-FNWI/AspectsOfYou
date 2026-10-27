using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UvA.AspectsOfYou.Endpoint.Entities;
using UvA.AspectsOfYou.Endpoint.Tests.Support;
using Xunit;

namespace UvA.AspectsOfYou.Endpoint.Tests;

public class SurveyDeletionTests : IAsyncLifetime
{
    private readonly string connectionString =
        PostgresTestDatabase.TryGetConnectionString()
        ?? throw new InvalidOperationException(
            "Integration tests require Postgres. Set ASPECTS_TEST_DATABASE or start Postgres (see README).");

    private AspectsWebApplicationFactory? factory;
    private HttpClient? client;
    private IServiceScope? scope;
    private AspectContext? db;

    public async Task InitializeAsync()
    {
        factory = new AspectsWebApplicationFactory(connectionString);
        client = factory.CreateClient();
        scope = factory.Services.CreateScope();
        db = scope.ServiceProvider.GetRequiredService<AspectContext>();
        await db.Database.MigrateAsync();
        await db.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE "DisplaySlots", "ViewAnswerOptions", "ViewQuestions", "ViewSurveys",
            "Responses", "Answers", "Questions", "Surveys" RESTART IDENTITY CASCADE;
            """);
    }

    public Task DisposeAsync()
    {
        scope?.Dispose();
        factory?.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task DeleteSurvey_clears_display_slot_and_removes_survey()
    {
        var surveyId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var answerId = Guid.NewGuid();

        db!.Surveys.Add(new Survey
        {
            SurveyId = surveyId,
            Title = "Delete me",
            Live = true,
            Editing = false,
        });
        db.Questions.Add(new Question
        {
            QuestionId = questionId,
            SurveyId = surveyId,
            QuestionText = "Q1",
            QuestionType = 0,
            OrderIndex = 0,
        });
        db.Answers.Add(new Answer
        {
            AnswerID = answerId,
            QuestionId = questionId,
            AnswerText = "A1",
            ExtraText = false,
        });
        db.ViewSurveys.Add(new ViewSurvey
        {
            SurveyId = surveyId,
            ViewNumber = 1,
            Title = "View 1",
        });
        await db.SaveChangesAsync();

        var viewId = await db.ViewSurveys.Where(v => v.SurveyId == surveyId).Select(v => v.Id).SingleAsync();
        db.DisplaySlots.Add(new DisplaySlot
        {
            SlotName = "display1",
            SurveyId = surveyId,
            ViewId = viewId,
        });
        await db.SaveChangesAsync();

        var response = await client!.DeleteAsync($"/api/surveys/delete/{surveyId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        db.ChangeTracker.Clear();
        Assert.False(await db.Surveys.AnyAsync(s => s.SurveyId == surveyId));

        var slot = await db.DisplaySlots.AsNoTracking().SingleAsync(s => s.SlotName == "display1");
        Assert.Null(slot.SurveyId);
        Assert.Null(slot.ViewId);
    }

    [Fact]
    public async Task DeleteSurvey_returns_not_found_for_missing_survey()
    {
        var response = await client!.DeleteAsync($"/api/surveys/delete/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
