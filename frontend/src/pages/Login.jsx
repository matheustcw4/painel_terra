import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import marcaDagua from "../assets/marca-dagua.png";

export default function Login() {
  const { entrar } = useAuth();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(login, senha);
    } catch (e) {
      setErro(e.message || "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* painel esquerdo — o momento de marca */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-terra-navy px-16 py-14 text-white">
        <img
          src={marcaDagua}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-[-8%] w-[560px] opacity-[0.12]"
        />
        <img src={logo} alt="Terra" className="relative h-10 w-10" />

        <div className="relative max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-terra-navy-tint/70">
            Painel Terra
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.15]">
            Clima, pragas e operação, numa conversa só.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60">
            Zeus, Protector e a base operacional já conectados. Pergunta em
            português — o agente sabe em qual base procurar.
          </p>
        </div>

        <p className="relative font-mono text-xs text-white/35">
          Terra Desenvolvimento Agropecuário
        </p>
      </div>

      {/* painel direito — formulário */}
      <div className="flex items-center justify-center px-8 py-16">
        <form onSubmit={aoEnviar} className="w-full max-w-[340px]">
          <img src={logo} alt="Terra" className="h-9 w-9 lg:hidden mb-8" />
          <h2 className="font-display text-2xl font-medium text-terra-navy">
            Entrar
          </h2>
          <p className="mt-1.5 text-sm text-terra-ink-muted">
            Acesso da equipe. Fala com o administrador se não tiver login.
          </p>

          <div className="mt-8 space-y-4">
            <Campo label="Usuário">
              <input
                autoFocus
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="campo"
                placeholder="seu.usuario"
              />
            </Campo>
            <Campo label="Senha">
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="campo"
                placeholder="••••••••"
              />
            </Campo>
          </div>

          {erro && (
            <p className="mt-4 rounded-md bg-terra-brick-tint px-3 py-2 text-sm text-terra-brick">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !login || !senha}
            className="mt-7 w-full rounded-md bg-terra-navy py-2.5 text-sm font-medium text-white
                       transition-colors hover:bg-terra-navy-hover
                       disabled:opacity-40 disabled:hover:bg-terra-navy"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-terra-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
