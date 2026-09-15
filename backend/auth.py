"""
auth.py — Login simples: usuário/senha conferidos contra usuarios.yaml (bcrypt),
sessão via JWT num cookie httpOnly. "Algo simples que dá pra controlar agora" — como
definido no PAINEL-STATUS.md. Evolui pra SSO/contas por cliente se/quando o painel for
além da equipe interna.

Nota técnica: usa o pacote `bcrypt` direto, não `passlib` — passlib.hash.bcrypt quebra
com versões atuais do bcrypt (bug conhecido, confirmado rodando aqui antes de escrever
este arquivo: passlib espera `bcrypt.__about__`, que não existe mais no pacote).
"""
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import yaml
from fastapi import Cookie, HTTPException
from jose import JWTError, jwt

CONFIG_PATH = Path(__file__).parent / "usuarios.yaml"
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGO = "HS256"
SESSAO_DIAS = 7


def _carregar_usuarios() -> dict:
    if not CONFIG_PATH.exists():
        raise RuntimeError(
            "usuarios.yaml não encontrado. Copia usuarios.example.yaml pra "
            "usuarios.yaml e roda criar_usuario.py pra trocar pelos usuários reais."
        )
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["usuarios"]


def autenticar(usuario: str, senha: str) -> str | None:
    """Confere usuário/senha. Retorna o nome de exibição se certo, None se errado."""
    usuarios = _carregar_usuarios()
    dados = usuarios.get(usuario)
    if not dados:
        return None
    if not bcrypt.checkpw(senha.encode(), dados["senha_hash"].encode()):
        return None
    return dados.get("nome", usuario)


def criar_token(usuario: str, nome: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(days=SESSAO_DIAS)
    return jwt.encode(
        {"sub": usuario, "nome": nome, "exp": expira}, JWT_SECRET, algorithm=JWT_ALGO
    )


def usuario_atual(painel_sessao: str | None = Cookie(default=None)) -> dict:
    """Dependency do FastAPI — protege qualquer rota que precisar de login."""
    if not JWT_SECRET:
        raise HTTPException(500, "JWT_SECRET não configurado no .env do backend.")
    if not painel_sessao:
        raise HTTPException(401, "Não autenticado.")
    try:
        payload = jwt.decode(painel_sessao, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError:
        raise HTTPException(401, "Sessão inválida ou expirada.")
    return {"usuario": payload["sub"], "nome": payload["nome"]}
