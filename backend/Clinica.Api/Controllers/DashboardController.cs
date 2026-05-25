using Clinica.Core.Data;
using Clinica.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api")]
public class DashboardController(ClinicaDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Get()
    {
        var hoy = ClinicaHelpers.FechaHoyGt();
        var ahora = DateTime.Now.ToString("yyyy-MM-ddTHH:mm");
        var mesActual = DateTime.Today.ToString("yyyy-MM");

        var totales = new
        {
            pacientes = await db.Pacientes.CountAsync(),
            citasHoy = await db.Citas.CountAsync(c =>
                c.FechaHora.StartsWith(hoy) && c.Estado != "cancelada"),
            proximasCitas = await db.Citas.CountAsync(c =>
                string.Compare(c.FechaHora, ahora) >= 0 &&
                c.Estado != "cancelada" && c.Estado != "atendida" && c.Estado != "no_asistio"),
            ingresosMes = await db.Pagos.Where(p => p.Fecha.StartsWith(mesActual)).SumAsync(p => (decimal?)p.Monto) ?? 0
        };

        var citasHoy = await db.Citas.Include(c => c.Paciente).Include(c => c.Medico)
            .Where(c => c.FechaHora.StartsWith(hoy) && c.Estado != "cancelada")
            .OrderBy(c => c.FechaHora).ToListAsync();

        var desde = DateTime.Today.AddDays(-6).ToString("yyyy-MM-dd");
        var citasSemana = await db.Citas
            .Where(c => string.Compare(c.FechaHora.Substring(0, 10), desde) >= 0 && c.Estado != "cancelada")
            .ToListAsync();

        var diasSemana = new[] { "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb" };
        var chartCitasSemana = Enumerable.Range(0, 7).Select(i => new
        {
            dia = diasSemana[i],
            citas = citasSemana.Count(c =>
            {
                if (!DateTime.TryParse(c.FechaHora.Substring(0, 10), out var d)) return false;
                return (int)d.DayOfWeek == i;
            })
        }).ToList();

        var anio = DateTime.Today.Year.ToString();
        var pagosAnio = await db.Pagos.Where(p => p.Fecha.StartsWith(anio)).ToListAsync();
        var meses = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
        var chartIngresosMes = meses.Select((label, i) => new
        {
            mes = label,
            ingresos = pagosAnio.Where(p => p.Fecha.Length >= 7 && int.Parse(p.Fecha.Substring(5, 2)) == i + 1)
                .Sum(p => p.Monto)
        }).ToList();

        return Ok(new
        {
            totales,
            citasHoy = citasHoy.Select(ClinicaHelpers.MapCita),
            chartCitasSemana,
            chartIngresosMes
        });
    }
}
