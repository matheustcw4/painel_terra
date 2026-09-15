"""
consultas/operacional.py — SQL direto pro banco TESTE_INTEGRACAO (erp + clockify).
Caminho separado do chat: sem MCP, sem IA envolvida — é psycopg rodando query e
devolvendo número. Mesma connection string que o chat já usa
(TESTE_INTEGRACAO_STRING), lida aqui direto, sem passar pelo npx/MCP.
"""
import os
from contextlib import contextmanager
from datetime import date

from dotenv import load_dotenv
load_dotenv()

import psycopg2
import psycopg2.extras


@contextmanager
def _conexao():
    conn = psycopg2.connect(os.environ.get("TESTE_INTEGRACAO_STRING", ""))
    try:
        yield conn
    finally:
        conn.close()


def _query(sql: str, params: dict) -> list[dict]:
    with _conexao() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]


_CTE_ENTRADAS_DEDUP = """
    entradas_dedup AS (
        SELECT DISTINCT ON (id_time_entry)
            id_time_entry, tecnico, email, cliente, categoria, billable, data_inicio,
            EXTRACT(EPOCH FROM (data_fim - hora_inicio)) / 3600.0 AS horas
        FROM clockify.time_entries
        WHERE data_inicio BETWEEN %(inicio)s AND %(fim)s
        ORDER BY id_time_entry, etiqueta
    )
"""


def resumo(inicio: date, fim: date, tecnico: str = None) -> dict:
    """KPIs gerais do período — filtro opcional por técnico."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT
            COUNT(*) AS lancamentos,
            ROUND(COALESCE(SUM(horas), 0)::numeric, 1) AS horas_totais,
            ROUND(COALESCE(SUM(horas) FILTER (WHERE billable), 0)::numeric, 1) AS horas_faturaveis,
            ROUND(COALESCE(SUM(horas) FILTER (WHERE categoria = 'Cliente'), 0)::numeric, 1) AS horas_cliente,
            ROUND(COALESCE(SUM(horas) FILTER (WHERE categoria = 'Terra - Interno'), 0)::numeric, 1) AS horas_internas,
            COUNT(DISTINCT email) AS tecnicos_ativos,
            COUNT(DISTINCT cliente) FILTER (WHERE categoria = 'Cliente') AS clientes_atendidos,
            MIN(data_inicio) AS primeiro_lancamento,
            MAX(data_inicio) AS ultimo_lancamento
        FROM entradas_dedup
        WHERE (%(tecnico)s IS NULL OR tecnico = %(tecnico)s);
    """
    linhas = _query(sql, {"inicio": inicio, "fim": fim, "tecnico": tecnico})
    return linhas[0] if linhas else {}


def evolucao_mensal(inicio: date, fim: date, tecnico: str = None) -> list[dict]:
    """Lançamentos e horas por mês — filtro opcional por técnico."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT
            TO_CHAR(data_inicio, 'YYYY-MM') AS mes,
            COUNT(*) AS lancamentos,
            ROUND(SUM(horas)::numeric, 1) AS horas
        FROM entradas_dedup
        WHERE (%(tecnico)s IS NULL OR tecnico = %(tecnico)s)
        GROUP BY 1
        ORDER BY 1;
    """
    return _query(sql, {"inicio": inicio, "fim": fim, "tecnico": tecnico})


def horas_por_tecnico(inicio: date, fim: date, limite: int = 15) -> list[dict]:
    """Ranking de horas por técnico — top N do período. Sem filtro de técnico
    de propósito: é o ranking geral, filtrar por um técnico deixaria a lista
    com uma linha só, sem função nenhuma."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT
            tecnico,
            ROUND(SUM(horas)::numeric, 1) AS horas,
            COUNT(*) AS lancamentos
        FROM entradas_dedup
        GROUP BY tecnico
        ORDER BY horas DESC
        LIMIT %(limite)s;
    """
    return _query(sql, {"inicio": inicio, "fim": fim, "limite": limite})


def horas_por_etiqueta(inicio: date, fim: date, tecnico: str = None) -> list[dict]:
    """Lançamentos e horas por etiqueta — filtro opcional por técnico. NÃO usa
    o CTE de dedup — aqui o grão entrada×etiqueta é o que se quer (uma
    entrada com 2 etiquetas conta a hora inteira nas duas)."""
    sql = """
        SELECT
            etiqueta,
            COUNT(*) AS lancamentos,
            ROUND(SUM(EXTRACT(EPOCH FROM (data_fim - hora_inicio)) / 3600.0)::numeric, 1) AS horas
        FROM clockify.time_entries
        WHERE data_inicio BETWEEN %(inicio)s AND %(fim)s
          AND (%(tecnico)s IS NULL OR tecnico = %(tecnico)s)
        GROUP BY etiqueta
        ORDER BY horas DESC;
    """
    return _query(sql, {"inicio": inicio, "fim": fim, "tecnico": tecnico})


def contratos_vigentes() -> dict:
    """Contagem de contratos por status — situação atual do cadastro."""
    sql = "SELECT status, COUNT(*) AS total FROM erp.contratos GROUP BY status ORDER BY total DESC;"
    linhas = _query(sql, {})
    return {l["status"]: l["total"] for l in linhas}


def por_cargo(inicio: date, fim: date) -> list[dict]:
    """Horas agregadas por cargo — cruza com colaboradores pelo e-mail."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT
            COALESCE(f.cargo, 'Sem função cadastrada') AS cargo,
            COUNT(DISTINCT ed.email) AS tecnicos,
            ROUND(SUM(ed.horas)::numeric, 1) AS horas,
            ROUND(AVG(ed.horas)::numeric, 1) AS media_horas_tecnico
        FROM entradas_dedup ed
        JOIN erp.colaboradores c ON ed.email = c.email
        LEFT JOIN erp.funcoes f ON c.funcao_id = f.id_funcao
        GROUP BY f.cargo
        ORDER BY horas DESC;
    """
    return _query(sql, {"inicio": inicio, "fim": fim})


def remuneracao_por_tecnico(inicio: date, fim: date) -> list[dict]:
    """Remuneração por hora = salário mensal ÷ horas apontadas no período."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT
            ed.tecnico,
            COALESCE(f.cargo, 'Sem função') AS cargo,
            ROUND(SUM(ed.horas)::numeric, 1) AS horas,
            ROUND((c.salario / NULLIF(SUM(ed.horas), 0))::numeric, 2) AS remuneracao_hora
        FROM entradas_dedup ed
        JOIN erp.colaboradores c ON ed.email = c.email
        LEFT JOIN erp.funcoes f ON c.funcao_id = f.id_funcao
        GROUP BY ed.tecnico, f.cargo, c.salario
        ORDER BY horas DESC;
    """
    return _query(sql, {"inicio": inicio, "fim": fim})


def horas_por_cliente(inicio: date, fim: date, limite: int = 10) -> list[dict]:
    """Horas por cliente — só categoria='Cliente'."""
    sql = f"""
        WITH {_CTE_ENTRADAS_DEDUP}
        SELECT cliente, ROUND(SUM(horas)::numeric, 1) AS horas, COUNT(*) AS lancamentos
        FROM entradas_dedup
        WHERE categoria = 'Cliente'
        GROUP BY cliente
        ORDER BY horas DESC
        LIMIT %(limite)s;
    """
    return _query(sql, {"inicio": inicio, "fim": fim, "limite": limite})


def horas_por_cliente_e_etiqueta(inicio: date, fim: date) -> list[dict]:
    """Horas por cliente, aberto por etiqueta dentro de cada um — pra tela de
    drill-down (expande o cliente, vê a atividade). NÃO usa o CTE de dedup,
    mesmo motivo de horas_por_etiqueta: grão entrada×etiqueta é o que se
    quer aqui, não o de entrada só. Vem achatado (uma linha por
    cliente+etiqueta); quem agrupa em hierarquia é o frontend."""
    sql = """
        SELECT
            cliente,
            etiqueta,
            ROUND(SUM(EXTRACT(EPOCH FROM (data_fim - hora_inicio)) / 3600.0)::numeric, 1) AS horas,
            COUNT(*) AS lancamentos
        FROM clockify.time_entries
        WHERE data_inicio BETWEEN %(inicio)s AND %(fim)s
          AND categoria = 'Cliente'
        GROUP BY cliente, etiqueta
        ORDER BY cliente, horas DESC;
    """
    return _query(sql, {"inicio": inicio, "fim": fim})


def tecnicos_disponiveis() -> list[str]:
    """Lista de técnicos distintos, pro filtro — sem recorte de período de
    propósito, pra sempre listar todo mundo que já apontou hora alguma vez,
    não só quem tem lançamento no período que estiver selecionado agora."""
    sql = "SELECT DISTINCT tecnico FROM clockify.time_entries WHERE tecnico IS NOT NULL ORDER BY tecnico;"
    return [r["tecnico"] for r in _query(sql, {})]