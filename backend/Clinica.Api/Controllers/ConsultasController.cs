using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Api.Infrastructure;
using Clinica.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Api.Controllers;

[ApiController]
[Route("api/consultas")]
public class ConsultasController(ClinicaDbContext db, FileStorageService files) : ControllerBase
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

        try
        {
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
            if (!string.IsNullOrWhiteSpace(body.FotoDataBase64))
            {
                var saved = GuardarFotoSeguimiento(body.PacienteId.Value, body.FotoDataBase64!, body.FotoMimeType, body.FotoNombreArchivo);
                c.FotoSeguimiento = saved.Relative;
                c.FotoSeguimientoNombreOriginal = body.FotoNombreArchivo ?? saved.Name;
                c.FotoSeguimientoMimeType = saved.Mime;
                c.FotoSeguimientoTamano = saved.Size;
            }
            if (!string.IsNullOrWhiteSpace(body.FotoAntesDataBase64))
            {
                var saved = GuardarFotoConsulta(body.PacienteId.Value, "antes", body.FotoAntesDataBase64!, body.FotoAntesMimeType, body.FotoAntesNombreArchivo);
                c.FotoAntes = saved.Relative;
                c.FotoAntesNombreOriginal = body.FotoAntesNombreArchivo ?? saved.Name;
                c.FotoAntesMimeType = saved.Mime;
                c.FotoAntesTamano = saved.Size;
            }
            if (!string.IsNullOrWhiteSpace(body.FotoDespuesDataBase64))
            {
                var saved = GuardarFotoConsulta(body.PacienteId.Value, "despues", body.FotoDespuesDataBase64!, body.FotoDespuesMimeType, body.FotoDespuesNombreArchivo);
                c.FotoDespues = saved.Relative;
                c.FotoDespuesNombreOriginal = body.FotoDespuesNombreArchivo ?? saved.Name;
                c.FotoDespuesMimeType = saved.Mime;
                c.FotoDespuesTamano = saved.Size;
            }

            db.Consultas.Add(c);
            if (body.CitaId > 0)
            {
                var cita = await db.Citas.FindAsync(body.CitaId);
                if (cita != null) cita.Estado = "atendida";
            }
            await db.SaveChangesAsync();
            return StatusCode(201, Map(await db.Consultas.Include(x => x.Paciente).Include(x => x.Medico).FirstAsync(x => x.Id == c.Id)));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

        try
        {
            if (body.EliminarFotoSeguimiento == true)
            {
                files.DeleteIfExists(c.FotoSeguimiento);
                LimpiarFotoSeguimiento(c);
            }
            if (!string.IsNullOrWhiteSpace(body.FotoDataBase64))
            {
                var saved = GuardarFotoSeguimiento(c.PacienteId, body.FotoDataBase64!, body.FotoMimeType, body.FotoNombreArchivo);
                files.DeleteIfExists(c.FotoSeguimiento);
                c.FotoSeguimiento = saved.Relative;
                c.FotoSeguimientoNombreOriginal = body.FotoNombreArchivo ?? saved.Name;
                c.FotoSeguimientoMimeType = saved.Mime;
                c.FotoSeguimientoTamano = saved.Size;
            }
            if (body.EliminarFotoAntes == true)
            {
                files.DeleteIfExists(c.FotoAntes);
                LimpiarFotoAntes(c);
            }
            if (!string.IsNullOrWhiteSpace(body.FotoAntesDataBase64))
            {
                var saved = GuardarFotoConsulta(c.PacienteId, "antes", body.FotoAntesDataBase64!, body.FotoAntesMimeType, body.FotoAntesNombreArchivo);
                files.DeleteIfExists(c.FotoAntes);
                c.FotoAntes = saved.Relative;
                c.FotoAntesNombreOriginal = body.FotoAntesNombreArchivo ?? saved.Name;
                c.FotoAntesMimeType = saved.Mime;
                c.FotoAntesTamano = saved.Size;
            }
            if (body.EliminarFotoDespues == true)
            {
                files.DeleteIfExists(c.FotoDespues);
                LimpiarFotoDespues(c);
            }
            if (!string.IsNullOrWhiteSpace(body.FotoDespuesDataBase64))
            {
                var saved = GuardarFotoConsulta(c.PacienteId, "despues", body.FotoDespuesDataBase64!, body.FotoDespuesMimeType, body.FotoDespuesNombreArchivo);
                files.DeleteIfExists(c.FotoDespues);
                c.FotoDespues = saved.Relative;
                c.FotoDespuesNombreOriginal = body.FotoDespuesNombreArchivo ?? saved.Name;
                c.FotoDespuesMimeType = saved.Mime;
                c.FotoDespuesTamano = saved.Size;
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        await db.SaveChangesAsync();
        return Ok(Map(await db.Consultas.Include(x => x.Paciente).Include(x => x.Medico).FirstAsync(x => x.Id == c.Id)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var cid = ClinicaHelpers.ParseId(id);
        if (cid == null) return BadRequest(new { message = "ID inválido." });
        var c = await db.Consultas.FindAsync(cid);
        if (c != null)
        {
            files.DeleteIfExists(c.FotoSeguimiento);
            files.DeleteIfExists(c.FotoAntes);
            files.DeleteIfExists(c.FotoDespues);
            db.Consultas.Remove(c);
            await db.SaveChangesAsync();
        }
        return Ok(new { ok = true });
    }

    private object Map(Consulta c) => new
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
        foto_antes = c.FotoAntes,
        foto_antes_url = c.FotoAntes != null ? files.PublicUrl(c.FotoAntes) : null,
        foto_antes_nombre_original = c.FotoAntesNombreOriginal,
        foto_antes_mime_type = c.FotoAntesMimeType,
        foto_antes_tamano = c.FotoAntesTamano,
        foto_despues = c.FotoDespues,
        foto_despues_url = c.FotoDespues != null ? files.PublicUrl(c.FotoDespues) : null,
        foto_despues_nombre_original = c.FotoDespuesNombreOriginal,
        foto_despues_mime_type = c.FotoDespuesMimeType,
        foto_despues_tamano = c.FotoDespuesTamano,
        paciente_nombre = c.Paciente?.Nombre,
        medico_nombre = c.Medico?.Nombre
    };

    private FileStorageService.SavedFile GuardarFotoSeguimiento(int pacienteId, string dataBase64, string? mimeType, string? nombreArchivo)
    {
        if (!string.IsNullOrWhiteSpace(mimeType) && !mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("La foto de seguimiento debe ser una imagen.");
        return files.SaveBase64($"consultas/{pacienteId}", dataBase64, mimeType, nombreArchivo, maxMb: 8);
    }

    private FileStorageService.SavedFile GuardarFotoConsulta(int pacienteId, string tipo, string dataBase64, string? mimeType, string? nombreArchivo)
    {
        if (!string.IsNullOrWhiteSpace(mimeType) && !mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Las fotos de evolución deben ser imágenes.");
        return files.SaveBase64($"consultas/{pacienteId}/{tipo}", dataBase64, mimeType, nombreArchivo, maxMb: 8);
    }

    private static void LimpiarFotoSeguimiento(Consulta c)
    {
        c.FotoSeguimiento = null;
        c.FotoSeguimientoNombreOriginal = null;
        c.FotoSeguimientoMimeType = null;
        c.FotoSeguimientoTamano = null;
    }

    private static void LimpiarFotoAntes(Consulta c)
    {
        c.FotoAntes = null;
        c.FotoAntesNombreOriginal = null;
        c.FotoAntesMimeType = null;
        c.FotoAntesTamano = null;
    }

    private static void LimpiarFotoDespues(Consulta c)
    {
        c.FotoDespues = null;
        c.FotoDespuesNombreOriginal = null;
        c.FotoDespuesMimeType = null;
        c.FotoDespuesTamano = null;
    }

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
        public string? FotoDataBase64 { get; set; }
        public string? FotoMimeType { get; set; }
        public string? FotoNombreArchivo { get; set; }
        public string? FotoAntesDataBase64 { get; set; }
        public string? FotoAntesMimeType { get; set; }
        public string? FotoAntesNombreArchivo { get; set; }
        public string? FotoDespuesDataBase64 { get; set; }
        public string? FotoDespuesMimeType { get; set; }
        public string? FotoDespuesNombreArchivo { get; set; }
    }

    public class ConsultaPatchRequest
    {
        public int? MedicoId { get; set; }
        public string? Motivo { get; set; }
        public string? Diagnostico { get; set; }
        public string? Tratamiento { get; set; }
        public string? Notas { get; set; }
        public string? FotoDataBase64 { get; set; }
        public string? FotoMimeType { get; set; }
        public string? FotoNombreArchivo { get; set; }
        public bool? EliminarFotoSeguimiento { get; set; }
        public string? FotoAntesDataBase64 { get; set; }
        public string? FotoAntesMimeType { get; set; }
        public string? FotoAntesNombreArchivo { get; set; }
        public bool? EliminarFotoAntes { get; set; }
        public string? FotoDespuesDataBase64 { get; set; }
        public string? FotoDespuesMimeType { get; set; }
        public string? FotoDespuesNombreArchivo { get; set; }
        public bool? EliminarFotoDespues { get; set; }
    }
}
