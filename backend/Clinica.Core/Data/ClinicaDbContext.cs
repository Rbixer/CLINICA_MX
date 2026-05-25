using Clinica.Core.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Core.Data;

public class ClinicaDbContext(DbContextOptions<ClinicaDbContext> options) : DbContext(options)
{
    public DbSet<ClinicaConfig> ClinicaConfig => Set<ClinicaConfig>();
    public DbSet<Medico> Medicos => Set<Medico>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Cita> Citas => Set<Cita>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<Tratamiento> Tratamientos => Set<Tratamiento>();
    public DbSet<EstudioClinico> EstudiosClinicos => Set<EstudioClinico>();
    public DbSet<Receta> Recetas => Set<Receta>();
    public DbSet<OrdenLaboratorio> OrdenesLaboratorio => Set<OrdenLaboratorio>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ClinicaConfig>().HasData(new ClinicaConfig
        {
            Id = 1,
            Nombre = "Clínica Integral",
            Direccion = "Ciudad de Guatemala",
            Telefono = "2222-0000",
            Email = "contacto@clinica.local"
        });

        modelBuilder.Entity<Paciente>()
            .HasIndex(p => p.Dpi)
            .IsUnique();

        modelBuilder.Entity<Cita>()
            .HasOne(c => c.Paciente)
            .WithMany(p => p.Citas)
            .HasForeignKey(c => c.PacienteId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Cita>()
            .HasOne(c => c.Medico)
            .WithMany()
            .HasForeignKey(c => c.MedicoId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Pago>()
            .Property(p => p.Monto)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Medico>()
            .Property(m => m.Activo)
            .HasDefaultValue(true);
    }
}
