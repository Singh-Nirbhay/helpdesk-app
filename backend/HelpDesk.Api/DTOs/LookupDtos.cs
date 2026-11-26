namespace HelpDesk.Api.DTOs;

public record LookupItemDto(int Id, string Name);

public record LookupsResponseDto(
    IReadOnlyList<LookupItemDto> Categories,
    IReadOnlyList<LookupItemDto> Priorities
);