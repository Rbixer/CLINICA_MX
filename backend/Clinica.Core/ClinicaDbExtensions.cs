using Clinica.Core.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Clinica.Core;

public static class ClinicaDbExtensions
{
    public static IServiceCollection AddClinicaDatabase(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ClinicaDbContext>(opt => opt.UseSqlServer(connectionString));
        return services;
    }
}
