# Instalador Windows — Clínica Integral (Electron)

El instalador incluye:

- Aplicación de escritorio (Electron + interfaz web)
- API en C# (.NET 8, autocontenida)
- Datos en `%LOCALAPPDATA%\ClinicaIntegral`
- Base de datos: **SQL Server LocalDB** en la PC de la clínica

## Requisitos en la PC destino (Windows 10/11)

1. **SQL Server Express** o **LocalDB** (recomendado: instalar [SQL Server Express](https://www.microsoft.com/es-es/sql-server/sql-server-downloads) con LocalDB).
2. No hace falta instalar Node.js ni .NET por separado (van embebidos en el instalador).

## Prueba rápida (desde Linux, sin instalador)

Ya se puede generar un ZIP listo para Windows:

```bash
npm run electron:package:win
```

Archivo: **`release/ClinicaIntegral-1.0.0-Prueba-Windows.zip`** (~171 MB)

1. Copie el ZIP a la PC Windows.
2. Descomprima (clic derecho → Extraer todo).
3. Ejecute **`ClinicaIntegral.exe`** o **`Iniciar Clinica.bat`**.
4. Necesita **SQL Server LocalDB** instalado en Windows.

## Generar el instalador (.exe instalador)

### Opción A — En Windows (recomendado)

Abre **PowerShell** en la carpeta del proyecto:

```powershell
cd C:\ruta\a\clinica_nueva
npm install
npm run install:all
npm run electron:build:win
```

O el script:

```powershell
.\scripts\build-windows-installer.ps1
```

El archivo quedará en:

`release/electron/ClinicaIntegral-1.0.0-Setup.exe`

### Opción B — Desde Linux (limitado)

```bash
cd /home/ia/Escritorio/clinica_nueva
chmod +x scripts/build-windows-installer.sh
./scripts/build-windows-installer.shd
```

En Linux suele generarse la carpeta `release/electron/win-unpacked/` (app portable). El **.exe instalador NSIS** requiere **Wine** o compilar en **Windows**.

Si ya existe `win-unpacked`, en Windows puedes ejecutar solo el empaquetado NSIS con electron-builder.

## Instalar en la clínica

1. Copiar `ClinicaIntegral-*-Setup.exe` a la PC Windows.
2. Ejecutar el instalador (siguiente → siguiente).
3. Abrir **Clínica Integral** desde el escritorio o el menú Inicio.
4. La primera vez se crea la base `ClinicaIntegral` en LocalDB y datos de ejemplo.

## Actualizar versión

Edita `"version"` en `package.json` y vuelve a ejecutar `npm run electron:build:win`.

## Solución de problemas

| Problema | Qué hacer |
|----------|-----------|
| Pantalla en blanco | Comprobar que LocalDB esté instalado; reiniciar la app |
| Error de API | Verificar que el puerto **4100** no esté ocupado |
| Firewall | Permitir **Clínica Integral** en red privada |
