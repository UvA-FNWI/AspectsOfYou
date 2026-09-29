namespace UvA.AspectsOfYou.Endpoint.Authentication;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddSurfConextAuthentication(this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSurfConextServices(configuration);

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
                    if (string.IsNullOrWhiteSpace(requiredMemberOf))
                        return false;

                    return context.User.Claims
                        .Where(c => c.Type == SurfConextClaimTypes.IsMemberOf)
                        .Any(c => string.Equals(c.Value, requiredMemberOf, StringComparison.Ordinal));
                });
            });
        });

        return services;
    }
}