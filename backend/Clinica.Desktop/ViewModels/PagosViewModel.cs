using Clinica.Core.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.ObjectModel;

namespace Clinica.Desktop.ViewModels;

public partial class PagosViewModel(IServiceProvider services) : ViewModelBase, ILoadableViewModel
{
    public ObservableCollection<PagoRow> Pagos { get; } = [];
    [ObservableProperty] private PagoRow? _seleccionado;
    [ObservableProperty] private string? _mensaje;

    [ObservableProperty] private string _concepto = "";
    [ObservableProperty] private string _montoTexto = "0";
    [ObservableProperty] private string _fecha = DateTime.Today.ToString("yyyy-MM-dd");
    [ObservableProperty] private string? _metodoPago;

    public async Task LoadAsync()
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        var list = await db.Pagos
            .Include(p => p.Paciente)
            .OrderByDescending(p => p.Fecha)
            .ThenByDescending(p => p.Id)
            .Take(200)
            .ToListAsync();

        Pagos.Clear();
        foreach (var p in list)
        {
            Pagos.Add(new PagoRow(
                p.Id,
                p.Fecha,
                p.Concepto,
                p.Monto,
                p.MetodoPago ?? "—",
                p.Paciente?.Nombre ?? "—"));
        }
        Mensaje = $"{Pagos.Count} registro(s)";
    }

    [RelayCommand]
    private async Task RegistrarAsync()
    {
        if (string.IsNullOrWhiteSpace(Concepto) || !decimal.TryParse(MontoTexto, out var monto) || monto <= 0)
        {
            Mensaje = "Indique concepto y monto válido.";
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicaDbContext>();
        db.Pagos.Add(new Core.Data.Entities.Pago
        {
            Concepto = Concepto.Trim(),
            Monto = monto,
            Fecha = Fecha,
            MetodoPago = MetodoPago
        });
        await db.SaveChangesAsync();
        Concepto = "";
        MontoTexto = "0";
        Mensaje = "Pago registrado";
        await LoadAsync();
    }
}

public record PagoRow(int Id, string Fecha, string Concepto, decimal Monto, string Metodo, string Paciente);
