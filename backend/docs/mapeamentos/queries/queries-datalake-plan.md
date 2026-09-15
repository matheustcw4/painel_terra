# Queries prontas — DATALAKE_PLAN

> Biblioteca de queries já normalizadas e testadas para a base **DATALAKE_PLAN** (ver @docs/mapeamentos/mapeamento-datalake-plan.md para o contexto de negócio e @docs/mapeamentos/schema-datalake-plan.md para o schema técnico). Use estas queries como ponto de partida ao responder pergunta que envolva **data em formato de texto sujo** ou **comparação realizado × meta** nesta base — os dois problemas mais recorrentes aqui já estão resolvidos abaixo, não precisam ser reinventados a cada pergunta.

Confirmado em 2026-08-15: a extensão `unaccent` está habilitada nesta conexão (`SELECT unaccent('ÁÇÃO')` → `ACAO`).

## Os dois padrões usados em toda query desta base

### 1. Normalização de `"DATA"` texto → `date`

Várias tabelas de `stg_f*`/`stg_fmetas*` guardam `"DATA"` como `character varying` com formato inconsistente (ver ressalva em @docs/mapeamentos/mapeamento-datalake-plan.md). Este trecho tenta parsear tanto `AAAAMMDD` (ISO) quanto `DDMMAAAA` (brasileiro), descartando o que não bater em nenhum dos dois formatos ao invés de gerar erro:

```sql
CASE
    WHEN regexp_replace("DATA", '[^0-9]', '', 'g') ~ '^[0-9]{7,8}$' THEN
        CASE
            -- Tenta formato ISO (AAAAMMDD) - Ex: 18991231 ou 20260101
            WHEN left(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                 AND substring(regexp_replace("DATA", '[^0-9]', '', 'g') from 5 for 2)::int BETWEEN 1 AND 12
            THEN to_date(regexp_replace("DATA", '[^0-9]', '', 'g'), 'YYYYMMDD')

            -- Tenta formato Brasileiro (DDMMAAAA) - Ex: 31121899
            WHEN right(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                 AND substring(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0') from 3 for 2)::int BETWEEN 1 AND 12
            THEN to_date(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0'), 'DDMMYYYY')

            ELSE NULL
        END
    ELSE NULL
END AS "DATA_2"
```

Datas que não batem em nenhum dos dois formatos (ex. o lixo `"1938/04/06 18:14:24.000"` documentado no mapeamento) viram `NULL` em `"DATA_2"` em vez de quebrar a query. **Filtrar por `"DATA_2"`, nunca por `"DATA"` bruta.**

### 2. Chave de cruzamento fazenda (`PROP_FAZ`)

Como não há chave técnica entre as tabelas fato/meta desta base (nem entre DATALAKE_PLAN e o ERP da TERRA — ver @docs/mapeamentos/mapeamento-erp-terra.md), o cruzamento por nome precisa ser normalizado — sem acento e sem espaço — antes de comparar:

```sql
unaccent(REPLACE(concat(t."proprietÁrio", t.fazenda), ' ', '')) AS PROP_FAZ
```

Use `PROP_FAZ` (ou o mesmo padrão aplicado nos dois lados de um `JOIN`) sempre que for cruzar `"proprietÁrio"`/`fazenda` entre tabelas desta base ou com outra conexão — nunca comparar os campos crus com `=`.

---

## Query 1 — Metas de Abates

Meta/orçado de abate por fazenda, com data parseada e chave de cruzamento pronta. Base para qualquer pergunta sobre **meta de abate** (sem comparar com o realizado).

```sql
SELECT
    CASE
       WHEN regexp_replace("DATA", '[^0-9]', '', 'g') ~ '^[0-9]{7,8}$' THEN
            CASE
                -- Tenta formato ISO (YYYYMMDD) - Ex: 18991231 ou 20260101
                WHEN left(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                     AND substring(regexp_replace("DATA", '[^0-9]', '', 'g') from 5 for 2)::int BETWEEN 1 AND 12
                THEN to_date(regexp_replace("DATA", '[^0-9]', '', 'g'), 'YYYYMMDD')

                -- Tenta formato Brasileiro (DDMMYYYY) - Ex: 31121899
                WHEN right(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                     AND substring(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0') from 3 for 2)::int BETWEEN 1 AND 12
                THEN to_date(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0'), 'DDMMYYYY')

                ELSE NULL
            END
        ELSE NULL
    END AS "DATA_2", *,
       unaccent(REPLACE(concat(t."proprietÁrio", t.fazenda), ' ', '')) as PROP_FAZ
 FROM "DATABASE".stg_fmetasabates t
```

**Tabela-fonte**: `stg_fmetasabates` (1.512 linhas). **Filtrar por**: `"DATA_2"` (mês/ano da meta), `PROP_FAZ` ou `fazenda`/`"proprietÁrio"` crus.

## Query 2 — Metas de Venda em Pé

Mesmo padrão da Query 1, aplicado à meta de venda "em pé" (boi vivo, sem abate).

```sql
SELECT
    CASE
       WHEN regexp_replace("DATA", '[^0-9]', '', 'g') ~ '^[0-9]{7,8}$' THEN
            CASE
                -- Tenta formato ISO (YYYYMMDD) - Ex: 18991231 ou 20260101
                WHEN left(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                     AND substring(regexp_replace("DATA", '[^0-9]', '', 'g') from 5 for 2)::int BETWEEN 1 AND 12
                THEN to_date(regexp_replace("DATA", '[^0-9]', '', 'g'), 'YYYYMMDD')

                -- Tenta formato Brasileiro (DDMMYYYY) - Ex: 31121899
                WHEN right(regexp_replace("DATA", '[^0-9]', '', 'g'), 4)::int BETWEEN 1800 AND 2100
                     AND substring(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0') from 3 for 2)::int BETWEEN 1 AND 12
                THEN to_date(lpad(regexp_replace("DATA", '[^0-9]', '', 'g'), 8, '0'), 'DDMMYYYY')

                ELSE NULL
            END
        ELSE NULL
    END AS "DATA_2", *,
       unaccent(REPLACE(concat(t."proprietÁrio", t.fazenda), ' ', '')) as PROP_FAZ
 FROM "DATABASE".stg_fmetasempe t
```

**Tabela-fonte**: `stg_fmetasempe` (612 linhas). **Filtrar por**: `"DATA_2"`, `PROP_FAZ` ou `fazenda`/`"proprietÁrio"` crus.

## Query 3 — Vendas Abates (realizado × meta diluída)

Junta o **realizado** (`stg_fvendaabate`, uma linha por evento de abate) com a **meta mensal** (`stg_fmetasabates`, agregada por fazenda/mês) e distribui ("dilui") a meta do mês proporcionalmente entre as linhas de realizado daquele mês. Use esta query pra qualquer pergunta que compare **abate realizado × meta no mesmo resultado**, linha a linha.

```sql
SELECT
    T."operaÇÃo",
    T.cliente,
    T.categ_fazenda,
    T.MES,
    T.ANO,
    SUBSTRING(T."DATA" FROM 1 FOR 10) AS "DATA",
    T.qtd,
    CASE
        WHEN T.DILUICAO_META = 0 THEN 0
        WHEN T.DILUICAO_META <> 0 THEN T.QTD_META_MENSAL / T.DILUICAO_META
    ELSE 0
    END AS QTD_META_DILUIDA,
    T.QTD_META_MENSAL,
    T.DILUICAO_META,
    T.era,
    T.peso_vivo,
    T.rendimento,
    T.peso_arroba,
    T.valor_arroba,
    T.faturamento,
    CASE
        WHEN T.DILUICAO_META = 0 THEN 0
        WHEN T.DILUICAO_META <> 0 THEN T.META_MENSAL / T.DILUICAO_META
    ELSE 0
    END AS META_DILUIDA,
    T.META_MENSAL,
    T.categoria_bi,
    T.sexo,
    T.peso_morto,
    T.pesovivo_total,
    T.pesomorto_total,
    T.valor_kg,
    T.valor_cab,
    T."proprietÁrio",
    T.fazenda,
    T.retiro,
        unaccent(REPLACE(concat(t."proprietÁrio", t.fazenda), ' ', '')) as PROP_FAZ

FROM
(
    SELECT
    *,
    COUNT(T1.QTD_META_MENSAL) OVER(partition by T1."proprietÁrio", T1.fazenda, T1.ANO, T1.MES) DILUICAO_META
    FROM
    (
        SELECT T0."operaÇÃo",
               T0.cliente,
               T0.categ_fazenda,
               T1.MES,
               T1.ANO,
               T0."DATA",
               T0.qtd,
               T1.qtd as QTD_META_MENSAL,
               T0.era,
               T0.peso_vivo,
               T0.rendimento,
               T0.peso_arroba,
               T0.valor_arroba,
               T0.faturamento,
               T1.META AS META_MENSAL,
               T0.categoria_bi,
               T0.sexo,
               T0.peso_morto,
               T0.pesovivo_total,
               T0.pesomorto_total,
               T0.valor_kg,
               T0.valor_cab,
               T0."proprietÁrio",
               T0.fazenda,
               T0.retiro
        FROM "DATABASE".stg_fvendaabate T0

        LEFT JOIN
        (
         SELECT
            T1."operaÇÃo",
            T1."proprietÁrio",
            T1.fazenda,
            T1.retiro,
            T1.MES,
            T1.ANO,
            SUM(T1.qtd) as qtd,
            SUM(T1.META) AS META
         FROM(
            SELECT
                T1."operaÇÃo",
                T1."proprietÁrio",
                T1.fazenda,
                T1.retiro,
                SUBSTRING(T1."DATA" FROM 6 FOR 2) AS MES,
                SUBSTRING(T1."DATA" FROM 1 FOR 4) AS ANO,
                T1."DATA",
                SUM(T1.qtd) as qtd,
                SUM(T1.faturamento) AS META

            FROM "DATABASE".stg_fmetasabates T1
            GROUP BY
                T1."operaÇÃo",
                T1."proprietÁrio",
                T1.fazenda,
                T1.retiro,
                T1."DATA"
            )T1
            GROUP BY
                T1."operaÇÃo",
                T1."proprietÁrio",
                T1.fazenda,
                T1.retiro,
                T1.MES,
                T1.ANO

        ) T1 ON T1."proprietÁrio" = T0."proprietÁrio" AND T1.fazenda = T0.fazenda AND T1.ANO = SUBSTRING(T0."DATA" FROM 1 FOR 4) AND T1.MES = SUBSTRING(T0."DATA" FROM 6 FOR 2)

    ) AS T1
) AS T
```

**Tabelas-fonte**: `stg_fvendaabate` (3.277 linhas, realizado) `LEFT JOIN` `stg_fmetasabates` (1.512 linhas, meta agregada por mês).

### Como funciona a "diluição de meta"

A tabela de meta (`stg_fmetasabates`) tem só um valor por fazenda/mês, mas o realizado (`stg_fvendaabate`) pode ter **várias linhas de venda no mesmo mês** (várias operações de abate na mesma fazenda no mesmo mês). Se a query simplesmente juntasse meta × realizado por fazenda/mês, a meta mensal apareceria **repetida e inteira** em cada linha de venda daquele mês — inflando qualquer `SUM(META_MENSAL)` por um fator igual ao número de vendas no mês.

A subquery com `COUNT(...) OVER (PARTITION BY proprietário, fazenda, ano, mês)` conta quantas linhas de realizado existem naquele fazenda/mês (`DILUICAO_META`) e divide a meta mensal por esse número (`QTD_META_DILUIDA`, `META_DILUIDA`). Assim, `SUM(QTD_META_DILUIDA)` e `SUM(META_DILUIDA)` **somam de volta ao valor mensal correto**, mesmo comparando linha a linha com o realizado — sem essa diluição, qualquer soma de meta nesta query estaria errada.

⚠️ Confirmado em 2026-08-15: nenhuma fazenda tem mais de um `retiro` distinto em `stg_fmetasabates`/`stg_fmetasempe`, então o `JOIN` (que casa só por `proprietÁrio`+`fazenda`+`ano`+`mês`, **sem** `retiro`) não duplica linhas nos dados atuais. Se isso mudar (uma fazenda passar a ter metas por retiro diferentes no mesmo mês), a query passa a gerar produto cartesiano — vale reconferir com `GROUP BY proprietÁrio, fazenda HAVING COUNT(DISTINCT retiro) > 1` antes de reusar este padrão em dado novo.

## Query 4 — Vendas em Pé (realizado × meta diluída)

Mesmo padrão da Query 3, aplicado à venda "em pé" (`stg_fvendaempe` × `stg_fmetasempe`). Note que os campos específicos de abate (`era`, `rendimento`, `peso_arroba`, `peso_morto`, `pesomorto_total`) não existem em venda em pé e por isso não aparecem aqui.

```sql
SELECT
    T."operaÇÃo",
    T.cliente,
    T.categ_fazenda,
    T.MES,
    T.ANO,
    SUBSTRING(T."DATA" FROM 1 FOR 10) AS "DATA",
    T.qtd,
    CASE
        WHEN T.DILUICAO_META = 0 THEN 0
        WHEN T.DILUICAO_META <> 0 THEN T.QTD_META_MENSAL / T.DILUICAO_META
    ELSE 0
    END AS QTD_META_DILUIDA,
    T.QTD_META_MENSAL,
    T.DILUICAO_META,
    T.peso_vivo,
    T.valor_arroba,
    T.faturamento,
    CASE
        WHEN T.DILUICAO_META = 0 THEN 0
        WHEN T.DILUICAO_META <> 0 THEN T.META_MENSAL / T.DILUICAO_META
    ELSE 0
    END AS META_DILUIDA,
    T.META_MENSAL,
    T.categoria_bi,
    T.sexo,
    T.pesovivo_total,
    T.valor_kg,
    T.valor_cab,
    T."proprietÁrio",
    T.fazenda,
        unaccent(REPLACE(concat(t."proprietÁrio", t.fazenda), ' ', '')) as PROP_FAZ,
    T.retiro

FROM
(
    SELECT
    *,
    COUNT(T1.QTD_META_MENSAL) OVER(partition by T1."proprietÁrio", T1.fazenda, T1.ANO, T1.MES) DILUICAO_META
    FROM
    (
        SELECT
               T0."operaÇÃo",
               T0.cliente,
               T0.categ_fazenda,
               T1.MES,
               T1.ANO,
               T0."DATA",
               T0.qtd,
               T1.qtd as QTD_META_MENSAL,
               T0.peso_vivo,
               T0.pesovivo_total,
               T0.valor_arroba,
               T0.valor_cab,
               T0.faturamento,
               T1.META AS META_MENSAL,
               T0.categoria_bi,
               T0.sexo,
               T0.valor_kg,
               T0."proprietÁrio",
               T0.fazenda,
               T0.retiro
        FROM "DATABASE".stg_fvendaempe T0

        LEFT JOIN
        (
         SELECT
            T1."operaÇÃo",
            T1."proprietÁrio",
            T1.fazenda,
            T1.retiro,
            T1.MES,
            T1.ANO,
            SUM(T1.qtd) as qtd,
            SUM(T1.META) AS META
         FROM(
            SELECT
                    T1."operaÇÃo",
                    T1."proprietÁrio",
                    T1.fazenda,
                    T1.retiro,
                    SUBSTRING(T1."DATA" FROM 6 FOR 2) AS MES,
                    SUBSTRING(T1."DATA" FROM 1 FOR 4) AS ANO,
                    SUM(T1.qtd) as qtd,
                    SUM(T1.faturamento) AS META

                FROM "DATABASE".stg_fmetasempe T1
                GROUP BY
                    T1."operaÇÃo",
                    T1."proprietÁrio",
                    T1.fazenda,
                    T1.retiro,
                    T1."DATA"
            )T1
            GROUP BY
                T1."operaÇÃo",
                T1."proprietÁrio",
                T1.fazenda,
                T1.retiro,
                T1.MES,
                T1.ANO
        ) T1 ON T1."proprietÁrio" = T0."proprietÁrio" AND T1.fazenda = T0.fazenda AND T1.ANO = SUBSTRING(T0."DATA" FROM 1 FOR 4) AND T1.MES = SUBSTRING(T0."DATA" FROM 6 FOR 2)
    ) AS T1
) AS T
```

**Tabelas-fonte**: `stg_fvendaempe` (1.842 linhas, realizado) `LEFT JOIN` `stg_fmetasempe` (612 linhas, meta agregada por mês).

---

## Reaproveitando o padrão pra outros pares realizado × meta

O mesmo par `LEFT JOIN` + diluição de meta das Queries 3/4 pode ser adaptado pra outros pares `stg_f*` × `stg_fmetas*` desta base (ex. `stg_fcompras`×`stg_fmetascompras`, `stg_fmortes`×`stg_fmetasmorte`, `stg_fnascimento`×`stg_fmetasnascimento`, `stg_ftransfentrada`×`stg_fmetastransfentrada`, `stg_ftransfsaida`×`stg_fmetatransfsaida`) — trocando o nome das duas tabelas e ajustando a lista de colunas pro schema de cada par (ver @docs/mapeamentos/schema-datalake-plan.md). **Antes de reusar em par novo**, confirmar com a checagem de `retiro` acima (`HAVING COUNT(DISTINCT retiro) > 1`) — se o par escolhido tiver fazenda com múltiplos retiros na meta, a query precisa incluir `retiro` na condição do `JOIN` final pra não gerar produto cartesiano.

Esses pares **não têm** query de diluição pronta ainda (não foram pedidos): `stg_fdre`×`stg_fmetasdre` (granularidade por centro de custo, não por evento — o padrão de diluição por contagem de linhas não se aplica direto) e `stg_area`×`stg_fmetasarea`/`stg_frebanhomedio`×`stg_fmetasrebanhomedio` (são snapshots mensais, não eventos — normalmente não precisam de diluição, já vêm 1:1 por mês).
