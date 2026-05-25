import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Stethoscope,
  User,
  Users,
  X
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import { useNotificacionesEnVivo } from "../hooks/useNotificacionesEnVivo";
import type { Notificacion } from "../types";
import { formatFecha, formatHora } from "../utils/format";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/citas", label: "Agenda", icon: CalendarDays },
  { to: "/doctores", label: "Doctores", icon: Stethoscope },
  { to: "/pagos", label: "Pagos", icon: CreditCard },
  { to: "/configuracion", label: "Configuración", icon: Settings },
  { to: "/ayuda", label: "Ayuda", icon: HelpCircle }
];

const USUARIO_KEY = "clinica_usuario";

function nombreUsuario() {
  return localStorage.getItem(USUARIO_KEY) || "Admin";
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "AD";
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [usuario, setUsuario] = useState(nombreUsuario);
  const [results, setResults] = useState<{
    pacientes: { id: number; nombre: string }[];
    medicos: { id: number; nombre: string }[];
    citas: { id: number; fecha_hora: string; paciente_nombre: string }[];
  } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const irNotificacion = useCallback(
    (n: Notificacion) => {
      setNotifOpen(false);
      if (n.tipo === "tratamiento") {
        navigate("/pacientes");
        return;
      }
      if (n.paciente_id) navigate(`/pacientes/${n.paciente_id}`);
      else navigate("/citas");
    },
    [navigate]
  );

  const { notificaciones, loading: notifLoading, refrescar } = useNotificacionesEnVivo(irNotificacion);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.buscar(search.trim()).then(setResults).catch(() => setResults(null));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (results?.pacientes[0]) navigate(`/pacientes/${results.pacientes[0].id}`);
    setSearchOpen(false);
  }

  function abrirNotificaciones() {
    const next = !notifOpen;
    setNotifOpen(next);
    setUserOpen(false);
    if (next) refrescar();
  }

  function cerrarSesion() {
    if (!confirm("¿Cerrar sesión?")) return;
    toast.success("Sesión cerrada");
    setUserOpen(false);
    navigate("/");
  }

  function editarNombre() {
    const nuevo = prompt("Nombre del usuario en sesión:", usuario);
    if (nuevo?.trim()) {
      localStorage.setItem(USUARIO_KEY, nuevo.trim());
      setUsuario(nuevo.trim());
      toast.success("Nombre actualizado");
    }
    setUserOpen(false);
  }

  const badge = notificaciones.length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="text-base font-bold text-slate-900">Clínica Integral</span>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={2} />
              <span className="leading-tight">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={cerrarSesion}
          >
            <LogOut className="h-[18px] w-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div ref={searchRef} className="relative mx-auto w-full max-w-xl flex-1">
              <form onSubmit={onSearch} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Buscar pacientes, citas, doctores..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                />
              </form>
              {searchOpen && search.trim() && results ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                  {results.pacientes.length === 0 &&
                  results.medicos.length === 0 &&
                  results.citas.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-slate-500">Sin resultados</p>
                  ) : (
                    <>
                      {results.pacientes.map((p) => (
                        <button
                          key={`p-${p.id}`}
                          type="button"
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            navigate(`/pacientes/${p.id}`);
                            setSearchOpen(false);
                          }}
                        >
                          <span className="font-medium">{p.nombre}</span>
                          <span className="ml-2 text-slate-400">Paciente</span>
                        </button>
                      ))}
                      {results.citas.map((c) => (
                        <button
                          key={`c-${c.id}`}
                          type="button"
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            navigate("/citas");
                            setSearchOpen(false);
                          }}
                        >
                          <span className="font-medium">{c.paciente_nombre}</span>
                          <span className="ml-2 text-slate-400">Cita</span>
                        </button>
                      ))}
                      {results.medicos.map((m) => (
                        <button
                          key={`m-${m.id}`}
                          type="button"
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            navigate("/doctores");
                            setSearchOpen(false);
                          }}
                        >
                          <span className="font-medium">{m.nombre}</span>
                          <span className="ml-2 text-slate-400">Doctor</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  className={`relative rounded-lg p-2 transition ${
                    notifOpen ? "bg-primary-50 text-primary-600" : "text-slate-500 hover:bg-slate-100"
                  }`}
                  aria-label="Notificaciones"
                  aria-expanded={notifOpen}
                  onClick={abrirNotificaciones}
                >
                  <Bell className="h-5 w-5" />
                  {badge > 0 ? (
                    <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </button>

                {notifOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-900">Notificaciones</p>
                      <p className="text-xs text-slate-500">Citas y seguimientos pendientes</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifLoading ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500">Cargando…</p>
                      ) : notificaciones.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-500">No hay alertas por ahora.</p>
                      ) : (
                        notificaciones.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className="flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50"
                            onClick={() => irNotificacion(n)}
                          >
                            <span
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                                n.tipo === "cita_hoy"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : n.tipo === "cita_proxima"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {n.tipo === "tratamiento" ? "Tx" : "C"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-900">{n.titulo}</span>
                              <span className="block truncate text-xs text-slate-500">{n.detalle}</span>
                              {n.fecha_hora ? (
                                <span className="mt-0.5 block text-xs text-primary-600">
                                  {formatFecha(n.fecha_hora)} · {formatHora(n.fecha_hora)}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        className="w-full rounded-lg py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/citas");
                        }}
                      >
                        Ver agenda completa
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={userRef} className="relative">
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-2 transition ${
                    userOpen ? "border-primary-300 bg-primary-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                  aria-label="Menú de usuario"
                  aria-expanded={userOpen}
                  onClick={() => {
                    setUserOpen((o) => !o);
                    setNotifOpen(false);
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {iniciales(usuario)}
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-sm font-medium text-slate-700 sm:inline">
                    {usuario}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition ${userOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-900">{usuario}</p>
                      <p className="text-xs text-slate-500">Administrador del sistema</p>
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        navigate("/");
                        setUserOpen(false);
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      Dashboard
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={editarNombre}
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Cambiar nombre
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        navigate("/configuracion");
                        setUserOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Configuración
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        navigate("/ayuda");
                        setUserOpen(false);
                      }}
                    >
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      Ayuda
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                      onClick={cerrarSesion}
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
