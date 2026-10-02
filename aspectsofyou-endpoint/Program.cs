using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Authentication;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Endpoints;
using UvA.AspectsOfYou.Endpoint.Entities;
using UvA.AspectsOfYou.Endpoint.Moderation;
/*
TODO's: 1. add security

This file describes the API in order to communicate with the database
*/
var builder = WebApplication.CreateBuilder(args);

var bannedTerms = BannedTerms.LoadFromContentRoot(builder.Environment.ContentRootPath);

var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

var corsOrigins = configuredCorsOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddSurfConextAuthentication(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            if (corsOrigins.Length > 0)
            {
                policy
                    .WithOrigins(corsOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
                return;
            }

            // In production, no configured origins means no cross-origin access.
            policy.SetIsOriginAllowed(_ => false);
        }
    );
});


builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

// Makes the connection to the database more robust (implemented after failing)
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

app.MapPost("/api/surveys", async (AspectContext db, CreateSurveyDto surveyDto) =>
{
    var survey = new Survey
    {
        SurveyId = Guid.NewGuid(),
        Title = surveyDto.Title,
        Live = surveyDto.Live,
        Editing = surveyDto.Editing,
        Questions = surveyDto.Questions.Select((q, index) => new Question
        {
            QuestionId = Guid.NewGuid(),
            QuestionText = q.QuestionText,
            QuestionType = q.QuestionType,
            AllowMultipleSelections = q.AllowMultipleSelections,
            OrderIndex = index,
            Answers = q.Answers.Select(a => new Answer
            {
                AnswerID = Guid.NewGuid(),
                AnswerText = a.AnswerText,
                ExtraText = a.ExtraText
            }).ToList()
        }).ToList()
    };

    db.Surveys.Add(survey);
    await db.SaveChangesAsync();

    // Initialize ViewSurvey, ViewQuestion, and ViewAnswerOption
    var viewSurvey = new ViewSurvey
    {
        SurveyId = survey.SurveyId,
        ViewNumber = 1,
        Title = survey.Title,
        Description = string.Empty,
        FunkyBackground = false,
        FunkyColors = false,
        FunkyFont = false
    };
    db.ViewSurveys.Add(viewSurvey);
    await db.SaveChangesAsync();

    foreach (var question in survey.Questions)
    {
        var viewQuestion = new ViewQuestion
        {
            ViewSurveyId = viewSurvey.Id,
            QuestionId = question.QuestionId,
            Title = question.QuestionText,
            ExcludedAnswerIds = string.Empty,
            ExcludedResponseIds = string.Empty,
            IsExcludedFromView = false,
            OrderingId = question.OrderIndex,
            ViewTypes = new List<string>
            {
                question.QuestionType == 3 ? "geochart" : "circleplot"
            }
        };
        db.ViewQuestions.Add(viewQuestion);
        await db.SaveChangesAsync();

        foreach (var answer in question.Answers)
        {
            var viewAnswer = new ViewAnswerOption
            {
                ViewQuestionId = viewQuestion.Id,
                AnswerId = answer.AnswerID,
                Title = answer.AnswerText
            };
            db.ViewAnswerOptions.Add(viewAnswer);
        }
        await db.SaveChangesAsync();
    }

    return Results.Created($"/api/surveys/{survey.SurveyId}", survey.SurveyId);
}).RequireAuthorization(AuthorizationPolicies.Admin);

app.MapPut("/api/surveys/{id}", async (AspectContext db, Guid id, CreateSurveyDto surveyDto) =>
{
    var survey = await db.Surveys
        .AsTracking()
        .FirstOrDefaultAsync(s => s.SurveyId == id);

    if (survey is null)
    {
        return Results.NotFound();
    }

    if (surveyDto.Editing && await db.Responses.AnyAsync(r => r.SurveyId == id))
    {
        return Results.BadRequest(new { message = "Cannot reopen editing after responses have been submitted." });
    }

    if (survey.Live && !survey.Editing)
    {
        return Results.BadRequest(new { message = "Survey is live and cannot be edited. Use view settings instead." });
    }

    await using var transaction = await db.Database.BeginTransactionAsync();

    // Remove existing view configuration so we can rebuild with fresh question/answer IDs
    var existingViewSurvey = await db.ViewSurveys.FirstOrDefaultAsync(vs => vs.SurveyId == survey.SurveyId);
    if (existingViewSurvey != null)
    {
        var existingViewQuestionIds = await db.ViewQuestions
            .Where(vq => vq.ViewSurveyId == existingViewSurvey.Id)
            .Select(vq => vq.Id)
            .ToListAsync();

        if (existingViewQuestionIds.Count > 0)
        {
            await db.ViewAnswerOptions
                .Where(va => existingViewQuestionIds.Contains(va.ViewQuestionId))
                .ExecuteDeleteAsync();
        }

        await db.ViewQuestions
            .Where(vq => vq.ViewSurveyId == existingViewSurvey.Id)
            .ExecuteDeleteAsync();

        await db.ViewSurveys
            .Where(vs => vs.Id == existingViewSurvey.Id)
            .ExecuteDeleteAsync();
    }

    // Remove responses, questions, and answers tied to this survey to avoid partial updates
    await db.Responses
        .Where(r => r.SurveyId == survey.SurveyId)
        .ExecuteDeleteAsync();

    var questionIds = await db.Questions
        .Where(q => q.SurveyId == survey.SurveyId)
        .Select(q => q.QuestionId)
        .ToListAsync();

    if (questionIds.Count > 0)
    {
        await db.Answers
            .Where(a => questionIds.Contains(a.QuestionId))
            .ExecuteDeleteAsync();
    }

    await db.Questions
        .Where(q => q.SurveyId == survey.SurveyId)
        .ExecuteDeleteAsync();

    // Update survey header fields
    survey.Title = surveyDto.Title;
    survey.Live = surveyDto.Live;
    survey.Editing = surveyDto.Editing;
    await db.SaveChangesAsync();

    // Recreate questions and answers with fresh IDs
    var questions = surveyDto.Questions.Select((q, index) => new Question
    {
        QuestionId = Guid.NewGuid(),
        QuestionText = q.QuestionText,
        QuestionType = q.QuestionType,
        AllowMultipleSelections = q.AllowMultipleSelections,
        OrderIndex = index,
        SurveyId = survey.SurveyId,
        Answers = q.Answers.Select(a => new Answer
        {
            AnswerID = Guid.NewGuid(),
            AnswerText = a.AnswerText,
            ExtraText = a.ExtraText
        }).ToList()
    }).ToList();

    db.Questions.AddRange(questions);
    await db.SaveChangesAsync();

    // Recreate view tables to match the new question/answer IDs
    var viewSurvey = new ViewSurvey
    {
        SurveyId = survey.SurveyId,
        ViewNumber = 1,
        Title = survey.Title,
        Description = string.Empty,
        FunkyBackground = false,
        FunkyColors = false,
        FunkyFont = false
    };
    db.ViewSurveys.Add(viewSurvey);
    await db.SaveChangesAsync();

    foreach (var question in questions)
    {
        var viewQuestion = new ViewQuestion
        {
            ViewSurveyId = viewSurvey.Id,
            QuestionId = question.QuestionId,
            Title = question.QuestionText,
            ExcludedAnswerIds = string.Empty,
            ExcludedResponseIds = string.Empty,
            IsExcludedFromView = false,
            OrderingId = question.OrderIndex,
            ViewTypes = new List<string>
            {
                question.QuestionType == 3 ? "geochart" : "circleplot"
            }
        };
        db.ViewQuestions.Add(viewQuestion);
        await db.SaveChangesAsync();

        foreach (var answer in question.Answers)
        {
            var viewAnswer = new ViewAnswerOption
            {
                ViewQuestionId = viewQuestion.Id,
                AnswerId = answer.AnswerID,
                Title = answer.AnswerText
            };
            db.ViewAnswerOptions.Add(viewAnswer);
        }
        await db.SaveChangesAsync();
    }

    await transaction.CommitAsync();

    return Results.Ok(new { surveyId = survey.SurveyId, live = survey.Live, editing = survey.Editing });
}).RequireAuthorization(AuthorizationPolicies.Admin);

app.MapPost("/api/surveys/{id}/status", async (AspectContext db, Guid id, UpdateSurveyStatusDto statusDto) =>
{
    var survey = await db.Surveys.FirstOrDefaultAsync(s => s.SurveyId == id);
    if (survey is null)
    {
        return Results.NotFound();
    }

    if (statusDto.Editing && await db.Responses.AnyAsync(r => r.SurveyId == id))
    {
        return Results.BadRequest(new { message = "Cannot reopen editing after responses have been submitted." });
    }

    survey.Live = statusDto.Live;
    survey.Editing = statusDto.Editing;
    await db.SaveChangesAsync();

    return Results.Ok(new { surveyId = survey.SurveyId, live = survey.Live, editing = survey.Editing });
}).RequireAuthorization(AuthorizationPolicies.Admin);

app.MapResponseEndpoints(bannedTerms);

/*
Lists all surveys in the database, with their questions and answers
*/
app.MapGet("/api/surveys", async (AspectContext db) =>
{
    var surveys = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Select(s => new SurveyDto
        {
            SurveyId = s.SurveyId,
            Title = s.Title,
            Live = s.Live,
            Editing = s.Editing,
            // adds questions in order to comply with the DTO interface
            Questions = s.Questions.OrderBy(q => q.OrderIndex).Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                AllowMultipleSelections = q.AllowMultipleSelections,
                OrderIndex = q.OrderIndex,
                // adds the answers to apply to the questions DTO interface
                Answers = q.Answers.Select(a => new AnswerDto
                {
                    AnswerId = a.AnswerID,
                    AnswerText = a.AnswerText,
                    ExtraText = a.ExtraText
                }).ToList()
            }).ToList(),
            // Include views for this survey
            Views = db.ViewSurveys
                .Where(vs => vs.SurveyId == s.SurveyId)
                .OrderBy(vs => vs.ViewNumber)
                .Select(vs => new ViewSummaryDto
                {
                    Id = vs.Id,
                    ViewNumber = vs.ViewNumber,
                    Title = vs.Title
                }).ToList()
        })
        .ToListAsync();

    return Results.Ok(surveys);
}).RequireAuthorization(AuthorizationPolicies.Admin);

/*
Select a certain survey id.

Same as previous API call, but now with one specific survey
*/
app.MapGet("/api/surveys/{id}", async (
    AspectContext db,
    Guid id,
    HttpContext context,
    IConfiguration configuration) =>
{
    var survey = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Where(s => s.SurveyId == id)
        .Select(s => new SurveyDto
        {
            SurveyId = s.SurveyId,
            Title = s.Title,
            Live = s.Live,
            Editing = s.Editing,
            Questions = s.Questions.OrderBy(q => q.OrderIndex).Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                AllowMultipleSelections = q.AllowMultipleSelections,
                OrderIndex = q.OrderIndex,
                Answers = q.Answers.Select(a => new AnswerDto
                {
                    AnswerId = a.AnswerID,
                    AnswerText = a.AnswerText,
                    ExtraText = a.ExtraText
                }).ToList()
            }).ToList()
        })
        .FirstOrDefaultAsync();

    if (survey is null)
    {
        return Results.NotFound();
    }

    var requiredMemberOf = configuration[$"{SurfConextOptions.Section}:AdminInviteMemberOf"];
    var isAdmin = context.User.Identity?.IsAuthenticated == true
        && SurfConextAdminAuthorization.IsInviteAdmin(context.User, requiredMemberOf);

    if (!isAdmin && !survey.Live)
    {
        return Results.NotFound();
    }

    return Results.Ok(survey);
});

/*
Returns all responses (of all questions) of a certain survey
*/
app.MapGet("/api/surveys/{surveyId}/responses", async (AspectContext db, Guid surveyId) =>
{
    var responses = await db.Responses
        .Where(r => r.SurveyId == surveyId)
        .Join(db.Questions,
            r => r.QuestionId,
            q => q.QuestionId,
            (r, q) => new { r, q })
        .Select(x => new ResponseDto
        {
            ResponseId = x.r.ResponseId,
            Date = x.r.Date,
            Additional = x.r.Additional,
            SurveyId = x.r.SurveyId,
            QuestionId = x.r.QuestionId,
            AnswerId = x.r.AnswerId,
            QuestionType = x.q.QuestionType
        })
        .ToListAsync();

    return Results.Ok(responses);
}).RequireAuthorization(AuthorizationPolicies.Admin);

/*
Returns all responses to a certain question
*/
app.MapGet("/api/questions/{questionId}/responses", async (AspectContext db, Guid questionId) =>
{
    var responses = await db.Responses
        .Where(r => r.QuestionId == questionId)
        .Join(db.Questions,
            r => r.QuestionId,
            q => q.QuestionId,
            (r, q) => new { r, q })
        .Select(x => new ResponseDto
        {
            ResponseId = x.r.ResponseId,
            Date = x.r.Date,
            Additional = x.r.Additional,
            SurveyId = x.r.SurveyId,
            QuestionId = x.r.QuestionId,
            AnswerId = x.r.AnswerId,
            QuestionType = x.q.QuestionType
        })
        .ToListAsync();

    return Results.Ok(responses);
}).RequireAuthorization(AuthorizationPolicies.Admin);


/*
Returns the counts for each question of a survey
*/
app.MapGet("/api/surveys/{surveyId}/responseCounts", async (AspectContext db, Guid surveyId) =>
{
    // Load questions for this survey
    var questions = await db.Questions
        .Where(q => q.SurveyId == surveyId)
        .ToListAsync();

    var questionOrder = questions
        .ToDictionary(q => q.QuestionId, q => q.OrderIndex); // Ensures the questions are returned in the order of the survey

    // Load answers for these questions
    var questionIds = questions.Select(q => q.QuestionId).ToList();
    var answers = await db.Answers
        .Where(a => questionIds.Contains(a.QuestionId))
        .ToListAsync();

    // Load all responses for this survey
    var responses = await db.Responses
        .Where(r => r.SurveyId == surveyId)
        .ToListAsync();

    // Load view configuration to determine excluded response IDs per question
    var viewQuestionConfigs = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId)
        .SelectMany(vs => db.ViewQuestions.Where(vq => vq.ViewSurveyId == vs.Id))
        .Select(vq => new { vq.QuestionId, vq.ExcludedResponseIds })
        .ToListAsync();

    var excludedByQuestion = new Dictionary<Guid, HashSet<Guid>>();
    foreach (var cfg in viewQuestionConfigs)
    {
        if (string.IsNullOrWhiteSpace(cfg.ExcludedResponseIds))
            continue;

        var ids = new HashSet<Guid>();
        foreach (var part in cfg.ExcludedResponseIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Guid.TryParse(part, out var guid))
            {
                ids.Add(guid);
            }
        }

        if (ids.Count > 0)
        {
            excludedByQuestion[cfg.QuestionId] = ids;
        }
    }

    // Filter responses based on excluded response IDs per question
    var filteredResponses = responses
        .Where(r =>
            !excludedByQuestion.TryGetValue(r.QuestionId, out var excludedSet) ||
            !excludedSet.Contains(r.ResponseId))
        .ToList();

    // handles multiple and open question separately using in-memory LINQ
    var responsesWithQuestions = filteredResponses
        .Join(questions,
            r => r.QuestionId,
            q => q.QuestionId,
            (r, q) => new { r, q })
        .ToList();

    var multipleChoiceResults = responsesWithQuestions
        .Where(rq => rq.q.QuestionType != 2) // Not open questions
        .Join(answers,
            rq => rq.r.AnswerId,
            a => a.AnswerID,
            (rq, a) => new { rq.r, rq.q, a })
        .GroupBy(x => new
        {
            x.q.QuestionId,
            x.q.QuestionText,
            x.q.OrderIndex,
            x.q.QuestionType,
            x.a.AnswerID,
            x.a.AnswerText
        })
        .Select(g => new ResponseCountDto
        {
            QuestionId = g.Key.QuestionId,
            QuestionText = g.Key.QuestionText,
            QuestionType = g.Key.QuestionType,
            AnswerId = g.Key.AnswerID,
            AnswerText = g.Key.AnswerText,
            Count = g.Count()
        })
        .OrderBy(r => r.QuestionId)
        .ToList();

    var openEndedResults = responsesWithQuestions
        .Where(rq => rq.q.QuestionType == 2) // Open ended questions
        .Select(x => new
        {
            QuestionId = x.q.QuestionId,
            QuestionText = x.q.QuestionText,
            QuestionType = x.q.QuestionType,
            ResponseText = x.r.Additional ?? "No response"
        })
        .GroupBy(x => new
        {
            x.QuestionId,
            x.QuestionText,
            x.QuestionType,
            x.ResponseText
        })
        .Select(g => new ResponseCountDto
        {
            QuestionId = g.Key.QuestionId,
            QuestionText = g.Key.QuestionText,
            QuestionType = g.Key.QuestionType,
            AnswerId = new Guid("00000000-0000-0000-0000-000000000000"),
            AnswerText = g.Key.ResponseText,
            Count = g.Count()
        })
        .ToList();

    // Combine multiple-choice and open-ended questions
    var combined = multipleChoiceResults.Concat(openEndedResults)
        .OrderBy(r => questionOrder.ContainsKey(r.QuestionId) ? questionOrder[r.QuestionId] : int.MaxValue)
        .ToList();

    return Results.Ok(combined);
});


/*
Deletes a survey from the database
*/
app.MapDelete("/api/surveys/delete/{id}", async (AspectContext db, Guid id) =>
{
    Console.WriteLine($"Attempting to delete survey with ID: {id}");

    var survey = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .Include(s => s.Responses)
        .FirstOrDefaultAsync(s => s.SurveyId == id);

    if (survey is null)
    {
        Console.WriteLine($"Survey with ID {id} not found.");
        return Results.NotFound(new { message = "Survey not found" });
    }

    Console.WriteLine($"Found survey with ID {id}. Deleting related entities...");

    // Remove related responses
    db.Responses.RemoveRange(survey.Responses);

    // Remove related questions and their answers
    foreach (var question in survey.Questions)
    {
        db.Answers.RemoveRange(question.Answers);
        db.Questions.Remove(question);
    }

    // Remove the survey itself
    db.Surveys.Remove(survey);
    await db.SaveChangesAsync();

    return Results.NoContent();
}).RequireAuthorization(AuthorizationPolicies.Admin);

app.MapViewSurveyEndpoints();
app.MapDisplaySlotEndpoints();

app.Run();