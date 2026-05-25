const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "clinica.db");
const db = new sqlite3.Database(dbPath);

const ESTADOS_CITA = ["pendiente", "confirmada", "atendida", "cancelada", "no_asistio"];
const ESTADOS_TRATAMIENTO = ["activo", "completado", "suspendido"];

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS clinica_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT NOT NULL DEFAULT 'Clínica Integral',
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      logo_path TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO clinica_config (id, nombre, direccion, telefono, email)
    VALUES (1, 'Clínica Integral', 'Ciudad de Guatemala', '2222-0000', 'contacto@clinica.local')
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      especialidad TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      colegiado TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dpi TEXT NOT NULL UNIQUE,
      telefono TEXT NOT NULL,
      email TEXT,
      direccion TEXT,
      fecha_nacimiento TEXT,
      sexo TEXT,
      alergias TEXT,
      notas TEXT,
      foto TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER,
      fecha_hora TEXT NOT NULL,
      motivo TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'confirmada', 'atendida', 'cancelada', 'no_asistio')),
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER,
      concepto TEXT NOT NULL,
      monto REAL NOT NULL CHECK (monto > 0),
      metodo_pago TEXT,
      referencia TEXT,
      fecha TEXT NOT NULL,
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER,
      cita_id INTEGER,
      fecha TEXT NOT NULL,
      motivo TEXT,
      diagnostico TEXT,
      tratamiento TEXT,
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL,
      FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tratamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT,
      estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'completado', 'suspendido')),
      progreso_notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS estudios_clinicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      archivo TEXT NOT NULL,
      nombre_original TEXT,
      mime_type TEXT,
      tamano INTEGER,
      fecha_estudio TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER,
      fecha TEXT NOT NULL,
      medicamentos TEXT NOT NULL,
      indicaciones TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ordenes_laboratorio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER,
      fecha TEXT NOT NULL,
      estudios_solicitados TEXT NOT NULL,
      diagnostico_presuntivo TEXT,
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
    )
  `);

  migrateColumn("pacientes", "foto", "TEXT");
  migrateColumn("pacientes", "sexo", "TEXT");
  migrateColumn("medicos", "colegiado", "TEXT");
  migrateColumn("pagos", "metodo_pago", "TEXT");
  migrateColumn("pagos", "referencia", "TEXT");
  migrateColumn("pagos", "notas", "TEXT");
});

function migrateColumn(table, column, type) {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) return;
    if (!rows.some((r) => r.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery,
  ESTADOS_CITA,
  ESTADOS_TRATAMIENTO
};
