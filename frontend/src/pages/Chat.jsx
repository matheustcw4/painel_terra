import { useEffect, useRef, useState } from "react";
import { Send, Database } from "lucide-react";
import { perguntarStreaming, status } from "../lib/api";

const NOMES_LEGIVEIS = {
  zeus: "Zeus · clima",
  protector: "Protector · pragas",
  operacional: "Operacional · horas e contratos",
  "relatorios-terra": "Gerador de PDF",
};

export default function Chat() {
  const [mensagens, setMensagens] = useState([]);
  const [entrada, setEntrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ativos, setAtivos] = useState([]);
  const fimRef = useRef(null);

  useEffect(() => {
    status().then((s) => setAtivos(s.servidores_ativos || []));
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

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
          // separa marcadores \x00FERRAMENTA:nome\x00 do texto normal
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-terra-line px-8 py-4">
        <h1 className="font-display text-lg font-medium text-terra-navy">Chat</h1>
        {ativos.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-terra-ink-muted">
            <Database size={13} strokeWidth={1.75} />
            {ativos.length} {ativos.length === 1 ? "base conectada" : "bases conectadas"}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {mensagens.length === 0 ? (
          <EstadoVazio />
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {mensagens.map((m, i) => (
              <Mensagem key={i} {...m} />
            ))}
            <div ref={fimRef} />
          </div>
        )}
      </div>

      <form onSubmit={enviar} className="border-t border-terra-line px-8 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Pergunta sobre clima, pragas, horas ou contratos..."
            className="campo"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={enviando || !entrada.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-terra-navy
                       text-white transition-colors hover:bg-terra-navy-hover
                       disabled:opacity-40 disabled:hover:bg-terra-navy"
          >
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
      </form>
    </div>
  );
}

function Mensagem({ role, content, fontes = [], erro }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg rounded-tr-sm bg-terra-navy px-4 py-2.5 text-[15px] text-white">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[85%]">
      {fontes.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {fontes.map((f) => (
            <span
              key={f}
              className="rounded-full bg-terra-sage-tint px-2.5 py-0.5 font-mono text-[11px] text-terra-sage-dark"
            >
              {NOMES_LEGIVEIS[f] || f}
            </span>
          ))}
        </div>
      )}
      <div
        className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
          erro ? "text-terra-brick" : "text-terra-ink"
        }`}
      >
        {content || <span className="text-terra-ink-muted">Pensando...</span>}
      </div>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
      <p className="font-display text-xl font-medium text-terra-navy">
        Pergunta alguma coisa
      </p>
      <p className="mt-2 text-sm text-terra-ink-muted">
        &ldquo;Quanto choveu na fazenda Dourado essa semana?&rdquo;<br />
        &ldquo;Quais talhões estão com maior infestação?&rdquo;
      </p>
    </div>
  );
}
