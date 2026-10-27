namespace UvA.AspectsOfYou.Endpoint.Tests.Support;

public static class PostgresTestDatabase
{
    public static string? TryGetConnectionString()
    {
        var fromEnv = Environment.GetEnvironmentVariable("ASPECTS_TEST_DATABASE");
        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            return fromEnv;
        }

        var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
        var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
        var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "strawberry";
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "strawberry";
        var database = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "aspects_test";

        return $"Host={host};Port={port};Database={database};Username={user};Password={password}";
    }
}
