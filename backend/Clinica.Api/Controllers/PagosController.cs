using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/pagos")]
public class PagosController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? pacienteId)
    {
        var q = db.Pagos.Include(p => p.Paciente).AsQueryable();
        if (pacienteId > 0) q = q.Where(p => p.PacienteId == pacienteId);
        var rows = await q.OrderByDescending(p => p.Fecha).ThenByDescending(p => p.Id).ToListAsync();
        return Ok(rows.Select(p => new
        {
            id = p.Id,
            paciente_id = p.PacienteId,
            concepto = p.Concepto,
            monto = p.Monto,
            metodo_pago = p.MetodoPago,
            referencia = p.Referencia,
            fecha = p.Fecha,
            notas = p.Notas,
            paciente_nombre = p.Paciente?.Nombre
        }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PagoRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Concepto) || body.Monto == null || string.IsNullOrWhiteSpace(body.Fecha))
            return BadRequest(new { message = "Concepto, monto y fecha son obligatorios." });

        var p = new Pago
        {
            PacienteId = body.PacienteId,
            Concepto = body.Concepto.Trim(),
            Monto = body.Monto.Value,
            Fecha = body.Fecha!,
            MetodoPago = body.MetodoPago?.Trim(),
            Referencia = body.Referencia?.Trim(),
            Notas = body.Notas?.Trim()
        };
        db.Pagos.Add(p);
        await db.SaveChangesAsync();
        return StatusCode(201, new
        {
            id = p.Id,
            paciente_id = p.PacienteId,
            concepto = p.Concepto,
            monto = p.Monto,
            metodo_pago = p.MetodoPago,
            referencia = p.Referencia,
            fecha = p.Fecha,
            notas = p.Notas
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var pid = Infrastructure.ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var p = await db.Pagos.FindAsync(pid);
        if (p != null)
        {
            db.Pagos.Remove(p);
            await db.SaveChangesAsync();
        }
        return Ok(new { ok = true });
    }

    public class PagoRequest
    {
        public int? PacienteId { get; set; }
        public string? Concepto { get; set; }
        public decimal? Monto { get; set; }
        public string? Fecha { get; set; }
        public string? MetodoPago { get; set; }
        public string? Referencia { get; set; }
        public string? Notas { get; set; }
    }
}
