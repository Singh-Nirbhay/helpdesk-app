using HelpDesk.Api.DTOs;
using HelpDesk.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    [HttpGet]
    public async Task<ActionResult<LookupsResponseDto>> Get(
        CancellationToken cancellationToken)
    {
        var lookups = await _lookupService
            .GetLookupsAsync(cancellationToken);

        return Ok(lookups);
    }
}