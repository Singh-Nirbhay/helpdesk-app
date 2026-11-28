using HelpDesk.Api.Configuration;
using HelpDesk.Api.Constants;
using HelpDesk.Api.Data;
using HelpDesk.Api.Data.Entities;
using HelpDesk.Api.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HelpDesk.Api.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly HelpDeskDbContext _context;
    private readonly JwtOptions _jwtOptions;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        HelpDeskDbContext context,
        IOptions<JwtOptions> jwtOptions)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<RegistrationResult> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();

        // Reserve the internal demo account domain.
        if (email.EndsWith(
            "@helpdesk.local",
            StringComparison.OrdinalIgnoreCase))
        {
            return RegistrationFailed();
        }

        var existingUser =
            await _userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return RegistrationFailed();
        }

        var user = new ApplicationUser
        {
            FullName = request.FullName.Trim(),
            Email = email,
            UserName = email
        };

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                cancellationToken);

        try
        {
            var createResult = await _userManager.CreateAsync(
                user,
                request.Password);

            if (!createResult.Succeeded)
            {
                var passwordErrors = createResult.Errors
                    .Where(e => e.Code.StartsWith(
                        "Password",
                        StringComparison.Ordinal))
                    .Select(e => e.Description)
                    .ToArray();

                return passwordErrors.Length > 0
                    ? new RegistrationResult(null, passwordErrors)
                    : RegistrationFailed();
            }

            var roleResult = await _userManager.AddToRoleAsync(
                user,
                AppRoles.Customer);

            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to assign the default Customer role.");
            }

            var response = GenerateAuthResponse(
                user,
                AppRoles.Customer);

            await transaction.CommitAsync(cancellationToken);

            return new RegistrationResult(response, []);
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is SqlException
            { Number: 2601 or 2627 })
        {
            // Handle a concurrent duplicate registration.
            return RegistrationFailed();
        }
    }

    public async Task<AuthResponseDto?> LoginAsync(
        LoginRequestDto request)
    {
        var user = await _userManager.FindByEmailAsync(
            request.Email.Trim());

        if (user is null)
        {
            return null;
        }

        var signInResult =
            await _signInManager.CheckPasswordSignInAsync(
                user,
                request.Password,
                lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return null;
        }

        // This checkpoint does not implement MFA challenges.
        if (user.TwoFactorEnabled)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);

        if (roles.Count != 1)
        {
            return null;
        }

        var role = roles[0];

        if (role is not (AppRoles.Customer
            or AppRoles.Agent
            or AppRoles.Manager
            or AppRoles.Admin))
        {
            return null;
        }

        return GenerateAuthResponse(user, role);
    }

    private AuthResponseDto GenerateAuthResponse(
        ApplicationUser user,
        string role)
    {
        var email = user.Email
            ?? throw new InvalidOperationException(
                "User email is missing.");

        var now = DateTimeOffset.FromUnixTimeSeconds(
            DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        var expiresAt = now.AddMinutes(
            _jwtOptions.ExpirationMinutes);

        Claim[] claims =
        [
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),

            new Claim(JwtRegisteredClaimNames.Email, email),

            new Claim(ClaimTypes.Name, user.FullName),

            new Claim(ClaimTypes.Role, role),

            new Claim(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString())
        ];

        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));

        var credentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        var accessToken =
            new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponseDto(
            accessToken,
            expiresAt,
            email,
            user.FullName,
            role);
    }

    private static RegistrationResult RegistrationFailed()
    {
        return new RegistrationResult(
            null,
            ["Registration could not be completed."]);
    }
}