# Clínica Integral — Sistema de gestión

Aplicación para la **gestión integral de clínicas** en entorno de **escritorio local**:

| Requisito | Implementación |
|-----------|----------------|
| **Tecnología** | **C# / .NET 8** (ASP.NET Core Web API) |
| **Base de datos** | **SQL Server local** (LocalDB, Express o Docker en desarrollo) |
| **Pacientes** | Registro, expediente, foto |
| **Historia clínica** | Consultas por paciente |
| **Citas** | Agenda (día / semana / mes) |
| **Pagos** | Cobros e historial |
| **Documentos médicos** | Estudios (PDF/imagen), recetas, órdenes de laboratorio |

La interfaz actual es **React** en el navegador, conectada al API en `localhost` (patrón típico de app de escritorio con UI web embebida). Los datos y archivos quedan en la PC de la clínica.

Documentación de arquitectura escritorio: [docs/APLICACION_ESCRITORIO.md](docs/APLICACION_ESCRITORIO.md)

### App de escritorio con Electron (recomendada — misma UI web)

Empaqueta la interfaz React en una **ventana de PC** (Windows/Linux). El API C# y SQL Server deben estar disponibles (Electron puede arrancar el API automáticamente).

```bash
npm install                    # dependencias Electron en la raíz
npm run sql:up                 # SQL Server
npm run electron:dev           # API + Vite + ventana Electron

# Probar build web empaquetado en Electron (sin Vite dev)
npm run electron:dist

# Instalador Windows (.exe NSIS) — ver docs/INSTALADOR_WINDOWS.md
npm run electron:build:win

# Instalador Linux (AppImage)
npm run electron:build
```

Variables útiles: `CLINICA_AUTO_API=0` (no iniciar dotnet), `CLINICA_ELECTRON_DEVTOOLS=1` (consola en desarrollo).

Código Electron en `electron-app/` (no usar carpeta `electron/` — conflicto con el paquete npm).

### App de escritorio nativa (Avalonia)

```bash
npm run sql:up          # SQL Server (Linux)
npm run desktop         # Ventana .NET — sin navegador
```

Proyectos: `Clinica.Core` (datos) · `Clinica.Api` (API opcional) · `Clinica.Desktop` (UI escritorio).

## Requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) 18+ (solo para el frontend)
- **SQL Server** en una de estas formas:
  - **Windows:** SQL Server Express o LocalDB `(localdb)\mssqllocaldb` (configurado por defecto en `appsettings.json`)
  - **Linux / Docker:** `docker compose up -d sqlserver` (ver abajo)

## Base de datos SQL Server

### Opción A — Docker (recomendado en Linux)

```bash
cd /home/ia/Escritorio/clinica_nueva
docker compose up -d sqlserver
# Esperar ~30 s a que SQL Server esté listo
```

La cadena de conexión en `backend/Clinica.Api/appsettings.Development.json` ya apunta a:

`Server=localhost;Database=ClinicaIntegral;User Id=sa;Password=Clinica2024!;TrustServerCertificate=True`

### Opción B — Windows (LocalDB)

En `backend/Clinica.Api/appsettings.json` (por defecto):

`Server=(localdb)\mssqllocaldb;Database=ClinicaIntegral;Trusted_Connection=True`

### Creación automática

Al iniciar la API, Entity Framework crea las tablas y datos de ejemplo (médicos, pacientes, una cita).

## Iniciar

```bash
cd /home/ia/Escritorio/clinica_nueva
npm run install:all

# Terminal 1 — API C# (puerto 4100)
npm run backend          # desarrollo (SQL Docker en Linux)
# npm run backend:desktop   # modo clínica: LocalDB + datos en %LOCALAPPDATA%

# Terminal 2 — Frontend (puerto 5176)
npm run frontend
```

Abrir: **http://localhost:5176**

Swagger (solo desarrollo): **http://127.0.0.1:4100/swagger**

## Arquitectura C#

```
backend/
  Clinica.sln
  Clinica.Api/
    Controllers/     # API REST (misma rutas que el frontend)
    Data/            # DbContext + entidades EF Core
    Services/        # Archivos, seed inicial
    Infrastructure/  # Utilidades y mapeo JSON snake_case
```

- **ORM:** Entity Framework Core 8 + SQL Server  
- **JSON:** snake_case en respuestas (compatible con el frontend React)  
- **Archivos:** `backend/Clinica.Api/uploads/`

El backend anterior en Node.js + SQLite quedó en `backend-node/` por referencia.

## Módulos incorporados

| Requerimiento | Dónde está |
|---------------|------------|
| **Pacientes** — registro, edición, eliminación, foto, filtros | Menú **Pacientes** |
| **Historia clínica** completa | Expediente → *Historia clínica* |
| **Estudios clínicos** (PDF e imágenes) | Expediente → *Estudios* |
| **Recetas médicas PDF** | Expediente → *Recetas* |
| **Órdenes de laboratorio** (membrete) | Expediente → *Laboratorio* |
| **Agenda y citas** | Menú **Agenda** |
| **Seguimiento de tratamientos** | Expediente → *Tratamientos* |
| **Pagos e historial financiero** | Menú **Pagos** |
| **Médicos y especialidades** | Menú **Doctores** |
| **Panel con indicadores** | **Dashboard** |
| **Membrete para PDF** | **Configuración** |

## API principal

Mismas rutas que antes (`/api/...` en el puerto **4100**).

## Cambiar contraseña SQL Server

Edita `backend/Clinica.Api/appsettings.Development.json` o usa variable de entorno:

```bash
export ConnectionStrings__DefaultConnection="Server=localhost;Database=ClinicaIntegral;User Id=sa;Password=TU_PASSWORD;TrustServerCertificate=True"
npm run backend
```
