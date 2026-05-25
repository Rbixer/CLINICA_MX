const { runQuery, getQuery, allQuery, ESTADOS_TRATAMIENTO } = require("./db");
const { saveBase64File, publicUrl, deleteFile, UPLOAD_ROOT } = require("./uploads");
const path = require("path");
const fs = require("fs");

function mapEstudio(row) {
  return { ...row, url: publicUrl(row.archivo) };
}

function mapPaciente(row) {
  if (!row) return row;
  return {
    ...row,
    foto_url: row.foto ? publicUrl(row.foto) : null
  };
}

function registerExtraRoutes(app, { parseId }) {
  // —— Config clínica (membrete) ——
  app.get("/api/config", async (_req, res) => {
    try {
      const cfg = await getQuery("SELECT * FROM clinica_config WHERE id = 1");
      res.json({
        ...cfg,
        logo_url: cfg?.logo_path ? publicUrl(cfg.logo_path) : null
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const { nombre, direccion, telefono, email } = req.body;
      await runQuery(
        `UPDATE clinica_config SET nombre = ?, direccion = ?, telefono = ?, email = ? WHERE id = 1`,
        [nombre?.trim() || "Clínica Integral", direccion?.trim() || null, telefono?.trim() || null, email?.trim() || null]
      );
      res.json(await getQuery("SELECT * FROM clinica_config WHERE id = 1"));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Pagos ——
  app.get("/api/pagos", async (req, res) => {
    try {
      const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
      const params = [];
      let where = "";
      if (pacienteId) {
        where = "WHERE pg.paciente_id = ?";
        params.push(pacienteId);
      }
      const rows = await allQuery(
        `
        SELECT pg.*, p.nombre AS paciente_nombre
        FROM pagos pg
        LEFT JOIN pacientes p ON p.id = pg.paciente_id
        ${where}
        ORDER BY pg.fecha DESC, pg.id DESC
        `,
        params
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pagos", async (req, res) => {
    try {
      const { pacienteId, concepto, monto, fecha, metodoPago, referencia, notas } = req.body;
      if (!concepto?.trim() || !monto || !fecha) {
        return res.status(400).json({ message: "Concepto, monto y fecha son obligatorios." });
      }
      const result = await runQuery(
        `INSERT INTO pagos (paciente_id, concepto, monto, fecha, metodo_pago, referencia, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId || null,
          concepto.trim(),
          Number(monto),
          fecha,
          metodoPago?.trim() || null,
          referencia?.trim() || null,
          notas?.trim() || null
        ]
      );
      res.status(201).json(await getQuery("SELECT * FROM pagos WHERE id = ?", [result.lastID]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/pagos/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID inválido." });
      await runQuery("DELETE FROM pagos WHERE id = ?", [id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Foto paciente ——
  app.post("/api/pacientes/:id/foto", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const { dataBase64, mimeType, nombreArchivo } = req.body;
      if (!id || !dataBase64) {
        return res.status(400).json({ message: "Archivo requerido." });
      }
      const paciente = await getQuery("SELECT foto FROM pacientes WHERE id = ?", [id]);
      if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });

      const saved = saveBase64File({
        subdir: `fotos/${id}`,
        dataBase64,
        mimeType,
        nombreArchivo
      });
      if (paciente.foto) deleteFile(paciente.foto);
      await runQuery("UPDATE pacientes SET foto = ? WHERE id = ?", [saved.relative, id]);
      const updated = await getQuery("SELECT * FROM pacientes WHERE id = ?", [id]);
      res.json(mapPaciente(updated));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  // —— Perfil completo ——
  app.get("/api/pacientes/:id/perfil", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID inválido." });
      const paciente = await getQuery("SELECT * FROM pacientes WHERE id = ?", [id]);
      if (!paciente) return res.status(404).json({ message: "Paciente no encontrado." });

      const [citas, consultas, tratamientos, estudios, recetas, ordenes, pagos] = await Promise.all([
        allQuery(
          `SELECT c.*, m.nombre AS medico_nombre FROM citas c
           LEFT JOIN medicos m ON m.id = c.medico_id WHERE c.paciente_id = ? ORDER BY c.fecha_hora DESC`,
          [id]
        ),
        allQuery(
          `SELECT co.*, m.nombre AS medico_nombre FROM consultas co
           LEFT JOIN medicos m ON m.id = co.medico_id WHERE co.paciente_id = ? ORDER BY co.fecha DESC`,
          [id]
        ),
        allQuery(
          `SELECT t.*, m.nombre AS medico_nombre FROM tratamientos t
           LEFT JOIN medicos m ON m.id = t.medico_id WHERE t.paciente_id = ? ORDER BY t.fecha_inicio DESC`,
          [id]
        ),
        allQuery("SELECT * FROM estudios_clinicos WHERE paciente_id = ? ORDER BY COALESCE(fecha_estudio, created_at) DESC", [id]),
        allQuery(
          `SELECT r.*, m.nombre AS medico_nombre FROM recetas r
           LEFT JOIN medicos m ON m.id = r.medico_id WHERE r.paciente_id = ? ORDER BY r.fecha DESC`,
          [id]
        ),
        allQuery(
          `SELECT o.*, m.nombre AS medico_nombre FROM ordenes_laboratorio o
           LEFT JOIN medicos m ON m.id = o.medico_id WHERE o.paciente_id = ? ORDER BY o.fecha DESC`,
          [id]
        ),
        allQuery("SELECT * FROM pagos WHERE paciente_id = ? ORDER BY fecha DESC", [id])
      ]);

      res.json({
        ...mapPaciente(paciente),
        citas,
        consultas,
        tratamientos,
        estudios: estudios.map(mapEstudio),
        recetas,
        ordenes,
        pagos
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Tratamientos ——
  app.get("/api/tratamientos", async (req, res) => {
    try {
      const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
      const estado = req.query.estado;
      const conditions = [];
      const params = [];
      if (pacienteId) {
        conditions.push("t.paciente_id = ?");
        params.push(pacienteId);
      }
      if (estado) {
        conditions.push("t.estado = ?");
        params.push(estado);
      }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      res.json(
        await allQuery(
          `SELECT t.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
           FROM tratamientos t
           JOIN pacientes p ON p.id = t.paciente_id
           LEFT JOIN medicos m ON m.id = t.medico_id
           ${where} ORDER BY t.fecha_inicio DESC`,
          params
        )
      );
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tratamientos", async (req, res) => {
    try {
      const { pacienteId, medicoId, nombre, descripcion, fechaInicio, fechaFin, estado, progresoNotas } = req.body;
      if (!pacienteId || !nombre?.trim() || !fechaInicio) {
        return res.status(400).json({ message: "Paciente, nombre y fecha de inicio son obligatorios." });
      }
      if (estado && !ESTADOS_TRATAMIENTO.includes(estado)) {
        return res.status(400).json({ message: "Estado no válido." });
      }
      const result = await runQuery(
        `INSERT INTO tratamientos (paciente_id, medico_id, nombre, descripcion, fecha_inicio, fecha_fin, estado, progreso_notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId,
          medicoId || null,
          nombre.trim(),
          descripcion?.trim() || null,
          fechaInicio,
          fechaFin || null,
          estado || "activo",
          progresoNotas?.trim() || null
        ]
      );
      res.status(201).json(await getQuery("SELECT * FROM tratamientos WHERE id = ?", [result.lastID]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tratamientos/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const ex = await getQuery("SELECT * FROM tratamientos WHERE id = ?", [id]);
      if (!ex) return res.status(404).json({ message: "No encontrado." });
      const { nombre, descripcion, fechaFin, estado, progresoNotas, medicoId } = req.body;
      await runQuery(
        `UPDATE tratamientos SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
         fecha_fin = COALESCE(?, fecha_fin), estado = COALESCE(?, estado),
         progreso_notas = COALESCE(?, progreso_notas), medico_id = COALESCE(?, medico_id) WHERE id = ?`,
        [
          nombre?.trim(),
          descripcion !== undefined ? descripcion?.trim() || null : ex.descripcion,
          fechaFin !== undefined ? fechaFin : ex.fecha_fin,
          estado ?? ex.estado,
          progresoNotas !== undefined ? progresoNotas?.trim() || null : ex.progreso_notas,
          medicoId !== undefined ? medicoId || null : ex.medico_id,
          id
        ]
      );
      res.json(await getQuery("SELECT * FROM tratamientos WHERE id = ?", [id]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tratamientos/:id", async (req, res) => {
    try {
      await runQuery("DELETE FROM tratamientos WHERE id = ?", [parseId(req.params.id)]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Estudios clínicos ——
  app.get("/api/pacientes/:id/estudios", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const rows = await allQuery(
        "SELECT * FROM estudios_clinicos WHERE paciente_id = ? ORDER BY COALESCE(fecha_estudio, created_at) DESC",
        [id]
      );
      res.json(rows.map(mapEstudio));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pacientes/:id/estudios", async (req, res) => {
    try {
      const pacienteId = parseId(req.params.id);
      const { titulo, descripcion, fechaEstudio, dataBase64, mimeType, nombreArchivo } = req.body;
      if (!pacienteId || !titulo?.trim() || !dataBase64) {
        return res.status(400).json({ message: "Título y archivo son obligatorios." });
      }
      const saved = saveBase64File({
        subdir: `estudios/${pacienteId}`,
        dataBase64,
        mimeType,
        nombreArchivo
      });
      const result = await runQuery(
        `INSERT INTO estudios_clinicos (paciente_id, titulo, descripcion, archivo, nombre_original, mime_type, tamano, fecha_estudio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId,
          titulo.trim(),
          descripcion?.trim() || null,
          saved.relative,
          nombreArchivo || saved.name,
          saved.mime,
          saved.size,
          fechaEstudio || null
        ]
      );
      const row = await getQuery("SELECT * FROM estudios_clinicos WHERE id = ?", [result.lastID]);
      res.status(201).json(mapEstudio(row));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/estudios/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const row = await getQuery("SELECT archivo FROM estudios_clinicos WHERE id = ?", [id]);
      if (row?.archivo) deleteFile(row.archivo);
      await runQuery("DELETE FROM estudios_clinicos WHERE id = ?", [id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Recetas ——
  app.get("/api/recetas", async (req, res) => {
    try {
      const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
      const params = [];
      let where = "";
      if (pacienteId) {
        where = "WHERE r.paciente_id = ?";
        params.push(pacienteId);
      }
      res.json(
        await allQuery(
          `SELECT r.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
           FROM recetas r JOIN pacientes p ON p.id = r.paciente_id
           LEFT JOIN medicos m ON m.id = r.medico_id ${where} ORDER BY r.fecha DESC`,
          params
        )
      );
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/recetas", async (req, res) => {
    try {
      const { pacienteId, medicoId, fecha, medicamentos, indicaciones } = req.body;
      if (!pacienteId || !fecha || !medicamentos?.trim()) {
        return res.status(400).json({ message: "Paciente, fecha y medicamentos son obligatorios." });
      }
      const result = await runQuery(
        `INSERT INTO recetas (paciente_id, medico_id, fecha, medicamentos, indicaciones)
         VALUES (?, ?, ?, ?, ?)`,
        [pacienteId, medicoId || null, fecha, medicamentos.trim(), indicaciones?.trim() || null]
      );
      res.status(201).json(await getQuery("SELECT * FROM recetas WHERE id = ?", [result.lastID]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/recetas/:id", async (req, res) => {
    try {
      await runQuery("DELETE FROM recetas WHERE id = ?", [parseId(req.params.id)]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Órdenes laboratorio ——
  app.get("/api/ordenes-laboratorio", async (req, res) => {
    try {
      const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
      const params = [];
      let where = "";
      if (pacienteId) {
        where = "WHERE o.paciente_id = ?";
        params.push(pacienteId);
      }
      res.json(
        await allQuery(
          `SELECT o.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
           FROM ordenes_laboratorio o JOIN pacientes p ON p.id = o.paciente_id
           LEFT JOIN medicos m ON m.id = o.medico_id ${where} ORDER BY o.fecha DESC`,
          params
        )
      );
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/ordenes-laboratorio", async (req, res) => {
    try {
      const { pacienteId, medicoId, fecha, estudiosSolicitados, diagnosticoPresuntivo, notas } = req.body;
      if (!pacienteId || !fecha || !estudiosSolicitados?.trim()) {
        return res.status(400).json({ message: "Paciente, fecha y estudios solicitados son obligatorios." });
      }
      const result = await runQuery(
        `INSERT INTO ordenes_laboratorio (paciente_id, medico_id, fecha, estudios_solicitados, diagnostico_presuntivo, notas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pacienteId,
          medicoId || null,
          fecha,
          estudiosSolicitados.trim(),
          diagnosticoPresuntivo?.trim() || null,
          notas?.trim() || null
        ]
      );
      res.status(201).json(await getQuery("SELECT * FROM ordenes_laboratorio WHERE id = ?", [result.lastID]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/ordenes-laboratorio/:id", async (req, res) => {
    try {
      await runQuery("DELETE FROM ordenes_laboratorio WHERE id = ?", [parseId(req.params.id)]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // —— Citas rango (calendario) ——
  app.get("/api/citas/rango", async (req, res) => {
    try {
      const { desde, hasta } = req.query;
      if (!desde || !hasta) {
        return res.status(400).json({ message: "Parámetros desde y hasta requeridos (YYYY-MM-DD)." });
      }
      res.json(
        await allQuery(
          `
          SELECT c.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre, m.especialidad AS medico_especialidad
          FROM citas c
          JOIN pacientes p ON p.id = c.paciente_id
          LEFT JOIN medicos m ON m.id = c.medico_id
          WHERE date(c.fecha_hora) >= date(?) AND date(c.fecha_hora) <= date(?)
          ORDER BY c.fecha_hora ASC
          `,
          [desde, hasta]
        )
      );
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/consultas/:id", async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const ex = await getQuery("SELECT * FROM consultas WHERE id = ?", [id]);
      if (!ex) return res.status(404).json({ message: "No encontrada." });
      const { motivo, diagnostico, tratamiento, notas, medicoId } = req.body;
      await runQuery(
        `UPDATE consultas SET motivo = COALESCE(?, motivo), diagnostico = COALESCE(?, diagnostico),
         tratamiento = COALESCE(?, tratamiento), notas = COALESCE(?, notas),
         medico_id = COALESCE(?, medico_id) WHERE id = ?`,
        [
          motivo !== undefined ? motivo?.trim() || null : ex.motivo,
          diagnostico !== undefined ? diagnostico?.trim() || null : ex.diagnostico,
          tratamiento !== undefined ? tratamiento?.trim() || null : ex.tratamiento,
          notas !== undefined ? notas?.trim() || null : ex.notas,
          medicoId !== undefined ? medicoId || null : ex.medico_id,
          id
        ]
      );
      res.json(await getQuery("SELECT * FROM consultas WHERE id = ?", [id]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/consultas/:id", async (req, res) => {
    try {
      await runQuery("DELETE FROM consultas WHERE id = ?", [parseId(req.params.id)]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
}

module.exports = { registerExtraRoutes, mapPaciente };
