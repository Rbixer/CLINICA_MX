using Clinica.Core;
using Clinica.Core.Data;
using Clinica.Core.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Desktop.Services;

public static class AppServices
{
    public static IServiceProvider Build(IConfiguration config)
    {
        var services = new ServiceCollection();
        var cs = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Falta ConnectionStrings:DefaultConnection");

        services.AddSingleton(config);
        services.AddClinicaDatabase(cs);
        services.AddSingleton<DocumentStorageService>();

        services.AddTransient<ViewModels.DashboardViewModel>();
        services.AddTransient<ViewModels.PacientesViewModel>();
        services.AddTransient<ViewModels.CitasViewModel>();
        services.AddTransient<ViewModels.PagosViewModel>();
        services.AddTransient<ViewModels.ExpedienteViewModel>();
        services.AddSingleton<ViewModels.MainWindowViewModel>();

        var provider = services.BuildServiceProvider();

        using var scope = provider.CreateScope();
        ClinicaSeedService.SeedAsync(scope.ServiceProvider.GetRequiredService<ClinicaDbContext>())
            .GetAwaiter().GetResult();

        return provider;
    }
}
