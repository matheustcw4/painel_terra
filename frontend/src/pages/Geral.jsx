import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, Users2, Briefcase, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import * as api from "../lib/api";

const NAVY = "#172944";
const NAVY_HOVER = "#3A4960";
const SAGE = "#3D7A5C";
const SAGE_DARK = "#2E5C45";
const LINE = "#E1E1E7";
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
function truncar(texto, max = 16) {
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

function CartaoDestaque({ rotulo, valor, sufixo }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-terra-navy to-terra-navy-hover p-5 text-white shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-white/70">{rotulo}</p>
      <p className="mt-1 font-display text-3xl font-semibold">
        {valor}
        {sufixo && <span className="ml-1 text-lg font-normal text-white/70">{sufixo}</span>}
      </p>
    </div>
  );
}

function Cartao({ rotulo, valor, icone: Icone }) {
  return (
    <div className="rounded-xl border border-terra-line bg-terra-surface p-4">
      <div className="flex items-center gap-1.5 text-terra-ink-muted">
        {Icone && <Icone size={13} strokeWidth={1.75} />}
        <p className="text-xs font-medium uppercase tracking-wide">{rotulo}</p>
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-terra-navy">{valor}</p>
    </div>
  );
}

function Painel({ titulo, subtitulo, children }) {
  return (
    <div className="rounded-xl border border-terra-line bg-terra-surface p-5">
      <h2 className="font-display text-sm font-semibold text-terra-navy">{titulo}</h2>
      {subtitulo && <p className="text-xs text-terra-ink-muted">{subtitulo}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TooltipCustom({ active, payload, label, sufixo = "h" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-terra-line bg-terra-surface px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-terra-navy">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono font-medium">{numeroBR(p.value)}{sufixo}</span>
        </p>
      ))}
    </div>
  );
}

export default function Geral() {
  const [inicio, setInicio] = useState(primeiroDiaDoAnoISO());
  const [fim, setFim] = useState(hojeISO());
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await api.biGeral(inicio, fim));
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

  const r = dados?.resumo;
  const dadosCategoria = r
    ? [
        { nome: "Cliente", valor: r.horas_cliente },
        { nome: "Terra - Interno", valor: r.horas_internas },
      ]
    : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-terra-line px-8 py-4">
        <h1 className="font-display text-lg font-medium text-terra-navy">Geral</h1>
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
            {/* Linha de destaque: 1 cartão grande + 3 menores */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <CartaoDestaque rotulo="Horas apontadas no período" valor={numeroBR(r?.horas_totais)} sufixo="h" />
              <Cartao rotulo="Lançamentos" valor={numeroBR(r?.lancamentos, 0)} icone={TrendingUp} />
              <Cartao rotulo="Técnicos ativos" valor={numeroBR(r?.tecnicos_ativos, 0)} icone={Users2} />
              <Cartao rotulo="Clientes atendidos" valor={numeroBR(r?.clientes_atendidos, 0)} icone={Briefcase} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Evolução mensal — área com gradiente, ocupa 2 colunas */}
              <div className="lg:col-span-2">
                <Painel titulo="Evolução mensal" subtitulo="Horas apontadas por mês, no período">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dados?.evolucao_mensal || []}>
                      <defs>
                        <linearGradient id="gradEvolucao" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={NAVY} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={LINE} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: LINE }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<TooltipCustom />} />
                      <Area
                        type="monotone"
                        dataKey="horas"
                        name="Horas"
                        stroke={NAVY}
                        strokeWidth={2}
                        fill="url(#gradEvolucao)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Painel>
              </div>

              {/* Cliente vs Interno — rosca */}
              <Painel titulo="Cliente x Terra-Interno" subtitulo="Horas por categoria">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <defs>
                      <linearGradient id="gradCliente" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={SAGE} />
                        <stop offset="100%" stopColor={SAGE_DARK} />
                      </linearGradient>
                      <linearGradient id="gradInterno" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={NAVY_HOVER} />
                        <stop offset="100%" stopColor={NAVY} />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={dadosCategoria}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      <Cell fill="url(#gradCliente)" />
                      <Cell fill="url(#gradInterno)" />
                    </Pie>
                    <Tooltip content={<TooltipCustom />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 flex justify-center gap-4 text-xs text-terra-ink-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: SAGE }} /> Cliente
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: NAVY }} /> Terra-Interno
                  </span>
                </div>
              </Painel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Horas por cliente — altura acompanha a quantidade de barra,
                  não é mais fixa: com nome de cliente comprido e ~10 linhas,
                  240px fixo colidia um rótulo em cima do outro. */}
              <Painel titulo="Horas por cliente" subtitulo="Top clientes no período">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(220, (dados?.horas_por_cliente?.length || 0) * 34)}
                >
                  <BarChart data={dados?.horas_por_cliente || []} layout="vertical" margin={{ left: 8 }}>
                    <defs>
                      <linearGradient id="gradCliBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={NAVY} />
                        <stop offset="100%" stopColor={NAVY_HOVER} />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="cliente"
                      width={110}
                      tick={<TickTruncado />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="horas" name="Horas" fill="url(#gradCliBar)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Painel>

              {/* Horas por cargo — mesma correção de altura dinâmica, embora
                  aqui costume ter menos linhas que o de cliente. */}
              <Painel titulo="Horas por cargo" subtitulo="Agregado dos técnicos ativos">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(220, (dados?.por_cargo?.length || 0) * 34)}
                >
                  <BarChart data={dados?.por_cargo || []} layout="vertical" margin={{ left: 8 }}>
                    <defs>
                      <linearGradient id="gradCargoBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={SAGE} />
                        <stop offset="100%" stopColor={SAGE_DARK} />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="cargo"
                      width={110}
                      tick={<TickTruncado />}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="horas" name="Horas" fill="url(#gradCargoBar)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Painel>

              {/* Remuneração/hora — lista, não gráfico (dado sensível).
                  Pode ter 40+ técnicos — sem teto de altura, empurrava a
                  página inteira pra baixo. Agora tem altura fixa e rolagem
                  própria, do mesmo jeito que uma lista longa deveria se
                  comportar dentro de um cartão. */}
              <Painel titulo="Remuneração por hora" subtitulo="Salário ÷ horas apontadas no período">
                <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                  {(dados?.remuneracao_por_tecnico || []).map((t) => (
                    <div key={t.tecnico} className="flex items-center justify-between border-b border-terra-line pb-2 last:border-0">
                      <div>
                        <p className="text-sm text-terra-ink">{t.tecnico}</p>
                        <p className="text-xs text-terra-ink-muted">{t.cargo}</p>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-sm font-medium text-terra-sage-dark">
                        <DollarSign size={12} />
                        {numeroBR(t.remuneracao_hora, 2)}/h
                      </div>
                    </div>
                  ))}
                  {!dados?.remuneracao_por_tecnico?.length && (
                    <p className="text-sm text-terra-ink-muted">Sem dado no período.</p>
                  )}
                </div>
              </Painel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}