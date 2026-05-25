using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api")]
public class HealthController(IConfiguration config) : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        var port = HttpContext.Request.Host.Port ?? 4100;
        return Ok(new
        {
            ok = true,
            port,
            fecha = ClinicaHelpers.FechaHoyGt(),
            motor = "ASP.NET Core + SQL Server",
            modo = config["Clinica:Modo"] ?? "servidor",
            base_datos = "ClinicaIntegral"
        });
    }
}
