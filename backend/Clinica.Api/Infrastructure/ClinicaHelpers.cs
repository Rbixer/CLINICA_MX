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
        titulo = e.Titulo,
        descripcion = e.Descripcion,
        archivo = e.Archivo,
        nombre_original = e.NombreOriginal,
        mime_type = e.MimeType,
        tamano = e.Tamano,
        fecha_estudio = e.FechaEstudio,
        created_at = e.CreatedAt,
        url = fs.PublicUrl(e.Archivo)
    };
}
