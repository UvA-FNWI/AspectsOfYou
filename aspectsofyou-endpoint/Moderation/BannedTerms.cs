namespace UvA.AspectsOfYou.Endpoint.Moderation;

public static class BannedTerms
{
    public static HashSet<string> LoadFromContentRoot(string contentRoot)
    {
        var sourcesDirectory = Path.Combine(contentRoot, "sources");
        var terms = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var fileName in new[] { "nl.txt", "en.txt" })
        {
            var path = Path.Combine(sourcesDirectory, fileName);

            if (!File.Exists(path))
            {
                Console.WriteLine($"Warning: banned terms file not found: {path}");
                continue;
            }

            foreach (var line in File.ReadAllLines(path))
            {
                var term = line.Trim();

                if (string.IsNullOrWhiteSpace(term))
                {
                    continue;
                }

                terms.Add(term);
            }
        }

        return terms;
    }

    public static bool ContainsBannedPhrase(string? input, HashSet<string> bannedTerms)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        var normalized = input.Trim();

        return bannedTerms.Contains(normalized);
    }
}
