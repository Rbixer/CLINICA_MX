/** Convierte claves camelCase a snake_case para el API .NET */
function toApiBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[snake] = value;
  }
  return out;
}

function jsonBody(body: Record<string, unknown>): string {
  return JSON.stringify(toApiBody(body));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  config: {
    get: () => request<import("./types").ClinicaConfig>("/api/config"),
    update: (body: Record<string, unknown>) =>
      request<import("./types").ClinicaConfig>("/api/config", { method: "PUT", body: jsonBody(body) })
  },
  dashboard: () => request<import("./types").DashboardData>("/api/dashboard"),
  notificaciones: () =>
    request<{ total: number; items: import("./types").Notificacion[] }>("/api/notificaciones"),
  buscar: (q: string) =>
    request<{
      pacientes: { id: number; nombre: string }[];
      medicos: { id: number; nombre: string }[];
      citas: { id: number; fecha_hora: string; paciente_nombre: string }[];
    }>(`/api/buscar?q=${encodeURIComponent(q)}`),

  medicos: {
    list: (activos = true) =>
      request<import("./types").Medico[]>(`/api/medicos${activos ? "" : "?activos=0"}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").Medico>("/api/medicos", { method: "POST", body: jsonBody(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Medico>(`/api/medicos/${id}`, { method: "PUT", body: jsonBody(body) }),
    deactivate: (id: number) => request<{ ok: boolean }>(`/api/medicos/${id}`, { method: "DELETE" })
  },

  pacientes: {
    list: (params?: { q?: string; sexo?: string; conAlergias?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set("q", params.q);
      if (params?.sexo) qs.set("sexo", params.sexo);
      if (params?.conAlergias) qs.set("conAlergias", "1");
      const q = qs.toString();
      return request<import("./types").Paciente[]>(`/api/pacientes${q ? `?${q}` : ""}`);
    },
    perfil: (id: number) => request<import("./types").PacientePerfil>(`/api/pacientes/${id}/perfil`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").Paciente>("/api/pacientes", { method: "POST", body: jsonBody(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Paciente>(`/api/pacientes/${id}`, { method: "PUT", body: jsonBody(body) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/pacientes/${id}`, { method: "DELETE" }),
    uploadFoto: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Paciente>(`/api/pacientes/${id}/foto`, { method: "POST", body: jsonBody(body) })
  },

  citas: {
    list: (params?: { fecha?: string; estado?: string; pacienteId?: number }) => {
      const qs = new URLSearchParams();
      if (params?.fecha) qs.set("fecha", params.fecha);
      if (params?.estado) qs.set("estado", params.estado);
      if (params?.pacienteId) qs.set("pacienteId", String(params.pacienteId));
      const query = qs.toString();
      return request<import("./types").Cita[]>(`/api/citas${query ? `?${query}` : ""}`);
    },
    rango: (desde: string, hasta: string) =>
      request<import("./types").Cita[]>(`/api/citas/rango?desde=${desde}&hasta=${hasta}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").Cita>("/api/citas", { method: "POST", body: jsonBody(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Cita>(`/api/citas/${id}`, { method: "PATCH", body: jsonBody(body) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/citas/${id}`, { method: "DELETE" })
  },

  consultas: {
    create: (body: Record<string, unknown>) =>
      request<import("./types").Consulta>("/api/consultas", { method: "POST", body: jsonBody(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Consulta>(`/api/consultas/${id}`, { method: "PATCH", body: jsonBody(body) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/consultas/${id}`, { method: "DELETE" })
  },

  tratamientos: {
    create: (body: Record<string, unknown>) =>
      request<import("./types").Tratamiento>("/api/tratamientos", { method: "POST", body: jsonBody(body) }),
    update: (id: number, body: Record<string, unknown>) =>
      request<import("./types").Tratamiento>(`/api/tratamientos/${id}`, {
        method: "PATCH",
        body: jsonBody(body)
      }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/tratamientos/${id}`, { method: "DELETE" })
  },

  estudios: {
    upload: (pacienteId: number, body: Record<string, unknown>) =>
      request<import("./types").EstudioClinico>(`/api/pacientes/${pacienteId}/estudios`, {
        method: "POST",
        body: jsonBody(body)
      }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/estudios/${id}`, { method: "DELETE" })
  },

  recetas: {
    create: (body: Record<string, unknown>) =>
      request<import("./types").Receta>("/api/recetas", { method: "POST", body: jsonBody(body) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/recetas/${id}`, { method: "DELETE" })
  },

  ordenesLab: {
    create: (body: Record<string, unknown>) =>
      request<import("./types").OrdenLaboratorio>("/api/ordenes-laboratorio", {
        method: "POST",
        body: jsonBody(body)
      }),
    remove: (id: number) =>
      request<{ ok: boolean }>(`/api/ordenes-laboratorio/${id}`, { method: "DELETE" })
  },

  pagos: {
    list: (pacienteId?: number) =>
      request<import("./types").Pago[]>(`/api/pagos${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    create: (body: Record<string, unknown>) =>
      request<import("./types").Pago>("/api/pagos", { method: "POST", body: jsonBody(body) }),
    remove: (id: number) => request<{ ok: boolean }>(`/api/pagos/${id}`, { method: "DELETE" })
  }
};
