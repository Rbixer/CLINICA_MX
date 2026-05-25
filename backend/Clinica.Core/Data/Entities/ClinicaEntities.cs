using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Clinica.Core.Data.Entities;

[Table("clinica_config")]
public class ClinicaConfig
{
    [Key]
    public int Id { get; set; } = 1;
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = "Clínica Integral";
    [MaxLength(500)]
    public string? Direccion { get; set; }
    [MaxLength(50)]
    public string? Telefono { get; set; }
    [MaxLength(120)]
    public string? Email { get; set; }
    [MaxLength(500)]
    public string? LogoPath { get; set; }
}

[Table("medicos")]
public class Medico
{
    public int Id { get; set; }
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = "";
    [Required, MaxLength(120)]
    public string Especialidad { get; set; } = "";
    [MaxLength(50)]
    public string? Telefono { get; set; }
    [MaxLength(120)]
    public string? Email { get; set; }
    [MaxLength(50)]
    public string? Colegiado { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("pacientes")]
public class Paciente
{
    public int Id { get; set; }
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = "";
    [Required, MaxLength(30)]
    public string Dpi { get; set; } = "";
    [Required, MaxLength(30)]
    public string Telefono { get; set; } = "";
    [MaxLength(120)]
    public string? Email { get; set; }
    [MaxLength(500)]
    public string? Direccion { get; set; }
    [MaxLength(10)]
    public string? FechaNacimiento { get; set; }
    [MaxLength(20)]
    public string? Sexo { get; set; }
    public string? Alergias { get; set; }
    public string? Notas { get; set; }
    [MaxLength(500)]
    public string? Foto { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Cita> Citas { get; set; } = [];
}

[Table("citas")]
public class Cita
{
    public int Id { get; set; }
    public int? PacienteId { get; set; }
    public int? MedicoId { get; set; }
    [MaxLength(30)]
    public string FechaHora { get; set; } = "";
    [MaxLength(500)]
    public string? Motivo { get; set; }
    [Required, MaxLength(20)]
    public string Estado { get; set; } = "pendiente";
    public string? Notas { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Paciente? Paciente { get; set; }
    public Medico? Medico { get; set; }
}

[Table("pagos")]
public class Pago
{
    public int Id { get; set; }
    public int? PacienteId { get; set; }
    [Required, MaxLength(300)]
    public string Concepto { get; set; } = "";
    [Column(TypeName = "decimal(18,2)")]
    public decimal Monto { get; set; }
    [MaxLength(30)]
    public string? MetodoPago { get; set; }
    [MaxLength(80)]
    public string? Referencia { get; set; }
    [Required, MaxLength(10)]
    public string Fecha { get; set; } = "";
    public string? Notas { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Paciente? Paciente { get; set; }
}

[Table("consultas")]
public class Consulta
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    public int? MedicoId { get; set; }
    public int? CitaId { get; set; }
    [Required, MaxLength(10)]
    public string Fecha { get; set; } = "";
    public string? Motivo { get; set; }
    public string? Diagnostico { get; set; }
    public string? Tratamiento { get; set; }
    public string? Notas { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Paciente Paciente { get; set; } = null!;
    public Medico? Medico { get; set; }
}

[Table("tratamientos")]
public class Tratamiento
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    public int? MedicoId { get; set; }
    [Required, MaxLength(200)]
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
    [Required, MaxLength(10)]
    public string FechaInicio { get; set; } = "";
    [MaxLength(10)]
    public string? FechaFin { get; set; }
    [Required, MaxLength(20)]
    public string Estado { get; set; } = "activo";
    public string? ProgresoNotas { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Paciente Paciente { get; set; } = null!;
    public Medico? Medico { get; set; }
}

[Table("estudios_clinicos")]
public class EstudioClinico
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    [Required, MaxLength(300)]
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    [Required, MaxLength(500)]
    public string Archivo { get; set; } = "";
    [MaxLength(300)]
    public string? NombreOriginal { get; set; }
    [MaxLength(80)]
    public string? MimeType { get; set; }
    public long? Tamano { get; set; }
    [MaxLength(10)]
    public string? FechaEstudio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("recetas")]
public class Receta
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    public int? MedicoId { get; set; }
    [Required, MaxLength(10)]
    public string Fecha { get; set; } = "";
    [Required]
    public string Medicamentos { get; set; } = "";
    public string? Indicaciones { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Medico? Medico { get; set; }
}

[Table("ordenes_laboratorio")]
public class OrdenLaboratorio
{
    public int Id { get; set; }
    public int PacienteId { get; set; }
    public int? MedicoId { get; set; }
    [Required, MaxLength(10)]
    public string Fecha { get; set; } = "";
    [Required]
    public string EstudiosSolicitados { get; set; } = "";
    public string? DiagnosticoPresuntivo { get; set; }
    public string? Notas { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Medico? Medico { get; set; }
}
