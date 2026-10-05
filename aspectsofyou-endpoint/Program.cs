using Microsoft.EntityFrameworkCore;
using UvA.AspectsOfYou.Endpoint.Authentication;
using UvA.AspectsOfYou.Endpoint.Endpoints;
using UvA.AspectsOfYou.Endpoint.Entities;
using UvA.AspectsOfYou.Endpoint.Moderation;

var builder = WebApplication.CreateBuilder(args);

var bannedTerms = BannedTerms.LoadFromContentRoot(builder.Environment.ContentRootPath);

var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

var corsOrigins = configuredCorsOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddSurfConextAuthentication(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            if (corsOrigins.Length > 0)
            {
                policy
                    .WithOrigins(corsOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
                return;
            }

            // In production, no configured origins means no cross-origin access.
            policy.SetIsOriginAllowed(_ => false);
        }
    );
});

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AspectContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AspectContext")));

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AspectContext>();
    var retryCount = 0;
    const int maxRetries = 10;

    while (retryCount < maxRetries)
    {
        try
        {
            await db.Database.MigrateAsync();
            break;
        }
        catch (Exception ex)
        {
            retryCount++;
            Console.WriteLine($"Database connection attempt {retryCount} failed: {ex.Message}");
            if (retryCount >= maxRetries)
            {
                throw;
            }

            await Task.Delay(2000 * retryCount);
        }
    }
}

app.MapResponseEndpoints(bannedTerms);
app.MapSurveyEndpoints();
app.MapViewSurveyEndpoints();
app.MapDisplaySlotEndpoints();

app.Run();
