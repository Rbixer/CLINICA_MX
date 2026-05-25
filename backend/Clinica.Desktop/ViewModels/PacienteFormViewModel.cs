using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Desktop.ViewModels;

public partial class PacienteFormViewModel : ViewModelBase
{
    [ObservableProperty] private int _id;
    [ObservableProperty] private string _nombre = "";
    [ObservableProperty] private string _dpi = "";
    [ObservableProperty] private string _telefono = "";
    [ObservableProperty] private string? _email;
    [ObservableProperty] private string? _sexo;
    [ObservableProperty] private string? _alergias;
    [ObservableProperty] private string? _notas;
    [ObservableProperty] private string? _error;

    public bool Guardado { get; private set; }
    public event Action? Cerrar;

    public static PacienteFormViewModel FromEntity(Paciente p) => new()
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Dpi = p.Dpi,
        Telefono = p.Telefono,
        Email = p.Email,
        Sexo = p.Sexo,
        Alergias = p.Alergias,
        Notas = p.Notas
    };

    [RelayCommand]
    private async Task GuardarAsync()
    {
        Error = null;
        if (string.IsNullOrWhiteSpace(Nombre) || string.IsNullOrWhiteSpace(Dpi) || string.IsNullOrWhiteSpace(Telefono))
        {
            Error = "Nombre, DPI y teléfono son obligatorios.";
            return;
        }

        var sp = App.Services;
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();

        Paciente entity;
        if (Id > 0)
        {
            entity = await db.Pacientes.FindAsync(Id) ?? new Paciente();
        }
        else
        {
            entity = new Paciente();
            db.Pacientes.Add(entity);
        }

        entity.Nombre = Nombre.Trim();
        entity.Dpi = Dpi.Trim();
        entity.Telefono = Telefono.Trim();
        entity.Email = string.IsNullOrWhiteSpace(Email) ? null : Email.Trim();
        entity.Sexo = string.IsNullOrWhiteSpace(Sexo) ? null : Sexo.Trim();
        entity.Alergias = Alergias;
        entity.Notas = Notas;

        await db.SaveChangesAsync();
        Guardado = true;
        Cerrar?.Invoke();
    }

    [RelayCommand]
    private void Cancelar() => Cerrar?.Invoke();
}
