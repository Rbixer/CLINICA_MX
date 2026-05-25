using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Clinica.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/pacientes")]
public class PacientesController(ClinicaDbContext db, FileStorageService files) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] string? sexo, [FromQuery] string? conAlergias)
    {
        var query = db.Pacientes.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim()}%";
            query = query.Where(p =>
                EF.Functions.Like(p.Nombre, like) ||
                EF.Functions.Like(p.Dpi, like) ||
                EF.Functions.Like(p.Telefono, like) ||
                (p.Email != null && EF.Functions.Like(p.Email, like)));
        }
        if (!string.IsNullOrWhiteSpace(sexo)) query = query.Where(p => p.Sexo == sexo);
        if (conAlergias == "1") query = query.Where(p => p.Alergias != null && p.Alergias.Trim() != "");

        var rows = await query.OrderBy(p => p.Nombre).ToListAsync();
        return Ok(rows.Select(p => ClinicaHelpers.MapPaciente(p, files)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var p = await db.Pacientes.FindAsync(pid);
        if (p == null) return NotFound(new { message = "Paciente no encontrado." });

        var citas = await db.Citas.Include(c => c.Medico).Where(c => c.PacienteId == pid)
            .OrderByDescending(c => c.FechaHora).Take(20).ToListAsync();
        var consultas = await db.Consultas.Include(c => c.Medico).Where(c => c.PacienteId == pid)
            .OrderByDescending(c => c.Fecha).Take(20).ToListAsync();

        return Ok(new
        {
            id = p.Id,
            nombre = p.Nombre,
            dpi = p.Dpi,
            telefono = p.Telefono,
            email = p.Email,
            direccion = p.Direccion,
            fecha_nacimiento = p.FechaNacimiento,
            sexo = p.Sexo,
            alergias = p.Alergias,
            notas = p.Notas,
            foto = p.Foto,
            foto_url = p.Foto != null ? files.PublicUrl(p.Foto) : null,
            citas = citas.Select(ClinicaHelpers.MapCita),
            consultas = consultas.Select(c => new
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
                foto_seguimiento = c.FotoSeguimiento,
                foto_seguimiento_url = c.FotoSeguimiento != null ? files.PublicUrl(c.FotoSeguimiento) : null,
                foto_seguimiento_nombre_original = c.FotoSeguimientoNombreOriginal,
                foto_seguimiento_mime_type = c.FotoSeguimientoMimeType,
                foto_seguimiento_tamano = c.FotoSeguimientoTamano,
                medico_nombre = c.Medico?.Nombre
            })
        });
    }

    [HttpGet("{id}/perfil")]
    public async Task<IActionResult> Perfil(string id)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var p = await db.Pacientes.FindAsync(pid);
        if (p == null) return NotFound(new { message = "Paciente no encontrado." });

        var citas = await db.Citas.Include(c => c.Medico).Where(c => c.PacienteId == pid)
            .OrderByDescending(c => c.FechaHora).ToListAsync();
        var consultas = await db.Consultas.Include(c => c.Medico).Where(c => c.PacienteId == pid)
            .OrderByDescending(c => c.Fecha).ToListAsync();
        var tratamientos = await db.Tratamientos.Include(t => t.Medico).Where(t => t.PacienteId == pid)
            .OrderByDescending(t => t.FechaInicio).ToListAsync();
        var estudios = await db.EstudiosClinicos.Where(e => e.PacienteId == pid)
            .OrderByDescending(e => e.FechaEstudio)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync();
        var recetas = await db.Recetas.Include(r => r.Medico).Where(r => r.PacienteId == pid)
            .OrderByDescending(r => r.Fecha).ToListAsync();
        var ordenes = await db.OrdenesLaboratorio.Include(o => o.Medico).Where(o => o.PacienteId == pid)
            .OrderByDescending(o => o.Fecha).ToListAsync();
        var pagos = await db.Pagos.Where(pg => pg.PacienteId == pid).OrderByDescending(pg => pg.Fecha).ToListAsync();

        return Ok(new
        {
            id = p.Id,
            nombre = p.Nombre,
            dpi = p.Dpi,
            telefono = p.Telefono,
            email = p.Email,
            direccion = p.Direccion,
            fecha_nacimiento = p.FechaNacimiento,
            sexo = p.Sexo,
            alergias = p.Alergias,
            notas = p.Notas,
            foto = p.Foto,
            foto_url = p.Foto != null ? files.PublicUrl(p.Foto) : null,
            citas = citas.Select(ClinicaHelpers.MapCita),
            consultas = consultas.Select(c => new
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
                foto_seguimiento = c.FotoSeguimiento,
                foto_seguimiento_url = c.FotoSeguimiento != null ? files.PublicUrl(c.FotoSeguimiento) : null,
                foto_seguimiento_nombre_original = c.FotoSeguimientoNombreOriginal,
                foto_seguimiento_mime_type = c.FotoSeguimientoMimeType,
                foto_seguimiento_tamano = c.FotoSeguimientoTamano,
                medico_nombre = c.Medico?.Nombre
            }),
            tratamientos = tratamientos.Select(t => new
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
                medico_nombre = t.Medico?.Nombre
            }),
            estudios = estudios.Select(e => ClinicaHelpers.MapEstudio(e, files)),
            recetas = recetas.Select(r => new
            {
                id = r.Id,
                paciente_id = r.PacienteId,
                medico_id = r.MedicoId,
                fecha = r.Fecha,
                medicamentos = r.Medicamentos,
                indicaciones = r.Indicaciones,
                medico_nombre = r.Medico?.Nombre
            }),
            ordenes = ordenes.Select(o => new
            {
                id = o.Id,
                paciente_id = o.PacienteId,
                medico_id = o.MedicoId,
                fecha = o.Fecha,
                estudios_solicitados = o.EstudiosSolicitados,
                diagnostico_presuntivo = o.DiagnosticoPresuntivo,
                notas = o.Notas,
                medico_nombre = o.Medico?.Nombre
            }),
            pagos = pagos.Select(pg => new
            {
                id = pg.Id,
                paciente_id = pg.PacienteId,
                concepto = pg.Concepto,
                monto = pg.Monto,
                metodo_pago = pg.MetodoPago,
                referencia = pg.Referencia,
                fecha = pg.Fecha,
                notas = pg.Notas
            })
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PacienteRequest body)
    {
        var temporal = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var p = new Paciente
        {
            Nombre = string.IsNullOrWhiteSpace(body.Nombre) ? "Paciente sin nombre" : body.Nombre.Trim(),
            Dpi = string.IsNullOrWhiteSpace(body.Dpi) ? $"TEMP-{temporal}" : body.Dpi.Trim(),
            Telefono = string.IsNullOrWhiteSpace(body.Telefono) ? "Sin teléfono" : body.Telefono.Trim(),
            Email = body.Email?.Trim(),
            Direccion = body.Direccion?.Trim(),
            FechaNacimiento = body.FechaNacimiento,
            Sexo = body.Sexo?.Trim(),
            Alergias = body.Alergias?.Trim(),
            Notas = body.Notas?.Trim()
        };
        try
        {
            db.Pacientes.Add(p);
            await db.SaveChangesAsync();
            return StatusCode(201, ClinicaHelpers.MapPaciente(p, files));
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe un paciente con ese DPI." });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] PacienteRequest body)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var p = await db.Pacientes.FindAsync(pid);
        if (p == null) return NotFound(new { message = "Paciente no encontrado." });

        if (string.IsNullOrWhiteSpace(body.Nombre) || string.IsNullOrWhiteSpace(body.Dpi) || string.IsNullOrWhiteSpace(body.Telefono))
            return BadRequest(new { message = "Nombre, DPI y teléfono son obligatorios." });

        p.Nombre = body.Nombre!.Trim();
        p.Dpi = body.Dpi!.Trim();
        p.Telefono = body.Telefono!.Trim();
        p.Email = body.Email?.Trim();
        p.Direccion = body.Direccion?.Trim();
        p.FechaNacimiento = body.FechaNacimiento;
        p.Sexo = body.Sexo?.Trim();
        p.Alergias = body.Alergias?.Trim();
        p.Notas = body.Notas?.Trim();

        try
        {
            await db.SaveChangesAsync();
            return Ok(ClinicaHelpers.MapPaciente(p, files));
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe otro paciente con ese DPI." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var p = await db.Pacientes.FindAsync(pid);
        if (p == null) return NotFound(new { message = "Paciente no encontrado." });
        db.Pacientes.Remove(p);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("{id}/foto")]
    public async Task<IActionResult> UploadFoto(string id, [FromBody] FotoRequest body)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null || string.IsNullOrWhiteSpace(body.DataBase64))
            return BadRequest(new { message = "Archivo requerido." });

        var p = await db.Pacientes.FindAsync(pid);
        if (p == null) return NotFound(new { message = "Paciente no encontrado." });

        try
        {
            var saved = files.SaveBase64($"fotos/{pid}", body.DataBase64!, body.MimeType, body.NombreArchivo);
            files.DeleteIfExists(p.Foto);
            p.Foto = saved.Relative;
            await db.SaveChangesAsync();
            return Ok(ClinicaHelpers.MapPaciente(p, files));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/estudios")]
    public async Task<IActionResult> ListEstudios(string id)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null) return BadRequest(new { message = "ID inválido." });
        var rows = await db.EstudiosClinicos.Where(e => e.PacienteId == pid)
            .OrderByDescending(e => e.FechaEstudio).ToListAsync();
        return Ok(rows.Select(e => ClinicaHelpers.MapEstudio(e, files)));
    }

    [HttpPost("{id}/estudios")]
    public async Task<IActionResult> UploadEstudio(string id, [FromBody] EstudioRequest body)
    {
        var pid = ClinicaHelpers.ParseId(id);
        if (pid == null || string.IsNullOrWhiteSpace(body.Titulo) || string.IsNullOrWhiteSpace(body.DataBase64))
            return BadRequest(new { message = "Título y archivo son obligatorios." });

        try
        {
            var saved = files.SaveBase64($"estudios/{pid}", body.DataBase64!, body.MimeType, body.NombreArchivo);
            var e = new EstudioClinico
            {
                PacienteId = pid.Value,
                Titulo = body.Titulo!.Trim(),
                Descripcion = body.Descripcion?.Trim(),
                Archivo = saved.Relative,
                NombreOriginal = body.NombreArchivo ?? saved.Name,
                MimeType = saved.Mime,
                Tamano = saved.Size,
                FechaEstudio = body.FechaEstudio
            };
            db.EstudiosClinicos.Add(e);
            await db.SaveChangesAsync();
            return StatusCode(201, ClinicaHelpers.MapEstudio(e, files));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public class PacienteRequest
    {
        public string? Nombre { get; set; }
        public string? Dpi { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Direccion { get; set; }
        public string? FechaNacimiento { get; set; }
        public string? Sexo { get; set; }
        public string? Alergias { get; set; }
        public string? Notas { get; set; }
    }

    public class FotoRequest
    {
        public string? DataBase64 { get; set; }
        public string? MimeType { get; set; }
        public string? NombreArchivo { get; set; }
    }

    public class EstudioRequest
    {
        public string? Titulo { get; set; }
        public string? Descripcion { get; set; }
        public string? FechaEstudio { get; set; }
        public string? DataBase64 { get; set; }
        public string? MimeType { get; set; }
        public string? NombreArchivo { get; set; }
    }
}
