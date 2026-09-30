using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddSurfConextAuthentication(this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSurfConextServices(configuration);
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, ProblemDetailsAuthorizationMiddlewareResultHandler>();

        services
            .AddAuthentication(SurfConextAuthenticationHandler.SchemeName)
            .AddSurfConext(options => { configuration.GetSection(SurfConextOptions.Section).Bind(options); });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AuthorizationPolicies.Admin, policy =>
            {
                policy.AddAuthenticationSchemes(SurfConextAuthenticationHandler.SchemeName);
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context =>
                {
                    var requiredMemberOf = configuration[$"{SurfConextOptions.Section}:AdminInviteMemberOf"];
                    return SurfConextAdminAuthorization.IsInviteAdmin(context.User, requiredMemberOf);
                });
            });
        });

        return services;
    }
}