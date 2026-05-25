using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Clinica.Core.Services;

public static class ClinicaSeedService
{
    public static async Task SeedAsync(ClinicaDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.Medicos.AnyAsync())
        {
            db.Medicos.AddRange(
                new Medico { Nombre = "Dr. Carlos Méndez", Especialidad = "Medicina General", Telefono = "5555-1001" },
                new Medico { Nombre = "Dra. Laura Rivas", Especialidad = "Pediatría", Telefono = "5555-1002" }
            );
        }

        if (!await db.Pacientes.AnyAsync())
        {
            var p1 = new Paciente
            {
                Nombre = "Ana García Pérez",
                Dpi = "2847 123456 0101",
                Telefono = "5555-2001",
                Email = "ana.garcia@email.com",
                Sexo = "F",
                Alergias = "Penicilina"
            };
            var p2 = new Paciente
            {
                Nombre = "Juan López Morales",
                Dpi = "2847 654321 0101",
                Telefono = "5555-2002",
                Sexo = "M"
            };
            db.Pacientes.AddRange(p1, p2);
            await db.SaveChangesAsync();

            var med = await db.Medicos.FirstAsync();
            var manana = DateTime.Today.AddDays(1).ToString("yyyy-MM-dd") + "T09:00";
            db.Citas.Add(new Cita
            {
                PacienteId = p1.Id,
                MedicoId = med.Id,
                FechaHora = manana,
                Motivo = "Control general",
                Estado = "confirmada"
            });
            await db.SaveChangesAsync();
        }
    }
}
