import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import PacientePerfil from "./pages/PacientePerfil";
import Citas from "./pages/Citas";
import Medicos from "./pages/Medicos";
import Pagos from "./pages/Pagos";
import Configuracion from "./pages/Configuracion";
import Ayuda from "./pages/Ayuda";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PacientePerfil />} />
        <Route path="citas" element={<Citas />} />
        <Route path="doctores" element={<Medicos />} />
        <Route path="medicos" element={<Medicos />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="ayuda" element={<Ayuda />} />
      </Route>
    </Routes>
  );
}
