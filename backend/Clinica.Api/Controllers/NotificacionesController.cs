using Clinica.Core.Data;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/notificaciones")]
public class NotificacionesController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var hoy = ClinicaHelpers.FechaHoyGt();
        var ahora = DateTime.Now.ToString("yyyy-MM-ddTHH:mm");

        var citasHoy = await db.Citas.Include(c => c.Paciente)
            .Where(c => c.FechaHora.StartsWith(hoy) && (c.Estado == "pendiente" || c.Estado == "confirmada"))
            .OrderBy(c => c.FechaHora).Take(10).ToListAsync();

        var proximas = await db.Citas.Include(c => c.Paciente)
            .Where(c => string.Compare(c.FechaHora, ahora) > 0
                     && string.Compare(c.FechaHora.Substring(0, 10), hoy) > 0
                     && (c.Estado == "pendiente" || c.Estado == "confirmada"))
            .OrderBy(c => c.FechaHora).Take(8).ToListAsync();

        var activos = await db.Tratamientos.CountAsync(t => t.Estado == "activo");

        var items = new List<object>();
        foreach (var c in citasHoy)
        {
            items.Add(new
            {
                id = $"hoy-{c.Id}",
                tipo = "cita_hoy",
                titulo = $"Cita hoy — {c.Paciente.Nombre}",
                detalle = c.Motivo ?? "Consulta programada",
                fecha_hora = c.FechaHora,
                paciente_id = c.PacienteId,
                cita_id = c.Id
            });
        }
        foreach (var c in proximas)
        {
            items.Add(new
            {
                id = $"prox-{c.Id}",
                tipo = "cita_proxima",
                titulo = $"Próxima cita — {c.Paciente.Nombre}",
                detalle = c.Motivo ?? "Cita agendada",
                fecha_hora = c.FechaHora,
                paciente_id = c.PacienteId,
                cita_id = c.Id
            });
        }
        if (activos > 0)
        {
            items.Add(new
            {
                id = "tratamientos-activos",
                tipo = "tratamiento",
                titulo = $"{activos} tratamiento{(activos == 1 ? "" : "s")} activo{(activos == 1 ? "" : "s")}",
                detalle = "Revisar seguimiento en expedientes",
                fecha_hora = (string?)null,
                paciente_id = (int?)null,
                cita_id = (int?)null
            });
        }

        return Ok(new { total = items.Count, items });
    }
}
