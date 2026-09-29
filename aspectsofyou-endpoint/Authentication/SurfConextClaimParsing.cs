using System.Text;
using System.Text.Json;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

internal static class SurfConextClaimParsing
{
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
        foreach (var propertyName in new[] { "is_member_of", "isMemberOf" })
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
