"""
main.py — App FastAPI do painel Terra. Rodar com: uvicorn main:app --reload
"""
import os
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
load_dotenv()
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import date
from consultas import operacional as consultas_operacional
from testeGraphEnginner_2 import obter_ferramentas, perguntar_streaming
from auth import autenticar, criar_token, usuario_atual
from pathlib import Path
app = FastAPI(title="Painel Terra API")


app.mount("/arquivos", StaticFiles(directory=str(Path(__file__).resolve().parent / "arquivos_gerados")), name="arquivos")

ORIGEM_FRONTEND = os.environ.get("ORIGEM_FRONTEND", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGEM_FRONTEND],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def montar_agente_na_subida():
    # Monta o agente uma vez, na subida do servidor — não a cada pergunta.
    await obter_ferramentas()


class LoginBody(BaseModel):
    usuario: str
    senha: str


class ChatBody(BaseModel):
    mensagem: str
    historico: list[dict] = []


@app.post("/api/login")
def login(body: LoginBody, response: Response):
    nome = autenticar(body.usuario, body.senha)
    if nome is None:
        raise HTTPException(401, "Usuário ou senha incorretos.")
    token = criar_token(body.usuario, nome)
    response.set_cookie(
        "painel_sessao", token,
        httponly=True, samesite="lax", max_age=7 * 24 * 3600,
    )
    return {"nome": nome}


@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie("painel_sessao")
    return {"ok": True}


@app.get("/api/me")
def me(usuario: dict = Depends(usuario_atual)):
    return usuario


@app.get("/api/status")
async def status():
    """Quais MCPs entraram de fato — pra UI mostrar sem precisar ler o .env."""
    _, nomes = await obter_ferramentas()
    return {"servidores_ativos": nomes}


@app.post("/api/chat")
async def chat(body: ChatBody, usuario: dict = Depends(usuario_atual)):
    async def gerar():
        async for pedaco in perguntar_streaming(body.mensagem, body.historico):
            yield pedaco

    return StreamingResponse(gerar(), media_type="text/plain")


@app.get("/api/bi/operacional")
def bi_operacional(
    inicio: date, fim: date, tecnico: str | None = None,
    usuario: dict = Depends(usuario_atual),
):
    """Dados pra página Operacional. `tecnico` filtra resumo/evolução/etiqueta
    — o ranking de horas_por_tecnico fica sempre geral (filtrar ele por um
    técnico só deixaria uma linha, sem função de comparação nenhuma)."""
    return {
        "resumo": consultas_operacional.resumo(inicio, fim, tecnico),
        "evolucao_mensal": consultas_operacional.evolucao_mensal(inicio, fim, tecnico),
        "horas_por_tecnico": consultas_operacional.horas_por_tecnico(inicio, fim),
        "horas_por_etiqueta": consultas_operacional.horas_por_etiqueta(inicio, fim, tecnico),
        "contratos_vigentes": consultas_operacional.contratos_vigentes(),
        "tecnicos_disponiveis": consultas_operacional.tecnicos_disponiveis(),
    }


@app.get("/api/bi/geral")
def bi_geral(inicio: date, fim: date, usuario: dict = Depends(usuario_atual)):
    """Dados pra página Geral — visão executiva, com gráfico."""
    return {
        "resumo": consultas_operacional.resumo(inicio, fim),
        "evolucao_mensal": consultas_operacional.evolucao_mensal(inicio, fim),
        "por_cargo": consultas_operacional.por_cargo(inicio, fim),
        "remuneracao_por_tecnico": consultas_operacional.remuneracao_por_tecnico(inicio, fim),
        "horas_por_cliente": consultas_operacional.horas_por_cliente(inicio, fim),
    }


@app.get("/api/bi/clientes")
def bi_clientes(inicio: date, fim: date, usuario: dict = Depends(usuario_atual)):
    """Dados pra página Clientes — drill-down cliente → etiqueta. Vem achatado
    do banco (uma linha por cliente+etiqueta); o frontend agrupa em
    hierarquia. 'orcada_h'/'gap_h' propositalmente NÃO existem aqui — essa
    parte depende de uma planilha Google Sheets externa ao painel (ver
    PAINEL-STATUS.md), o frontend mostra essas colunas zeradas."""
    return {
        "por_cliente_e_etiqueta": consultas_operacional.horas_por_cliente_e_etiqueta(inicio, fim),
        "por_etiqueta_geral": consultas_operacional.horas_por_etiqueta(inicio, fim),
    }