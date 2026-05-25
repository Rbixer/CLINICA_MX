using Clinica.Core.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.ObjectModel;

namespace Clinica.Desktop.ViewModels;

public partial class CitasViewModel(IServiceProvider services) : ViewModelBase, ILoadableViewModel
{
    public ObservableCollection<CitaRow> Citas { get; } = [];
    [ObservableProperty] private string _filtroFecha = DateTime.Today.ToString("yyyy-MM-dd");
    [ObservableProperty] private string? _mensaje;

    public async Task LoadAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var pref = FiltroFecha.Trim();
        var list = await db.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Medico)
            .Where(c => c.FechaHora.StartsWith(pref))
            .OrderBy(c => c.FechaHora)
            .ToListAsync();

        Citas.Clear();
        foreach (var c in list)
        {
            Citas.Add(new CitaRow(
                c.Id,
                c.FechaHora,
                c.Paciente?.Nombre ?? "—",
                c.Medico?.Nombre ?? "—",
                c.Motivo ?? "",
                c.Estado));
        }
        Mensaje = $"{Citas.Count} cita(s) para {pref}";
    }

    [RelayCommand]
    private async Task RefrescarAsync() => await LoadAsync();
}

public record CitaRow(int Id, string FechaHora, string Paciente, string Medico, string Motivo, string Estado);
