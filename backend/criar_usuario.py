"""criar_usuario.py — adiciona ou atualiza um usuário em usuarios.yaml com senha
hasheada de verdade (bcrypt). Rodar: python criar_usuario.py"""
import getpass
from pathlib import Path

import bcrypt
import yaml

CONFIG_PATH = Path(__file__).parent / "usuarios.yaml"


def main():
    if not CONFIG_PATH.exists():
        dados = {"usuarios": {}}
    else:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            dados = yaml.safe_load(f) or {"usuarios": {}}

    login = input("Login (sem espaço, ex: joao): ").strip()
    nome = input("Nome de exibição: ").strip()
    senha = getpass.getpass("Senha: ")

    dados.setdefault("usuarios", {})[login] = {
        "nome": nome,
        "senha_hash": bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode(),
    }

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(dados, f, allow_unicode=True)

    print(f"Usuário '{login}' salvo em {CONFIG_PATH}.")


if __name__ == "__main__":
    main()
