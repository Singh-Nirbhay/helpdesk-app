using HelpDesk.Api.DTOs;

namespace HelpDesk.Api.Services;

public record RegistrationResult(
    AuthResponseDto? Response,
    IReadOnlyList<string> Errors
);

public interface IAuthService
{
    Task<RegistrationResult> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken);

    Task<AuthResponseDto?> LoginAsync(
        LoginRequestDto request);
}