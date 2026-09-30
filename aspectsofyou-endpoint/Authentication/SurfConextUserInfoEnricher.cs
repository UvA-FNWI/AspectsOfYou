using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public sealed class SurfConextUserInfoEnricher
{
    private readonly IHttpClientFactory httpClientFactory;
    private readonly IOptionsMonitor<SurfConextOptions> optionsMonitor;
    private readonly ILogger<SurfConextUserInfoEnricher> logger;

    public SurfConextUserInfoEnricher(
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<SurfConextOptions> optionsMonitor,
        ILogger<SurfConextUserInfoEnricher> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.optionsMonitor = optionsMonitor;
        this.logger = logger;
    }

    internal async Task<ClaimsPrincipal> EnrichAsync(
        ClaimsPrincipal principal,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        if (SurfConextAdminAuthorization.GetMemberships(principal).Any())
            return principal;

        var baseUrl = optionsMonitor.CurrentValue.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            return principal;

        try
        {
            var client = httpClientFactory.CreateClient(SurfConextUserInfoEnricherExtensions.ClientName);
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/oidc/userinfo");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

            using var response = await client.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogInformation(
                    "SURFconext userinfo enrichment skipped: status {StatusCode}",
                    response.StatusCode);
                return principal;
            }

            using var document = JsonDocument.Parse(content);
            var enriched = SurfConextPrincipalFactory.MergeUserInfoClaims(principal, document.RootElement);
            var memberships = SurfConextAdminAuthorization.GetMemberships(enriched).ToArray();

            logger.LogInformation(
                "SURFconext userinfo enrichment applied. MembershipCount={MembershipCount}",
                memberships.Length);

            return enriched;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "SURFconext userinfo enrichment failed.");
            return principal;
        }
    }
}

internal static class SurfConextUserInfoEnricherExtensions
{
    internal const string ClientName = "SURFconextUserInfo";

    internal static IServiceCollection AddSurfConextUserInfoClient(
        this IServiceCollection services,
        SurfConextOptions options)
    {
        services.AddHttpClient(ClientName, client =>
        {
            client.BaseAddress = new Uri(options.BaseUrl!.TrimEnd('/') + "/");
        });

        services.AddSingleton<SurfConextUserInfoEnricher>();
        return services;
    }
}
