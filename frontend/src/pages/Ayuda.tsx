import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/ui";

const MODULOS = [
  {
    titulo: "Gestión de pacientes",
    items: ["Registro, edición y eliminación", "Fotografía de perfil", "Filtros por nombre, DPI, sexo y alergias"],
    ruta: "/pacientes",
    pasos: "Pacientes → icono ojo = expediente completo"
  },
  {
    titulo: "Historia clínica y tratamientos",
    items: ["Consultas con motivo, diagnóstico y plan", "Seguimiento de tratamientos (activo / completado)", "PDF de historia clínica"],
    ruta: "/pacientes",
    pasos: "Expediente → pestañas Historia clínica y Tratamientos"
  },
  {
    titulo: "Estudios clínicos",
    items: ["Subir PDF e imágenes (JPG, PNG, WEBP)", "Galería por paciente"],
    ruta: "/pacientes",
    pasos: "Expediente → pestaña Estudios → Subir archivo"
  },
  {
    titulo: "Recetas médicas (PDF)",
    items: ["Crear receta con medicamentos", "Descargar PDF con membrete de la clínica"],
    ruta: "/pacientes",
    pasos: "Expediente → Recetas → Nueva receta → PDF"
  },
  {
    titulo: "Órdenes de laboratorio",
    items: ["Solicitud de estudios", "PDF membretado para laboratorio"],
    ruta: "/pacientes",
    pasos: "Expediente → Laboratorio → Nueva orden → PDF membretado"
  },
  {
    titulo: "Agenda y calendarización",
    items: ["Vista mes, semana, día y lista", "Selección de fecha con listado de pacientes", "Estados: pendiente, confirmada, atendida, etc."],
    ruta: "/citas",
    pasos: "Menú Agenda → Mes / Semana / Día / Lista"
  },
  {
    titulo: "Pagos e historial financiero",
    items: ["Registro de pagos por paciente", "Método de pago y totales", "Historial en módulo Pagos"],
    ruta: "/pagos",
    pasos: "Menú Pagos o Expediente → pestaña Pagos"
  },
  {
    titulo: "Médicos y especialidades",
    items: ["Alta y edición de doctores", "Especialidad por médico"],
    ruta: "/doctores",
    pasos: "Menú Doctores"
  },
  {
    titulo: "Panel e indicadores",
    items: ["Pacientes, citas del día, ingresos del mes", "Gráficas y citas de hoy"],
    ruta: "/",
    pasos: "Dashboard (inicio)"
  },
  {
    titulo: "Membrete (PDF)",
    items: ["Nombre, dirección y teléfono de la clínica en documentos"],
    ruta: "/configuracion",
    pasos: "Configuración → guardar datos de la clínica"
  }
];

export default function Ayuda() {
  return (
    <div>
      <PageHeader
        title="Ayuda"
        subtitle="Guía de módulos incorporados en Clínica Integral"
      />

      <Card className="mb-6 border-primary-100 bg-primary-50/40">
        <p className="text-sm text-slate-700">
          Todos los módulos solicitados están activos. El <strong>expediente del paciente</strong> concentra historia
          clínica, tratamientos, estudios, recetas, laboratorio y pagos. Acceda desde{" "}
          <Link to="/pacientes" className="font-medium text-primary-600 hover:underline">
            Pacientes
          </Link>{" "}
          con el icono de expediente (ojo).
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {MODULOS.map((m) => (
          <Card key={m.titulo}>
            <h3 className="font-semibold text-slate-900">{m.titulo}</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
              {m.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">{m.pasos}</p>
            <Link
              to={m.ruta}
              className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
            >
              Ir al módulo →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

