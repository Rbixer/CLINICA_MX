using Clinica.Core.Data.Entities;
using Clinica.Api.Services;

namespace Clinica.Api.Infrastructure;

public static class ClinicaHelpers
{
    public static readonly string[] EstadosCita = ["pendiente", "confirmada", "atendida", "cancelada", "no_asistio"];
    public static readonly string[] EstadosTratamiento = ["activo", "completado", "suspendido"];

    public static string FechaHoyGt()
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Guatemala");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).ToString("yyyy-MM-dd");
        }
        catch
        {
            return DateTime.Today.ToString("yyyy-MM-dd");
        }
    }

    public static int? ParseId(string? value) =>
        int.TryParse(value, out var id) && id > 0 ? id : null;

    public static object MapPaciente(Paciente p, FileStorageService fs) => new
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
        foto_url = p.Foto != null ? fs.PublicUrl(p.Foto) : null,
        created_at = p.CreatedAt
    };

    public static object MapMedico(Medico m) => new
    {
        id = m.Id,
        nombre = m.Nombre,
        especialidad = m.Especialidad,
        telefono = m.Telefono,
        email = m.Email,
        colegiado = m.Colegiado,
        activo = m.Activo ? 1 : 0,
        created_at = m.CreatedAt
    };

    public static object MapCita(Cita c) => new
    {
        id = c.Id,
        paciente_id = c.PacienteId,
        medico_id = c.MedicoId,
        fecha_hora = c.FechaHora,
        motivo = c.Motivo,
        estado = c.Estado,
        notas = c.Notas,
        created_at = c.CreatedAt,
        paciente_nombre = c.Paciente?.Nombre,
        paciente_telefono = c.Paciente?.Telefono,
        medico_nombre = c.Medico?.Nombre,
        medico_especialidad = c.Medico?.Especialidad
    };

    public static object MapEstudio(EstudioClinico e, FileStorageService fs) => new
    {
        id = e.Id,
        paciente_id = e.PacienteId,
        cita_id = e.CitaId,
        titulo = e.Titulo,
        descripcion = e.Descripcion,
        archivo = e.Archivo,
        nombre_original = e.NombreOriginal,
        mime_type = e.MimeType,
        tamano = e.Tamano,
        fecha_estudio = e.FechaEstudio,
        created_at = e.CreatedAt,
        foto_antes = e.FotoAntes,
        foto_antes_url = e.FotoAntes != null ? fs.PublicUrl(e.FotoAntes) : null,
        foto_antes_nombre_original = e.FotoAntesNombreOriginal,
        foto_antes_mime_type = e.FotoAntesMimeType,
        foto_antes_tamano = e.FotoAntesTamano,
        foto_despues = e.FotoDespues,
        foto_despues_url = e.FotoDespues != null ? fs.PublicUrl(e.FotoDespues) : null,
        foto_despues_nombre_original = e.FotoDespuesNombreOriginal,
        foto_despues_mime_type = e.FotoDespuesMimeType,
        foto_despues_tamano = e.FotoDespuesTamano,
        url = fs.PublicUrl(e.Archivo)
    };
}
