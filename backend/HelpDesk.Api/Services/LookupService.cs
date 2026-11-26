using HelpDesk.Api.Data;
using HelpDesk.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Services;

public class LookupService : ILookupService
{
    private readonly HelpDeskDbContext _context;

    public LookupService(HelpDeskDbContext context)
    {
        _context = context;
    }

    public async Task<LookupsResponseDto> GetLookupsAsync(
        CancellationToken cancellationToken)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new LookupItemDto(c.Id, c.Name))
            .ToListAsync(cancellationToken);

        var priorities = await _context.Priorities
            .AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .Select(p => new LookupItemDto(p.Id, p.Name))
            .ToListAsync(cancellationToken);

        return new LookupsResponseDto(categories, priorities);
    }
}