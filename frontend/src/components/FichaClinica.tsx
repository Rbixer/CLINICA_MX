import type { ClinicaConfig, Consulta, Paciente } from "../types";
import { calcularEdad, formatFechaLarga } from "../utils/edad";
import { formatFecha } from "../utils/format";

type PacienteFicha = Pick<
  Paciente,
  | "id"
  | "nombre"
  | "dpi"
  | "telefono"
  | "email"
  | "direccion"
  | "fecha_nacimiento"
  | "sexo"
  | "alergias"
  | "notas"
  | "foto_url"
>;

export default function FichaClinica({
  cfg,
  paciente,
  consultas
}: {
  cfg: ClinicaConfig | null;
  paciente: PacienteFicha;
  consultas: Consulta[];
}) {
  const folio = `EXP-${String(paciente.id).padStart(5, "0")}-${new Date().getFullYear()}`;
  const emitido = formatFechaLarga(new Date().toISOString().slice(0, 10));

  return (
    <article
      id="ficha-clinica-print"
      className="ficha-clinica mx-auto max-w-4xl border border-slate-300 bg-white shadow-sm print:shadow-none print:border-black"
    >
      <header className="border-b-2 border-slate-800 px-6 py-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Documento clínico confidencial
        </p>
        <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
          {cfg?.nombre || "Clínica Integral"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {[cfg?.direccion, cfg?.telefono, cfg?.email].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mx-auto mt-4 max-w-md border-y border-slate-800 py-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Ficha clínica</h3>
          <p className="text-xs text-slate-600">Historia clínica integral del paciente</p>
        </div>
        <div className="mt-3 flex justify-center gap-8 text-xs text-slate-600">
          <span>
            <strong>Folio:</strong> {folio}
          </span>
          <span>
            <strong>Emisión:</strong> {emitido}
          </span>
        </div>
      </header>

      <section className="border-b border-slate-200 px-6 py-4">
        <h4 className="ficha-seccion-titulo">I. Datos de identificación del paciente</h4>
        <div className="mt-3 flex items-start gap-4">
          <table className="w-full flex-1 border-collapse text-sm">
            <tbody>
              <Fila label="Nombre completo" value={paciente.nombre} colSpan={3} />
              <tr className="border border-slate-200">
                <th className="ficha-th">No. identificación (DPI)</th>
                <td className="ficha-td">{paciente.dpi}</td>
                <th className="ficha-th">Teléfono</th>
                <td className="ficha-td">{paciente.telefono}</td>
              </tr>
              <tr className="border border-slate-200">
                <th className="ficha-th">Correo</th>
                <td className="ficha-td">{paciente.email || "—"}</td>
                <th className="ficha-th">Sexo</th>
                <td className="ficha-td">
                  {paciente.sexo === "M" ? "Masculino" : paciente.sexo === "F" ? "Femenino" : "—"}
                </td>
              </tr>
              <Fila label="Dirección" value={paciente.direccion} colSpan={3} />
              <tr className="border border-slate-200">
                <th className="ficha-th">Fecha de nacimiento</th>
                <td className="ficha-td">{formatFecha(paciente.fecha_nacimiento || "")}</td>
                <th className="ficha-th">Edad</th>
                <td className="ficha-td">{calcularEdad(paciente.fecha_nacimiento)}</td>
              </tr>
            </tbody>
          </table>
          {paciente.foto_url ? (
            <div className="w-28 shrink-0 text-center">
              <img
                src={paciente.foto_url}
                alt={`Fotografía de ${paciente.nombre}`}
                className="h-28 w-28 rounded border border-slate-200 object-cover"
              />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fotografía</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-slate-200 px-6 py-4">
        <h4 className="ficha-seccion-titulo">II. Antecedentes y alertas médicas</h4>
        <div className="mt-3 space-y-3 text-sm">
          <CampoBloque label="Alergias conocidas" value={paciente.alergias} alerta />
          <CampoBloque label="Antecedentes / notas generales" value={paciente.notas} />
        </div>
      </section>

      <section className="px-6 py-4">
        <h4 className="ficha-seccion-titulo">III. Registro de atenciones clínicas</h4>
        {consultas.length === 0 ? (
          <p className="mt-4 text-center text-sm italic text-slate-500">
            Sin consultas registradas en el expediente.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {consultas.map((c, i) => (
              <div key={c.id} className="rounded border border-slate-300 bg-slate-50/30 p-4 print:break-inside-avoid">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-800">
                    Atención clínica No. {consultas.length - i}
                  </p>
                  <p className="text-xs text-slate-600">{formatFechaLarga(c.fecha)}</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <CampoBloque label="Motivo de consulta" value={c.motivo} />
                  <CampoBloque label="Examen físico y observaciones" value={c.notas} />
                  <CampoBloque label="Diagnóstico / impresión clínica" value={c.diagnostico} />
                  <CampoBloque label="Plan de tratamiento e indicaciones" value={c.tratamiento} />
                  {c.foto_seguimiento_url ? (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        Foto de seguimiento
                      </p>
                      <a href={c.foto_seguimiento_url} target="_blank" rel="noreferrer" className="mt-1 block">
                        <img
                          src={c.foto_seguimiento_url}
                          alt={`Foto de seguimiento ${formatFecha(c.fecha)}`}
                          className="max-h-64 rounded border border-slate-200 object-contain"
                        />
                      </a>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold uppercase">Médico tratante:</span>{" "}
                    {c.medico_nombre || "No especificado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t-2 border-slate-800 px-6 py-5">
        <p className="text-center text-[10px] leading-relaxed text-slate-500">
          Este documento forma parte del expediente clínico del paciente. La información contenida es de carácter
          confidencial y está protegida por la normativa de secreto profesional. Queda prohibida su divulgación sin
          autorización del titular o representante legal.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-12">
          <div>
            <div className="border-t border-slate-800 pt-1" />
            <p className="text-center text-xs text-slate-600">Firma y sello del médico tratante</p>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-1" />
            <p className="text-center text-xs text-slate-600">Firma del paciente o responsable</p>
          </div>
        </div>
      </footer>
    </article>
  );
}

function Fila({
  label,
  value,
  colSpan
}: {
  label: string;
  value: string | null | undefined;
  colSpan?: number;
}) {
  return (
    <tr className="border border-slate-200">
      <th className="ficha-th">{label}</th>
      <td className="ficha-td" colSpan={colSpan}>
        {value?.trim() || "—"}
      </td>
    </tr>
  );
}

function CampoBloque({
  label,
  value,
  alerta
}: {
  label: string;
  value: string | null | undefined;
  alerta?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p
        className={`mt-1 min-h-[1.25rem] whitespace-pre-wrap rounded border px-3 py-2 ${
          alerta && value?.trim()
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : "border-slate-200 bg-white text-slate-800"
        }`}
      >
        {value?.trim() || "—"}
      </p>
    </div>
  );
}
