using System.Text.Json;
using System.Text.Json.Serialization;

namespace Clinica.Api.Infrastructure;

/// <summary>
/// JSON compatible con el frontend existente: respuestas en snake_case, entradas camelCase o snake_case.
/// </summary>
public static class JsonSnakeCase
{
    public static JsonSerializerOptions Options { get; } = CreateOptions();

    public static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        return options;
    }
}
