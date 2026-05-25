using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/consultas")]
public class ConsultasController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? pacienteId)
    {
        var q = db.Consultas.Include(c => c.Paciente).Include(c => c.Medico).AsQueryable();
        if (pacienteId > 0) q = q.Where(c => c.PacienteId == pacienteId);
        var rows = await q.OrderByDescending(c => c.Fecha).ThenByDescending(c => c.Id).ToListAsync();
        return Ok(rows.Select(Map));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ConsultaRequest body)
    {
        if (body.PacienteId == null || string.IsNullOrWhiteSpace(body.Fecha))
            return BadRequest(new { message = "Paciente y fecha son obligatorios." });
        if (!await db.Pacientes.AnyAsync(p => p.Id == body.PacienteId))
            return NotFound(new { message = "Paciente no encontrado." });

        var c = new Consulta
        {
            PacienteId = body.PacienteId.Value,
            MedicoId = body.MedicoId,
            CitaId = body.CitaId,
            Fecha = body.Fecha!,
            Motivo = body.Motivo?.Trim(),
            Diagnostico = body.Diagnostico?.Trim(),
            Tratamiento = body.Tratamiento?.Trim(),
            Notas = body.Notas?.Trim()
        };
        db.Consultas.Add(c);
        if (body.CitaId > 0)
        {
            var cita = await db.Citas.FindAsync(body.CitaId);
            if (cita != null) cita.Estado = "atendida";
        }
        await db.SaveChangesAsync();
        return StatusCode(201, Map(await db.Consultas.Include(x => x.Paciente).Include(x => x.Medico).FirstAsync(x => x.Id == c.Id)));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(string id, [FromBody] ConsultaPatchRequest body)
    {
        var cid = ClinicaHelpers.ParseId(id);
        if (cid == null) return BadRequest(new { message = "ID inválido." });
        var c = await db.Consultas.FindAsync(cid);
        if (c == null) return NotFound(new { message = "No encontrada." });

        if (body.Motivo != null) c.Motivo = body.Motivo.Trim();
        if (body.Diagnostico != null) c.Diagnostico = body.Diagnostico.Trim();
        if (body.Tratamiento != null) c.Tratamiento = body.Tratamiento.Trim();
        if (body.Notas != null) c.Notas = body.Notas.Trim();
        if (body.MedicoId.HasValue) c.MedicoId = body.MedicoId;

        await db.SaveChangesAsync();
        return Ok(Map(await db.Consultas.Include(x => x.Paciente).Include(x => x.Medico).FirstAsync(x => x.Id == c.Id)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var cid = ClinicaHelpers.ParseId(id);
        if (cid == null) return BadRequest(new { message = "ID inválido." });
        var c = await db.Consultas.FindAsync(cid);
        if (c != null) { db.Consultas.Remove(c); await db.SaveChangesAsync(); }
        return Ok(new { ok = true });
    }

    private static object Map(Consulta c) => new
    {
        id = c.Id,
        paciente_id = c.PacienteId,
        medico_id = c.MedicoId,
        cita_id = c.CitaId,
        fecha = c.Fecha,
        motivo = c.Motivo,
        diagnostico = c.Diagnostico,
        tratamiento = c.Tratamiento,
        notas = c.Notas,
        paciente_nombre = c.Paciente?.Nombre,
        medico_nombre = c.Medico?.Nombre
    };

    public class ConsultaRequest
    {
        public int? PacienteId { get; set; }
        public int? MedicoId { get; set; }
        public int? CitaId { get; set; }
        public string? Fecha { get; set; }
        public string? Motivo { get; set; }
        public string? Diagnostico { get; set; }
        public string? Tratamiento { get; set; }
        public string? Notas { get; set; }
    }

    public class ConsultaPatchRequest
    {
        public int? MedicoId { get; set; }
        public string? Motivo { get; set; }
        public string? Diagnostico { get; set; }
        public string? Tratamiento { get; set; }
        public string? Notas { get; set; }
    }
}
