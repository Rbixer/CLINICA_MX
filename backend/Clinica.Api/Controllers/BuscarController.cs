using Clinica.Core.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/buscar")]
public class BuscarController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new { pacientes = Array.Empty<object>(), medicos = Array.Empty<object>(), citas = Array.Empty<object>() });

        var like = $"%{q.Trim()}%";
        var pacientes = await db.Pacientes
            .Where(p => EF.Functions.Like(p.Nombre, like) || EF.Functions.Like(p.Dpi, like) || EF.Functions.Like(p.Telefono, like))
            .Take(8).Select(p => new { p.Id, p.Nombre, p.Dpi, p.Telefono }).ToListAsync();

        var medicos = await db.Medicos.Where(m => m.Activo &&
            (EF.Functions.Like(m.Nombre, like) || EF.Functions.Like(m.Especialidad, like)))
            .Take(8).Select(m => new { m.Id, m.Nombre, m.Especialidad }).ToListAsync();

        var citas = await db.Citas.Include(c => c.Paciente)
            .Where(c => EF.Functions.Like(c.Paciente.Nombre, like) || (c.Motivo != null && EF.Functions.Like(c.Motivo, like)))
            .OrderByDescending(c => c.FechaHora).Take(8)
            .Select(c => new { c.Id, c.FechaHora, paciente_nombre = c.Paciente.Nombre }).ToListAsync();

        return Ok(new { pacientes, medicos, citas });
    }
}
