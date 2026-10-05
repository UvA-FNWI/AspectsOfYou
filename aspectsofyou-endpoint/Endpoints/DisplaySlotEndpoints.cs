using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Authentication;
using UvA.AspectsOfYou.Endpoint.Dtos;
using UvA.AspectsOfYou.Endpoint.Entities;

namespace UvA.AspectsOfYou.Endpoint.Endpoints;

public static class DisplaySlotEndpoints
{
    public static void MapDisplaySlotEndpoints(this WebApplication app)
    {
        app.MapGet("/api/displayslots", async (AspectContext db) =>
        {
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
        }).RequireAuthorization(AuthorizationPolicies.Admin);

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
                var newSlot = new DisplaySlot { SlotName = slotName };
                db.DisplaySlots.Add(newSlot);
                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    newSlot.Id,
                    newSlot.SlotName,
                    SurveyId = (Guid?)null,
                    ViewId = (int?)null,
                    SurveyTitle = (string?)null,
                    ViewNumber = (int?)null,
                    ViewTitle = (string?)null
                });
            }

            return Results.Ok(slot);
        });

        app.MapPost("/api/displayslots/{slotName}",
            async (AspectContext db, string slotName, DisplaySlotAssignmentDto assignment) =>
            {
                var slot = await db.DisplaySlots.FirstOrDefaultAsync(s => s.SlotName == slotName);
                if (slot == null)
                {
                    slot = new DisplaySlot { SlotName = slotName };
                    db.DisplaySlots.Add(slot);
                }

                if (assignment.SurveyId.HasValue)
                {
                    var surveyExists = await db.Surveys.AnyAsync(s => s.SurveyId == assignment.SurveyId.Value);
                    if (!surveyExists)
                    {
                        return Results.BadRequest(new { message = "Survey not found" });
                    }
                }

                if (assignment.ViewId.HasValue)
                {
                    var view = await db.ViewSurveys
                        .AsNoTracking()
                        .FirstOrDefaultAsync(v => v.Id == assignment.ViewId.Value);
                    if (view == null)
                    {
                        return Results.BadRequest(new { message = "View not found" });
                    }

                    if (assignment.SurveyId.HasValue && view.SurveyId != assignment.SurveyId.Value)
                    {
                        return Results.BadRequest(new { message = "View does not belong to the selected survey" });
                    }
                }

                var displaySlotNames = new[] { "display1", "display2", "display3" };
                if (displaySlotNames.Contains(slotName, StringComparer.OrdinalIgnoreCase) && !assignment.ViewId.HasValue)
                {
                    return Results.BadRequest(new { message = "Display slots require a view assignment" });
                }

                slot.SurveyId = assignment.SurveyId;
                slot.ViewId = assignment.ViewId;
                await db.SaveChangesAsync();

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
            }).RequireAuthorization(AuthorizationPolicies.Admin);

        app.MapDelete("/api/displayslots/{slotName}", async (AspectContext db, string slotName) =>
        {
            var slot = await db.DisplaySlots.FirstOrDefaultAsync(s => s.SlotName == slotName);
            if (slot == null)
            {
                return Results.NotFound();
            }

            slot.SurveyId = null;
            slot.ViewId = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Slot cleared" });
        }).RequireAuthorization(AuthorizationPolicies.Admin);
    }
}
