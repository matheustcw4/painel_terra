import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import * as api from "../lib/api";

const NAVY = "#172944";
const NAVY_HOVER = "#3A4960";
const INK_MUTED = "#55606E";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
function primeiroDiaDoAnoISO() {
  return `${new Date().getFullYear()}-01-01`;
}
function numeroBR(valor, casas = 1) {
  if (valor === null || valor === undefined) return "—";
  return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}
function truncar(texto, max = 20) {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}
function TickTruncado({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
      {truncar(payload.value)}
    </text>
  );
}
function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-terra-line bg-terra-surface px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-terra-navy">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono font-medium">{numeroBR(p.value)}h</span>
        </p>
      ))}
    </div>
  );
}

/** Achata do backend {cliente, etiqueta, horas, lancamentos}[] pra hierarquia
 * {cliente, horas, lancamentos, etiquetas: [...]}[], ordenado por horas. */
function agruparPorCliente(linhas) {
  const mapa = new Map();
  for (const l of linhas || []) {
    if (!mapa.has(l.cliente)) {
      mapa.set(l.cliente, { cliente: l.cliente, horas: 0, lancamentos: 0, etiquetas: [] });
    }
    const c = mapa.get(l.cliente);
    c.horas += l.horas;
    c.lancamentos += l.lancamentos;
    c.etiquetas.push({ etiqueta: l.etiqueta, horas: l.horas, lancamentos: l.lancamentos });
  }
  return [...mapa.values()].sort((a, b) => b.horas - a.horas);
}

export default function Clientes() {
  const [inicio, setInicio] = useState(primeiroDiaDoAnoISO());
  const [fim, setFim] = useState(hojeISO());
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [expandidos, setExpandidos] = useState(new Set());

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await api.biClientes(inicio, fim));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientes = useMemo(
    () => agruparPorCliente(dados?.por_cliente_e_etiqueta),
    [dados]
  );

  function alternar(cliente) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      novo.has(cliente) ? novo.delete(cliente) : novo.add(cliente);
      return novo;
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-terra-line px-8 py-4">
        <h1 className="font-display text-lg font-medium text-terra-navy">Clientes</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-md border border-terra-line bg-terra-surface px-2 py-1 text-sm text-terra-ink"
          />
          <span className="text-terra-ink-muted">até</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="rounded-md border border-terra-line bg-terra-surface px-2 py-1 text-sm text-terra-ink"
          />
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 rounded-md bg-terra-navy px-3 py-1.5 text-sm text-white hover:bg-terra-navy-hover disabled:opacity-50"
          >
            <RefreshCw size={14} className={carregando ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </header>

      <div className="flex-1 px-8 py-6">
        {erro && (
          <div className="mb-4 rounded-md border border-terra-brick bg-terra-brick-tint px-4 py-3 text-sm text-terra-brick">
            {erro}
          </div>
        )}

        {!erro && (
          <>
            <div className="mb-4 flex items-start gap-2 rounded-md border border-terra-brick/40 bg-terra-brick-tint/60 px-4 py-3 text-xs text-terra-ink">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-terra-brick" />
              <p>
                <strong className="text-terra-brick">Orçada, h</strong> e{" "}
                <strong className="text-terra-brick">GAP, h</strong> aparecem zeradas de
                propósito — essa informação hoje mora numa planilha do Google Sheets,
                fora do banco que este painel consulta. Enquanto continuar lá, o painel
                não consegue mostrar esse número.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
              {/* Tabela hierárquica — 3 colunas de largura */}
              <div className="rounded-xl border border-terra-line bg-terra-surface xl:col-span-3">
                <div className="border-b border-terra-line px-5 py-3">
                  <h2 className="font-display text-sm font-semibold text-terra-navy">
                    Horas por cliente
                  </h2>
                  <p className="text-xs text-terra-ink-muted">
                    Clique num cliente pra ver as atividades
                  </p>
                </div>
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-terra-surface">
                      <tr className="border-b border-terra-line text-left text-xs uppercase tracking-wide text-terra-ink-muted">
                        <th className="px-5 py-2">Cliente / atividade</th>
                        <th className="px-2 py-2 text-right">Horas</th>
                        <th className="px-2 py-2 text-right">Orçada, h</th>
                        <th className="px-2 py-2 text-right">GAP, h</th>
                        <th className="px-5 py-2 text-right">% GAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c) => {
                        const aberto = expandidos.has(c.cliente);
                        return (
                          <>
                            <tr
                              key={c.cliente}
                              onClick={() => alternar(c.cliente)}
                              className="cursor-pointer border-b border-terra-line bg-terra-canvas/40 hover:bg-terra-canvas"
                            >
                              <td className="flex items-center gap-1.5 px-5 py-2 font-medium text-terra-navy">
                                {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {c.cliente}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-terra-navy">
                                {numeroBR(c.horas)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-terra-ink-muted">0,0</td>
                              <td className="px-2 py-2 text-right font-mono text-terra-ink-muted">0,0</td>
                              <td className="px-5 py-2 text-right font-mono text-terra-ink-muted">—</td>
                            </tr>
                            {aberto &&
                              c.etiquetas
                                .sort((a, b) => b.horas - a.horas)
                                .map((et) => (
                                  <tr key={`${c.cliente}-${et.etiqueta}`} className="border-b border-terra-line">
                                    <td className="py-1.5 pl-11 pr-5 text-terra-ink">{et.etiqueta}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-terra-ink">
                                      {numeroBR(et.horas)}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-mono text-terra-ink-muted">0,0</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-terra-ink-muted">0,0</td>
                                    <td className="px-5 py-1.5 text-right font-mono text-terra-ink-muted">—</td>
                                  </tr>
                                ))}
                          </>
                        );
                      })}
                      {!clientes.length && (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-terra-ink-muted">
                            Sem dado no período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Horas por atividade, geral — 2 colunas de largura */}
              <div className="rounded-xl border border-terra-line bg-terra-surface p-5 xl:col-span-2">
                <h2 className="font-display text-sm font-semibold text-terra-navy">
                  Horas por atividade
                </h2>
                <p className="text-xs text-terra-ink-muted">Todos os clientes, no período</p>
                <div className="mt-3">
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(300, (dados?.por_etiqueta_geral?.length || 0) * 30)}
                  >
                    <BarChart data={dados?.por_etiqueta_geral || []} layout="vertical" margin={{ left: 8 }}>
                      <defs>
                        <linearGradient id="gradEtiquetaGeral" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={NAVY} />
                          <stop offset="100%" stopColor={NAVY_HOVER} />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="etiqueta"
                        width={130}
                        tick={<TickTruncado />}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="horas" name="Horas" fill="url(#gradEtiquetaGeral)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}