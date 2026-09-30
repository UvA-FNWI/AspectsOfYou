using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Mvc;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public sealed class ProblemDetailsAuthorizationMiddlewareResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler fallback = new();
    private readonly ILogger<ProblemDetailsAuthorizationMiddlewareResultHandler> logger;

    public ProblemDetailsAuthorizationMiddlewareResultHandler(
        ILogger<ProblemDetailsAuthorizationMiddlewareResultHandler> logger)
    {
        this.logger = logger;
    }

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged)
        {
            logger.LogInformation(
                "Authorization challenged for {Path}: {Detail}",
                context.Request.Path.Value,
                BuildChallengeDetail(context));

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Unauthorized",
                    Detail = BuildChallengeDetail(context),
                    Instance = context.Request.Path.Value
                },
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
            return;
        }

        if (authorizeResult.Forbidden)
        {
            var memberships = SurfConextAdminAuthorization.GetMemberships(context.User).ToArray();
            logger.LogInformation(
                "Authorization forbidden for {Path}: authenticated user lacks required invite membership. Memberships={Memberships}",
                context.Request.Path.Value,
                memberships.Length == 0 ? "(none)" : string.Join(", ", memberships));

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Forbidden",
                    Detail =
                        "Authenticated, but missing required SURFconext Invite isMemberOf for this admin endpoint.",
                    Instance = context.Request.Path.Value
                },
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
            return;
        }

        await fallback.HandleAsync(next, context, policy, authorizeResult);
    }

    private static string BuildChallengeDetail(HttpContext context)
    {
        if (context.Items[SurfConextAuthenticationHandler.SurfConextErrorItemKey] is string detail &&
            !string.IsNullOrWhiteSpace(detail))
        {
            return detail;
        }

        if (!context.Request.Headers.ContainsKey("Authorization"))
            return "Missing Authorization header.";

        return "Bearer token was missing, invalid, or not accepted.";
    }
}
