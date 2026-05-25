#!/usr/bin/env bash
# Compilar instalador Windows desde Linux (requiere Wine para NSIS en muchos casos)
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.dotnet:$PATH"

echo "==> Frontend"
npm run build --prefix frontend

echo "==> API win-x64"
dotnet publish backend/Clinica.Api/Clinica.Api.csproj \
  -c Release -r win-x64 --self-contained true \
  /p:PublishReadyToRun=true \
  -o release/api-win

echo "==> Electron Builder (Windows)"
npx electron-builder --win --config electron-builder.yml

echo ""
echo "Instalador generado en release/electron/"
ls -la release/electron/*.exe 2>/dev/null || ls -la release/electron/
