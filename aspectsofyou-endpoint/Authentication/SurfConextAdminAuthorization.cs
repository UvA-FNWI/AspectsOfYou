using System.Security.Claims;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public static class SurfConextAdminAuthorization
{
    public static bool IsInviteAdmin(ClaimsPrincipal user, string? requiredMemberOf)
    {
        if (string.IsNullOrWhiteSpace(requiredMemberOf))
            return false;

        return GetMemberships(user)
            .Any(membership => string.Equals(membership, requiredMemberOf, StringComparison.Ordinal));
    }

    public static IEnumerable<string> GetMemberships(ClaimsPrincipal user)
    {
        var memberships = new HashSet<string>(StringComparer.Ordinal);

        foreach (var claim in user.Claims)
        {
            if (IsMemberOfClaimType(claim.Type) && !string.IsNullOrWhiteSpace(claim.Value))
                memberships.Add(claim.Value);

            if (claim.Value.StartsWith("urn:mace:surf.nl:invite", StringComparison.Ordinal))
                memberships.Add(claim.Value);
        }

        return memberships;
    }

    internal static bool IsMemberOfClaimType(string claimType) =>
        string.Equals(claimType, SurfConextClaimTypes.IsMemberOf, StringComparison.Ordinal) ||
        claimType.Contains("isMemberOf", StringComparison.OrdinalIgnoreCase) ||
        claimType.Contains("is_member_of", StringComparison.OrdinalIgnoreCase);
}
