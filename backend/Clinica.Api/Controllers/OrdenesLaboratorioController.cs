using System.Text.Json.Serialization;
using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/ordenes-laboratorio")]
public class OrdenesLaboratorioController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? pacienteId)
    {
        var q = db.OrdenesLaboratorio.Include(o => o.Medico).AsQueryable();
        if (pacienteId > 0) q = q.Where(o => o.PacienteId == pacienteId);
        var rows = await q.OrderByDescending(o => o.Fecha).ToListAsync();
        return Ok(rows.Select(Map));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OrdenRequest body)
    {
        if (body.PacienteId == null || string.IsNullOrWhiteSpace(body.Fecha) || string.IsNullOrWhiteSpace(body.EstudiosSolicitados))
            return BadRequest(new { message = "Paciente, fecha y estudios solicitados son obligatorios." });

        var o = new OrdenLaboratorio
        {
            PacienteId = body.PacienteId.Value,
            MedicoId = body.MedicoId,
            Fecha = body.Fecha!,
            EstudiosSolicitados = body.EstudiosSolicitados!.Trim(),
            DiagnosticoPresuntivo = body.DiagnosticoPresuntivo?.Trim(),
            Notas = body.Notas?.Trim()
        };
        db.OrdenesLaboratorio.Add(o);
        await db.SaveChangesAsync();
        return StatusCode(201, Map(o));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var oid = ClinicaHelpers.ParseId(id);
        if (oid == null) return BadRequest(new { message = "ID inválido." });
        var o = await db.OrdenesLaboratorio.FindAsync(oid);
        if (o != null) { db.OrdenesLaboratorio.Remove(o); await db.SaveChangesAsync(); }
        return Ok(new { ok = true });
    }

    private static object Map(OrdenLaboratorio o) => new
    {
        id = o.Id,
        paciente_id = o.PacienteId,
        medico_id = o.MedicoId,
        fecha = o.Fecha,
        estudios_solicitados = o.EstudiosSolicitados,
        diagnostico_presuntivo = o.DiagnosticoPresuntivo,
        notas = o.Notas,
        medico_nombre = o.Medico?.Nombre
    };

    public class OrdenRequest
    {
        [JsonPropertyName("paciente_id")]
        public int? PacienteId { get; set; }
        [JsonPropertyName("medico_id")]
        public int? MedicoId { get; set; }
        public string? Fecha { get; set; }
        [JsonPropertyName("estudios_solicitados")]
        public string? EstudiosSolicitados { get; set; }
        [JsonPropertyName("diagnostico_presuntivo")]
        public string? DiagnosticoPresuntivo { get; set; }
        public string? Notas { get; set; }
    }
}
