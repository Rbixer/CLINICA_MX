const express = require("express");
const cors = require("cors");
const path = require("path");
const { runQuery, getQuery, allQuery, ESTADOS_CITA } = require("./src/db");
const { registerExtraRoutes, mapPaciente } = require("./src/extra-routes");
const { UPLOAD_ROOT, ensureDir } = require("./src/uploads");

const app = express();
const PORT = process.env.PORT || 4100;

ensureDir(UPLOAD_ROOT);
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(UPLOAD_ROOT));

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fechaHoyGt() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, port: PORT, fecha: fechaHoyGt() });
});

// —— Dashboard ——
app.get("/api/dashboard", async (_req, res) => {
  try {
    const hoy = fechaHoyGt();
    const [pacientes, citasHoyCount, proximasCount, ingresosMes] = await Promise.all([
      getQuery("SELECT COUNT(*) AS total FROM pacientes"),
      getQuery(
        `SELECT COUNT(*) AS total FROM citas
         WHERE date(fecha_hora) = date(?) AND estado NOT IN ('cancelada')`,
        [hoy]
      ),
      getQuery(
        `SELECT COUNT(*) AS total FROM citas
         WHERE datetime(fecha_hora) >= datetime('now', 'localtime')
           AND estado NOT IN ('cancelada', 'atendida', 'no_asistio')`
      ),
      getQuery(
        `SELECT COALESCE(SUM(monto), 0) AS total FROM pagos
         WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')`
      )
    ]);

    const citasHoy = await allQuery(
      `
      SELECT c.id, c.paciente_id, c.fecha_hora, c.motivo, c.estado,
             p.nombre AS paciente_nombre,
             m.nombre AS medico_nombre
      FROM citas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN medicos m ON m.id = c.medico_id
      WHERE date(c.fecha_hora) = date(?)
        AND c.estado NOT IN ('cancelada')
      ORDER BY c.fecha_hora ASC
      `,
      [hoy]
    );

    const citasPorSemana = await allQuery(
      `
      SELECT strftime('%w', fecha_hora) AS dia, COUNT(*) AS total
      FROM citas
      WHERE date(fecha_hora) >= date('now', '-6 days', 'localtime')
        AND estado NOT IN ('cancelada')
      GROUP BY strftime('%w', fecha_hora)
      ORDER BY dia
      `
    );

    const ingresosPorMes = await allQuery(
      `
      SELECT strftime('%m', fecha) AS mes, SUM(monto) AS total
      FROM pagos
      WHERE strftime('%Y', fecha) = strftime('%Y', 'now', 'localtime')
      GROUP BY strftime('%m', fecha)
      ORDER BY mes
      `
    );

    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const mapSemana = Object.fromEntries(citasPorSemana.map((r) => [Number(r.dia), r.total]));
    const chartCitasSemana = diasSemana.map((label, i) => ({
      dia: label,
      citas: mapSemana[i] ?? 0
    }));

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const mapMes = Object.fromEntries(ingresosPorMes.map((r) => [r.mes, r.total]));
    const chartIngresosMes = meses.map((label, i) => {
      const key = String(i + 1).padStart(2, "0");
      return { mes: label, ingresos: mapMes[key] ?? 0 };
    });

    res.json({
      totales: {
        pacientes: pacientes?.total ?? 0,
        citasHoy: citasHoyCount?.total ?? 0,
        ingresosMes: ingresosMes?.total ?? 0,
        proximasCitas: proximasCount?.total ?? 0
      },
      citasHoy,
      chartCitasSemana,
      chartIngresosMes
    });
  } catch (error) {
    res.status(500).json({ message: "Error al cargar dashboard.", detail: error.message });
  }
});

app.get("/api/notificaciones", async (_req, res) => {
  try {
    const hoy = fechaHoyGt();
    const [citasHoy, proximas, tratamientosActivos] = await Promise.all([
      allQuery(
        `
        SELECT c.id, c.paciente_id, c.fecha_hora, c.estado, c.motivo,
               p.nombre AS paciente_nombre
        FROM citas c
        JOIN pacientes p ON p.id = c.paciente_id
        WHERE date(c.fecha_hora) = date(?)
          AND c.estado IN ('pendiente', 'confirmada')
        ORDER BY c.fecha_hora ASC
        LIMIT 10
        `,
        [hoy]
      ),
      allQuery(
        `
        SELECT c.id, c.paciente_id, c.fecha_hora, c.estado, c.motivo,
               p.nombre AS paciente_nombre
        FROM citas c
        JOIN pacientes p ON p.id = c.paciente_id
        WHERE datetime(c.fecha_hora) > datetime('now', 'localtime')
          AND date(c.fecha_hora) > date(?)
          AND c.estado IN ('pendiente', 'confirmada')
        ORDER BY c.fecha_hora ASC
        LIMIT 8
        `,
        [hoy]
      ),
      getQuery("SELECT COUNT(*) AS total FROM tratamientos WHERE estado = 'activo'")
    ]);

    const items = [
      ...citasHoy.map((c) => ({
        id: `hoy-${c.id}`,
        tipo: "cita_hoy",
        titulo: `Cita hoy — ${c.paciente_nombre}`,
        detalle: c.motivo || "Consulta programada",
        fecha_hora: c.fecha_hora,
        paciente_id: c.paciente_id,
        cita_id: c.id
      })),
      ...proximas.map((c) => ({
        id: `prox-${c.id}`,
        tipo: "cita_proxima",
        titulo: `Próxima cita — ${c.paciente_nombre}`,
        detalle: c.motivo || "Cita agendada",
        fecha_hora: c.fecha_hora,
        paciente_id: c.paciente_id,
        cita_id: c.id
      }))
    ];

    const activos = tratamientosActivos?.total ?? 0;
    if (activos > 0) {
      items.push({
        id: "tratamientos-activos",
        tipo: "tratamiento",
        titulo: `${activos} tratamiento${activos === 1 ? "" : "s"} activo${activos === 1 ? "" : "s"}`,
        detalle: "Revisar seguimiento en expedientes",
        paciente_id: null,
        cita_id: null
      });
    }

    res.json({ total: items.length, items });
  } catch (error) {
    res.status(500).json({ message: "Error al cargar notificaciones.", detail: error.message });
  }
});

app.get("/api/buscar", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ pacientes: [], citas: [], medicos: [] });
    const like = `%${q}%`;
    const [pacientes, medicos, citas] = await Promise.all([
      allQuery(
        `SELECT id, nombre, dpi, telefono FROM pacientes
         WHERE nombre LIKE ? OR dpi LIKE ? OR telefono LIKE ? LIMIT 8`,
        [like, like, like]
      ),
      allQuery(
        `SELECT id, nombre, especialidad FROM medicos
         WHERE activo = 1 AND (nombre LIKE ? OR especialidad LIKE ?) LIMIT 8`,
        [like, like]
      ),
      allQuery(
        `
        SELECT c.id, c.fecha_hora, p.nombre AS paciente_nombre
        FROM citas c
        JOIN pacientes p ON p.id = c.paciente_id
        WHERE p.nombre LIKE ? OR c.motivo LIKE ?
        ORDER BY c.fecha_hora DESC LIMIT 8
        `,
        [like, like]
      )
    ]);
    res.json({ pacientes, medicos, citas });
  } catch (error) {
    res.status(500).json({ message: "Error en búsqueda.", detail: error.message });
  }
});

// —— Médicos ——
app.get("/api/medicos", async (req, res) => {
  try {
    const soloActivos = req.query.activos !== "0";
    const sql = soloActivos
      ? "SELECT * FROM medicos WHERE activo = 1 ORDER BY nombre ASC"
      : "SELECT * FROM medicos ORDER BY nombre ASC";
    res.json(await allQuery(sql));
  } catch (error) {
    res.status(500).json({ message: "Error al listar médicos.", detail: error.message });
  }
});

app.post("/api/medicos", async (req, res) => {
  try {
    const { nombre, especialidad, telefono, email } = req.body;
    if (!nombre?.trim() || !especialidad?.trim()) {
      return res.status(400).json({ message: "Nombre y especialidad son obligatorios." });
    }
    const result = await runQuery(
      "INSERT INTO medicos (nombre, especialidad, telefono, email) VALUES (?, ?, ?, ?)",
      [nombre.trim(), especialidad.trim(), telefono?.trim() || null, email?.trim() || null]
    );
    const medico = await getQuery("SELECT * FROM medicos WHERE id = ?", [result.lastID]);
    res.status(201).json(medico);
  } catch (error) {
    res.status(500).json({ message: "Error al crear médico.", detail: error.message });
  }
});

app.put("/api/medicos/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const { nombre, especialidad, telefono, email, activo } = req.body;
    if (!nombre?.trim() || !especialidad?.trim()) {
      return res.status(400).json({ message: "Nombre y especialidad son obligatorios." });
    }

    const existente = await getQuery("SELECT id FROM medicos WHERE id = ?", [id]);
    if (!existente) return res.status(404).json({ message: "Médico no encontrado." });

    await runQuery(
      "UPDATE medicos SET nombre = ?, especialidad = ?, telefono = ?, email = ?, activo = ? WHERE id = ?",
      [
        nombre.trim(),
        especialidad.trim(),
        telefono?.trim() || null,
        email?.trim() || null,
        activo === false || activo === 0 ? 0 : 1,
        id
      ]
    );
    res.json(await getQuery("SELECT * FROM medicos WHERE id = ?", [id]));
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar médico.", detail: error.message });
  }
});

app.delete("/api/medicos/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });
    await runQuery("UPDATE medicos SET activo = 0 WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error al desactivar médico.", detail: error.message });
  }
});

// —— Pacientes ——
app.get("/api/pacientes", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const sexo = String(req.query.sexo || "").trim();
    const conAlergias = req.query.conAlergias === "1";
    const conditions = [];
    const params = [];

    if (q) {
      const like = `%${q}%`;
      conditions.push("(nombre LIKE ? OR dpi LIKE ? OR telefono LIKE ? OR email LIKE ?)");
      params.push(like, like, like, like);
    }
    if (sexo) {
      conditions.push("sexo = ?");
      params.push(sexo);
    }
    if (conAlergias) {
      conditions.push("alergias IS NOT NULL AND TRIM(alergias) != ''");
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await allQuery(`SELECT * FROM pacientes ${where} ORDER BY nombre ASC`, params);
    res.json(rows.map(mapPaciente));
  } catch (error) {
    res.status(500).json({ message: "Error al listar pacientes.", detail: error.message });
  }
});

app.get("/api/pacientes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });
    const paciente = await getQuery("SELECT * FROM pacientes WHERE id = ?", [id]);
    if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });

    const [citas, consultas] = await Promise.all([
      allQuery(
        `SELECT c.*, m.nombre AS medico_nombre
         FROM citas c
         LEFT JOIN medicos m ON m.id = c.medico_id
         WHERE c.paciente_id = ?
         ORDER BY c.fecha_hora DESC
         LIMIT 20`,
        [id]
      ),
      allQuery(
        `SELECT co.*, m.nombre AS medico_nombre
         FROM consultas co
         LEFT JOIN medicos m ON m.id = co.medico_id
         WHERE co.paciente_id = ?
         ORDER BY co.fecha DESC
         LIMIT 20`,
        [id]
      )
    ]);

    res.json({ ...paciente, citas, consultas });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener paciente.", detail: error.message });
  }
});

app.post("/api/pacientes", async (req, res) => {
  try {
    const { nombre, dpi, telefono, email, direccion, fechaNacimiento, sexo, alergias, notas } = req.body;
    if (!nombre?.trim() || !dpi?.trim() || !telefono?.trim()) {
      return res.status(400).json({ message: "Nombre, DPI y teléfono son obligatorios." });
    }
    const result = await runQuery(
      `INSERT INTO pacientes (nombre, dpi, telefono, email, direccion, fecha_nacimiento, sexo, alergias, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        dpi.trim(),
        telefono.trim(),
        email?.trim() || null,
        direccion?.trim() || null,
        fechaNacimiento || null,
        sexo?.trim() || null,
        alergias?.trim() || null,
        notas?.trim() || null
      ]
    );
    res.status(201).json(mapPaciente(await getQuery("SELECT * FROM pacientes WHERE id = ?", [result.lastID])));
  } catch (error) {
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ message: "Ya existe un paciente con ese DPI." });
    }
    res.status(500).json({ message: "Error al registrar paciente.", detail: error.message });
  }
});

app.put("/api/pacientes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const { nombre, dpi, telefono, email, direccion, fechaNacimiento, sexo, alergias, notas } = req.body;
    if (!nombre?.trim() || !dpi?.trim() || !telefono?.trim()) {
      return res.status(400).json({ message: "Nombre, DPI y teléfono son obligatorios." });
    }

    const existente = await getQuery("SELECT id FROM pacientes WHERE id = ?", [id]);
    if (!existente) return res.status(404).json({ message: "Paciente no encontrado." });

    await runQuery(
      `UPDATE pacientes SET nombre = ?, dpi = ?, telefono = ?, email = ?, direccion = ?,
       fecha_nacimiento = ?, sexo = ?, alergias = ?, notas = ? WHERE id = ?`,
      [
        nombre.trim(),
        dpi.trim(),
        telefono.trim(),
        email?.trim() || null,
        direccion?.trim() || null,
        fechaNacimiento || null,
        sexo?.trim() || null,
        alergias?.trim() || null,
        notas?.trim() || null,
        id
      ]
    );
    res.json(mapPaciente(await getQuery("SELECT * FROM pacientes WHERE id = ?", [id])));
  } catch (error) {
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ message: "Ya existe otro paciente con ese DPI." });
    }
    res.status(500).json({ message: "Error al actualizar paciente.", detail: error.message });
  }
});

app.delete("/api/pacientes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });
    const result = await runQuery("DELETE FROM pacientes WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ message: "Paciente no encontrado." });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar paciente.", detail: error.message });
  }
});

// —— Citas ——
app.get("/api/citas", async (req, res) => {
  try {
    const { fecha, estado, pacienteId } = req.query;
    const conditions = [];
    const params = [];

    if (fecha) {
      conditions.push("date(c.fecha_hora) = date(?)");
      params.push(fecha);
    }
    if (estado) {
      conditions.push("c.estado = ?");
      params.push(estado);
    }
    if (pacienteId) {
      conditions.push("c.paciente_id = ?");
      params.push(Number(pacienteId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await allQuery(
      `
      SELECT c.*, p.nombre AS paciente_nombre, p.telefono AS paciente_telefono,
             m.nombre AS medico_nombre, m.especialidad AS medico_especialidad
      FROM citas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN medicos m ON m.id = c.medico_id
      ${where}
      ORDER BY c.fecha_hora ASC
      `,
      params
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al listar citas.", detail: error.message });
  }
});

app.post("/api/citas", async (req, res) => {
  try {
    const { pacienteId, medicoId, fechaHora, motivo, estado, notas } = req.body;
    if (!pacienteId || !fechaHora) {
      return res.status(400).json({ message: "Paciente y fecha/hora son obligatorios." });
    }
    if (estado && !ESTADOS_CITA.includes(estado)) {
      return res.status(400).json({ message: "Estado de cita no válido." });
    }

    const paciente = await getQuery("SELECT id FROM pacientes WHERE id = ?", [pacienteId]);
    if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });

    const result = await runQuery(
      `INSERT INTO citas (paciente_id, medico_id, fecha_hora, motivo, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        pacienteId,
        medicoId || null,
        fechaHora,
        motivo?.trim() || null,
        estado || "pendiente",
        notas?.trim() || null
      ]
    );

    const cita = await getQuery(
      `
      SELECT c.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
      FROM citas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN medicos m ON m.id = c.medico_id
      WHERE c.id = ?
      `,
      [result.lastID]
    );
    res.status(201).json(cita);
  } catch (error) {
    res.status(500).json({ message: "Error al crear cita.", detail: error.message });
  }
});

app.patch("/api/citas/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const existente = await getQuery("SELECT * FROM citas WHERE id = ?", [id]);
    if (!existente) return res.status(404).json({ message: "Cita no encontrada." });

    const { medicoId, fechaHora, motivo, estado, notas } = req.body;
    if (estado && !ESTADOS_CITA.includes(estado)) {
      return res.status(400).json({ message: "Estado de cita no válido." });
    }

    await runQuery(
      `UPDATE citas SET
        medico_id = COALESCE(?, medico_id),
        fecha_hora = COALESCE(?, fecha_hora),
        motivo = COALESCE(?, motivo),
        estado = COALESCE(?, estado),
        notas = COALESCE(?, notas)
       WHERE id = ?`,
      [
        medicoId !== undefined ? medicoId || null : existente.medico_id,
        fechaHora ?? existente.fecha_hora,
        motivo !== undefined ? motivo?.trim() || null : existente.motivo,
        estado ?? existente.estado,
        notas !== undefined ? notas?.trim() || null : existente.notas,
        id
      ]
    );

    const cita = await getQuery(
      `
      SELECT c.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
      FROM citas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN medicos m ON m.id = c.medico_id
      WHERE c.id = ?
      `,
      [id]
    );
    res.json(cita);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar cita.", detail: error.message });
  }
});

app.delete("/api/citas/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });
    const result = await runQuery("DELETE FROM citas WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ message: "Cita no encontrada." });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar cita.", detail: error.message });
  }
});

// —— Consultas ——
app.get("/api/consultas", async (req, res) => {
  try {
    const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
    const params = [];
    let where = "";
    if (pacienteId) {
      where = "WHERE co.paciente_id = ?";
      params.push(pacienteId);
    }
    const rows = await allQuery(
      `
      SELECT co.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
      FROM consultas co
      JOIN pacientes p ON p.id = co.paciente_id
      LEFT JOIN medicos m ON m.id = co.medico_id
      ${where}
      ORDER BY co.fecha DESC, co.id DESC
      `,
      params
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al listar consultas.", detail: error.message });
  }
});

app.post("/api/consultas", async (req, res) => {
  try {
    const { pacienteId, medicoId, citaId, fecha, motivo, diagnostico, tratamiento, notas } = req.body;
    if (!pacienteId || !fecha) {
      return res.status(400).json({ message: "Paciente y fecha son obligatorios." });
    }

    const paciente = await getQuery("SELECT id FROM pacientes WHERE id = ?", [pacienteId]);
    if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });

    const result = await runQuery(
      `INSERT INTO consultas (paciente_id, medico_id, cita_id, fecha, motivo, diagnostico, tratamiento, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pacienteId,
        medicoId || null,
        citaId || null,
        fecha,
        motivo?.trim() || null,
        diagnostico?.trim() || null,
        tratamiento?.trim() || null,
        notas?.trim() || null
      ]
    );

    if (citaId) {
      await runQuery("UPDATE citas SET estado = 'atendida' WHERE id = ?", [citaId]);
    }

    const consulta = await getQuery(
      `
      SELECT co.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
      FROM consultas co
      JOIN pacientes p ON p.id = co.paciente_id
      LEFT JOIN medicos m ON m.id = co.medico_id
      WHERE co.id = ?
      `,
      [result.lastID]
    );
    res.status(201).json(consulta);
  } catch (error) {
    res.status(500).json({ message: "Error al registrar consulta.", detail: error.message });
  }
});

registerExtraRoutes(app, { parseId });

app.listen(PORT, () => {
  console.log(`API clínica escuchando en http://127.0.0.1:${PORT}`);
});
