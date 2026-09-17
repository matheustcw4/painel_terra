import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Database } from "lucide-react";
import { perguntarStreaming, status } from "../lib/api";

const NOMES_LEGIVEIS = {
  zeus: "Zeus · clima",
  protector: "Protector · pragas",
  operacional: "Operacional · horas e contratos",
  "relatorios-terra": "Gerador de PDF",
};

function nomeLegivel(nomeFerramenta) {
  const prefixo = Object.keys(NOMES_LEGIVEIS).find(
    (p) => nomeFerramenta === p || nomeFerramenta.startsWith(p + "_")
  );
  return prefixo ? NOMES_LEGIVEIS[prefixo] : nomeFerramenta;
}

function renderizarComLinks(texto) {
  const partes = texto.split(/(\[[^\]]+\]\([^)]+\))/g);
  return partes.map((parte, i) => {
    const m = parte.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const [, rotulo, url] = m;
      return (

          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-terra-sage-dark underline hover:text-terra-sage-dark/80"
        >
          {rotulo}
        </a>
      );
    }
    return <span key={i}>{parte}</span>;
  });
}

export default function ChatFlutuante() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [entrada, setEntrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ativos, setAtivos] = useState([]);
  const fimRef = useRef(null);

  useEffect(() => {
    status().then((s) => setAtivos(s.servidores_ativos || []));
  }, []);

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  async function enviar(e) {
    e.preventDefault();
    const texto = entrada.trim();
    if (!texto || enviando) return;

    const historico = mensagens.map(({ role, content }) => ({ role, content }));
    setMensagens((m) => [...m, { role: "user", content: texto }]);
    setEntrada("");
    setEnviando(true);
    setMensagens((m) => [...m, { role: "assistant", content: "", fontes: [] }]);

    try {
      await perguntarStreaming(texto, historico, (pedaco) => {
        setMensagens((atual) => {
          const copia = [...atual];
          const ultima = { ...copia[copia.length - 1] };
          let resto = pedaco;
          const re = /\x00FERRAMENTA:([^\x00]+)\x00/g;
          let m;
          let textoLimpo = "";
          let cursor = 0;
          while ((m = re.exec(resto))) {
            textoLimpo += resto.slice(cursor, m.index);
            if (!ultima.fontes.includes(m[1])) ultima.fontes = [...ultima.fontes, m[1]];
            cursor = re.lastIndex;
          }
          textoLimpo += resto.slice(cursor);
          ultima.content += textoLimpo;
          copia[copia.length - 1] = ultima;
          return copia;
        });
      });
    } catch (err) {
      setMensagens((atual) => {
        const copia = [...atual];
        copia[copia.length - 1] = {
          ...copia[copia.length - 1],
          content: `Deu erro: ${err.message}`,
          erro: true,
        };
        return copia;
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {aberto && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[600px] max-h-[75vh] w-96 flex-col overflow-hidden rounded-xl border border-terra-line bg-terra-surface shadow-2xl">
          <header className="flex items-center justify-between border-b border-terra-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-terra-navy">Chat</h2>
            {ativos.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-terra-ink-muted">
                <Database size={11} strokeWidth={1.75} />
                {ativos.length} {ativos.length === 1 ? "base" : "bases"}
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {mensagens.length === 0 ? (
              <EstadoVazio />
            ) : (
              <div className="space-y-4">
                {mensagens.map((m, i) => (
                  <Mensagem key={i} {...m} />
                ))}
                <div ref={fimRef} />
              </div>
            )}
          </div>

          <form onSubmit={enviar} className="border-t border-terra-line px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                placeholder="Pergunta alguma coisa..."
                className="campo text-sm"
                disabled={enviando}
                autoFocus
              />
              <button
                type="submit"
                disabled={enviando || !entrada.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-terra-navy
                           text-white transition-colors hover:bg-terra-navy-hover
                           disabled:opacity-40 disabled:hover:bg-terra-navy"
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setAberto((a) => !a)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center
                   rounded-full bg-terra-navy text-white shadow-lg transition-transform
                   hover:scale-105 hover:bg-terra-navy-hover"
        title={aberto ? "Fechar chat" : "Abrir chat"}
      >
        {aberto ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}

function Mensagem({ role, content, fontes = [], erro }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-terra-navy px-3 py-2 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[90%]">
      {fontes.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {fontes.map((f) => (
            <span
              key={f}
              className="rounded-full bg-terra-sage-tint px-2 py-0.5 font-mono text-[10px] text-terra-sage-dark"
            >
              {nomeLegivel(f)}
            </span>
          ))}
        </div>
      )}
      <div
        className={`whitespace-pre-wrap text-sm leading-relaxed ${
          erro ? "text-terra-brick" : "text-terra-ink"
        }`}
      >
          {content ? renderizarComLinks(content) : <span className="text-terra-ink-muted">Pensando...</span>}
        </div>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="font-display text-base font-medium text-terra-navy">
        Pergunta alguma coisa
      </p>
      <p className="mt-1.5 text-xs text-terra-ink-muted">
        &ldquo;Quanto choveu na fazenda Dourado essa semana?&rdquo;<br />
        &ldquo;Quais talhões estão com maior infestação?&rdquo;
      </p>
    </div>
  );
}