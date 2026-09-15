"""
exemplo_minimo.py — orquestrador escolhe UM entre dois agentes. Roda sem chave
de API (decisão por palavra-chave, só pra ver o mecanismo funcionando). Troca
a função `orquestrador` por uma chamada de LLM quando quiser testar com
pergunta ambígua de verdade.
"""
import asyncio
from typing import TypedDict
from langgraph.graph import StateGraph, END


class Estado(TypedDict):
    pergunta: str
    resposta: str


def orquestrador(estado: Estado) -> str:
    """Decide, devolvendo o NOME do nó pra onde ir — não escreve no estado,
    só aponta o caminho. Troque a lógica aqui por uma chamada de LLM quando
    quiser (mesmo padrão do _escolher_base do painel: manda a pergunta,
    pede resposta de uma palavra só)."""
    pergunta = estado["pergunta"].lower()
    if "chuva" in pergunta or "chover" in pergunta or "pluviometria" in pergunta:
        return "agentePluviometria"
    return "agenteProdutividade"


def agentePluviometria(estado: Estado) -> dict:
    """Na vida real: create_react_agent com ferramenta zeus_query."""
    return {"resposta": f"[Pluviometria] respondendo: '{estado['pergunta']}'"}


def agenteProdutividade(estado: Estado) -> dict:
    """Na vida real: create_react_agent com a ferramenta de VW_PRODUTIVIDADE_MILHO."""
    return {"resposta": f"[Produtividade] respondendo: '{estado['pergunta']}'"}


grafo = StateGraph(Estado)
grafo.add_node("agentePluviometria", agentePluviometria)
grafo.add_node("agenteProdutividade", agenteProdutividade)
grafo.set_conditional_entry_point(orquestrador, ["agentePluviometria", "agenteProdutividade"])
grafo.add_edge("agentePluviometria", END)
grafo.add_edge("agenteProdutividade", END)
agente = grafo.compile()


if __name__ == "__main__":
    for pergunta in [
        "vai chover essa semana na fazenda Dourado?",
        "qual foi a produtividade de milho na safra 23/24?",
    ]:
        resultado = asyncio.run(agente.ainvoke({"pergunta": pergunta}))
        print(f"PERGUNTA: {pergunta}\nRESPOSTA: {resultado['resposta']}\n")