using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/medicos")]
public class MedicosController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? activos)
    {
        var q = db.Medicos.AsQueryable();
        if (activos != "0") q = q.Where(m => m.Activo);
        var rows = await q.OrderBy(m => m.Nombre).ToListAsync();
        return Ok(rows.Select(ClinicaHelpers.MapMedico));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MedicoRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Nombre) || string.IsNullOrWhiteSpace(body.Especialidad))
            return BadRequest(new { message = "Nombre y especialidad son obligatorios." });

        var m = new Medico
        {
            Nombre = body.Nombre.Trim(),
            Especialidad = body.Especialidad.Trim(),
            Telefono = body.Telefono?.Trim(),
            Email = body.Email?.Trim()
        };
        db.Medicos.Add(m);
        await db.SaveChangesAsync();
        return StatusCode(201, ClinicaHelpers.MapMedico(m));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] MedicoRequest body)
    {
        var mid = ClinicaHelpers.ParseId(id);
        if (mid == null) return BadRequest(new { message = "ID inválido." });
        if (string.IsNullOrWhiteSpace(body.Nombre) || string.IsNullOrWhiteSpace(body.Especialidad))
            return BadRequest(new { message = "Nombre y especialidad son obligatorios." });

        var m = await db.Medicos.FindAsync(mid);
        if (m == null) return NotFound(new { message = "Médico no encontrado." });

        m.Nombre = body.Nombre.Trim();
        m.Especialidad = body.Especialidad.Trim();
        m.Telefono = body.Telefono?.Trim();
        m.Email = body.Email?.Trim();
        if (body.Activo != null)
        {
            m.Activo = body.Activo switch
            {
                false or 0 or "0" => false,
                _ => true
            };
        }

        await db.SaveChangesAsync();
        return Ok(ClinicaHelpers.MapMedico(m));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var mid = ClinicaHelpers.ParseId(id);
        if (mid == null) return BadRequest(new { message = "ID inválido." });
        var m = await db.Medicos.FindAsync(mid);
        if (m == null) return NotFound();
        m.Activo = false;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    public class MedicoRequest
    {
        public string? Nombre { get; set; }
        public string? Especialidad { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public object? Activo { get; set; }
    }
}
