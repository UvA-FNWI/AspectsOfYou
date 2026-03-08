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

        services.AddAuthorization();
        
        return services;
    }
}