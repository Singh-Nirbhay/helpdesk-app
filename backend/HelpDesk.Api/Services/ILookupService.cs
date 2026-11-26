using HelpDesk.Api.DTOs;

namespace HelpDesk.Api.Services;

public interface ILookupService
{
    Task<LookupsResponseDto> GetLookupsAsync(
        CancellationToken cancellationToken);
}