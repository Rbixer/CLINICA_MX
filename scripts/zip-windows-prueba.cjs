/**
 * Empaqueta win-unpacked en ZIP para pruebas en Windows (sin instalador NSIS).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const src = path.join(root, "release/electron/win-unpacked");
const outDir = path.join(root, "release");
const zipName = "ClinicaIntegral-1.0.0-Prueba-Windows.zip";
const zipPath = path.join(outDir, zipName);

if (!fs.existsSync(path.join(src, "ClinicaIntegral.exe")) && !fs.existsSync(path.join(src, "Clínica Integral.exe"))) {
  console.error("No existe release/electron/win-unpacked. Ejecute: npm run electron:package:win");
  process.exit(1);
}

const readme = `CLINICA INTEGRAL - PRUEBA EN WINDOWS
================================

1. Descomprima esta carpeta en su PC (ej: C:\\ClinicaIntegral)
2. Ejecute "ClinicaIntegral.exe" o "Iniciar Clinica.bat"
3. Requisito: SQL Server LocalDB o SQL Server Express instalado
   (https://www.microsoft.com/sql-server/sql-server-downloads)

La primera vez se crea la base ClinicaIntegral automaticamente.

Para instalador formal: compile en Windows con "npm run electron:build:win"
`;

fs.writeFileSync(path.join(src, "LEEME.txt"), readme, "utf8");
fs.writeFileSync(
  path.join(src, "Iniciar Clinica.bat"),
  "@echo off\r\nstart \"\" \"%~dp0ClinicaIntegral.exe\"\r\n",
  "utf8"
);

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

try {
  execSync(`cd "${src}" && zip -r -q "${zipPath}" .`, { stdio: "inherit" });
} catch {
  console.error("Instale 'zip' o descomprima manualmente la carpeta win-unpacked");
  process.exit(1);
}

const mb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`\nListo: ${zipPath} (${mb} MB)`);
console.log("Copie el ZIP a Windows, descomprima y ejecute ClinicaIntegral.exe\n");
