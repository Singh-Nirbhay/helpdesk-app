using Microsoft.AspNetCore.Identity;

namespace HelpDesk.Api.Data.Entities;

public class ApplicationUser
    : IdentityUser
{
    public string FullName { get; set; }= string.Empty;
}
