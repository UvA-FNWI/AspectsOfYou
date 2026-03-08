using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Authentication;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;
/*
TODO's: 1. add security

This file describes the API in order to communicate with the database
*/
var builder = WebApplication.CreateBuilder(args);

var bannedTerms = LoadBannedTerms(builder.Environment.ContentRootPath);

builder.Services.AddSurfConextAuthentication(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});


builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

app.UseAuthentication();
app.UseRouting();
app.UseAuthorization();

app.UseCors("AllowReactDev");

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
}).RequireAuthorization();

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
});

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
});

// 2. Get view values for a survey (returns first/default view), including questions, excluded answers, and answer views
app.MapGet("/api/viewsurveys/{surveyId}", async (AspectContext db, Guid surveyId) =>
{
    var viewSurvey = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId)
        .OrderBy(vs => vs.ViewNumber)
        .Select(vs => new
        {
            vs.Id,
            vs.SurveyId,
            vs.ViewNumber,
            vs.Title,
            vs.Description,
            vs.FunkyBackground,
            vs.FunkyColors,
            vs.FunkyFont,
            Questions = db.ViewQuestions
                .Where(vq => vq.ViewSurveyId == vs.Id)
                .Select(vq => new
                {
                    vq.Id,
                    vq.QuestionId,
                    vq.Title,
                    ExcludedAnswerIds = vq.ExcludedAnswerIds,
                    ExcludedResponseIds = vq.ExcludedResponseIds,
                    vq.IsExcludedFromView,
                    vq.OrderingId,
                    vq.ViewTypes,
                    vq.RegionFilter,
                    Answers = db.ViewAnswerOptions
                        .Where(va => va.ViewQuestionId == vq.Id)
                        .Select(va => new
                        {
                            va.Id,
                            va.AnswerId,
                            va.Title
                        }).ToList()
                }).ToList()
        })
        .FirstOrDefaultAsync();

    return viewSurvey is null ? Results.NotFound() : Results.Ok(viewSurvey);
});

// Get a specific view by viewId
app.MapGet("/api/viewsurveys/{surveyId}/view/{viewId:int}", async (AspectContext db, Guid surveyId, int viewId) =>
{
    var viewSurvey = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId && vs.Id == viewId)
        .Select(vs => new
        {
            vs.Id,
            vs.SurveyId,
            vs.ViewNumber,
            vs.Title,
            vs.Description,
            vs.FunkyBackground,
            vs.FunkyColors,
            vs.FunkyFont,
            Questions = db.ViewQuestions
                .Where(vq => vq.ViewSurveyId == vs.Id)
                .Select(vq => new
                {
                    vq.Id,
                    vq.QuestionId,
                    vq.Title,
                    ExcludedAnswerIds = vq.ExcludedAnswerIds,
                    ExcludedResponseIds = vq.ExcludedResponseIds,
                    vq.IsExcludedFromView,
                    vq.OrderingId,
                    vq.ViewTypes,
                    vq.RegionFilter,
                    Answers = db.ViewAnswerOptions
                        .Where(va => va.ViewQuestionId == vq.Id)
                        .Select(va => new
                        {
                            va.Id,
                            va.AnswerId,
                            va.Title
                        }).ToList()
                }).ToList()
        })
        .FirstOrDefaultAsync();

    return viewSurvey is null ? Results.NotFound() : Results.Ok(viewSurvey);
});

// List all views for a survey
app.MapGet("/api/viewsurveys/{surveyId}/all", async (AspectContext db, Guid surveyId) =>
{
    var views = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId)
        .OrderBy(vs => vs.ViewNumber)
        .Select(vs => new ViewSummaryDto
        {
            Id = vs.Id,
            ViewNumber = vs.ViewNumber,
            Title = vs.Title
        })
        .ToListAsync();

    return Results.Ok(views);
});

// 3. Update the view tables for a given survey (replace all view questions and answers for a survey)
// This endpoint updates the first/default view - kept for backwards compatibility
app.MapPut("/api/viewsurveys/{surveyId}", async (AspectContext db, Guid surveyId, ViewSurvey update) =>
{
    var viewSurvey = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId)
        .OrderBy(vs => vs.ViewNumber)
        .FirstOrDefaultAsync();
    if (viewSurvey == null)
        return Results.NotFound();

    return await UpdateViewSurvey(db, viewSurvey, update);
});

// Update a specific view by its ID
app.MapPut("/api/viewsurveys/{surveyId}/view/{viewId:int}", async (AspectContext db, Guid surveyId, int viewId, ViewSurvey update) =>
{
    var viewSurvey = await db.ViewSurveys.FirstOrDefaultAsync(vs => vs.SurveyId == surveyId && vs.Id == viewId);
    if (viewSurvey == null)
        return Results.NotFound();

    return await UpdateViewSurvey(db, viewSurvey, update);
});

// Helper function to update a view survey
async Task<IResult> UpdateViewSurvey(AspectContext db, ViewSurvey viewSurvey, ViewSurvey update)
{
    viewSurvey.Title = update.Title;
    viewSurvey.Description = update.Description;
    viewSurvey.FunkyBackground = update.FunkyBackground;
    viewSurvey.FunkyColors = update.FunkyColors;
    viewSurvey.FunkyFont = update.FunkyFont;
    await db.SaveChangesAsync();

    // Remove old questions and answers
    var oldQuestions = db.ViewQuestions.Where(vq => vq.ViewSurveyId == viewSurvey.Id).ToList();
    foreach (var vq in oldQuestions)
    {
        var oldAnswers = db.ViewAnswerOptions.Where(va => va.ViewQuestionId == vq.Id).ToList();
        db.ViewAnswerOptions.RemoveRange(oldAnswers);
    }
    db.ViewQuestions.RemoveRange(oldQuestions);
    await db.SaveChangesAsync();

    // Add new questions and answers
    foreach (var q in update.ViewQuestions)
    {
        var newVq = new ViewQuestion
        {
            ViewSurveyId = viewSurvey.Id,
            QuestionId = q.QuestionId,
            Title = q.Title,
            ExcludedAnswerIds = q.ExcludedAnswerIds,
            ExcludedResponseIds = q.ExcludedResponseIds,
            IsExcludedFromView = q.IsExcludedFromView,
            OrderingId = q.OrderingId,
                RegionFilter = q.RegionFilter,
                ViewTypes = (q.ViewTypes == null || q.ViewTypes.Count == 0)
                    ? new List<string> { "circleplot" }
                    : q.ViewTypes.Take(3).ToList()
        };
        db.ViewQuestions.Add(newVq);
        await db.SaveChangesAsync();

        foreach (var a in q.ViewAnswerOptions)
        {
            // Skip invalid or placeholder answer IDs (e.g., open-ended pseudo answers)
            if (a.AnswerId == Guid.Empty)
            {
                continue;
            }

            // Ensure the referenced Answer actually exists to avoid FK violations
            var answerExists = await db.Answers.AnyAsync(ans => ans.AnswerID == a.AnswerId);
            if (!answerExists)
            {
                continue;
            }

            var newVa = new ViewAnswerOption
            {
                ViewQuestionId = newVq.Id,
                AnswerId = a.AnswerId,
                Title = a.Title
            };
            db.ViewAnswerOptions.Add(newVa);
        }
        await db.SaveChangesAsync();
    }

    return Results.Ok();
}

// Delete a specific view
app.MapDelete("/api/viewsurveys/{surveyId}/view/{viewId:int}", async (AspectContext db, Guid surveyId, int viewId) =>
{
    var viewSurvey = await db.ViewSurveys.FirstOrDefaultAsync(vs => vs.SurveyId == surveyId && vs.Id == viewId);
    if (viewSurvey == null)
        return Results.NotFound();

    // Check if this is the only view for the survey
    var viewCount = await db.ViewSurveys.CountAsync(vs => vs.SurveyId == surveyId);
    if (viewCount <= 1)
        return Results.BadRequest(new { message = "Cannot delete the only view for a survey" });

    // Delete associated ViewQuestions and ViewAnswerOptions
    var viewQuestions = await db.ViewQuestions.Where(vq => vq.ViewSurveyId == viewId).ToListAsync();
    foreach (var vq in viewQuestions)
    {
        var viewAnswers = await db.ViewAnswerOptions.Where(va => va.ViewQuestionId == vq.Id).ToListAsync();
        db.ViewAnswerOptions.RemoveRange(viewAnswers);
    }
    db.ViewQuestions.RemoveRange(viewQuestions);
    db.ViewSurveys.Remove(viewSurvey);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "View deleted successfully" });
});

// Create a new view for a survey
app.MapPost("/api/viewsurveys/{surveyId}/new", async (AspectContext db, Guid surveyId) =>
{
    var survey = await db.Surveys
        .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
        .FirstOrDefaultAsync(s => s.SurveyId == surveyId);
    
    if (survey == null)
        return Results.NotFound(new { message = "Survey not found" });

    // Get the next view number for this survey
    var maxViewNumber = await db.ViewSurveys
        .Where(vs => vs.SurveyId == surveyId)
        .MaxAsync(vs => (int?)vs.ViewNumber) ?? 0;
    var newViewNumber = maxViewNumber + 1;

    // Create new view survey
    var viewSurvey = new ViewSurvey
    {
        SurveyId = surveyId,
        ViewNumber = newViewNumber,
        Title = $"View {newViewNumber}",
        Description = string.Empty,
        FunkyBackground = false,
        FunkyColors = false,
        FunkyFont = false
    };
    db.ViewSurveys.Add(viewSurvey);
    await db.SaveChangesAsync();

    // Create default view questions for each question in the survey
    foreach (var question in survey.Questions.OrderBy(q => q.OrderIndex))
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

    return Results.Created($"/api/viewsurveys/{surveyId}/{viewSurvey.Id}", new ViewSummaryDto
    {
        Id = viewSurvey.Id,
        ViewNumber = viewSurvey.ViewNumber,
        Title = viewSurvey.Title
    });
});


/*
TODO: only save the date a user completed the servey

Adds a response of a user to the Responses database
*/
app.MapPost("/api/responses", async (AspectContext db, CreateResponseDto responseDto) =>
{
    if (!string.IsNullOrWhiteSpace(responseDto.Additional) &&
        ContainsBannedPhrase(responseDto.Additional, bannedTerms))
    {
        return Results.BadRequest(new { message = "Additional text contains disallowed terms." });
    }

    var response = new Response
    {
        ResponseId = Guid.NewGuid(),
        Date = DateOnly.FromDateTime(DateTime.UtcNow),
        Additional = responseDto.Additional,
        SurveyId = responseDto.SurveyId,
        QuestionId = responseDto.QuestionId,
        AnswerId = responseDto.AnswerId
    };

    db.Responses.Add(response);
    await db.SaveChangesAsync();

    return Results.Created($"/api/responses/{response.ResponseId}", response.ResponseId);
});

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
});

/*
Select a certain survey id.

Same as previous API call, but now with one specific survey
*/
app.MapGet("/api/surveys/{id}", async (AspectContext db, Guid id) =>
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

    return survey is null ? Results.NotFound() : Results.Ok(survey);
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
});

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
});


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


app.MapGet("/health", () => Results.Ok("Healthy"));

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
});

// ==================== Display Slots API ====================

// Get all display slots with their assignments
app.MapGet("/api/displayslots", async (AspectContext db) =>
{
    // Ensure all 4 slots exist
    var slotNames = new[] { "fillin", "display1", "display2", "display3" };
    foreach (var name in slotNames)
    {
        if (!await db.DisplaySlots.AnyAsync(s => s.SlotName == name))
        {
            db.DisplaySlots.Add(new DisplaySlot { SlotName = name });
        }
    }
    await db.SaveChangesAsync();

    var slots = await db.DisplaySlots
        .Select(s => new
        {
            s.Id,
            s.SlotName,
            s.SurveyId,
            s.ViewId,
            SurveyTitle = s.Survey != null ? s.Survey.Title : null,
            ViewNumber = s.ViewSurvey != null ? s.ViewSurvey.ViewNumber : (int?)null,
            ViewTitle = s.ViewSurvey != null ? s.ViewSurvey.Title : null
        })
        .ToListAsync();

    return Results.Ok(slots);
});

// Get a specific slot by name
app.MapGet("/api/displayslots/{slotName}", async (AspectContext db, string slotName) =>
{
    var slot = await db.DisplaySlots
        .Where(s => s.SlotName == slotName)
        .Select(s => new
        {
            s.Id,
            s.SlotName,
            s.SurveyId,
            s.ViewId,
            SurveyTitle = s.Survey != null ? s.Survey.Title : null,
            ViewNumber = s.ViewSurvey != null ? s.ViewSurvey.ViewNumber : (int?)null,
            ViewTitle = s.ViewSurvey != null ? s.ViewSurvey.Title : null
        })
        .FirstOrDefaultAsync();

    if (slot == null)
    {
        // Create slot if it doesn't exist
        var newSlot = new DisplaySlot { SlotName = slotName };
        db.DisplaySlots.Add(newSlot);
        await db.SaveChangesAsync();
        return Results.Ok(new { newSlot.Id, newSlot.SlotName, SurveyId = (Guid?)null, ViewId = (int?)null, SurveyTitle = (string?)null, ViewNumber = (int?)null, ViewTitle = (string?)null });
    }

    return Results.Ok(slot);
});

// Assign a survey/view to a slot
app.MapPost("/api/displayslots/{slotName}", async (AspectContext db, string slotName, DisplaySlotAssignmentDto assignment) =>
{
    var slot = await db.DisplaySlots.FirstOrDefaultAsync(s => s.SlotName == slotName);
    if (slot == null)
    {
        slot = new DisplaySlot { SlotName = slotName };
        db.DisplaySlots.Add(slot);
    }

    // Validate that survey exists if provided
    if (assignment.SurveyId.HasValue)
    {
        var surveyExists = await db.Surveys.AnyAsync(s => s.SurveyId == assignment.SurveyId.Value);
        if (!surveyExists)
            return Results.BadRequest(new { message = "Survey not found" });
    }

    // Validate that view exists if provided
    if (assignment.ViewId.HasValue)
    {
        var viewExists = await db.ViewSurveys.AnyAsync(v => v.Id == assignment.ViewId.Value);
        if (!viewExists)
            return Results.BadRequest(new { message = "View not found" });
    }

    slot.SurveyId = assignment.SurveyId;
    slot.ViewId = assignment.ViewId;
    await db.SaveChangesAsync();

    // Return the updated slot with details
    var result = await db.DisplaySlots
        .Where(s => s.SlotName == slotName)
        .Select(s => new
        {
            s.Id,
            s.SlotName,
            s.SurveyId,
            s.ViewId,
            SurveyTitle = s.Survey != null ? s.Survey.Title : null,
            ViewNumber = s.ViewSurvey != null ? s.ViewSurvey.ViewNumber : (int?)null,
            ViewTitle = s.ViewSurvey != null ? s.ViewSurvey.Title : null
        })
        .FirstOrDefaultAsync();

    return Results.Ok(result);
});

// Clear a slot
app.MapDelete("/api/displayslots/{slotName}", async (AspectContext db, string slotName) =>
{
    var slot = await db.DisplaySlots.FirstOrDefaultAsync(s => s.SlotName == slotName);
    if (slot == null)
        return Results.NotFound();

    slot.SurveyId = null;
    slot.ViewId = null;
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Slot cleared" });
});

app.Run();

static HashSet<string> LoadBannedTerms(string contentRoot)
{
    var sourcesDirectory = Path.Combine(contentRoot, "sources");
    var terms = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var fileName in new[] { "nl.txt", "en.txt" })
    {
        var path = Path.Combine(sourcesDirectory, fileName);

        if (!File.Exists(path))
        {
            Console.WriteLine($"Warning: banned terms file not found: {path}");
            continue;
        }

        foreach (var line in File.ReadAllLines(path))
        {
            var term = line.Trim();

            if (string.IsNullOrWhiteSpace(term))
            {
                continue;
            }

            terms.Add(term);
        }
    }

    return terms;
}

static bool ContainsBannedPhrase(string? input, HashSet<string> bannedTerms)
{
    if (string.IsNullOrWhiteSpace(input))
    {
        return false;
    }

    var normalized = input.Trim();

    return bannedTerms.Contains(normalized);
}