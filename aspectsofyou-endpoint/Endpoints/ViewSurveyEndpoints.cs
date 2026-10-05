using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Authentication;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;

namespace UvA.AspectsOfYou.Endpoint.Endpoints;

public static class ViewSurveyEndpoints
{
    public static void MapViewSurveyEndpoints(this WebApplication app)
    {
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
        }).RequireAuthorization(AuthorizationPolicies.Admin);

        app.MapPut("/api/viewsurveys/{surveyId}", async (AspectContext db, Guid surveyId, ViewSurvey update) =>
        {
            var viewSurvey = await db.ViewSurveys
                .Where(vs => vs.SurveyId == surveyId)
                .OrderBy(vs => vs.ViewNumber)
                .FirstOrDefaultAsync();
            if (viewSurvey == null)
            {
                return Results.NotFound();
            }

            return await UpdateViewSurvey(db, viewSurvey, update);
        }).RequireAuthorization(AuthorizationPolicies.Admin);

        app.MapPut("/api/viewsurveys/{surveyId}/view/{viewId:int}",
            async (AspectContext db, Guid surveyId, int viewId, ViewSurvey update) =>
            {
                var viewSurvey =
                    await db.ViewSurveys.FirstOrDefaultAsync(vs => vs.SurveyId == surveyId && vs.Id == viewId);
                if (viewSurvey == null)
                {
                    return Results.NotFound();
                }

                return await UpdateViewSurvey(db, viewSurvey, update);
            }).RequireAuthorization(AuthorizationPolicies.Admin);

        app.MapDelete("/api/viewsurveys/{surveyId}/view/{viewId:int}", async (AspectContext db, Guid surveyId, int viewId) =>
        {
            var viewSurvey = await db.ViewSurveys.FirstOrDefaultAsync(vs => vs.SurveyId == surveyId && vs.Id == viewId);
            if (viewSurvey == null)
            {
                return Results.NotFound();
            }

            var viewCount = await db.ViewSurveys.CountAsync(vs => vs.SurveyId == surveyId);
            if (viewCount <= 1)
            {
                return Results.BadRequest(new { message = "Cannot delete the only view for a survey" });
            }

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
        }).RequireAuthorization(AuthorizationPolicies.Admin);

        app.MapPost("/api/viewsurveys/{surveyId}/new", async (AspectContext db, Guid surveyId) =>
        {
            var survey = await db.Surveys
                .Include(s => s.Questions)
                .ThenInclude(q => q.Answers)
                .FirstOrDefaultAsync(s => s.SurveyId == surveyId);

            if (survey == null)
            {
                return Results.NotFound(new { message = "Survey not found" });
            }

            var maxViewNumber = await db.ViewSurveys
                .Where(vs => vs.SurveyId == surveyId)
                .MaxAsync(vs => (int?)vs.ViewNumber) ?? 0;
            var newViewNumber = maxViewNumber + 1;

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
        }).RequireAuthorization(AuthorizationPolicies.Admin);
    }

    private static async Task<IResult> UpdateViewSurvey(AspectContext db, ViewSurvey viewSurvey, ViewSurvey update)
    {
        viewSurvey.Title = update.Title;
        viewSurvey.Description = update.Description;
        viewSurvey.FunkyBackground = update.FunkyBackground;
        viewSurvey.FunkyColors = update.FunkyColors;
        viewSurvey.FunkyFont = update.FunkyFont;
        await db.SaveChangesAsync();

        var oldQuestions = db.ViewQuestions.Where(vq => vq.ViewSurveyId == viewSurvey.Id).ToList();
        foreach (var vq in oldQuestions)
        {
            var oldAnswers = db.ViewAnswerOptions.Where(va => va.ViewQuestionId == vq.Id).ToList();
            db.ViewAnswerOptions.RemoveRange(oldAnswers);
        }

        db.ViewQuestions.RemoveRange(oldQuestions);
        await db.SaveChangesAsync();

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
                if (a.AnswerId == Guid.Empty)
                {
                    continue;
                }

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
}
