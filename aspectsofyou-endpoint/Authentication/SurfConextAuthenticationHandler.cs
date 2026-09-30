using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public class SurfConextAuthenticationHandler : AuthenticationHandler<SurfConextOptions>
{
    public const string SurfConextErrorItemKey = "SurfConextError";
    public const string SchemeName = "SURFconext";

    public SurfConextAuthenticationHandler(
        IOptionsMonitor<SurfConextOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        SurfConextJwtValidator jwtValidator)
        : base(options, logger, encoder)
    {
        this.httpClient = httpClientFactory.CreateClient(SchemeName);
        this.cache = cache;
        this.jwtValidator = jwtValidator;
    }

    private readonly HttpClient httpClient;
    private readonly IMemoryCache cache;
    private readonly SurfConextJwtValidator jwtValidator;
    private static readonly int CacheExpirationMinutes = 10;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Context.Request.Headers.Authorization.Count == 0)
            return AuthenticateResult.NoResult();

        var authorizationHeader = Context.Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(authorizationHeader))
            return AuthenticationFailed("missing Authorization header");

        var authHeaderParts = authorizationHeader.Split(' ');
        if (authHeaderParts.Length < 2 || authHeaderParts[0] != "Bearer")
            return AuthenticationFailed("invalid Authorization header");

        var bearerToken = authHeaderParts[1].Trim();
        if (string.IsNullOrEmpty(bearerToken))
            return AuthenticationFailed("missing bearer token");

        var cacheKey = $"bt_{bearerToken}";

        if (cache.TryGetValue(cacheKey, out ClaimsPrincipal? cachedPrincipal))
            return AuthenticateResult.Success(new AuthenticationTicket(cachedPrincipal!, SchemeName));

        ClaimsPrincipal? principal = await jwtValidator.ValidateAccessTokenAsync(
            bearerToken,
            Context.RequestAborted);

        if (principal is null)
        {
            var resp = await ValidateSurfBearerToken(bearerToken);
            if (resp is null)
                return AuthenticationFailed("token validation failed");

            if (!resp.Active)
                return AuthenticationFailed("inactive token");

            principal = SurfConextPrincipalFactory.CreateFromIntrospection(resp);
        }

        var identityError = SurfConextPrincipalFactory.ValidateRequiredIdentity(principal);
        if (identityError is not null)
            return AuthenticationFailed(identityError);

        cache.Set(cacheKey, principal,
            new MemoryCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromMinutes(CacheExpirationMinutes)
            });

        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unauthorized",
                Detail = Context.Items[SurfConextErrorItemKey] as string ?? "Unauthorized",
                Instance = Context.Request.Path.Value
            },
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    private AuthenticateResult AuthenticationFailed(string detail)
    {
        Context.Items[SurfConextErrorItemKey] = detail;
        return AuthenticateResult.Fail(detail);
    }

    private async Task<IntrospectionResponse?> ValidateSurfBearerToken(string token)
    {
        var response = await httpClient.PostAsync("/oidc/introspect",
            new FormUrlEncodedContent(
            [
                new KeyValuePair<string?, string?>("token", token),
                new KeyValuePair<string?, string?>("token_type_hint", "access_token")
            ]));

        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            Logger.LogError(
                "Token validation failed: SurfConext returned status {Code}: {Response}, ClientId:{ClientId}, Secret:{ClientSecret}",
                response.StatusCode, content, OptionsMonitor.CurrentValue.ClientId,
                OptionsMonitor.CurrentValue.ClientSecret?[..4]);
            Context.Items[SurfConextErrorItemKey] =
                $"Token validation failed: SurfConext returned status {response.StatusCode}, check the logs for details";
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(content);
            var resp = JsonSerializer.Deserialize<IntrospectionResponse>(content);
            if (resp is null)
                return null;

            var isMemberOf = SurfConextClaimParsing.MergeIsMemberOf(
                document.RootElement,
                token,
                resp.IsMemberOf);

            var uids = SurfConextClaimParsing.ParseUidsFromJson(document.RootElement, resp.Uids);
            var sub = string.IsNullOrWhiteSpace(resp.Sub)
                ? SurfConextClaimParsing.ReadSub(document.RootElement)
                : resp.Sub;

            resp = resp with
            {
                IsMemberOf = isMemberOf.Length > 0 ? isMemberOf : resp.IsMemberOf,
                Uids = uids.Length > 0 ? uids : resp.Uids,
                Sub = sub
            };

            return SurfConextClaimParsing.EnrichFromJwtPayload(resp, token);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Token validation failed: unable to deserialize response: {Response}", content);
            Context.Items[SurfConextErrorItemKey] =
                "Token validation failed: unable to deserialize response from SurfConext, check the logs for details";
            return null;
        }
    }
}
