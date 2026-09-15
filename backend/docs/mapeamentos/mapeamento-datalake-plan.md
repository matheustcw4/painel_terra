# Mapeamento da base DATALAKE_PLAN

> Levantamento feito consultando `information_schema` (schemas, tabelas, colunas), contagem de linhas (`count(*)`) e amostras de dados (`LIMIT`) diretamente na conexão, em 2026-08-14. Banco **Postgres** usado como área de *staging* (prefixo `stg_`), mesmo padrão de LKS_PROTECTOR_DATABASE.

> Este documento é descritivo/de negócio. Para referência técnica pura — tabela por tabela, coluna por coluna, tipo Postgres, tamanho, nullable — ver @docs/mapeamentos/schema-datalake-plan.md.

> Para EXEMPLOS DE CONSULTAS leia atentamente a @docs/mapeamentos/queries-datalake-plan.md.

## O que é essa base

Dados **operacionais e financeiros de pecuária de corte** das fazendas atendidas pela TERRA (a consultoria/empresa dona deste workspace) — movimentação de rebanho (compra, venda, nascimento, morte, transferência, abate), rebanho médio, área de pasto, e DRE (Demonstrativo de Resultado do Exercício) por fazenda. Cada tabela `stg_f*` tem um par `stg_fmetas*` correspondente com a **meta/orçado**, permitindo comparar realizado × planejado.

## Acesso — leia isto antes de escrever qualquer query nesta base

- **Schema**: tudo fica em `DATABASE` — nome literal, não é placeholder de exemplo. `public` está vazio (diferente de LKS_PROTECTOR_DATABASE, que usa `public`). `information_schema`/`pg_catalog`/`pg_toast` são catálogo interno do Postgres, não têm dado de negócio.
  **Toda tabela citada neste documento precisa do prefixo `"DATABASE".nome_da_tabela`, com aspas duplas, sem exceção** — inclusive tabela sem exemplo de query pronta aqui.
- **Nomes de coluna com acento/maiúscula**: muitas colunas usam acento e/ou caixa mista (ex.: `"proprietÁrio"`, `"operaÇÃo"`, `"Área_pasto"`, `"cÓdigo_cliente"`, `"DATA"`) — Postgres exige aspas duplas exatas (`"proprietÁrio"`, não `proprietario` nem `PROPRIETÁRIO`). Confirme o nome exato via `information_schema.columns` antes de escrever a query, sempre que não tiver certeza.
- **Nenhuma tabela tem chave primária/estrangeira declarada** (é staging bruto de ETL) — todo cruzamento entre tabelas é por texto (`fazenda` + `"proprietÁrio"`), sensível a diferença de acentuação/caixa.
- **Colunas de identificação numérica vêm como texto com vírgula decimal brasileira** (ex.: `"cÓdigo_cliente" = "227,0"`, `"CÓDIGO PROJETO" = "227,0"`) — padrão recorrente em várias tabelas, não só nas listadas abaixo com ressalva específica. Tratar como string ou fazer replace de `,` por `.` antes de converter pra número, sempre que a coluna parecer um código numérico.
⚠️ Toda coluna numérica desta base é `double precision`, não `numeric`. `ROUND(coluna, N)`
com duas casas decimais NÃO EXISTE pra `double precision` no Postgres — só
`round(numeric, integer)`. Sempre que arredondar soma/média, converta primeiro:
`ROUND(SUM(coluna)::numeric, 2)`, nunca `ROUND(SUM(coluna), 2)` direto.
## Tabelas — dimensão / cadastro

### `stg_unidades` 
**Dimensão fazenda** — projeto, proprietário, fazenda, sistema produtivo, código do projeto, ano-base (safra/civil).
Colunas-chave: `"proprietÁrio"`, `fazenda`, `ano` (SAFRA/CÍVIL).

### `stg_area` 
Série mensal de área de pasto/ILP/total por fazenda.
Colunas-chave: `DATA`, `"Área_pasto"`, `"Área_ilp"`, `"Área_total"`, `"proprietÁrio"`, `fazenda`, `retiro`, `"cÓdigo_cliente"`, `projeto`.
⚠️ `"proprietÁrio"`/`fazenda` repete o mesmo par em várias linhas (uma por mês) — é série temporal, não catálogo; usar `stg_unidades` como dimensão única de fazenda, não esta tabela.

## Tabelas fato — movimentação de rebanho (realizado)

Todas seguem o mesmo grão (fazenda × retiro × data × categoria × sexo), com a coluna `"operaÇÃo"` marcando o tipo de evento, e compartilham o mesmo domínio de `categoria_bi` (taxonomia por idade/sexo usada nos relatórios BI):

```
BEZERRA, BEZERRO, MACHOS 8-12, MACHOS 13-24, MACHOS 25-36, MACHOS + 36,
NOVILHAS 8-12, NOVILHAS 13-24, NOVILHAS 25-36, MATRIZES, TOUROS,
TOUROS DESCARTES, VACA DESCARTE, VACA LEITEIRA, SINUELO
```

### `stg_fcompras` operação `COMPRA`
Compra de animais — traz preço (`valor_cab`, `"VALOR TOTAL"`, `valo_kg`, `valor_arroba`) e peso.

### `stg_fvendaabate` operação `ABATE`
Venda para abate — traz `rendimento` (carcaça), `peso_morto`, `faturamento`. Par de meta: `stg_fmetasabates`.

### `stg_fvendaempe` operação `EMPÉ` (venda "em pé", boi vivo)
Traz `documento`, `faturamento`. Par de meta: `stg_fmetasempe`.

### `stg_fnascimento` operação `NASCIMENTO`
Nascimentos por categoria/sexo; `peso_nasc` quase sempre nulo na amostra. Par de meta: `stg_fmetasnascimento`.

### `stg_fmortes` operação `MORTE`
Traz `causa` (DOENTE, COBRA, DESCONHECIDO...), `"LOCAL"` (número do talhão/piquete). Par de meta: `stg_fmetasmorte`.
⚠️ `peso_vivo` nesta tabela é `character varying` — diferente das outras tabelas de movimentação, onde peso costuma ser numérico. Não assumir tipo, conferir antes de usar em cálculo.
⚠️ `"LOCAL"` segue o mesmo padrão de vírgula decimal citado em "Acesso" (ex.: `"4,0"`).

### `stg_ftransfentrada` `stg_ftransfsaida`
Transferência de animais entrando / saindo da fazenda/retiro. Pares de meta: `stg_fmetastransfentrada`, `stg_fmetatransfsaida`.

### `stg_frebanhomedio` Snapshot mensal
Rebanho médio em cabeças (`qtd_cab`) e Unidade Animal (`qtd_ua`) por `grupo_categoria` (Bezerros/Jovens/Adultos). Par de meta: `stg_fmetasrebanhomedio`.

### `stg_fmovgado` Consolidada, todas as operações
Reúne todo tipo de evento (`ABATE`, `COMPRA`, `Consumo/Doação`, `DESMAME`, `EMPÉ`, `MORTE`, `Mud. de Categoria`, `NASCIMENTO`, `Saldo Anterior`, `Transf. Entrada`, `Transf. Saida`) numa view só. **Ponto de partida preferencial** pra pergunta tipo "quantos animais entraram/saíram", sem precisar unir as tabelas específicas acima. Não existe `stg_fmetasmovgado` (meta consolidada) — pra comparar com meta, usar a tabela específica do evento.

## financeiro (DRE)

### `stg_fdre`
**Tabela fato principal do financeiro** — lançamentos de DRE por fazenda: `centro_de_custo`/`sub_centro`, `valor`, `"operaÇÃo"`, `desembolso`, `custeio`, `tipo_custeio` (ex. "CV" = custo variável), `data_pag`. Par de meta: `stg_fmetasdre`.

⚠️ **`"operaÇÃo"` só teve o valor `"D"` (débito/despesa) nas amostras observadas** — não foi possível confirmar o código de crédito/receita sem uma varredura maior. Não assumir que existe um "C", não inventar o valor.

⚠️ **`centro_de_custo_bi` tem duplicidade de grafia**: `"Soja"` e `"SOJA"`, `"Receitas outros"` e `"Receitas Outros"` são valores DISTINTOS que representam a mesma categoria de negócio. Sempre agrupar com `UPPER(TRIM(...))` ao somar por centro de custo, senão a soma fica dividida entre as duas grafias.

⚠️ **`data_pag` tem formatos de data inconsistentes na mesma coluna** (`character varying`, não é `date`): já observado `"2026/01/01"`, `"01/08/2025"` (DD/MM/AAAA), `"07/2026"` (só mês/ano), e até `"1938/04/06 18:14:24.000"` (lixo de parsing de planilha). **Nunca usar `MIN`/`MAX`/`ORDER BY` direto em `data_pag` sem normalizar antes** — o resultado sai errado silenciosamente (ordenação lexicográfica de texto, não de data).

Domínio de `centro_de_custo_bi` observado (39 valores): categorias de despesa/receita de rebanho (`Insumos do rebanho`, `Rebanho`, `Mão de Obra Permanente Rebanho`...), de lavoura (`Milho Safrinha`, `Sorgo Grão`, `Silagem de Milho`...), estrutura (`Manutenção da fazenda`, `Investimentos em infraestrutura`) e financeiro puro (`Aporte de capital`, `Dividendos`, `Financiamentos créditos/débitos`, `Empréstimos sócios crédito/débito`, `Receitas financeiras`).

## Tabelas fato — metas/orçado (espelho de cada tabela acima)

Mesma estrutura das tabelas realizadas, prefixo `stg_fmetas*`:

| Tabela meta | Linhas | Espelha |
|---|---|---|
| `stg_fmetasabates` | `stg_fvendaabate` |
| `stg_fmetascompras` | `stg_fcompras` |
| `stg_fmetasdre` | `stg_fdre` |
| `stg_fmetasempe` | `stg_fvendaempe` |
| `stg_fmetasmorte` | `stg_fmortes` |
| `stg_fmetasnascimento` | `stg_fnascimento` |
| `stg_fmetasrebanhomedio` | `stg_frebanhomedio` |
| `stg_fmetastransfentrada` | `stg_ftransfentrada` |
| `stg_fmetatransfsaida` | `stg_ftransfsaida` |
| `stg_fmetasarea` | `stg_area` |

## Como responder perguntas típicas

- **"Quantas cabeças a fazenda X comprou/vendeu/perdeu na safra Y?"** → somar `qtd` em `stg_fcompras`/`stg_fvendaabate`/`stg_fvendaempe`/`stg_fmortes`/`stg_fnascimento` filtrando por `fazenda` (e `"proprietÁrio"` se o nome de fazenda se repetir entre proprietários diferentes — acontece, ver `"CONDOMINIO"` e `"ALVORADA"` em `stg_unidades`).
- **"Qual o rebanho médio da fazenda X?"** → `stg_frebanhomedio`, somar `qtd_cab`/`qtd_ua` por `grupo_categoria` no mês desejado.
- **"Realizado × orçado de [métrica] na fazenda X"** → comparar a tabela `stg_f*` com sua correspondente `stg_fmetas*`, mesma granularidade de filtro.
- **"Qual a despesa/receita de [centro de custo] na fazenda X?"** → `stg_fdre` filtrando `centro_de_custo_bi` (ou `sub_centro_bi` para o nível mais granular) — não esquecer `UPPER(TRIM(...))`.
- **"Quem é o técnico/gerente responsável pela fazenda X?"** → `stg_rls`, campos `"tÉcnico"`/`email`/`"EMAIL - GERENTE"`/`"email- REGIONAL"`.