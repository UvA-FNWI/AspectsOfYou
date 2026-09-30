using System.Security.Claims;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public static class SurfConextAdminAuthorization
{
    public static bool IsInviteAdmin(ClaimsPrincipal user, string? requiredMemberOf)
    {
        if (string.IsNullOrWhiteSpace(requiredMemberOf))
            return false;

        return GetMemberships(user)
            .Any(membership => MatchesRequiredMembership(membership, requiredMemberOf));
    }

    public static IEnumerable<string> GetMemberships(ClaimsPrincipal user)
    {
        var memberships = new HashSet<string>(StringComparer.Ordinal);

        foreach (var claim in user.Claims)
        {
            if (string.IsNullOrWhiteSpace(claim.Value))
                continue;

            if (IsMemberOfClaimType(claim.Type))
                memberships.Add(claim.Value);

            if (claim.Value.StartsWith("urn:mace:surf.nl:invite", StringComparison.Ordinal))
                memberships.Add(claim.Value);

            if (claim.Value.Contains("datanose_-_aspects_of_you", StringComparison.Ordinal))
                memberships.Add(claim.Value);
        }

        return memberships;
    }

    internal static bool MatchesRequiredMembership(string membership, string requiredMemberOf)
    {
        if (string.Equals(membership, requiredMemberOf, StringComparison.Ordinal))
            return true;

        var requiredSuffix = requiredMemberOf.Split(':').LastOrDefault();
        if (string.IsNullOrWhiteSpace(requiredSuffix))
            return false;

        if (string.Equals(membership, requiredSuffix, StringComparison.Ordinal))
            return true;

        if (requiredMemberOf.EndsWith(":" + membership, StringComparison.Ordinal))
            return true;

        return membership.Contains(requiredSuffix, StringComparison.Ordinal);
    }

    internal static bool IsMemberOfClaimType(string claimType) =>
        string.Equals(claimType, SurfConextClaimTypes.IsMemberOf, StringComparison.Ordinal) ||
        claimType.Contains("isMemberOf", StringComparison.OrdinalIgnoreCase) ||
        claimType.Contains("is_member_of", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(claimType, "edumember_is_member_of", StringComparison.OrdinalIgnoreCase);
}
