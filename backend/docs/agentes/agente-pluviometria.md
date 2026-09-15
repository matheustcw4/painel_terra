# Marca TERRA Desenvolvimento Agropecuário — valores de referência

Medido em 10/08/2026 a partir de dois arquivos oficiais (`TERRA_ICONE_AZUL.png` e o papel
timbrado), via amostragem de pixel — não estimado no olho. Se a marca for atualizada, é só
repetir a mesma extração e trocar os valores abaixo (e nos dois arquivos .py que os usam).

## Cores

| Nome              | Hex       | Onde vem / onde usar |
|-------------------|-----------|------------------------|
| Azul TERRA        | `#172944` | Cor única do ícone oficial (916×916px, medição 100% pura). Logo, títulos, cabeçalho de tabela, série principal dos gráficos. |
| Cinza da marca     | `#E1E1E7` | Globo/marca d'água do papel timbrado. Só grade e linhas de apoio — baixo contraste demais pra ser cor de dado. |
| Preto da barra topo | `#121212` | Barra fina no topo do papel timbrado. Tratado como preto puro, não é uma variação do azul. |
| Tons derivados (gráfico) | `#687485` (35%), `#AEB4BE` (65%) | Interpolação matemática azul→branco, pra 2ª/3ª série em gráficos comparativos. |

O papel timbrado tem uma cor de azul quase idêntica (`#162A45`, 1 unidade de diferença por
canal) — é ruído de exportação, não uma segunda cor. Usa `#172944` como referência única.

## Contato (rodapé)

- E-mail: `contato@terradesenvolvimento.com.br`
- Telefone: `(67) 3026-3442`
- Endereço: Rua São Paulo, 1568 – Vila Gomes, CEP 79.022-140 – Campo Grande/MS
- Social: `@terradesenvolvimento` (LinkedIn/Instagram/Facebook — já embutido na imagem do cabeçalho)

## Layout medido (papel A4, 210×297mm)

- Cabeçalho: conteúdo real entre 4,9% e 13,2% da altura da página → reservado 44mm com folga.
- Rodapé: conteúdo real entre 90,6% e 95,6% da altura → reservado 34mm com folga.
- Marca d'água: bbox 49,0%–99,7% (largura) / 40,3%–89,2% (altura) do papel timbrado.

## Arquivos de imagem já prontos (`mcp_relatorios/`)

- `logo.png` — ícone isolado (916×916px, fundo transparente). Cópia direta de `TERRA_ICONE_AZUL.png`.
- `cabecalho-terra.png` — ícone + "TERRA" + subtítulo + redes sociais, recortado do papel
  timbrado oficial com fundo tornado transparente. Usado assim (imagem), não recriado em
  HTML, porque a letra do logotipo é customizada — não existe fonte pra reproduzir fiel.
- `marca-dagua-terra.png` — globo decorativo do papel timbrado, extraído isolado (só ele,
  fundo transparente), pra reusar como elemento de fundo sem carregar a folha inteira.

## Em aberto

- **Fonte oficial do corpo de texto**: não dá pra extrair de um logotipo customizado em
  raster. `template.py` está usando uma pilha sans-serif genérica até confirmar. Se
  existir manual de marca, essa é a peça que falta.
- **Ponto vermelho isolado** visto numa captura de tela do papel timbrado: 6×6px, fora da
  área real da página (na sobra de tela cortada). Tratado como artefato de captura, não
  como cor de marca — se for algo intencional, avisar pra revisar.

## Quirk técnico do WeasyPrint (não é da marca, é da ferramenta)

`position:fixed` no WeasyPrint é relativo à caixa de conteúdo (dentro da margem do
`@page`), não à borda física da folha — confirmado por teste isolado, não documentado
assim na spec. Os offsets negativos em `template.py` (`_OFFSET_*`) já compensam isso.
Se essas margens (`ALTURA_CABECALHO_MM`, `ALTURA_RODAPE_MM`, `MARGEM_LATERAL_MM`)
mudarem, os offsets recalculam sozinhos — são derivados, não hardcoded soltos.
