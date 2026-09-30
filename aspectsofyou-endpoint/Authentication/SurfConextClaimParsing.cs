using System.Text;
using System.Text.Json;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

internal static class SurfConextClaimParsing
{
    internal static readonly string[] IsMemberOfPropertyNames =
    [
        "is_member_of",
        "isMemberOf",
        "edumember_is_member_of",
    ];

    internal static bool TryReadJwtPayload(string bearerToken, out JsonElement root)
    {
        root = default;
        var parts = bearerToken.Split('.');
        if (parts.Length < 2)
            return false;

        try
        {
            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            using var doc = JsonDocument.Parse(payloadJson);
            root = doc.RootElement.Clone();
            return true;
        }
        catch
        {
            return false;
        }
    }

    internal static IEnumerable<string> ReadIsMemberOf(JsonElement root)
    {
        foreach (var value in ParseIsMemberOfProperty(root))
            yield return value;

        foreach (var value in ParseInviteUrnValues(root))
            yield return value;
    }

    private static IEnumerable<string> ParseInviteUrnValues(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            yield break;

        foreach (var property in root.EnumerateObject())
        {
            foreach (var value in ParseStringOrArray(property.Value))
            {
                if (value.StartsWith("urn:mace:surf.nl:invite", StringComparison.Ordinal))
                    yield return value;
            }
        }
    }

    internal static IEnumerable<string> ReadUids(JsonElement root)
    {
        foreach (var propertyName in new[]
                 {
                     "uids",
                     "uid",
                     "urn:mace:dir:attribute-def:uid",
                     "urn:mace:dir:attribute-def:eduPersonPrincipalName"
                 })
        {
            if (!root.TryGetProperty(propertyName, out var element))
                continue;

            foreach (var value in ParseStringOrArray(element))
                yield return value;
        }
    }

    internal static string? ReadSub(JsonElement root)
    {
        if (root.TryGetProperty("sub", out var subElement) && subElement.ValueKind == JsonValueKind.String)
            return subElement.GetString();

        return null;
    }

    internal static string[] ParseUidsFromJson(JsonElement root, string[]? fromDto)
    {
        var uids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (fromDto is { Length: > 0 })
        {
            foreach (var uid in fromDto)
            {
                if (!string.IsNullOrWhiteSpace(uid))
                    uids.Add(uid);
            }
        }

        foreach (var uid in ReadUids(root))
            uids.Add(uid);

        return uids.Count == 0 ? Array.Empty<string>() : uids.ToArray();
    }

    internal static string? ReadEmail(JsonElement root)
    {
        foreach (var propertyName in new[] { "email", "mail" })
        {
            if (root.TryGetProperty(propertyName, out var emailElement) &&
                emailElement.ValueKind == JsonValueKind.String)
            {
                return emailElement.GetString();
            }
        }

        return null;
    }

    internal static string? ReadName(JsonElement root)
    {
        foreach (var propertyName in new[] { "name", "preferred_username" })
        {
            if (root.TryGetProperty(propertyName, out var nameElement) &&
                nameElement.ValueKind == JsonValueKind.String)
            {
                return nameElement.GetString();
            }
        }

        return null;
    }

    internal static IntrospectionResponse EnrichFromJwtPayload(IntrospectionResponse response, string bearerToken)
    {
        if (!TryReadJwtPayload(bearerToken, out var payload))
            return response;

        var email = string.IsNullOrWhiteSpace(response.Email) ? ReadEmail(payload) : response.Email;
        var name = string.IsNullOrWhiteSpace(response.FullName) ? ReadName(payload) : response.FullName;
        var sub = string.IsNullOrWhiteSpace(response.Sub) ? ReadSub(payload) : response.Sub;
        var uids = response.Uids is { Length: > 0 } ? response.Uids : ReadUids(payload).ToArray();
        var isMemberOf = MergeIsMemberOf(payload, bearerToken, response.IsMemberOf);

        return response with
        {
            Email = email,
            FullName = name,
            Sub = sub,
            Uids = uids is { Length: > 0 } ? uids : response.Uids,
            IsMemberOf = isMemberOf.Length > 0 ? isMemberOf : response.IsMemberOf
        };
    }

    internal static string[] MergeIsMemberOf(JsonElement introspectionRoot, string bearerToken, string[]? fromDto)
    {
        var memberships = new HashSet<string>(StringComparer.Ordinal);

        foreach (var value in ParseIsMemberOfProperty(introspectionRoot))
            memberships.Add(value);

        if (fromDto is { Length: > 0 })
        {
            foreach (var value in fromDto)
            {
                if (!string.IsNullOrWhiteSpace(value))
                    memberships.Add(value);
            }
        }

        if (memberships.Count == 0)
        {
            foreach (var value in ParseIsMemberOfFromJwt(bearerToken))
                memberships.Add(value);
        }

        return memberships.Count == 0 ? Array.Empty<string>() : memberships.ToArray();
    }

    private static IEnumerable<string> ParseIsMemberOfProperty(JsonElement root)
    {
        foreach (var propertyName in IsMemberOfPropertyNames)
        {
            if (!root.TryGetProperty(propertyName, out var element))
                continue;

            foreach (var value in ParseStringOrArray(element))
                yield return value;
        }
    }

    private static IEnumerable<string> ParseIsMemberOfFromJwt(string bearerToken)
    {
        var parts = bearerToken.Split('.');
        if (parts.Length < 2)
            return Array.Empty<string>();

        try
        {
            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            using var doc = JsonDocument.Parse(payloadJson);
            return ParseIsMemberOfProperty(doc.RootElement).ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static IEnumerable<string> ParseStringOrArray(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
            {
                var value = element.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                    yield return value;
                yield break;
            }
            case JsonValueKind.Array:
            {
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        var value = item.GetString();
                        if (!string.IsNullOrWhiteSpace(value))
                            yield return value;
                    }
                }

                yield break;
            }
        }
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var base64 = input.Replace('-', '+').Replace('_', '/');
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }

        return Convert.FromBase64String(base64);
    }
}
