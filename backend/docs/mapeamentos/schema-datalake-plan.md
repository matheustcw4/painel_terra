# Schema técnico — DATALAKE_PLAN
⚠️ TODA tabela desta base fica no schema literalmente chamado `DATABASE` — não é
placeholder, é o nome real. SEMPRE prefixe: `"DATABASE".nome_da_tabela`, com aspas
duplas, em QUALQUER query desta base, mesmo tabela sem exemplo pronto aqui (ex.:
stg_fcompras, stg_fdre, stg_frebanhomedio — todas seguem essa regra igual).
> Referência de schema pura (sem narrativa/negócio — isso está em @docs/mapeamentos/mapeamento-datalake-plan.md). Gerado consultando `information_schema.columns` (tipo, tamanho, nullable), `information_schema.table_constraints` e `pg_indexes` em 2026-08-15.

**Conexão**: Postgres. **Schema de negócio**: `"DATABASE"` (precisa aspas duplas — nome reservado/maiúsculo). `public` existe mas está vazio.

**Constraints e índices**: nenhuma tabela deste schema tem `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE` ou índice declarado (`table_constraints` e `pg_indexes` retornam vazio para todas as 23 tabelas). **Todas as 324 colunas do schema são `is_nullable = YES`** — não há `NOT NULL` em lugar nenhum. Todo relacionamento entre tabelas é inferido por valor de texto (`fazenda`, `"proprietÁrio"`, `retiro`), não por chave.

Nomes de coluna entre aspas duplas na query original preservam exatamente a caixa/acento mostrados abaixo (ex. `"proprietÁrio"`, `"operaÇÃo"`, `"Área_pasto"`).

---

### stg_unidades (214 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | projeto | varchar(200) |
| 2 | proprietÁrio | varchar(200) |
| 3 | fazenda | varchar(200) |
| 4 | SISTEMA PRODUTIVO | varchar(50) |
| 5 | CÓDIGO PROJETO | varchar(5) |
| 6 | ano | varchar(10) |
| 7 | filename | varchar(200) |

### stg_area (2.979 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | DATA | varchar(10) |
| 2 | Área_pasto | double precision |
| 3 | Área_ilp | double precision |
| 4 | Área_total | double precision |
| 5 | proprietÁrio | varchar(200) |
| 6 | fazenda | varchar(200) |
| 7 | retiro | varchar(200) |
| 8 | cÓdigo_cliente | varchar(5) |
| 9 | projeto | varchar(200) |

### stg_rls (281 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | base | varchar(10) |
| 2 | CÓDIGO DO CLIENTE | varchar(10) |
| 3 | proprietÁrio | varchar(100) |
| 4 | cliente | varchar(100) |
| 5 | NOME DO PROJETO (FAZENDA) | varchar(100) |
| 6 | tÉcnico | varchar(100) |
| 7 | email | varchar(60) |
| 8 | EMAIL - GERENTE | varchar(60) |
| 9 | email- REGIONAL | varchar(60) |

### stg_fcompras (1.850 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(40) |
| 2 | DATA | timestamp without time zone |
| 3 | qtd | double precision |
| 4 | peso_vivo | double precision |
| 5 | total_peso | double precision |
| 6 | valor_cab | double precision |
| 7 | VALOR TOTAL | double precision |
| 8 | valo_kg | double precision |
| 9 | valor_arroba | double precision |
| 10 | data_abrev | varchar(40) |
| 11 | categoria_bi | varchar(50) |
| 12 | sexo | varchar(40) |
| 13 | peso_arroba | double precision |
| 14 | proprietÁrio | varchar(100) |
| 15 | fazenda | varchar(100) |
| 16 | retiro | varchar(100) |
| 17 | origem | varchar(100) |
| 18 | categ_fazenda | varchar(100) |

### stg_fmetascompras (892 linhas) — espelho meta/orçado de stg_fcompras
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | DATA | varchar(20) |
| 3 | origem | varchar(100) |
| 4 | categ_fazenda | varchar(50) |
| 5 | qtd | double precision |
| 6 | peso_vivo | double precision |
| 7 | total_peso | double precision |
| 8 | VALOR TOTAL | double precision |
| 9 | valo_kg | double precision |
| 10 | valor_arroba | double precision |
| 11 | data_abrev | varchar(20) |
| 12 | categoria_bi | varchar(50) |
| 13 | sexo | varchar(40) |
| 14 | peso_arroba | double precision |
| 15 | proprietÁrio | varchar(100) |
| 16 | fazenda | varchar(100) |
| 17 | retiro | varchar(100) |

### stg_fdre (152.447 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | centro_de_custo | varchar(100) |
| 2 | sub_centro | varchar(100) |
| 3 | valor | double precision |
| 4 | operaÇÃo | varchar(50) |
| 5 | centro_de_custo_bi | varchar(100) |
| 6 | sub_centro_bi | varchar(100) |
| 7 | fazenda | varchar(100) |
| 8 | proprietÁrio | varchar(100) |
| 9 | desembolso | varchar(20) |
| 10 | custeio | varchar(20) |
| 11 | tipo_custeio | varchar(20) |
| 12 | data_pag | varchar(25) |

### stg_fmetasdre (46.385 linhas) — espelho meta/orçado de stg_fdre
| # | Coluna | Tipo |
|---|---|---|
| 1 | centro_de_custo | varchar(100) |
| 2 | sub_centro | varchar(100) |
| 3 | valor | double precision |
| 4 | data_pag | varchar(20) |
| 5 | centro_de_custo_bi | varchar(100) |
| 6 | sub_centro_bi | varchar(100) |
| 7 | fazenda | varchar(100) |
| 8 | proprietÁrio | varchar(100) |
| 9 | desembolso | varchar(20) |
| 10 | custeio | varchar(20) |
| 11 | tipo_custeio | varchar(20) |
| 12 | operaÇÃo | varchar(10) |

### stg_fvendaabate (3.277 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(40) |
| 2 | cliente | varchar(100) |
| 3 | qtd | double precision |
| 4 | era | varchar(40) |
| 5 | peso_vivo | double precision |
| 6 | rendimento | double precision |
| 7 | peso_arroba | double precision |
| 8 | valor_arroba | double precision |
| 9 | faturamento | double precision |
| 10 | data_abrev | varchar(40) |
| 11 | sexo | varchar(40) |
| 12 | peso_morto | double precision |
| 13 | pesovivo_total | double precision |
| 14 | pesomorto_total | double precision |
| 15 | valor_kg | double precision |
| 16 | valor_cab | double precision |
| 17 | proprietÁrio | varchar(100) |
| 18 | fazenda | varchar(100) |
| 19 | retiro | varchar(100) |
| 20 | DATA | varchar(25) |
| 21 | categ_fazenda | varchar(100) |
| 22 | categoria_bi | varchar(100) |

### stg_fmetasabates (1.512 linhas) — espelho meta/orçado de stg_fvendaabate
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | cliente | varchar(100) |
| 3 | categ_fazenda | varchar(100) |
| 4 | DATA | varchar(20) |
| 5 | qtd | double precision |
| 6 | era | varchar(20) |
| 7 | peso_vivo | double precision |
| 8 | rendimento | double precision |
| 9 | peso_arroba | double precision |
| 10 | valor_arroba | double precision |
| 11 | faturamento | double precision |
| 12 | data_abrev | varchar(20) |
| 13 | categoria_bi | varchar(50) |
| 14 | sexo | varchar(40) |
| 15 | peso_morto | double precision |
| 16 | pesovivo_total | double precision |
| 17 | pesomorto_total | double precision |
| 18 | valor_kg | double precision |
| 19 | valor_cab | double precision |
| 20 | proprietÁrio | varchar(100) |
| 21 | fazenda | varchar(100) |
| 22 | retiro | varchar(100) |

### stg_fvendaempe (1.842 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(40) |
| 2 | cliente | text |
| 3 | documento | varchar(100) |
| 4 | qtd | double precision |
| 5 | peso_vivo | double precision |
| 6 | pesovivo_total | double precision |
| 7 | valor_arroba | double precision |
| 8 | valor_cab | double precision |
| 9 | faturamento | double precision |
| 10 | data_abrev | varchar(40) |
| 11 | sexo | varchar(40) |
| 12 | valor_kg | double precision |
| 13 | proprietÁrio | varchar(100) |
| 14 | fazenda | varchar(100) |
| 15 | retiro | varchar(100) |
| 16 | DATA | varchar(25) |
| 17 | categ_fazenda | varchar(100) |
| 18 | categoria_bi | varchar(100) |

### stg_fmetasempe (612 linhas) — espelho meta/orçado de stg_fvendaempe
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | cliente | varchar(100) |
| 3 | DATA | varchar(20) |
| 4 | documento | varchar(50) |
| 5 | categ_fazenda | varchar(50) |
| 6 | qtd | double precision |
| 7 | peso_vivo | double precision |
| 8 | pesovivo_total | double precision |
| 9 | valor_arroba | double precision |
| 10 | valor_cab | double precision |
| 11 | faturamento | double precision |
| 12 | data_abrev | varchar(20) |
| 13 | categoria_bi | varchar(50) |
| 14 | sexo | varchar(40) |
| 15 | valor_kg | double precision |
| 16 | proprietÁrio | varchar(100) |
| 17 | fazenda | varchar(100) |
| 18 | retiro | varchar(100) |

### stg_fnascimento (5.685 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | categ_fazenda | varchar(100) |
| 3 | qtd | double precision |
| 4 | safra | varchar(10) |
| 5 | peso_nasc | double precision |
| 6 | data_abrev | varchar(40) |
| 7 | categoria_bi | varchar(50) |
| 8 | sexo | varchar(40) |
| 9 | proprietÁrio | varchar(100) |
| 10 | fazenda | varchar(100) |
| 11 | retiro | varchar(100) |
| 12 | DATA | varchar(25) |

### stg_fmetasnascimento (1.507 linhas) — espelho meta/orçado de stg_fnascimento
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | DATA | varchar(20) |
| 3 | categ_fazenda | varchar(50) |
| 4 | qtd | double precision |
| 5 | safra | varchar(20) |
| 6 | peso_nasc | double precision |
| 7 | data_abrev | varchar(20) |
| 8 | categoria_bi | varchar(50) |
| 9 | sexo | varchar(40) |
| 10 | proprietÁrio | varchar(100) |
| 11 | fazenda | varchar(100) |
| 12 | retiro | varchar(100) |

### stg_fmortes (9.324 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(100) |
| 2 | categ_fazenda | varchar(100) |
| 3 | qtd | double precision |
| 4 | causa | varchar(500) |
| 5 | LOCAL | varchar(100) |
| 6 | safra | varchar(20) |
| 7 | data_abrev | varchar(40) |
| 8 | grupo_categoria | varchar(40) |
| 9 | era | varchar(20) |
| 10 | categoria_bi | varchar(40) |
| 11 | peso_total | double precision |
| 12 | sexo | varchar(40) |
| 13 | proprietÁrio | varchar(100) |
| 14 | fazenda | varchar(100) |
| 15 | retiro | varchar(100) |
| 16 | DATA | varchar(25) |
| 17 | carimbo_bez | text |
| 18 | peso_vivo | varchar(100) *(⚠️ texto, não numérico — ver ressalva no doc descritivo)* |
| 19 | operaÇÃo_ktl | varchar(100) |
| 20 | categ_fazenda_ktl | varchar(100) |

### stg_fmetasmorte (7.995 linhas) — espelho meta/orçado de stg_fmortes
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(50) |
| 2 | DATA | varchar(20) |
| 3 | categ_fazenda | varchar(50) |
| 4 | carimbo_bez | varchar(50) |
| 5 | qtd | double precision |
| 6 | causa | varchar(500) |
| 7 | LOCAL | varchar(200) |
| 8 | peso_vivo | double precision |
| 9 | safra | varchar(20) |
| 10 | data_abrev | varchar(20) |
| 11 | grupo_categoria | varchar(50) |
| 12 | era | varchar(50) |
| 13 | categoria_bi | varchar(50) |
| 14 | peso_total | double precision |
| 15 | sexo | varchar(40) |
| 16 | proprietÁrio | varchar(100) |
| 17 | fazenda | varchar(100) |
| 18 | retiro | varchar(100) |

### stg_frebanhomedio (4.023 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | grupo_categoria | varchar(50) |
| 2 | qtd_cab | double precision |
| 3 | qtd_ua | double precision |
| 4 | DATA | varchar(20) |
| 5 | proprietÁrio | varchar(100) |
| 6 | fazenda | varchar(100) |
| 7 | retiro | varchar(100) |

### stg_fmetasrebanhomedio (4.352 linhas) — mesmo shape de stg_frebanhomedio

### stg_fmovgado (17.419 linhas) — tabela consolidada de todos os tipos de movimentação
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(40) |
| 2 | DATA | varchar(40) |
| 3 | qtd | double precision |
| 4 | categoria_bi | varchar(50) |
| 5 | sexo | varchar(40) |
| 6 | proprietÁrio | varchar(100) |
| 7 | fazenda | varchar(100) |
| 8 | retiro | varchar(100) |


### stg_ftransfentrada (1.741 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | operaÇÃo | varchar(40) |
| 2 | DATA | varchar(10) |
| 3 | categoria_fazenda | varchar(50) |
| 4 | qtd | double precision |
| 5 | peso_vivo | double precision |
| 6 | total_peso | double precision |
| 7 | VALOR TOTAL | double precision |
| 8 | data_abrev | varchar(40) |
| 9 | categoria_bi | varchar(40) |
| 10 | sexo | varchar(40) |
| 11 | peso_arroba | double precision |
| 12 | valor_cab | double precision |
| 13 | valo_kg | double precision |
| 14 | valor_arroba | double precision |
| 15 | proprietÁrio | varchar(100) |
| 16 | fazenda | varchar(100) |
| 17 | retiro | varchar(100) |

### stg_fmetastransfentrada (333 linhas) — mesmo shape de stg_ftransfentrada

### stg_ftransfsaida (1.655 linhas) — mesmo shape de stg_ftransfentrada

### stg_fmetatransfsaida (452 linhas) — mesmo shape de stg_ftransfentrada

