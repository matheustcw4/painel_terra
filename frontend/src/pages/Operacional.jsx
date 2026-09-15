import { useEffect, useState } from "react";
import { RefreshCw, Users2, Briefcase } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import * as api from "../lib/api";

const NAVY = "#172944";
const NAVY_HOVER = "#3A4960";
const SAGE = "#3D7A5C";
const SAGE_DARK = "#2E5C45";
const LINE = "#E1E1E7";
const INK_MUTED = "#55606E";
const CORES_STATUS = [NAVY, SAGE, "#C0503D", NAVY_HOVER, SAGE_DARK, "#8891A0"];

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

function Cartao({ rotulo, valor, destaque = false }) {
  return (
    <div className="rounded-lg border border-terra-line bg-terra-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-terra-ink-muted">
        {rotulo}
      </p>
      <p
        className={`mt-1 font-display text-2xl font-semibold ${
          destaque ? "text-terra-sage-dark" : "text-terra-navy"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function Bloco({ titulo, icone: Icone, subtitulo, children }) {
  return (
    <div className="rounded-lg border border-terra-line bg-terra-surface">
      <div className="flex items-center gap-2 border-b border-terra-line px-4 py-3">
        {Icone && <Icone size={16} className="text-terra-navy-muted" strokeWidth={1.75} />}
        <div>
          <h2 className="font-display text-sm font-semibold text-terra-navy">{titulo}</h2>
          {subtitulo && <p className="text-xs text-terra-ink-muted">{subtitulo}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Tabela({ colunas, linhas, chave }) {
  if (!linhas?.length) {
    return <p className="text-sm text-terra-ink-muted">Sem dado no período.</p>;
  }
  return (
    <div className="max-h-80 overflow-y-auto pr-1">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-terra-surface">
          <tr className="border-b border-terra-line text-left text-xs uppercase tracking-wide text-terra-ink-muted">
            {colunas.map((c) => (
              <th key={c.chave} className={`pb-2 ${c.numero ? "text-right" : ""}`}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={linha[chave] ?? i} className="border-b border-terra-line last:border-0">
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={`py-1.5 ${c.numero ? "text-right font-mono text-terra-navy" : "text-terra-ink"}`}
                >
                  {c.numero ? numeroBR(linha[c.chave]) : linha[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TooltipEvolucao({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-terra-line bg-terra-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-terra-navy">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}:{" "}
          <span className="font-mono font-medium">
            {numeroBR(p.value)}
            {p.name === "Horas" ? "h" : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function TooltipContratos({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = total ? ((p.value / total) * 100).toFixed(0) : 0;
  return (
    <div className="rounded-md border border-terra-line bg-terra-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-terra-navy">{p.name}</p>
      <p className="font-mono">
        {p.value} contrato{p.value === 1 ? "" : "s"} ({pct}%)
      </p>
    </div>
  );
}

export default function Operacional() {
  const [inicio, setInicio] = useState(primeiroDiaDoAnoISO());
  const [fim, setFim] = useState(hojeISO());
  const [tecnico, setTecnico] = useState("");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await api.biOperacional(inicio, fim, tecnico || undefined));
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
  const contratosEntradas = Object.entries(dados?.contratos_vigentes || {});
  const contratosTotal = contratosEntradas.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-terra-line px-8 py-4">
        <h1 className="font-display text-lg font-medium text-terra-navy">Operacional</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
            className="rounded-md border border-terra-line bg-terra-surface px-2 py-1 text-sm text-terra-ink"
          >
            <option value="">Todos os técnicos</option>
            {(dados?.tecnicos_disponiveis || []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Cartao rotulo="Lançamentos" valor={numeroBR(r?.lancamentos, 0)} />
              <Cartao rotulo="Horas totais" valor={numeroBR(r?.horas_totais)} />
              <Cartao rotulo="Horas faturáveis" valor={numeroBR(r?.horas_faturaveis)} destaque />
              <Cartao rotulo="Horas c/ cliente" valor={numeroBR(r?.horas_cliente)} />
              <Cartao rotulo="Técnicos ativos" valor={numeroBR(r?.tecnicos_ativos, 0)} />
              <Cartao rotulo="Clientes atendidos" valor={numeroBR(r?.clientes_atendidos, 0)} />
            </div>

            {/* Evolução (70%) + Contratos (30%) */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-10">
              <div className="lg:col-span-7">
                <Bloco titulo="Evolução mensal" subtitulo="Barras = horas · linha = lançamentos">
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={dados?.evolucao_mensal || []}>
                      <defs>
                        <linearGradient id="gradHorasBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={NAVY_HOVER} />
                          <stop offset="100%" stopColor={NAVY} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={LINE} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: LINE }} tickLine={false} />
                      <YAxis yAxisId="horas" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} width={40} />
                      <YAxis yAxisId="lanc" orientation="right" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<TooltipEvolucao />} />
                      <Bar yAxisId="horas" dataKey="horas" name="Horas" fill="url(#gradHorasBar)" radius={[4, 4, 0, 0]} barSize={28} />
                      <Line yAxisId="lanc" type="monotone" dataKey="lancamentos" name="Lançamentos" stroke={SAGE_DARK} strokeWidth={2} dot={{ r: 3, fill: SAGE_DARK }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Bloco>
              </div>

              <div className="lg:col-span-3">
                <Bloco titulo="Contratos por status">
                  {contratosEntradas.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie
                            data={contratosEntradas.map(([status, total]) => ({ name: status, value: total }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={75}
                            paddingAngle={2}
                          >
                            {contratosEntradas.map(([status], i) => (
                              <Cell key={status} fill={CORES_STATUS[i % CORES_STATUS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<TooltipContratos total={contratosTotal} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-terra-ink-muted">
                        {contratosEntradas.map(([status, total], i) => (
                          <span key={status} className="flex items-center gap-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: CORES_STATUS[i % CORES_STATUS.length] }}
                            />
                            {status} ({total})
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-terra-ink-muted">Sem dado.</p>
                  )}
                </Bloco>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Bloco titulo="Horas por técnico" icone={Users2}>
                <Tabela
                  chave="tecnico"
                  colunas={[
                    { chave: "tecnico", rotulo: "Técnico" },
                    { chave: "horas", rotulo: "Horas", numero: true },
                    { chave: "lancamentos", rotulo: "Lanç.", numero: true },
                  ]}
                  linhas={dados?.horas_por_tecnico}
                />
              </Bloco>

              <Bloco titulo="Horas por etiqueta" icone={Briefcase}>
                <Tabela
                  chave="etiqueta"
                  colunas={[
                    { chave: "etiqueta", rotulo: "Etiqueta" },
                    { chave: "horas", rotulo: "Horas", numero: true },
                    { chave: "lancamentos", rotulo: "Lanç.", numero: true },
                  ]}
                  linhas={dados?.horas_por_etiqueta}
                />
              </Bloco>
            </div>
          </>
        )}
      </div>
    </div>
  );
}