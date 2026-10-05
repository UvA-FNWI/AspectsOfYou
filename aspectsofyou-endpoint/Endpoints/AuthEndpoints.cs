using UvA.AspectsOfYou.Endpoint.Authentication;

namespace UvA.AspectsOfYou.Endpoint.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        app.MapGet("/api/auth/admin-status", (
            HttpContext context,
            IConfiguration configuration,
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("SurfConextAdminAuth");

            if (context.User.Identity?.IsAuthenticated != true)
            {
                logger.LogInformation(
                    "Admin status check for {Path}: not authenticated",
                    context.Request.Path.Value);

                return Results.Json(
                    new { authenticated = false, isAdmin = false },
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            var requiredMemberOf = configuration[$"{SurfConextOptions.Section}:AdminInviteMemberOf"];
            var memberships = SurfConextAdminAuthorization.GetMemberships(context.User).ToArray();
            var isAdmin = SurfConextAdminAuthorization.IsInviteAdmin(context.User, requiredMemberOf);

            if (isAdmin)
            {
                logger.LogDebug(
                    "Admin status check for {Path}: granted (membership matched)",
                    context.Request.Path.Value);
            }
            else
            {
                logger.LogInformation(
                    "Admin status check for {Path}: denied. Required={RequiredMemberOf} Memberships={Memberships}",
                    context.Request.Path.Value,
                    requiredMemberOf ?? "(not configured)",
                    memberships.Length == 0 ? "(none)" : string.Join(", ", memberships));
            }

            return Results.Ok(new
            {
                authenticated = true,
                isAdmin,
                memberships
            });
        });

        app.MapGet("/health", () => Results.Ok("Healthy"));
    }
}
