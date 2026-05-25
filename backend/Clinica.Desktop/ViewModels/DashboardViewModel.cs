using Clinica.Core.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Desktop.ViewModels;

public partial class DashboardViewModel(IServiceProvider services) : ViewModelBase, ILoadableViewModel
{
    [ObservableProperty] private int _totalPacientes;
    [ObservableProperty] private int _citasHoy;
    [ObservableProperty] private int _citasPendientes;
    [ObservableProperty] private decimal _pagosMes;
    [ObservableProperty] private int _estudiosTotal;
    [ObservableProperty] private string _nombreClinica = "Clínica Integral";

    public async Task LoadAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var hoy = DateTime.Today.ToString("yyyy-MM-dd");
        var mes = DateTime.Today.ToString("yyyy-MM");

        TotalPacientes = await db.Pacientes.CountAsync();
        CitasHoy = await db.Citas.CountAsync(c => c.FechaHora.StartsWith(hoy));
        CitasPendientes = await db.Citas.CountAsync(c => c.Estado == "pendiente" || c.Estado == "confirmada");
        PagosMes = await db.Pagos.Where(p => p.Fecha.StartsWith(mes)).SumAsync(p => p.Monto);
        EstudiosTotal = await db.EstudiosClinicos.CountAsync();

        var cfg = await db.ClinicaConfig.FirstOrDefaultAsync();
        if (cfg != null) NombreClinica = cfg.Nombre;
    }
}
