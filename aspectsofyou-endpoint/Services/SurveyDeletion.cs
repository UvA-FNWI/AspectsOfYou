using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Entities;

namespace UvA.AspectsOfYou.Endpoint.Services;

public static class SurveyDeletion
{
    public static async Task<bool> TryDeleteSurveyAsync(
        AspectContext db,
        Guid surveyId,
        CancellationToken cancellationToken = default)
    {
        var survey = await db.Surveys
            .Include(s => s.Questions)
            .ThenInclude(q => q.Answers)
            .Include(s => s.Responses)
            .FirstOrDefaultAsync(s => s.SurveyId == surveyId, cancellationToken);

        if (survey is null)
        {
            return false;
        }

        var viewIds = await db.ViewSurveys
            .Where(vs => vs.SurveyId == surveyId)
            .Select(vs => vs.Id)
            .ToListAsync(cancellationToken);

        await db.DisplaySlots
            .Where(s =>
                s.SurveyId == surveyId ||
                (s.ViewId != null && viewIds.Contains(s.ViewId.Value)))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(s => s.SurveyId, (Guid?)null)
                    .SetProperty(s => s.ViewId, (int?)null),
                cancellationToken);

        db.Responses.RemoveRange(survey.Responses);

        foreach (var question in survey.Questions)
        {
            db.Answers.RemoveRange(question.Answers);
            db.Questions.Remove(question);
        }

        db.Surveys.Remove(survey);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
