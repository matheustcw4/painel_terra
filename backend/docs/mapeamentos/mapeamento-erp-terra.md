# Mapeamento da base ERP_TERRA

> Levantamento feito consultando `information_schema` (schemas, tabelas, colunas), contagem de linhas (`count(*)`), amostras de dados (`LIMIT`) e checagem de integridade (`LEFT JOIN ... WHERE x IS NULL`) diretamente na conexão, em 2026-08-14. Banco **Postgres** usado como área de *staging* (prefixo `stg_`), mesmo padrão de LKS_PROTECTOR_DATABASE e DATALAKE_PLAN.
>
> Este documento é descritivo/de negócio. Para referência técnica pura — tabela por tabela, coluna por coluna, tipo Postgres, tamanho, nullable — ver @docs/mapeamentos/schema-erp-terra.md.

## O que é essa base

**ERP comercial da própria TERRA** (a consultoria dona deste workspace) — clientes, contratos de prestação de serviço, produtos/serviços contratados, fazendas vinculadas a cada cliente/contrato, gestores (gerente/técnico) responsáveis, orçamentos (propostas) e quadro Kanban de tarefas/entregas por contrato.

## ⚠️ MESMA FONTE que TESTE_INTEGRACAO.erp — não são bases independentes

`ERP_TERRA` e o schema `erp` da conexão **TESTE_INTEGRACAO** (ver @mapeamento-teste-integracao.md) claramente vêm do **mesmo sistema de origem** — confirmado por IDs idênticos entre as duas conexões:

| Entidade | ERP_TERRA | TESTE_INTEGRACAO.erp |
|---|---|---|
| Cliente id 3 | "Nathália Junqueira Justi" | "NATHÁLIA JUNQUEIRA JUSTI" |
| Cliente id 6 | "Agropecuária Seringueira Tocantins" | "AGROPECUÁRIA SERINGUEIRA TOCANTINS" |
| Contrato id 2, cliente 93 (Shiro Nishimura) | valor_total 51521.76 | valor_total 51521.76 |

As duas conexões são **pipelines de ETL diferentes do mesmo ERP**, com cobertura de tabelas parcialmente distinta:

- **Só em TESTE_INTEGRACAO.erp**: `produtos` (catálogo oficial de produto/serviço com regra de precificação — `plano_conta_id`, `forma_base_calculo`, `valor_inicial_cabeca`, etc.), `valor_produto`, `usuarios`, `funcoes`, `colaboradores`, `tecnicos_completo`, `clientes_completo`.
- **Só em ERP_TERRA**: `stg_gerente` (gestor por base regional), `stg_kanban_card` (quadro de tarefas/entregas, 12.578 linhas), `stg_orcamento` (propostas comerciais antes de virar contrato), `stg_termo` (itens/escopo do contrato — "Reunião Trimestral", "Diagnóstico" etc.), `stg_service` (catálogo de serviço **diferente** do `produtos` — ver observação abaixo), `stg_farmcontract`/`stg_farmclient` (detalhe de área/rebanho por fazenda vinculada a contrato).

**Recomendação de roteamento**: para preço/regra de cálculo de produto, usar `TESTE_INTEGRACAO.erp.produtos` + `valor_produto`. Para escopo do contrato (termos/entregas), orçamento (proposta) e quadro de tarefas (Kanban), usar `ERP_TERRA` — não existe equivalente em TESTE_INTEGRACAO. Para cliente/contrato "puro" (nome, status, valor total), qualquer uma das duas serve, mas confira se o dado está mais completo/atualizado em uma ou outra antes de decidir.

## Cruzamento com DATALAKE_PLAN

O nome do proprietário/cliente em `ERP_TERRA.stg_client.nome_razao_social` corresponde ao `"proprietÁrio"`/`cliente` de **DATALAKE_PLAN** (ver @mapeamento-datalake-plan.md) — vínculo por nome, não por chave técnica.

## Schemas
- `DATABASE` — schema ativo, com todos os dados.
- `public` — vazio.
- `information_schema`, `pg_catalog`, `pg_toast` — catálogo interno do Postgres.

## Tabelas

| Tabela | Linhas | O que é | Colunas-chave |
|---|---|---|---|
| `stg_base` | 24 | Bases/regionais da TERRA (ex. GO, MS1, MT1, TERRA, Corporativo, Regional Sul) | `id`, `nome`, `centro_custo_id` |
| `stg_gerente` | 23 | Gestores regionais (gerentes) — 1 por `base_id` | `id`, `user_id`, `base_id`, `nome` |
| `stg_tecnico` | 72 | Técnicos de campo, vinculados a uma `base_id` | `id`, `user_id`, `base_id`, `nome` |
| `stg_client` | 362 | **Cliente** (PF ou PJ) — dono da fazenda/operação atendida. Cadastro completo: documento (CPF/CNPJ), endereço, dados de cobrança, `base_id`/`gerente_id`/`tecnico_id` responsáveis | `id`, `codigo`, `nome_razao_social`, `tipo_pessoa` (F/J), `status` (A=ativo/I=inativo), `cpf`/`cnpj`, `uf`, `municipio`, `base_id`, `gerente_id`, `tecnico_id` |
| `stg_farmclient` | 275 | **Fazenda do cliente** — pode haver mais de uma por cliente. Área (total/pastagem/reserva/cultivo/floresta), rebanho médio, sistema de produção (pecuária/agricultura/floresta), geolocalização | `id`, `cliente_id`, `nome`, `categoria` (C/O/R), `rebanho_medio`, `area_total`, `base_id`, `gerente_id`, `tecnico_id` |
| `stg_contract` | 400 | **Contrato** comercial com o cliente | `id`, `cliente_id`, `cliente_nome`, `dt_inicio`, `dt_finalizacao`, `valor_total`, `status_contrato`, `parcelas`, `orcamento_id` (origem, se veio de proposta) |
| `stg_contractproduct` | 705 | Item de produto/serviço vendido dentro de um contrato — **`produto_id` referencia o catálogo `produtos` de TESTE_INTEGRACAO, não `stg_service` desta base** (ver observação abaixo) | `id`, `contrato_id`, `produto_id`, `valor_total` |
| `stg_farmcontract` | 368 | Snapshot da fazenda **no momento do contrato** (fotografia de área/rebanho que pode divergir do `stg_farmclient` atual) | `id`, `contrato_id`, `cliente_fazenda_id` (→ `stg_farmclient.id`), `rebanho_medio`, `area_total` |
| `stg_termo` | 1.012 | **Item de escopo/entrega do contrato** ("termo de abertura") — cada linha é uma entrega prevista (ex. "Reunião Trimestral", "Orçamentação 25/26"), com prazo e responsável | `id`, `contrato_id`, `servico_id` (→ `stg_service.id`), `status` (A/C/E/S), `dt_inicio`, `dt_fim`, `frequencia` (U=única/M=mensal/T=trimestral), `tecnico_id`, `base_id` |
| `stg_service` | 113 | Catálogo de nome de serviço usado em `stg_termo` (ex. "Apresentação", "Auditoria", "Orçamentação", "Consulta Online") | `id`, `nome`, `modelo_contrato_id` |
| `stg_orcamento` | 159 | **Proposta comercial** (orçamento) antes de virar contrato — pode ter `origem_contrato_id` (renovação) | `id`, `cliente_id`, `situacao` (A/G/N/P/R), `dt_orcamento`, `valor_total`, `unidades_negocio`, `meses_acompanhamento`, `forma_pagamento_id`, `parcelas` |
| `stg_kanban_card` | 12.578 | **Quadro Kanban** — tarefas/cards de acompanhamento vinculados (opcionalmente) a cliente/contrato/termo. Muitas colunas técnicas de sincronização (`task_*`, `contrato_termo_*`) | `id`, `cliente_id`, `contrato_id`, `titulo`, `status` (A/C/D/E/S), `dt_inicio`, `dt_fim`, `dt_vencimento`, `descricao`, `origem_criacao` |

## Relacionamentos (inferidos, sem FK declarada)

```
stg_base ─┬─ stg_gerente.base_id
          ├─ stg_tecnico.base_id
          ├─ stg_client.base_id
          └─ stg_farmclient.base_id / stg_termo.base_id

stg_client (id) ─┬─ stg_farmclient.cliente_id
                 ├─ stg_contract.cliente_id
                 ├─ stg_orcamento.cliente_id
                 └─ stg_kanban_card.cliente_id

stg_contract (id) ─┬─ stg_contractproduct.contrato_id
                    ├─ stg_farmcontract.contrato_id
                    ├─ stg_termo.contrato_id
                    └─ stg_kanban_card.contrato_id

stg_farmclient (id) ── stg_farmcontract.cliente_fazenda_id

stg_service (id) ── stg_termo.servico_id   (~10% dos termos não batem — ver qualidade de dado)

stg_orcamento (id) ── stg_contract.orcamento_id  (contrato originado de proposta)
```

Integridade checada (LEFT JOIN):
- `stg_contract.cliente_id` → `stg_client.id`: **100% íntegro** (0 órfãos em 400 contratos).
- `stg_farmcontract.cliente_fazenda_id` → `stg_farmclient.id`: **100% íntegro** (0 órfãos em 368 linhas).
- `stg_farmclient.cliente_id` → `stg_client.id`: **1 órfão** em 275 linhas.
- `stg_termo.contrato_id` → `stg_contract.id`: **100% íntegro**.
- `stg_kanban_card.contrato_id` → `stg_contract.id`: **100% íntegro** (nos cards que têm `contrato_id` preenchido — muitos são `NULL`, tarefas internas sem contrato).
- `stg_contractproduct.produto_id` → `stg_service.id`: **310 de 705 (44%) não batem** — confirma que `produto_id` referencia o catálogo `produtos` de **TESTE_INTEGRACAO**, não `stg_service` (que é o catálogo usado só em `stg_termo`, e mesmo ali ~10% dos `servico_id` não batem).
- `stg_client.base_id`: **33 de 362 clientes sem base definida** (`NULL`).

## Domínios de código observados

| Coluna | Valores observados | Significado (quando óbvio) |
|---|---|---|
| `stg_client.status` | `A`, `I` | Ativo / Inativo |
| `stg_client.tipo_pessoa` | `F`, `J` | Pessoa Física / Jurídica |
| `stg_contract.status_contrato` | `A`, `C`, `E`, `G`, `M`, `P`, `R`, `T`, `X` | Não confirmado sem consulta ao time — **não adivinhar**; `TESTE_INTEGRACAO.erp.contratos.status` traz o rótulo em português (ex. "Vencido") pro mesmo contrato e pode servir de Rosetta Stone |
| `stg_termo.status` / `stg_kanban_card.status` | `A`, `C`, `D`, `E`, `S` (kanban também tem `NULL`) | Não confirmado — provavelmente Ativo/Concluído/... mas não assumir |
| `stg_orcamento.situacao` | `A`, `G`, `N`, `P`, `R` | Não confirmado |
| `stg_farmclient.categoria` | `C`, `O`, `R` (+ `NULL`) | Não confirmado — possivelmente porte/classe do cliente |
| `stg_termo.frequencia` | `U`, `M`, `T` | Única, Mensal, Trimestral (inferido pelo contexto das linhas de amostra) |

## Período coberto

`stg_contract.dt_inicio`: **2020-03 a 2026-08**. Nenhum contrato com `deleted_at` preenchido (0 de 400) — soft-delete existe no schema mas não foi usado nos dados observados.

## Observações de qualidade de dado

- `stg_client.id`, `stg_client.codigo`, `stg_client.tabela_fiscal_id`, `stg_client.gerente_id`, `stg_client.tecnico_id` são `double precision` (float), não inteiro — resíduo de ETL via planilha/CSV. Fazer `CAST(... AS integer)` antes de usar como chave se for comparar com colunas inteiras de outra tabela.
- `stg_farmclient.municipio` guarda **um JSON malformado como string**, não o nome do município: `{"lat":-10,"lng":-55,"municipio":"$this->municipio"}` — literalmente um template de código PHP não interpolado que vazou pro dado. O nome real do município **não está disponível** nesta coluna; `uf` também está incorretamente tipado como `integer` e vem sempre `NULL` nas amostras. Não confiar em localização geográfica de `stg_farmclient` sem antes checar `latitude`/`longitude` (que também aparecem zeradas — `"0.00000000"` — em vários registros, i.e., não preenchidas de verdade).
- `stg_farmcontract.area_cultivo` teve um valor de **5.000.000** (ha) numa linha de amostra — claramente um outlier/erro de digitação (nenhuma fazenda tem 5 milhões de hectares de cultivo). Sempre checar outlier antes de somar área por contrato.
- `stg_termo.contrato_id` é `double precision`, `stg_termo.tecnico_id`/`base_id`/`user_id` são `text` — tipagem inconsistente dentro da própria tabela e entre tabelas irmãs.
- `stg_kanban_card.id` é `text` (não inteiro) — cuidado ao ordenar/comparar.
- `stg_contract.valor_total` é `text`, não numérico — precisa `CAST` antes de somar.
