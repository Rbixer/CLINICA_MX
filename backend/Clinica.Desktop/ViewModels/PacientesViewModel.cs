using System.Collections.ObjectModel;
using Clinica.Core.Data;
using Clinica.Core.Data.Entities;
using Clinica.Desktop.Views;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Desktop.ViewModels;

public partial class PacientesViewModel(IServiceProvider services) : ViewModelBase, ILoadableViewModel
{
    [ObservableProperty] private string _busqueda = "";
    public ObservableCollection<PacienteRow> Pacientes { get; } = [];
    [ObservableProperty] private PacienteRow? _seleccionado;
    [ObservableProperty] private string? _mensaje;

    public async Task LoadAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var q = db.Pacientes.AsQueryable();
        if (!string.IsNullOrWhiteSpace(Busqueda))
        {
            var t = Busqueda.Trim();
            q = q.Where(p => p.Nombre.Contains(t) || p.Dpi.Contains(t) || p.Telefono.Contains(t));
        }
        var list = await q.OrderBy(p => p.Nombre).ToListAsync();
        Pacientes.Clear();
        foreach (var p in list) Pacientes.Add(PacienteRow.From(p));
        Mensaje = $"{Pacientes.Count} paciente(s)";
    }

    [RelayCommand]
    private async Task BuscarAsync() => await LoadAsync();

    [RelayCommand]
    private async Task NuevoAsync()
    {
        var vm = new PacienteFormViewModel();
        if (await MostrarFormulario(vm) && vm.Guardado)
            await LoadAsync();
    }

    [RelayCommand]
    private async Task EditarAsync()
    {
        if (Seleccionado == null) return;
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var p = await db.Pacientes.FindAsync(Seleccionado.Id);
        if (p == null) return;
        var vm = PacienteFormViewModel.FromEntity(p);
        if (await MostrarFormulario(vm) && vm.Guardado)
            await LoadAsync();
    }

    [RelayCommand]
    private async Task EliminarAsync()
    {
        if (Seleccionado == null) return;
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var p = await db.Pacientes.FindAsync(Seleccionado.Id);
        if (p == null) return;
        db.Pacientes.Remove(p);
        await db.SaveChangesAsync();
        Mensaje = "Paciente eliminado";
        await LoadAsync();
    }

    private static async Task<bool> MostrarFormulario(PacienteFormViewModel vm)
    {
        var win = new PacienteFormWindow(vm);
        if (Avalonia.Application.Current?.ApplicationLifetime is Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop
            && desktop.MainWindow != null)
            await win.ShowDialog(desktop.MainWindow);
        return vm.Guardado;
    }
}

public class PacienteRow
{
    public int Id { get; init; }
    public string Nombre { get; init; } = "";
    public string Dpi { get; init; } = "";
    public string Telefono { get; init; } = "";
    public string? Email { get; init; }
    public string? Sexo { get; init; }

    public static PacienteRow From(Paciente p) => new()
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Dpi = p.Dpi,
        Telefono = p.Telefono,
        Email = p.Email,
        Sexo = p.Sexo
    };
}
