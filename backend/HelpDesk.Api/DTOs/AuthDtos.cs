using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.DTOs;

public record RegisterRequestDto(
    [Required]
    [StringLength(150)]
    string FullName,

    [Required]
    [EmailAddress]
    [StringLength(256)]
    string Email,

    [Required]
    [StringLength(128)]
    string Password
);

public record LoginRequestDto(
    [Required]
    [EmailAddress]
    [StringLength(256)]
    string Email,

    [Required]
    [StringLength(128)]
    string Password
);

public record AuthResponseDto(
    string AccessToken,
    DateTimeOffset ExpiresAtUtc,
    string Email,
    string FullName,
    string Role
);

public record CurrentUserDto(
    string Id,
    string Email,
    string Role
);