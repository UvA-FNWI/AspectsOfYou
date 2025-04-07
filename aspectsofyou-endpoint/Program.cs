using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Modified in order to retry multiple times to connect to the postgresql database.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AspectContext>();
    var retryCount = 0;
    const int maxRetries = 10;

    while (retryCount < maxRetries)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex)
        {
            retryCount++;
            Console.WriteLine($"Database connection attempt {retryCount} failed: {ex.Message}");
            if (retryCount >= maxRetries)
                throw;
            await Task.Delay(2000 * retryCount);
        }
    }
}

app.MapPost("/api/addsurveys", async (AspectContext db, Survey surveyObj) =>
{
    // survey
    var surveyID = Guid.NewGuid();
    var survey = new Survey
    {
        SurveyId = surveyID,
        Title = surveyObj.Title
    };

    // questions
    foreach (var questionObj in surveyObj.Questions)
    {
        var questionId = Guid.NewGuid();
        var question = new Question
        {
            QuestionId = questionId,
            QuestionText = questionObj.QuestionText,
            QuestionType = questionObj.QuestionType,
            SurveyId = surveyID
        };

        survey.Questions.Add(question);

        // answers
        foreach (var answerObj in questionObj.Answers)
        {
            var answer = new Answer
            {
                AnswerID = Guid.NewGuid(),
                AnswerText = answerObj.AnswerText,
                ExtraText = answerObj.ExtraText,
                QuestionId = questionId
            };

            question.Answers.Add(answer);
        }
    }

    // this will recursively also add all questions and answers
    db.Surveys.Add(survey);
    await db.SaveChangesAsync();

    return Results.Created($"/api/surveys/{survey.SurveyId}", survey.SurveyId);
});

// TODO: add point to register answers to questions
app.MapPost("/api/addsurveys", async (AspectContext db, Survey surveyObj) =>
{
    // survey
    var surveyID = Guid.NewGuid();
    var survey = new Survey
    {
        SurveyId = surveyID,
        Title = surveyObj.Title
    };

    // questions
    foreach (var questionObj in surveyObj.Questions)
    {
        var questionId = Guid.NewGuid();
        var question = new Question
        {
            QuestionId = questionId,
            QuestionText = questionObj.QuestionText,
            QuestionType = questionObj.QuestionType,
            SurveyId = surveyID
        };

        survey.Questions.Add(question);

        // answers
        foreach (var answerObj in questionObj.Answers)
        {
            var answer = new Answer
            {
                AnswerID = Guid.NewGuid(),
                AnswerText = answerObj.AnswerText,
                ExtraText = answerObj.ExtraText,
                QuestionId = questionId
            };

            question.Answers.Add(answer);
        }
    }

    // this will recursively also add all questions and answers
    db.Surveys.Add(survey);
    await db.SaveChangesAsync();

    return Results.Created($"/api/surveys/{survey.SurveyId}", survey.SurveyId);
});

// TODO: add point to get all responses for questions

app.Run();