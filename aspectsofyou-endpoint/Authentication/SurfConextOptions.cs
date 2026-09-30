using Microsoft.AspNetCore.Authentication;

namespace UvA.AspectsOfYou.Endpoint.Authentication;

public class SurfConextOptions : AuthenticationSchemeOptions
{
    public static string Section = "SurfConext";
    public string? BaseUrl { get; set; }
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }

    /// <summary>
    /// SURFconext Invite isMemberOf value required for admin API access.
    /// </summary>
    public string? AdminInviteMemberOf { get; set; }

    /// <summary>
    /// Allowed JWT audiences for browser-issued access tokens. When empty, audience is not validated.
    /// </summary>
    public string[] JwtValidAudiences { get; set; } =
    [
        "aspectsofyou.datanose.nl",
        "api.aspectsofyou.datanose.nl"
    ];
}