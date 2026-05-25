# Genera el instalador .exe para Windows (ejecutar en PowerShell dentro del proyecto)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Frontend (Vite build)"
npm run build --prefix frontend

Write-Host "==> API .NET (win-x64, autocontenido)"
dotnet publish backend/Clinica.Api/Clinica.Api.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  /p:PublishReadyToRun=true `
  -o release/api-win

Write-Host "==> Instalador Electron (NSIS)"
npx electron-builder --win --config electron-builder.yml

Write-Host ""
Write-Host "Listo. Instalador en:"
Get-ChildItem -Path "release/electron" -Filter "*.exe" | ForEach-Object { $_.FullName }
