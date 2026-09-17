import os
import re
from datetime import datetime
from pathlib import Path
import asyncio
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from typing import Annotated
import operator
from tools import gerar_excel, gerar_pdf
from dotenv import load_dotenv
load_dotenv()

MODELO = os.environ.get("PAINEL_MODELO", "deepseek-v4-flash")
MODELO_ROTEADOR = os.environ.get("PAINEL_MODELO_ROTEADOR", "deepseek-v4-flash")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-9e884af3f17f46c2855de5bd62b91aa1")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"

BACKEND = Path(__file__).resolve().parent
CANDIDATOS_RAIZ = [BACKEND, BACKEND.parents[1]]

class State(TypedDict):
    pergunta: str
    historico: list
    resposta: Annotated[list[str], operator.add]

def _log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def _carregar_com_imports(caminho: Path, raizes: list, ja_incluidos: set = None) -> str:
    if ja_incluidos is None:
        ja_incluidos = set()
    caminho = caminho.resolve()
    if caminho in ja_incluidos or not caminho.exists():
        return ""
    ja_incluidos.add(caminho)
    texto = caminho.read_text(encoding="utf-8")
    def resolver(m):
        candidatos = [r / m.group(1) for r in raizes]
        alvo = next((c for c in candidatos if c.exists()), candidatos[0])
        return _carregar_com_imports(alvo, raizes, ja_incluidos)
    return re.sub(r"@([\w./\\-]+\.md)", resolver, texto)


def _extrair_bases_do_router(caminho_router: Path) -> dict:
    if not caminho_router or not caminho_router.exists():
        return {}
    texto = caminho_router.read_text(encoding="utf-8")
    padrao = re.compile(r"^-\s+\*\*([\w-]+)\*\*:\s*(.+?)(?=\n-\s+\*\*|\n##|\Z)", re.DOTALL | re.MULTILINE)
    return {m.group(1): m.group(2).strip() for m in padrao.finditer(texto)}


def _extrair_exemplos_do_router(caminho_router: Path) -> list:
    if not caminho_router or not caminho_router.exists():
        return []
    texto = caminho_router.read_text(encoding="utf-8")
    m_secao = re.search(r"##\s*Exemplos de roteamento\s*\n(.+?)(?=\n##|\Z)", texto, re.DOTALL)
    if not m_secao:
        return []
    exemplos = []
    for linha in m_secao.group(1).splitlines():
        m = re.match(r"-\s+(.+?)\s*→\s*(\S.*)", linha.strip())
        if m:
            exemplos.append((m.group(1).strip(), m.group(2).strip().lower()))
    return exemplos


_claude_md = next((r / "base.md" for r in CANDIDATOS_RAIZ if (r / "base.md").exists()), None)
SYSTEM_PROMPT = (
    _carregar_com_imports(_claude_md, CANDIDATOS_RAIZ) if _claude_md else
    "Responda com precisão usando as ferramentas disponíveis — base.md não foi "
    "encontrado nem em backend/ nem na raiz do projeto, prompt mínimo em uso."
)
_prompt_pluviometria = _carregar_com_imports(
    next((r / "docs/agentes/agente-pluviometria.md" for r in CANDIDATOS_RAIZ
          if (r / "docs/agentes/agente-pluviometria.md").exists()), Path("docs/agentes/agente-pluviometria.md")),
    CANDIDATOS_RAIZ,
)
_prompt_clockfy = _carregar_com_imports(
    next((r / "docs/agentes/agente-clockfy.md" for r in CANDIDATOS_RAIZ
          if (r / "docs/agentes/agente-clockfy.md").exists()), Path("docs/agentes/agente-clockfy.md")),
    CANDIDATOS_RAIZ,
)

_router_md = next((r / "router.md" for r in CANDIDATOS_RAIZ if (r / "router.md").exists()), None)
_BASES_DOCUMENTADAS = _extrair_bases_do_router(_router_md)
_EXEMPLOS_ROTEAMENTO = _extrair_exemplos_do_router(_router_md)


MCP_SERVERS = {
    "zeus": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres",
                 os.environ.get("ZEUS_CONNECTION_STRING", "")],
        "transport": "stdio",
    },
    "protector": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres",
                 os.environ.get("PROTECTOR_CONNECTION_STRING", "")],
        "transport": "stdio",
    },
    "operacional": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres",
                 os.environ.get("TESTE_INTEGRACAO_STRING", "")],
        "transport": "stdio",
    },
    "dw_plan": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres",
                 os.environ.get("DW_PLAN", "")],
        "transport": "stdio",
    },
    "relatorios-terra": {
        "command": os.environ.get("PYTHON312_PATH", r"C:\Program Files\Python312\python.exe"),
        "args": [os.environ.get("RELATORIOS_SERVER_PATH",
                                 r"C:\Workspace\Jarvs - Terra\mcp_relatorios\server.py")],
        "transport": "stdio",
    },
}

def _servidores_configurados() -> dict:
    return {
        nome: cfg for nome, cfg in MCP_SERVERS.items()
        if cfg.get("command") and all(cfg.get("args", []))
    }


def _modelo_deepseek(nome: str):
    return ChatOpenAI(model=nome, api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


async def _escolher_base(pergunta: str, nomes_configurados: list, historico: list = None) -> str:
    """Roteador — só oferece bases DOCUMENTADAS (têm bullet no router.md) E
    CONFIGURADAS (o MCP está de pé agora). 'historico' é opcional, só as
    últimas mensagens — sem isso, uma pergunta de continuação curta ("Gere",
    "sim", "e esse mês?") fica sem contexto pra classificar certo. 'fora de
    contexto' faz o agente final responder sem nenhuma ferramenta."""
    candidatas = {n: d for n, d in _BASES_DOCUMENTADAS.items() if n in nomes_configurados}
    if not candidatas:
        return "tudo"

    opcoes_validas = list(candidatas.keys()) + ["tudo", "fora de contexto"]
    descricoes = "\n".join(f"- {nome}: {desc}" for nome, desc in candidatas.items())
    exemplos_txt = ""
    if _EXEMPLOS_ROTEAMENTO:
        linhas = "\n".join(f'"{p}" -> {r}' for p, r in _EXEMPLOS_ROTEAMENTO)
        exemplos_txt = f"\n\nEXEMPLOS (pergunta -> resposta esperada):\n{linhas}"

    contexto_txt = ""
    if historico:
        recentes = historico[-4:]  # só as últimas 2 trocas — o roteador é pra ser rápido/barato, não precisa da conversa inteira
        linhas_hist = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in recentes)
        contexto_txt = (
            "\n\nCONTEXTO DA CONVERSA (mensagens recentes — use só pra entender se a "
            f"pergunta de agora é continuação de algo, NÃO classifique o contexto em si):\n{linhas_hist}"
        )

    _log(f"roteador: pergunta = {pergunta[:70]!r} | bases candidatas = {list(candidatas)}")

    modelo = _modelo_deepseek(MODELO_ROTEADOR)
    resposta = await modelo.ainvoke([
        {"role": "system", "content": (
            "Tarefa: classificar a pergunta ATUAL do usuário em UMA categoria.\n\n"
            f"CATEGORIAS VÁLIDAS (responda com exatamente uma destas palavras, "
            f"em minúsculo, nada mais): {', '.join(opcoes_validas)}\n\n"
            f"O QUE CADA BASE COBRE:\n{descricoes}\n\n"
            "REGRA: 'tudo' se a pergunta cruzar mais de uma base ou você não tiver "
            "certeza. 'fora de contexto' SÓ se a pergunta genuinamente não tiver nada "
            "a ver com nenhuma base E não for continuação de algo no contexto abaixo "
            "(matemática, conversa geral, pergunta sobre você mesmo).\n"
            "NÃO explique. NÃO escreva mais de uma palavra. Só a categoria."
            f"{exemplos_txt}"
            f"{contexto_txt}"
        )},
        {"role": "user", "content": f"PERGUNTA ATUAL: {pergunta}"},
    ])
    escolha = resposta.content.strip().lower()
    if escolha not in candidatas and escolha not in ("tudo", "fora de contexto"):
        escolha = "tudo"
    _log(f"roteador: escolheu base = {escolha!r}")
    return escolha


def _ferramentas_da_base(todas_tools, base: str):
    if base == "tudo":
        return todas_tools
    return [t for t in todas_tools
            if t.name.startswith(base + "_") or t.name.startswith("relatorios-terra_")]


_cache = {"tools": None, "nomes": []}


async def obter_ferramentas():
    if _cache["tools"] is not None:
        return _cache["tools"], _cache["nomes"]

    servidores = _servidores_configurados()
    if not servidores:
        return None, []

    client = MultiServerMCPClient(servidores, tool_name_prefix=True)
    tools = await client.get_tools()

    _cache["tools"] = tools
    _cache["nomes"] = list(servidores.keys())
    return tools, _cache["nomes"]



def _modelo_deepseek(nome: str):
    return ChatOpenAI(model=nome, api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)

MODELO = os.environ.get("PAINEL_MODELO", "deepseek-v4-flash")
def ask(ask: str, historico: list = None):
    modelo = _modelo_deepseek(MODELO)
    contexto_txt = ""
    if historico:
        recentes = historico[-4:]
        linhas_hist = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in recentes)
        contexto_txt = (
            "\n\nCONTEXTO DA CONVERSA (mensagens recentes — use pra entender se a "
            "pergunta atual é continuação de algo, tipo resposta a uma oferta de "
            "PDF/Excel que você mesmo fez antes; nesse caso, roteie pro mesmo "
            "agente do assunto anterior, não 'fora de contexto'):\n" + linhas_hist
        )

    response = modelo.invoke([
    {"role": "system", "content": """# Seu papel é decidir qual(is) subagente(s) respondem cada pergunta, antes de
                                        qualquer consulta. Não responda a pergunta aqui — APENAS identifique o(s) agente(s).
                                        
                                        ## Agentes Disponíveis
                                        
                                        - **Pluviometria**: rede de estações meteorológicas em campo (sistema Zeus)...
                                        - **Mip**: sistema de monitoramento de pragas/scouting de pragas.
                                        - **Operacional**: dados de ERP comercial/RH da própria empresa.
                                        - **Pecuário**: dados operacionais e financeiros de pecuária de corte.
                                        - **clockfy**: dados referente a horas e apontamentos de jornada e atividades diárias.
                                        
                                        ## Como decidir
                                        
                                        Identifique o contexto da pergunta e qual(is) agente(s) TÊM MAIOR PROBABILIDADE de
                                        ter a resposta.
                                        
                                        Se a pergunta tocar em só um assunto, responda SÓ o nome desse agente.
                                        Se a pergunta cruzar mais de um assunto (ex.: pergunta envolvendo chuva E gado ao
                                        mesmo tempo), responda os nomes separados por vírgula, sem espaço — exemplo:
                                        Pecuario,Pluviometria
                                        
                                        Responda SOMENTE com o(s) nome(s), nada mais — sem explicação.""" + contexto_txt},

    {"role": "user", "content": ask}
    ])
    return response

def orquestrator(state: State) -> str:
    question = state["pergunta"].lower()
    response = ask(question, state.get("historico"))
    response = response.content.lower()

    return response.strip().split(",")


async def agentPluviom(state: State) -> dict:
    todas_tools, _ = await obter_ferramentas()
    ferramentas = [t for t in todas_tools if t.name.startswith("zeus_")] + [gerar_excel] + [gerar_pdf]
    modelo = _modelo_deepseek(MODELO)
    agente_especialista = create_react_agent(modelo, ferramentas, prompt=SYSTEM_PROMPT)
    resultado = await agente_especialista.ainvoke({
        "messages": [{"role": "user", "content": state["pergunta"]}]
    })
    return {"resposta": [resultado["messages"][-1].content]}

async def agentClockfy(state: State) -> dict:
    todas_tools, _ = await obter_ferramentas()
    ferramentas = [t for t in todas_tools if t.name.startswith("operacional_")] + [gerar_excel] + [gerar_pdf]
    modelo = _modelo_deepseek(MODELO)
    agente_especialista = create_react_agent(modelo, ferramentas, prompt=SYSTEM_PROMPT)
    mensagens = (state.get("historico") or []) + [{"role": "user", "content": state["pergunta"]}]
    resultado = await agente_especialista.ainvoke({"messages": mensagens})
    return {"resposta": [resultado["messages"][-1].content]}

async def agentOperacional(state: State) -> dict:
    todas_tools, _ = await obter_ferramentas()
    ferramentas = [t for t in todas_tools if t.name.startswith("operacional_")] + [gerar_excel] + [gerar_pdf]
    modelo = _modelo_deepseek(MODELO)
    agente_especialista = create_react_agent(modelo, ferramentas, prompt=SYSTEM_PROMPT)
    mensagens = (state.get("historico") or []) + [{"role": "user", "content": state["pergunta"]}]
    resultado = await agente_especialista.ainvoke({"messages": mensagens})
    return {"resposta": [resultado["messages"][-1].content]}

graph = StateGraph(State)

graph.add_node("pluviometria", agentPluviom)
graph.add_node("clockfy", agentClockfy)
graph.add_node("operacional", agentOperacional)
graph.set_conditional_entry_point(orquestrator, ["pluviometria", "clockfy","operacional"])
graph.add_edge("pluviometria", END)
graph.add_edge("clockfy", END)
graph.add_edge("operacional", END)
agente = graph.compile()

async def perguntar_streaming(mensagem: str, historico: list):
    _log(f"chat: nova pergunta = {mensagem[:70]!r}")

    try:
        async for evento in agente.astream_events({"pergunta": mensagem, "historico": historico}, version="v2"):
            tipo = evento["event"]
            if tipo == "on_tool_start":
                entrada = evento["data"].get("input", {})
                _log(f"chat: chamando ferramenta {evento['name']} | entrada: {entrada}")
                yield f"\x00FERRAMENTA:{evento['name']}\x00"
            elif tipo == "on_tool_end":
                _log(f"chat: ferramenta {evento['name']} terminou")
            elif tipo == "on_chat_model_stream":
                chunk = evento["data"]["chunk"]
                texto = getattr(chunk, "content", "")
                if isinstance(texto, list):
                    texto = "".join(p.get("text", "") for p in texto if isinstance(p, dict))
                if texto:
                    yield texto
        _log("resposta: concluída")
    except Exception as e:
        _log(f"chat: ERRO — {e}")
        yield "\n\nNão consegui buscar essa informação agora. Tenta reformular a pergunta, ou tenta de novo em instantes."


# async def main():
#     todas_tools, nomes = await obter_ferramentas()
#     print("servidores realmente configurados:", nomes)
#
#     pergunta = "Qual foi o último apontamento de horas do técnico Francys ?"
#     teste = await agente.ainvoke({"pergunta": pergunta})
#     print(f"PERGUNTA: {pergunta}\nRESPOSTA: {teste['resposta']}\n")
#
# asyncio.run(main())

# todas_tools, nomes = obter_ferramentas()
# print("servidores realmente configurados:", nomes)
# pergunta = "Qual foi o último apontamento de horas do técnico Francys ?"
# teste = asyncio.run(agente.ainvoke({"pergunta": pergunta}))
#
# print(f"PERGUNTA: {pergunta}\nRESPOSTA: {teste['resposta']}\n")