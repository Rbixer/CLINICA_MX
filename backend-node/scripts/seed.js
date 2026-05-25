const path = require("path");
const fs = require("fs");
const { runQuery, getQuery, allQuery } = require("../src/db");

async function seed() {
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const medicos = await allQuery("SELECT id FROM medicos LIMIT 1");
  if (medicos.length) {
    console.log("La base ya tiene datos. Seed omitido.");
    process.exit(0);
  }

  const med1 = await runQuery(
    "INSERT INTO medicos (nombre, especialidad, telefono, email) VALUES (?, ?, ?, ?)",
    ["Dra. María López", "Medicina general", "5555-1001", "maria@clinica.local"]
  );
  const med2 = await runQuery(
    "INSERT INTO medicos (nombre, especialidad, telefono, email) VALUES (?, ?, ?, ?)",
    ["Dr. Carlos Méndez", "Pediatría", "5555-1002", "carlos@clinica.local"]
  );

  const p1 = await runQuery(
    `INSERT INTO pacientes (nombre, dpi, telefono, email, direccion, fecha_nacimiento, alergias)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "Ana García Pérez",
      "1234567890101",
      "5555-2001",
      "ana@correo.com",
      "Zona 10, Ciudad de Guatemala",
      "1990-05-12",
      "Penicilina"
    ]
  );
  const p2 = await runQuery(
    `INSERT INTO pacientes (nombre, dpi, telefono, email, direccion, fecha_nacimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "Juan Rodríguez",
      "2345678901212",
      "5555-2002",
      null,
      "Mixco",
      "1985-11-03"
    ]
  );

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(9, 0, 0, 0);
  const fechaCita = manana.toISOString().slice(0, 16);

  await runQuery(
    `INSERT INTO citas (paciente_id, medico_id, fecha_hora, motivo, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [p1.lastID, med1.lastID, fechaCita, "Control general", "confirmada"]
  );

  const hoy = new Date().toISOString().slice(0, 10);
  await runQuery(
    `INSERT INTO consultas (paciente_id, medico_id, fecha, motivo, diagnostico, tratamiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      p2.lastID,
      med2.lastID,
      hoy,
      "Fiebre y malestar",
      "Infección viral leve",
      "Reposo, hidratación y paracetamol según indicación"
    ]
  );

  console.log("Datos de ejemplo cargados correctamente.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
