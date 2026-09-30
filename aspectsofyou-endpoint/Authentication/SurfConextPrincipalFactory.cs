using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

internal static class SurfConextPrincipalFactory
{
    internal static ClaimsPrincipal CreateFromIntrospection(IntrospectionResponse response)
    {
        var claims = new List<Claim>();

        if (!string.IsNullOrWhiteSpace(response.Sub))
            claims.Add(new Claim("sub", response.Sub));

        if (!string.IsNullOrWhiteSpace(response.FullName))
            claims.Add(new Claim(ClaimTypes.Name, response.FullName));

        if (!string.IsNullOrWhiteSpace(response.Email))
            claims.Add(new Claim(ClaimTypes.Email, response.Email));

        AddIsMemberOfClaims(claims, response.IsMemberOf);
        AddIdentityClaims(claims, response.Uids, response.Sub);

        if (response.EmailVerified.HasValue)
            claims.Add(new Claim("email_verified", response.EmailVerified.Value ? "true" : "false"));

        if (!string.IsNullOrWhiteSpace(response.ClientId))
            claims.Add(new Claim("client_id", response.ClientId));

        if (!string.IsNullOrWhiteSpace(response.Acr))
            claims.Add(new Claim("acr", response.Acr));

        if (!string.IsNullOrWhiteSpace(response.AuthenticatingAuthority))
            claims.Add(new Claim("authenticating_authority", response.AuthenticatingAuthority));

        if (!string.IsNullOrWhiteSpace(response.Iss))
            claims.Add(new Claim("iss", response.Iss));

        if (!string.IsNullOrWhiteSpace(response.TokenType))
            claims.Add(new Claim("token_type", response.TokenType));

        if (!string.IsNullOrWhiteSpace(response.Scope))
        {
            foreach (var scope in response.Scope.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                claims.Add(new Claim("scope", scope));
        }

        if (response.Exp.HasValue)
            claims.Add(new Claim("exp", response.Exp.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)));

        if (response.UpdatedAt.HasValue)
        {
            claims.Add(new Claim("updated_at",
                response.UpdatedAt.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }

        return CreatePrincipal(claims);
    }

    internal static ClaimsPrincipal CreateFromValidatedJwt(JwtSecurityToken jwt, string rawToken)
    {
        var claims = jwt.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();

        if (string.IsNullOrWhiteSpace(FindClaimValue(claims, ClaimTypes.Email)))
        {
            foreach (var claim in jwt.Claims)
            {
                if (claim.Type is ClaimTypes.Email or "email" or "mail" &&
                    !string.IsNullOrWhiteSpace(claim.Value))
                {
                    claims.Add(new Claim(ClaimTypes.Email, claim.Value));
                    break;
                }
            }
        }

        AddIsMemberOfClaims(
            claims,
            claims
                .Where(c => c.Value.StartsWith("urn:mace:surf.nl:invite", StringComparison.Ordinal))
                .Select(c => c.Value)
                .ToArray());

        if (SurfConextClaimParsing.TryReadJwtPayload(rawToken, out var payload))
        {
            if (string.IsNullOrWhiteSpace(FindClaimValue(claims, ClaimTypes.Email)))
            {
                var email = SurfConextClaimParsing.ReadEmail(payload);
                if (!string.IsNullOrWhiteSpace(email))
                    claims.Add(new Claim(ClaimTypes.Email, email));
            }

            if (string.IsNullOrWhiteSpace(FindClaimValue(claims, ClaimTypes.Name)))
            {
                var name = SurfConextClaimParsing.ReadName(payload);
                if (!string.IsNullOrWhiteSpace(name))
                    claims.Add(new Claim(ClaimTypes.Name, name));
            }

            AddIsMemberOfClaims(claims, SurfConextClaimParsing.ReadIsMemberOf(payload).ToArray());
            AddIdentityClaims(
                claims,
                SurfConextClaimParsing.ReadUids(payload).ToArray(),
                SurfConextClaimParsing.ReadSub(payload) ?? FindClaimValue(claims, "sub"));
        }

        AddIdentityClaims(claims, null, FindClaimValue(claims, "sub"));

        return CreatePrincipal(claims);
    }

    internal static ClaimsPrincipal MergeUserInfoClaims(ClaimsPrincipal principal, JsonElement userInfo)
    {
        var claims = principal.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();

        var email = SurfConextClaimParsing.ReadEmail(userInfo);
        if (!string.IsNullOrWhiteSpace(email) &&
            string.IsNullOrWhiteSpace(FindClaimValue(claims, ClaimTypes.Email)))
        {
            claims.Add(new Claim(ClaimTypes.Email, email));
        }

        var name = SurfConextClaimParsing.ReadName(userInfo);
        if (!string.IsNullOrWhiteSpace(name) &&
            string.IsNullOrWhiteSpace(FindClaimValue(claims, ClaimTypes.Name)))
        {
            claims.Add(new Claim(ClaimTypes.Name, name));
        }

        AddIsMemberOfClaims(claims, SurfConextClaimParsing.ReadIsMemberOf(userInfo).ToArray());
        AddIdentityClaims(
            claims,
            SurfConextClaimParsing.ReadUids(userInfo).ToArray(),
            SurfConextClaimParsing.ReadSub(userInfo) ?? FindClaimValue(claims, "sub"));

        return CreatePrincipal(claims);
    }

    internal static string? ValidateRequiredIdentity(ClaimsPrincipal principal)
    {
        var hasIdentifier =
            !string.IsNullOrWhiteSpace(principal.FindFirst(UvaClaimTypes.UvanetId)?.Value) ||
            !string.IsNullOrWhiteSpace(principal.FindFirst("sub")?.Value);

        if (!hasIdentifier)
            return "missing user identifier (uid or sub)";

        return null;
    }

    private static ClaimsPrincipal CreatePrincipal(List<Claim> claims)
    {
        var identity = new ClaimsIdentity(
            claims,
            SurfConextAuthenticationHandler.SchemeName,
            UvaClaimTypes.UvanetId,
            ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }

    private static void AddIsMemberOfClaims(List<Claim> claims, string[]? memberships)
    {
        if (memberships is not { Length: > 0 })
            return;

        var existing = new HashSet<string>(
            claims.Where(c => c.Type == SurfConextClaimTypes.IsMemberOf).Select(c => c.Value),
            StringComparer.Ordinal);

        foreach (var membership in memberships)
        {
            if (string.IsNullOrWhiteSpace(membership) || existing.Contains(membership))
                continue;

            claims.Add(new Claim(SurfConextClaimTypes.IsMemberOf, membership));
            existing.Add(membership);
        }
    }

    private static void AddIdentityClaims(List<Claim> claims, string[]? uids, string? sub)
    {
        if (claims.Any(c => c.Type == UvaClaimTypes.UvanetId))
            return;

        var identifier = uids is { Length: > 0 } ? uids[0] : sub;
        if (string.IsNullOrWhiteSpace(identifier))
            return;

        claims.Add(new Claim(ClaimTypes.NameIdentifier, identifier));
        claims.Add(new Claim(UvaClaimTypes.UvanetId, identifier));
    }

    private static string? FindClaimValue(IEnumerable<Claim> claims, string claimType) =>
        claims.FirstOrDefault(c => c.Type == claimType)?.Value;
}
