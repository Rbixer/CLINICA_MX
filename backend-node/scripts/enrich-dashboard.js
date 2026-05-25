const { runQuery, allQuery, getQuery } = require("../src/db");

async function enrich() {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });

  const pagos = await getQuery("SELECT COUNT(*) AS n FROM pagos");
  if ((pagos?.n ?? 0) === 0) {
    const pacientes = await allQuery("SELECT id FROM pacientes LIMIT 2");
    const montos = [450, 320, 180, 890, 210, 560, 340, 720, 410, 290];
    for (let i = 0; i < montos.length; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i * 3);
      const fecha = d.toISOString().slice(0, 10);
      await runQuery(
        "INSERT INTO pagos (paciente_id, concepto, monto, fecha) VALUES (?, ?, ?, ?)",
        [pacientes[i % pacientes.length]?.id || null, "Consulta / servicio", montos[i], fecha]
      );
    }
    console.log("Pagos de ejemplo agregados.");
  }

  const citasHoy = await getQuery(
    "SELECT COUNT(*) AS n FROM citas WHERE date(fecha_hora) = date(?)",
    [hoy]
  );
  if ((citasHoy?.n ?? 0) < 2) {
    const pacientes = await allQuery("SELECT id FROM pacientes");
    const medicos = await allQuery("SELECT id FROM medicos WHERE activo = 1");
    const horas = ["09:00", "10:30", "11:00", "14:00"];
    const motivos = ["Control general", "Seguimiento", "Primera consulta", "Urgencia leve"];
    for (let i = 0; i < horas.length && i < pacientes.length; i++) {
      await runQuery(
        `INSERT INTO citas (paciente_id, medico_id, fecha_hora, motivo, estado)
         VALUES (?, ?, ?, ?, 'confirmada')`,
        [
          pacientes[i].id,
          medicos[i % medicos.length]?.id || null,
          `${hoy}T${horas[i]}`,
          motivos[i]
        ]
      );
    }
    console.log("Citas de hoy agregadas.");
  }

  console.log("Dashboard enriquecido.");
  process.exit(0);
}

enrich().catch((e) => {
  console.error(e);
  process.exit(1);
});
