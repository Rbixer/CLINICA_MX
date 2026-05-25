using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/tratamientos")]
public class TratamientosController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? pacienteId, [FromQuery] string? estado)
    {
        var q = db.Tratamientos.Include(t => t.Paciente).Include(t => t.Medico).AsQueryable();
        if (pacienteId > 0) q = q.Where(t => t.PacienteId == pacienteId);
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(t => t.Estado == estado);
        var rows = await q.OrderByDescending(t => t.FechaInicio).ToListAsync();
        return Ok(rows.Select(Map));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TratamientoRequest body)
    {
        if (body.PacienteId == null || string.IsNullOrWhiteSpace(body.Nombre) || string.IsNullOrWhiteSpace(body.FechaInicio))
            return BadRequest(new { message = "Paciente, nombre y fecha de inicio son obligatorios." });
        if (body.Estado != null && !ClinicaHelpers.EstadosTratamiento.Contains(body.Estado))
            return BadRequest(new { message = "Estado no válido." });

        var t = new Tratamiento
        {
            PacienteId = body.PacienteId.Value,
            MedicoId = body.MedicoId,
            Nombre = body.Nombre!.Trim(),
            Descripcion = body.Descripcion?.Trim(),
            FechaInicio = body.FechaInicio!,
            FechaFin = body.FechaFin,
            Estado = body.Estado ?? "activo",
            ProgresoNotas = body.ProgresoNotas?.Trim()
        };
        db.Tratamientos.Add(t);
        await db.SaveChangesAsync();
        return StatusCode(201, Map(t));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(string id, [FromBody] TratamientoPatchRequest body)
    {
        var tid = ClinicaHelpers.ParseId(id);
        if (tid == null) return BadRequest(new { message = "ID inválido." });
        var t = await db.Tratamientos.FindAsync(tid);
        if (t == null) return NotFound(new { message = "No encontrado." });

        if (body.Nombre != null) t.Nombre = body.Nombre.Trim();
        if (body.Descripcion != null) t.Descripcion = body.Descripcion.Trim();
        if (body.FechaFin != null) t.FechaFin = body.FechaFin;
        if (body.Estado != null) t.Estado = body.Estado;
        if (body.ProgresoNotas != null) t.ProgresoNotas = body.ProgresoNotas.Trim();
        if (body.MedicoId.HasValue) t.MedicoId = body.MedicoId;

        await db.SaveChangesAsync();
        return Ok(Map(t));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var tid = ClinicaHelpers.ParseId(id);
        if (tid == null) return BadRequest(new { message = "ID inválido." });
        var t = await db.Tratamientos.FindAsync(tid);
        if (t != null) { db.Tratamientos.Remove(t); await db.SaveChangesAsync(); }
        return Ok(new { ok = true });
    }

    private static object Map(Tratamiento t) => new
    {
        id = t.Id,
        paciente_id = t.PacienteId,
        medico_id = t.MedicoId,
        nombre = t.Nombre,
        descripcion = t.Descripcion,
        fecha_inicio = t.FechaInicio,
        fecha_fin = t.FechaFin,
        estado = t.Estado,
        progreso_notas = t.ProgresoNotas,
        medico_nombre = t.Medico?.Nombre,
        paciente_nombre = t.Paciente?.Nombre
    };

    public class TratamientoRequest
    {
        public int? PacienteId { get; set; }
        public int? MedicoId { get; set; }
        public string? Nombre { get; set; }
        public string? Descripcion { get; set; }
        public string? FechaInicio { get; set; }
        public string? FechaFin { get; set; }
        public string? Estado { get; set; }
        public string? ProgresoNotas { get; set; }
    }

    public class TratamientoPatchRequest
    {
        public string? Nombre { get; set; }
        public string? Descripcion { get; set; }
        public string? FechaFin { get; set; }
        public string? Estado { get; set; }
        public string? ProgresoNotas { get; set; }
        public int? MedicoId { get; set; }
    }
}
