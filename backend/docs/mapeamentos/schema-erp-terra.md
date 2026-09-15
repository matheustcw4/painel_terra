# Schema técnico — ERP_TERRA

> Referência de schema pura (sem narrativa/negócio — isso está em @docs/mapeamentos/mapeamento-erp-terra.md). Gerado consultando `information_schema.columns` (tipo, tamanho, nullable), `information_schema.table_constraints` e `pg_indexes` em 2026-08-15.

**Conexão**: Postgres. **Schema de negócio**: `"DATABASE"` (precisa aspas duplas). `public` existe mas está vazio.

**Constraints e índices**: nenhuma tabela deste schema tem `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE` ou índice declarado. **Todas as 201 colunas do schema são `is_nullable = YES`**. Diferente de DATALAKE_PLAN, aqui **nenhuma coluna de texto tem limite de tamanho** — tudo que não é numérico/data é `text` puro (sem `varchar(n)`). Relacionamentos são inferidos por `*_id` (ver mapa de FKs e integridade checada no doc descritivo).

---

### stg_base (24 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | nome | text |
| 3 | centro_custo_id | integer |

### stg_gerente (23 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | user_id | integer |
| 3 | base_id | integer |
| 4 | nome | text |

### stg_tecnico (72 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | user_id | integer |
| 3 | base_id | integer |
| 4 | nome | text |

### stg_service (113 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | tenant_id | integer |
| 3 | nome | text |
| 4 | modelo_contrato_id | text |

### stg_client (362 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | double precision *(⚠️ PK como float, não integer)* |
| 2 | tenant_id | double precision |
| 3 | tabela_fiscal_id | double precision |
| 4 | codigo | double precision |
| 5 | nome_razao_social | text |
| 6 | tipo | text |
| 7 | status | text |
| 8 | tipo_pessoa | text |
| 9 | nome_fantasia | text |
| 10 | pais | text |
| 11 | dt_nascimento | text |
| 12 | estado_civil | text |
| 13 | profissao | text |
| 14 | rg | text |
| 15 | cpf | text |
| 16 | inscricao_estadual | text |
| 17 | inscricao_municipal | text |
| 18 | cnpj | text |
| 19 | apelido | text |
| 20 | orgao_publico | text |
| 21 | codigo_estrangeiro | text |
| 22 | codigo_terceiros | text |
| 23 | dt_inicio_relacionamento | text |
| 24 | base_id | double precision |
| 25 | gerente_id | double precision |
| 26 | tecnico_id | double precision |
| 27 | ender_cep | text |
| 28 | ender_tipo_logradouro | text |
| 29 | ender_lgr | text |
| 30 | ender_numero | text |
| 31 | ender_tipo_bairro | text |
| 32 | ender_bairro | text |
| 33 | ender_cpl | text |
| 34 | ender_codigo_pais | text |
| 35 | ender_codigo_cidade | text |
| 36 | uf | text |
| 37 | municipio | text |
| 38 | cobr_nome_resp_financeiro | text |
| 39 | cobr_cpf_cnpj | text |
| 40 | cobr_dia_vencimento_boletos | text |

### stg_farmclient (275 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | tenant_id | integer |
| 3 | codigo | text |
| 4 | cliente_id | integer |
| 5 | tabela_fiscal_id | text |
| 6 | tipo_pessoa | text |
| 7 | nome | text |
| 8 | qtd_fazenda | integer |
| 9 | sistema_producao_pecuaria | text *("true"/"false" como string, não boolean)* |
| 10 | sistema_producao_agricultura | text |
| 11 | sistema_producao_floresta | text |
| 12 | categoria | text |
| 13 | rebanho_medio | integer |
| 14 | area_total | integer |
| 15 | area_pastagem | integer |
| 16 | area_reserva | integer |
| 17 | area_outros | integer |
| 18 | area_cultivo | integer |
| 19 | area_floresta | integer |
| 20 | latitude | text |
| 21 | longitude | text |
| 22 | lat | integer *(⚠️ sempre NULL nas amostras — usar `latitude`)* |
| 23 | lng | integer *(⚠️ idem)* |
| 24 | municipio | text *(⚠️ contém JSON malformado, não nome de município — ver doc descritivo)* |
| 25 | uf | integer *(⚠️ tipado errado — UF é sigla, não número; sempre NULL nas amostras)* |
| 26 | base_id | integer |
| 27 | gerente_id | integer |
| 28 | tecnico_id | integer |

### stg_farmcontract (368 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | contrato_id | integer |
| 3 | cliente_fazenda_id | integer |
| 4 | qtd_fazenda | integer |
| 5 | categoria | text |
| 6 | rebanho_medio | double precision |
| 7 | sistema_producao_pecuaria | text |
| 8 | sistema_producao_agricultura | text |
| 9 | sistema_producao_floresta | text |
| 10 | area_total | double precision |
| 11 | area_pastagem | double precision |
| 12 | area_reserva | double precision |
| 13 | area_outros | double precision |
| 14 | area_cultivo | double precision |
| 15 | area_floresta | double precision |

### stg_contract (400 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | tenant_id | integer |
| 3 | sequencia | integer |
| 4 | importado | integer |
| 5 | orcamento_id | integer |
| 6 | renovado_de_contrato_id | integer |
| 7 | cliente_id | integer |
| 8 | termo_abertura_id | integer |
| 9 | cliente_nome | text |
| 10 | dt_inicio | text |
| 11 | dt_finalizacao | text |
| 12 | valor_total | text *(⚠️ texto, não numérico)* |
| 13 | confirmado_em | text |
| 14 | confirmado_por_user_id | integer |
| 15 | forma_pagamento_id | integer |
| 16 | parcelas | integer |
| 17 | status_contrato | text |
| 18 | principais_entregas | text |
| 19 | deleted_at | text |

### stg_contractproduct (705 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | double precision |
| 2 | contrato_id | integer |
| 3 | produto_id | integer *(⚠️ referencia catálogo `produtos` de TESTE_INTEGRACAO, não `stg_service` — ver doc descritivo)* |
| 4 | valor_total | double precision |

### stg_orcamento (159 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | tenant_id | integer |
| 3 | uuid | text |
| 4 | sequencia | integer |
| 5 | cliente_id | integer |
| 6 | origem_contrato_id | integer |
| 7 | termo_abertura_id | integer |
| 8 | situacao | text |
| 9 | status_termo_abertura | text |
| 10 | forma_pagamento | text |
| 11 | justificativa_id | integer |
| 12 | dt_orcamento | text |
| 13 | qtde_cabecas | integer |
| 14 | unidades_negocio | integer |
| 15 | meses_implantacao | integer |
| 16 | meses_acompanhamento | integer |
| 17 | fechamento_mensal | text |
| 18 | diarias_extras | double precision |
| 19 | diagnostico_gestacao | text |
| 20 | diagnostico_gestacao_porcentagem_extra | text |
| 21 | manejo_sanitario | text |
| 22 | manejo_sanitario_porcentagem_extra | text |
| 23 | valor_despesas_viagem | double precision |
| 24 | valor_base_calculo | double precision |
| 25 | forma_pagamento_id | integer |
| 26 | parcelas | integer |
| 27 | valor_total | double precision |
| 28 | valor_total_competencia | double precision |
| 29 | valor_total_parcela | double precision |

### stg_termo (1.012 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | integer |
| 2 | tenant_id | integer |
| 3 | ordem | integer |
| 4 | servico_id | integer |
| 5 | produto_origem_id | text |
| 6 | status | text |
| 7 | responsavel_opcao | text |
| 8 | dt_inicio | text |
| 9 | dt_fim | text |
| 10 | frequencia | text |
| 11 | descricao | text |
| 12 | contrato_id | double precision *(⚠️ float, inconsistente com `stg_contract.id` integer)* |
| 13 | user_id | text |
| 14 | tecnico_id | text |
| 15 | base_id | text |

### stg_kanban_card (12.578 linhas)
| # | Coluna | Tipo |
|---|---|---|
| 1 | id | text *(⚠️ não é integer, cuidado ao ordenar/comparar)* |
| 2 | tenant_id | integer |
| 3 | cliente_id | integer |
| 4 | contrato_id | integer |
| 5 | contrato_termo_abertura_id | integer |
| 6 | titulo | text |
| 7 | uuid | text |
| 8 | codigo | integer |
| 9 | ordem | text |
| 10 | status | text |
| 11 | descricao | text |
| 12 | justificativa | text |
| 13 | dt_inicio | text |
| 14 | dt_fim | text |
| 15 | dt_vencimento | text |
| 16 | frequencia | text |
| 17 | origem_criacao | text |
| 18 | created_at | text |
| 19 | updated_at | text |
| 20 | deleted_at | text |
| 21 | task_id | integer |
| 22 | card_id | integer |
| 23 | user_id | integer |
| 24 | task | text |
| 25 | task_status | text |
| 26 | realizado_em | text |
| 27 | task_created_at | text |
| 28 | task_updated_at | text |
| 29 | task_deleted_at | text |
| 30 | contrato_termo_id | integer |
| 31 | contrato_id_1 | integer *(duplicata de `contrato_id`, provável artefato de JOIN na origem)* |
| 32 | servico_id | integer |
| 33 | contrato_status | text |
| 34 | contrato_termo_dt_inicio | text |
| 35 | contrato_termo_dt_fim | text |
| 36 | contrato_termo_frequencia | text |

---

## Domínios / valores de coluna já catalogados

Ver @docs/mapeamentos/mapeamento-erp-terra.md para: mapa de relacionamentos entre tabelas, resultado da checagem de integridade (LEFT JOIN por par de tabela), domínios de código observados (`status`, `situacao`, `categoria`, `frequencia`) e ressalvas de qualidade de dado.
