import { createContext, useContext, useEffect, useState } from "react";
import * as api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined); // undefined = ainda checando
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.quemSou()
      .then(setUsuario)
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(login, senha) {
    const dados = await api.login(login, senha);
    setUsuario(dados);
  }

  async function sair() {
    await api.logout();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
