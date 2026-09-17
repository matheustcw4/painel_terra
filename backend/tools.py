"""
ferramentas_extras.py — ferramentas que rodam DENTRO do backend, sem processo
separado nem MCP — evita o problema que o relatorios-terra teve (caminho de
executável do Windows fixo, quebrou na VPS). Portátil de propósito.
"""
from pathlib import Path
from datetime import datetime

from langchain_core.tools import tool
from openpyxl import Workbook

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
PASTA_ARQUIVOS = Path(__file__).parent / "arquivos_gerados"
PASTA_ARQUIVOS.mkdir(exist_ok=True)


@tool
def gerar_excel(titulo: str, colunas: list[str], linhas: list[list[str]]) -> str:
    """Gera um arquivo Excel (.xlsx) a partir de dados tabulares e devolve o link
    pra baixar. Use sempre que a resposta envolver uma tabela que o usuário
    provavelmente vai querer baixar ou analisar depois (lista de contratos,
    horas por técnico, comparativo de valores, etc.) — não use pra uma
    resposta de uma linha só.

    titulo: nome curto pro arquivo (ex. "Horas por contrato")
    colunas: nomes das colunas, na ordem
    linhas: cada item é uma linha; valores na MESMA ordem das colunas, todos como texto
    """
    wb = Workbook()
    ws = wb.active
    ws.title = titulo[:31]
    ws.append(colunas)
    for linha in linhas:
        ws.append(linha)

    for i, col in enumerate(colunas, 1):
        maior = max([len(str(col))] + [len(str(l[i - 1])) for l in linhas if i - 1 < len(l)])
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = min(maior + 2, 40)

    nome_arquivo = f"{titulo.lower().replace(' ', '-')}-{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    caminho = PASTA_ARQUIVOS / nome_arquivo
    wb.save(caminho)

    return f"Planilha gerada: /arquivos/{nome_arquivo}"

@tool
def gerar_pdf(titulo: str, colunas: list[str], linhas: list[list[str]], resumo: str = "") -> str:
    """Gera um relatório em PDF, com título e tabela, e devolve o link pra
    baixar. Use quando o usuário pedir um PDF explicitamente, ou quando fizer
    sentido um documento formal pra compartilhar/imprimir (diferente do Excel,
    que é mais pra continuar analisando o dado).

    titulo: título do relatório
    colunas: nomes das colunas da tabela
    linhas: cada item é uma linha; valores na MESMA ordem das colunas, como texto
    resumo: parágrafo opcional de contexto, antes da tabela — pode deixar vazio
    """
    nome_arquivo = f"{titulo.lower().replace(' ', '-')}-{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    caminho = PASTA_ARQUIVOS / nome_arquivo

    doc = SimpleDocTemplate(
        str(caminho), pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
    )
    estilos = getSampleStyleSheet()
    elementos = [Paragraph(titulo, estilos["Title"]), Spacer(1, 12)]
    if resumo:
        elementos += [Paragraph(resumo, estilos["Normal"]), Spacer(1, 16)]

    tabela = Table([colunas] + linhas, repeatRows=1)
    tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172944")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F5")]),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabela)
    doc.build(elementos)

    return f"Relatório gerado: /arquivos/{nome_arquivo}"