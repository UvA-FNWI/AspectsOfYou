using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using UvA.AspectsOfYou.Endpoint.Authentication;

namespace UvA.AspectsOfYou.Endpoint.Tests.Support;

public sealed class AspectsWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string connectionString;

    public AspectsWebApplicationFactory(string connectionString)
    {
        this.connectionString = connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:AspectContext"] = connectionString,
                ["SurfConext:BaseUrl"] = "https://connect.surfconext.nl",
                ["SurfConext:ClientId"] = "test-client",
                ["SurfConext:ClientSecret"] = "test-secret",
                ["SurfConext:AdminInviteMemberOf"] =
                    "urn:mace:surf.nl:invite.surfconext.nl:test:datanose_-_aspects_of_you",
                ["Cors:AllowedOrigins:0"] = "http://localhost",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    _ => { });

            services.AddAuthorization(options =>
            {
                options.AddPolicy(AuthorizationPolicies.Admin, policy =>
                {
                    policy.AddAuthenticationSchemes(TestAuthHandler.SchemeName);
                    policy.RequireAuthenticatedUser();
                    policy.RequireAssertion(context =>
                    {
                        var requiredMemberOf = "urn:mace:surf.nl:invite.surfconext.nl:test:datanose_-_aspects_of_you";
                        return SurfConextAdminAuthorization.IsInviteAdmin(context.User, requiredMemberOf);
                    });
                });
            });
        });
    }
}
