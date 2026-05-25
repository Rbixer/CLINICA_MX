using System.Text.Json.Serialization;
using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/citas")]
public class CitasController(ClinicaDbContext db) : ControllerBase
{
    private async Task<Cita?> LoadCita(int id) =>
        await db.Citas.Include(c => c.Paciente).Include(c => c.Medico).FirstOrDefaultAsync(c => c.Id == id);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? fecha, [FromQuery] string? estado, [FromQuery] int? pacienteId)
    {
        var q = db.Citas.Include(c => c.Paciente).Include(c => c.Medico).AsQueryable();
        if (!string.IsNullOrWhiteSpace(fecha)) q = q.Where(c => c.FechaHora.StartsWith(fecha));
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(c => c.Estado == estado);
        if (pacienteId > 0) q = q.Where(c => c.PacienteId == pacienteId);
        var rows = await q.OrderBy(c => c.FechaHora).ToListAsync();
        return Ok(rows.Select(ClinicaHelpers.MapCita));
    }

    [HttpGet("rango")]
    public async Task<IActionResult> Rango([FromQuery] string? desde, [FromQuery] string? hasta)
    {
        if (string.IsNullOrWhiteSpace(desde) || string.IsNullOrWhiteSpace(hasta))
            return BadRequest(new { message = "Parámetros desde y hasta requeridos (YYYY-MM-DD)." });

        var rows = await db.Citas.Include(c => c.Paciente).Include(c => c.Medico)
            .Where(c => string.Compare(c.FechaHora.Substring(0, 10), desde) >= 0
                     && string.Compare(c.FechaHora.Substring(0, 10), hasta) <= 0)
            .OrderBy(c => c.FechaHora).ToListAsync();
        return Ok(rows.Select(ClinicaHelpers.MapCita));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CitaRequest body)
    {
        if (body.Estado != null && !ClinicaHelpers.EstadosCita.Contains(body.Estado))
            return BadRequest(new { message = "Estado de cita no válido." });

        var pacienteId = body.PacienteId is > 0 ? body.PacienteId : null;
        if (pacienteId != null && !await db.Pacientes.AnyAsync(p => p.Id == pacienteId))
            return NotFound(new { message = "Paciente no encontrado." });

        var fechaHora = string.IsNullOrWhiteSpace(body.FechaHora)
            ? DateTime.Now.ToString("yyyy-MM-ddTHH:mm")
            : body.FechaHora.Trim();

        var c = new Cita
        {
            PacienteId = pacienteId,
            MedicoId = body.MedicoId is > 0 ? body.MedicoId : null,
            FechaHora = fechaHora,
            Motivo = string.IsNullOrWhiteSpace(body.Motivo) ? null : body.Motivo.Trim(),
            Estado = body.Estado ?? "pendiente",
            Notas = string.IsNullOrWhiteSpace(body.Notas) ? null : body.Notas.Trim()
        };
        db.Citas.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, ClinicaHelpers.MapCita(await LoadCita(c.Id) ?? c));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(string id, [FromBody] CitaPatchRequest body)
    {
        var cid = ClinicaHelpers.ParseId(id);
        if (cid == null) return BadRequest(new { message = "ID inválido." });
        var c = await db.Citas.FindAsync(cid);
        if (c == null) return NotFound(new { message = "Cita no encontrada." });
        if (body.Estado != null && !ClinicaHelpers.EstadosCita.Contains(body.Estado))
            return BadRequest(new { message = "Estado de cita no válido." });

        if (body.MedicoId.HasValue) c.MedicoId = body.MedicoId;
        if (body.FechaHora != null) c.FechaHora = body.FechaHora;
        if (body.Motivo != null) c.Motivo = body.Motivo.Trim();
        if (body.Estado != null) c.Estado = body.Estado;
        if (body.Notas != null) c.Notas = body.Notas.Trim();

        await db.SaveChangesAsync();
        return Ok(ClinicaHelpers.MapCita(await LoadCita(c.Id) ?? c));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var cid = ClinicaHelpers.ParseId(id);
        if (cid == null) return BadRequest(new { message = "ID inválido." });
        var c = await db.Citas.FindAsync(cid);
        if (c == null) return NotFound(new { message = "Cita no encontrada." });
        db.Citas.Remove(c);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    public class CitaRequest
    {
        [JsonPropertyName("paciente_id")]
        public int? PacienteId { get; set; }
        [JsonPropertyName("medico_id")]
        public int? MedicoId { get; set; }
        [JsonPropertyName("fecha_hora")]
        public string? FechaHora { get; set; }
        public string? Motivo { get; set; }
        public string? Estado { get; set; }
        public string? Notas { get; set; }
    }

    public class CitaPatchRequest
    {
        [JsonPropertyName("medico_id")]
        public int? MedicoId { get; set; }
        [JsonPropertyName("fecha_hora")]
        public string? FechaHora { get; set; }
        public string? Motivo { get; set; }
        public string? Estado { get; set; }
        public string? Notas { get; set; }
    }
}
