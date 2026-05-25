export type EstadoCita = "pendiente" | "confirmada" | "atendida" | "cancelada" | "no_asistio";
export type EstadoTratamiento = "activo" | "completado" | "suspendido";

export interface ClinicaConfig {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
}

export interface Medico {
  id: number;
  nombre: string;
  especialidad: string;
  telefono: string | null;
  email: string | null;
  colegiado?: string | null;
  activo: number;
}

export interface Paciente {
  id: number;
  nombre: string;
  dpi: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  alergias: string | null;
  notas: string | null;
  foto: string | null;
  foto_url?: string | null;
  created_at?: string;
}

export interface Cita {
  id: number;
  paciente_id: number | null;
  medico_id: number | null;
  fecha_hora: string;
  motivo: string | null;
  estado: EstadoCita;
  notas: string | null;
  paciente_nombre?: string;
  medico_nombre?: string;
  medico_especialidad?: string;
}

export interface Consulta {
  id: number;
  paciente_id: number;
  medico_id: number | null;
  cita_id: number | null;
  fecha: string;
  motivo: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  notas: string | null;
  foto_seguimiento: string | null;
  foto_seguimiento_url?: string | null;
  foto_seguimiento_nombre_original?: string | null;
  foto_seguimiento_mime_type?: string | null;
  foto_seguimiento_tamano?: number | null;
  medico_nombre?: string;
}

export interface Tratamiento {
  id: number;
  paciente_id: number;
  medico_id: number | null;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoTratamiento;
  progreso_notas: string | null;
  medico_nombre?: string;
}

export interface EstudioClinico {
  id: number;
  paciente_id: number;
  titulo: string;
  descripcion: string | null;
  archivo: string;
  nombre_original: string | null;
  mime_type: string | null;
  fecha_estudio: string | null;
  url?: string;
}

export interface Receta {
  id: number;
  paciente_id: number;
  medico_id: number | null;
  fecha: string;
  medicamentos: string;
  indicaciones: string | null;
  medico_nombre?: string;
}

export interface OrdenLaboratorio {
  id: number;
  paciente_id: number;
  medico_id: number | null;
  fecha: string;
  estudios_solicitados: string;
  diagnostico_presuntivo: string | null;
  notas: string | null;
  medico_nombre?: string;
}

export interface Pago {
  id: number;
  paciente_id: number | null;
  concepto: string;
  monto: number;
  metodo_pago: string | null;
  referencia: string | null;
  fecha: string;
  notas: string | null;
  paciente_nombre?: string;
}

export interface PacientePerfil extends Paciente {
  citas: Cita[];
  consultas: Consulta[];
  tratamientos: Tratamiento[];
  estudios: EstudioClinico[];
  recetas: Receta[];
  ordenes: OrdenLaboratorio[];
  pagos: Pago[];
}

export interface Notificacion {
  id: string;
  tipo: "cita_hoy" | "cita_proxima" | "tratamiento";
  titulo: string;
  detalle: string;
  fecha_hora?: string;
  paciente_id: number | null;
  cita_id: number | null;
}

export interface DashboardData {
  totales: {
    pacientes: number;
    citas_hoy: number;
    ingresos_mes: number;
    proximas_citas: number;
  };
  citas_hoy: Cita[];
  chart_citas_semana: { dia: string; citas: number }[];
  chart_ingresos_mes: { mes: string; ingresos: number }[];
}
