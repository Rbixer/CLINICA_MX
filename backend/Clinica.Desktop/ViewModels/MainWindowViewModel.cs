using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Desktop.ViewModels;

public partial class MainWindowViewModel(IServiceProvider services) : ViewModelBase
{
    [ObservableProperty] private ViewModelBase? _currentPage;
    [ObservableProperty] private string _tituloPagina = "Dashboard";
    [ObservableProperty] private string _estadoDb = "Conectado a SQL Server local";

    [RelayCommand]
    private async Task NavigateAsync(string? clave)
    {
        if (string.IsNullOrEmpty(clave)) return;

        CurrentPage = clave switch
        {
            "dashboard" => services.GetRequiredService<DashboardViewModel>(),
            "pacientes" => services.GetRequiredService<PacientesViewModel>(),
            "citas" => services.GetRequiredService<CitasViewModel>(),
            "pagos" => services.GetRequiredService<PagosViewModel>(),
            "expediente" => services.GetRequiredService<ExpedienteViewModel>(),
            _ => CurrentPage
        };

        TituloPagina = clave switch
        {
            "dashboard" => "Panel general",
            "pacientes" => "Pacientes",
            "citas" => "Agenda y citas",
            "pagos" => "Pagos",
            "expediente" => "Expediente clínico",
            _ => TituloPagina
        };

        if (CurrentPage is ILoadableViewModel loadable)
            await loadable.LoadAsync();
    }

    public async Task InicializarAsync() => await NavigateAsync("dashboard");
}
