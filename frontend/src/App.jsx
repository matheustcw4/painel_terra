import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Operacional from "./pages/Operacional";
import Geral from "./pages/Geral";
import Clientes from "./pages/Clientes";

function Protegido({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RotaLogin() {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (usuario) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<RotaLogin />} />
          <Route
            path="/"
            element={
              <Protegido>
                <Layout />
              </Protegido>
            }
          >
            <Route index element={<Navigate to="/geral" replace />} />
            <Route path="geral" element={<Geral />} />
            <Route path="operacional" element={<Operacional />} />
            <Route path="clientes" element={<Clientes />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}