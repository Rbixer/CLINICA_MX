#!/usr/bin/env bash
# Arranca SQL Server (Docker), API C# y frontend React
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.dotnet:$PATH"

echo "==> SQL Server (Docker)"
docker compose up -d sqlserver
echo "    Esperando que SQL esté listo..."
for i in $(seq 1 30); do
  if docker compose ps sqlserver 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 2
done

echo "==> API C# (puerto 4100)"
fuser -k 4100/tcp 2>/dev/null || true
sleep 1
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/Clinica.Api/Clinica.Api.csproj &

echo "==> Frontend web (puerto 5176) — opcional"
npm run frontend &

echo ""
echo "Listo:"
echo "  Escritorio: npm run desktop"
echo "  API:        http://127.0.0.1:4100/api/health"
echo "  App web:    http://localhost:5176"
echo "  Detener:    fuser -k 4100/tcp 5176/tcp; docker compose down"
