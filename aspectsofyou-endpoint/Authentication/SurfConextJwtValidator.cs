using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public sealed class SurfConextJwtValidator
{
    private readonly IOptionsMonitor<SurfConextOptions> optionsMonitor;
    private readonly ILogger<SurfConextJwtValidator> logger;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> configurationManager;

    public SurfConextJwtValidator(
        IOptionsMonitor<SurfConextOptions> optionsMonitor,
        ILogger<SurfConextJwtValidator> logger)
    {
        this.optionsMonitor = optionsMonitor;
        this.logger = logger;

        var baseUrl = optionsMonitor.CurrentValue.BaseUrl!.TrimEnd('/');
        configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            $"{baseUrl}/oidc/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever());
    }

    internal async Task<System.Security.Claims.ClaimsPrincipal?> ValidateAccessTokenAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (token.Split('.').Length != 3)
            return null;

        try
        {
            var options = optionsMonitor.CurrentValue;
            var configuration = await configurationManager.GetConfigurationAsync(cancellationToken);
            var audiences = options.JwtValidAudiences?
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Select(a => a.Trim())
                .Distinct(StringComparer.Ordinal)
                .ToArray() ?? Array.Empty<string>();

            var handler = new JwtSecurityTokenHandler();
            JwtSecurityToken? jwt = null;

            if (audiences.Length > 0)
            {
                jwt = TryValidate(handler, configuration, token, validateAudience: true, audiences);
            }

            jwt ??= TryValidate(handler, configuration, token, validateAudience: false, audiences);
            if (jwt is null)
                return null;

            return SurfConextPrincipalFactory.CreateFromValidatedJwt(jwt, token);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "JWT access token validation failed.");
            return null;
        }
    }

    private static JwtSecurityToken? TryValidate(
        JwtSecurityTokenHandler handler,
        OpenIdConnectConfiguration configuration,
        string token,
        bool validateAudience,
        string[] audiences)
    {
        try
        {
            var validationParameters = new TokenValidationParameters
            {
                ValidIssuer = configuration.Issuer,
                IssuerSigningKeys = configuration.SigningKeys,
                ValidateIssuer = true,
                ValidateLifetime = true,
                ValidateAudience = validateAudience,
                ValidAudiences = audiences,
                ClockSkew = TimeSpan.FromMinutes(2),
            };

            handler.ValidateToken(token, validationParameters, out var validatedToken);
            return validatedToken as JwtSecurityToken;
        }
        catch
        {
            return null;
        }
    }
}
