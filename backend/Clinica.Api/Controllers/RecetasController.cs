using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/recetas")]
public class RecetasController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? pacienteId)
    {
        var q = db.Recetas.Include(r => r.Medico).AsQueryable();
        if (pacienteId > 0) q = q.Where(r => r.PacienteId == pacienteId);
        var rows = await q.OrderByDescending(r => r.Fecha).ToListAsync();
        return Ok(rows.Select(Map));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RecetaRequest body)
    {
        if (body.PacienteId == null || string.IsNullOrWhiteSpace(body.Fecha) || string.IsNullOrWhiteSpace(body.Medicamentos))
            return BadRequest(new { message = "Paciente, fecha y medicamentos son obligatorios." });

        var r = new Receta
        {
            PacienteId = body.PacienteId.Value,
            MedicoId = body.MedicoId,
            Fecha = body.Fecha!,
            Medicamentos = body.Medicamentos!.Trim(),
            Indicaciones = body.Indicaciones?.Trim()
        };
        db.Recetas.Add(r);
        await db.SaveChangesAsync();
        return StatusCode(201, Map(r));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var rid = ClinicaHelpers.ParseId(id);
        if (rid == null) return BadRequest(new { message = "ID inválido." });
        var r = await db.Recetas.FindAsync(rid);
        if (r != null) { db.Recetas.Remove(r); await db.SaveChangesAsync(); }
        return Ok(new { ok = true });
    }

    private static object Map(Receta r) => new
    {
        id = r.Id,
        paciente_id = r.PacienteId,
        medico_id = r.MedicoId,
        fecha = r.Fecha,
        medicamentos = r.Medicamentos,
        indicaciones = r.Indicaciones,
        medico_nombre = r.Medico?.Nombre
    };

    public class RecetaRequest
    {
        public int? PacienteId { get; set; }
        public int? MedicoId { get; set; }
        public string? Fecha { get; set; }
        public string? Medicamentos { get; set; }
        public string? Indicaciones { get; set; }
    }
}
