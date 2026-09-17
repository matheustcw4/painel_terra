# Mapeamento da base TESTE_INTEGRACAO

> Levantamento feito consultando `information_schema` (schemas, tabelas, colunas, chaves), `pg_get_viewdef`/`information_schema.views`, contagem de linhas (`count(*)`), amostras de dados (`LIMIT`) e checagens de integridade referencial (`NOT IN` / órfãos) diretamente na conexão, em 2026-08-10. Banco **Postgres**.

> ⚠️ **Atenção ao nome da conexão**: esta base se chama `TESTE_INTEGRACAO`. O nome sugere fortemente um ambiente de teste/homologação (padrão semelhante ao de `catalogo-travas`, que o `router.md` já marca como "dado de teste/demonstração, não é uma base de negócio real"). Os dados aqui, no entanto, **não parecem sintéticos** — são nomes reais de clientes, colaboradores, contratos com valores em R$, e lançamentos de horas (Clockify) até a data corrente (2026-08-10). Ainda assim, **antes de tratar qualquer número desta base como oficial para decisão de negócio, confirme com o usuário se `TESTE_INTEGRACAO` é ambiente de produção espelhado ou um sandbox de integração** — isso não estava documentado em `router.md` e não pôde ser confirmado só pela introspecção do schema.
>
> Esta base **não está listada em `@router.md`**. Ela cobre dados de **ERP/gestão comercial** (clientes, contratos, produtos/serviços, colaboradores) e **apontamento de horas (Clockify)** — um domínio (financeiro/comercial/RH) que não é coberto por nenhuma das bases já mapeadas (`LKS_ZEUS_INT` = clima, `LKS_PROTECTOR_DATABASE` = praga/scouting). Se o roteamento for atualizado para incluir esta base, ela é a candidata natural para perguntas do tipo "quantos contratos vigentes temos", "qual o valor total de um contrato", "quantas horas um técnico lançou", "quem são os colaboradores ativos".

Origem dos dados: dois sistemas distintos, unidos numa única conexão Postgres via schemas separados:
- **schema `erp`**: dados de ERP — clientes, contratos, fazendas vinculadas a contratos/clientes, produtos/serviços contratados, valores por produto, colaboradores, técnicos, usuários e bases/regiões operacionais.
- **schema `clockify`**: apontamento de horas trabalhadas (integração com a ferramenta Clockify), por técnico/tarefa/cliente/projeto.

## Schemas

| Schema | Tabelas | Views | Cobertura |
|---|---|---|---|
| `erp` | 10 | 3 | Clientes, contratos, fazendas, produtos/serviços, colaboradores, técnicos, usuários, bases |
| `clockify` | 1 | 0 | Apontamento de horas (time tracking) |

`public`, `information_schema`, `pg_catalog`, `pg_toast` não têm tabelas de negócio.

## ⚠️ Observação geral de tipagem — leia antes de consultar

A grande maioria das colunas está tipada como `text` no Postgres, **inclusive** IDs numéricos (`id_cliente = '10'`), booleanos (`sistema_producao_pecuaria = 'true'`/`'false'` como string, não `boolean`), datas (`dt_admissao` em `colaboradores` é `date` de verdade, mas `dt_inicio_relacionamento` em `clientes` é `text` com formato ISO), e números decimais (`area_total = '26657.0000'` como string, `valor_total` em `contratos`/`valor_produto` é `numeric` de verdade mas retorna como string em alguns clientes JSON). **Ao filtrar ou ordenar esses campos, faça `CAST`/`::numeric`/`::boolean`/`::date` explícito** — comparação de string pura (`'2' > '10'`) dá resultado errado.

Colunas realmente tipadas como não-texto: `qtd_fazenda`, `rebanho_medio`, `parcelas` (`integer`); `valor_total`, `salario`, `rate` (`numeric`); `dt_admissao`, `data_saida`, `data_inicio`(contratos), `data_finalizacao`, `data_inicio`(time_entries) (`date`); `hora_inicio`, `data_fim`(time_entries) (`timestamp without time zone`); `billable` (`boolean`); `atualizado_em` em todas as tabelas (`timestamp with time zone`).

## Tabelas — schema `erp`

| Tabela | Linhas | PK | O que é | Colunas |
|---|---|---|---|---|
| `base` | 24 | `id_base` | Bases/unidades operacionais e sua região | `id_base`, `base` (sigla, ex. `GO`, `PR`, `Corporativo`), `regiao` (ex. `Araguaia`, `Sulamerica`, `Norte`, `Corporativo`), `atualizado_em` |
| `clientes` | 373 | `id_cliente` | Cadastro de clientes (pessoa física/jurídica) | `id_cliente`, `nome_cliente`, `status` (`A`=ativo, `I`=inativo), `nome_fantasia` (sempre `NULL` na amostra), `pais` (código `1`/`2`/`3` — **sem tabela de lookup nesta base**, ver observação abaixo), `dt_inicio_relacionamento` (texto ISO, `NULL` em 133/373 linhas), `id_base` (→ `base.id_base`), `id_gerente` (→ `tecnicos.id_tecnico`, **não** `usuarios`), `tecnico_id` (→ `tecnicos.id_tecnico`), `deleted_at` (sempre `NULL` na amostra — soft delete não observado em uso), `atualizado_em` |
| `cliente_fazendas` | 280 | `id_cliente_fazenda` | Fazendas/propriedades vinculadas a um cliente | `id_cliente_fazenda`, `codigo` (formato `"{cliente_id}-{seq}"`, ex. `"117-1"`), `cliente_id` (→ `clientes.id_cliente`), `nome` (nome da fazenda), `qtd_fazenda`, `base_id` (→ `base.id_base`), `gerente_id` (→ `tecnicos.id_tecnico`), `atualizado_em` |
| `contratos` | 403 | `id_contrato` | Contratos comerciais firmados com clientes | `id_contrato`, `cliente_id` (→ `clientes.id_cliente`), `cliente` (nome desnormalizado do cliente), `data_inicio`, `data_finalizacao`, `valor_total` (numeric, em R$), `forma_pagamento_id` (sem tabela de lookup nesta base), `parcelas`, `mensalista` (`"Sim"`/`"Não"`), `status_assinatura` (`draft`/`running`/`closed`/`canceled` — status do fluxo de assinatura eletrônica), `status` (`Vigente`/`Vencido`/`Encerrado`/`Pendente`/`Cancelado`/`Em Aberto` — status comercial do contrato), `deleted_at` (sempre `NULL` na amostra), `atualizado_em` |
| `contrato_fazendas` | 372 | `id_contrato_fazenda` | Detalhe operacional/agropecuário da fazenda dentro de um contrato específico (área, rebanho, sistema de produção) | `id_contrato_fazenda`, `contrato_id` (→ `contratos.id_contrato`), `cliente_fazenda_id` (→ `cliente_fazendas.id_cliente_fazenda`), `qtd_fazenda`, `categoria` (`C`/`O`/`R` — sem legenda encontrada nesta base), `rebanho_medio` (cabeças de gado), `sistema_producao_pecuaria`/`sistema_producao_agricultura`/`sistema_producao_floresta` (texto `"true"`/`"false"`), `area_total`/`area_pastagem`/`area_reserva`/`area_outros`/`area_cultivo`/`area_floresta` (texto numérico, hectares, 4 casas decimais), `atualizado_em` |
| `produtos` | 39 | `id_produto` | Catálogo de produtos/serviços que podem compor um contrato, com parâmetros de precificação | `id_produto`, `nome`, `plano_conta_id` (sem tabela de lookup nesta base), `adicional_fazenda`, `adicional_multi_atividade` (texto `"true"`/`"false"`), `codigo_servico_prestado` (sempre `NULL` na amostra), `forma_base_calculo` (código `1`–`4`, sem legenda), `numero_area_util`, `valor_por_hectare` (sempre `NULL` na amostra), `numero_inicial_cabeca`, `valor_inicial_cabeca`, `valor_inicial_diarias`, `valor_diaria_por_salario_minimo`, `desconto_progressivo` (`N`/`F`), `opcao_valor_constante` (`C`/`F`/`NULL`), `percentual_desconto_por_cabeca` (sempre `NULL` na amostra), 10 colunas `usa_vbc_*` (flags texto `"true"`/`"false"` indicando quais componentes entram na "variável base de cálculo" do produto: unidades de negócio, meses de implantação/acompanhamento, fechamento mensal, diárias extras, mensalidade continuada, módulos de implantação, diagnóstico de gestação, manejo sanitário, desconto/acréscimo final), `deleted_at` (sempre `NULL` na amostra), `atualizado_em` |
| `valor_produto` | 712 | `id_valor_produto` | Valor efetivamente contratado de cada produto dentro de cada contrato (grão: contrato × produto) | `id_valor_produto`, `contrato_id` (→ `contratos.id_contrato`), `produto_id` (→ `produtos.id_produto`), `valor_total` (numeric, em R$), `atualizado_em` |
| `colaboradores` | 100 | `id_colaborador` | Quadro de funcionários da empresa (RH) | `id_colaborador`, `nome`, `email`, `dt_admissao`, `salario` (numeric), `data_saida`, `motivo_desligamento` (`D`/`P`, sem legenda; sempre `NULL` quando ativo), `funcao_id` (→ `funcoes.id_funcao`), `status` (`Ativo`/`Inativo` — **checado contra `data_saida`: os dois campos são sempre consistentes, nenhum "Ativo" tem `data_saida` preenchida na amostra completa**), `atualizado_em` |
| `funcoes` | 27 | `id_funcao` | Catálogo de funções/cargos | `id_funcao`, `funcao` (nome específico, ex. "Gerente Financeiro"), `cargo` (nome mais genérico, ex. "Gerente"), `atualizado_em` |
| `tecnicos` | 72 | `id_tecnico` | Técnicos de campo — **é a tabela usada como destino real de `id_gerente`/`gerente_id`/`tecnico_id` em outras tabelas**, não `usuarios` | `id_tecnico`, `user_id` (**FK declarada** → `usuarios.id_usuario`), `base_id` (**FK declarada** → `base.id_base`), `nome`, `atualizado_em` |
| `usuarios` | 89 | `id_usuario` | Cadastro de usuários do sistema (login/dados pessoais) — cobre um universo diferente/maior do que só técnicos | `id_usuario`, `name`, `email`, `birthday` (texto, quase sempre `NULL`), `documentation` (CPF, quase sempre `NULL`), `phone_number` (quase sempre `NULL`), `deleted_at` (sempre `NULL` na amostra), `atualizado_em` |

## Views — schema `erp`

Views são o caminho recomendado para consultas que precisam de nome/atributo descritivo em vez de só o ID — elas já resolvem os `LEFT JOIN` mais comuns.

| View | Linhas | Definição (join real, extraído via `pg_get_viewdef`) |
|---|---|---|
| `clientes_completo` | 373 | `clientes c LEFT JOIN base b ON c.id_base = b.id_base` — adiciona `base` e `regiao` ao cliente. Mantém `id_gerente`/`tecnico_id` como IDs crus (não resolve nome). |
| `tecnicos_completo` | 72 | `tecnicos t LEFT JOIN usuarios u ON t.user_id = u.id_usuario` `LEFT JOIN base b ON t.base_id = b.id_base`, com `DISTINCT ON (email)` — adiciona `email` (com fallback `'teste@terradesenvolvimento.com.br'` quando o usuário não tem e-mail), `base`, `regiao` e `usuario` (parte local do e-mail, antes do `@`). **Atenção**: o `DISTINCT ON` colapsa técnicos que compartilham o mesmo e-mail de fallback — não assumir 1 linha por técnico sem checar. |
| `valor_produto_completo` | 712 | `valor_produto vp LEFT JOIN produtos p ON vp.produto_id = p.id_produto` — adiciona `nome` do produto ao valor contratado. |

## Tabelas — schema `clockify`

| Tabela | Linhas | PK | O que é | Colunas |
|---|---|---|---|---|
| `time_entries` | 24.087 | `id_time_entry_tag` | Lançamentos de horas trabalhadas por técnico, com etiqueta (tag). **Grão é entrada × etiqueta**, não entrada: 24.087 linhas cobrem 23.423 `id_time_entry` distintos — uma entrada com múltiplas etiquetas gera uma linha por etiqueta (`id_time_entry_tag = "{id_time_entry}::{etiqueta}"`). Para métricas de tempo total, agregar por `id_time_entry` antes, senão o mesmo intervalo de tempo é contado mais de uma vez. | `id_time_entry_tag`, `id_time_entry`, `descricao`, `hora_inicio` (timestamp), `data_fim` (timestamp), `data_inicio` (date, mesmo dia de `hora_inicio`), `billable` (boolean real), `rate` (numeric, valor/hora — `0.0` em quase todas as linhas da amostra, chega a `122.0` em algumas `billable=true`), `tecnico` (nome, desnormalizado), `email`, `usuario` (parte local do e-mail), `etiqueta` (tag do Clockify, ex. "Reunião Interna", "Lançamento de Dados"), `tarefa` (com fallback `"Tarefa não informada"`), `projeto`, `cliente` (nome do cliente/projeto Clockify — **texto livre, não é FK para `erp.clientes`**), `categoria` (`"Cliente"` ou `"Terra - Interno"` — distingue trabalho faturável a cliente de trabalho interno), `atualizado_em` |

## Chaves e relacionamentos

### FKs declaradas no banco (constraint real)
- `tecnicos.user_id` → `usuarios.id_usuario`
- `tecnicos.base_id` → `base.id_base`

Todas as demais tabelas têm **apenas PK declarada** — nenhuma outra FK é imposta pelo banco. Os relacionamentos abaixo foram **inferidos por correspondência de valores** (`JOIN`/`NOT IN` testado diretamente nos dados) e pelas 3 views existentes, não por constraint:

| Coluna | Referencia | Cobertura observada |
|---|---|---|
| `clientes.id_base` | `base.id_base` | 340/373 (33 `NULL`, 0 órfã) |
| `clientes.id_gerente` | `tecnicos.id_tecnico` (**não** `usuarios` — confirmado por teste de correspondência: 288/289 batem com `tecnicos`, só coincidência parcial com `usuarios`) | 288/289 preenchidos (84 `NULL`, 1 órfã) |
| `clientes.tecnico_id` | `tecnicos.id_tecnico` | 285/285 preenchidos, 0 órfã (88 `NULL`) |
| `cliente_fazendas.cliente_id` | `clientes.id_cliente` | 279/280 (1 órfã) |
| `cliente_fazendas.base_id` | `base.id_base` | não testado individualmente, mesmo padrão de `clientes.id_base` esperado |
| `cliente_fazendas.gerente_id` | `tecnicos.id_tecnico` | mesmo padrão de `clientes.id_gerente` |
| `contratos.cliente_id` | `clientes.id_cliente` | 403/403, 0 órfã — **FK de fato íntegra** |
| `contrato_fazendas.contrato_id` | `contratos.id_contrato` | 364/372 (8 órfãs, 0 `NULL`) |
| `contrato_fazendas.cliente_fazenda_id` | `cliente_fazendas.id_cliente_fazenda` | 366/372 (6 órfãs, 0 `NULL`) |
| `valor_produto.contrato_id` | `contratos.id_contrato` | 697/712 (15 órfãs, 0 `NULL`) |
| `valor_produto.produto_id` | `produtos.id_produto` | 712/712, 0 órfã — **FK de fato íntegra** |
| `colaboradores.funcao_id` | `funcoes.id_funcao` | 90/100 (2 `NULL`, 8 órfãs) |

**Cuidado**: como as FKs acima não são impostas pelo banco, ao fazer `JOIN` prefira `LEFT JOIN` (nunca `INNER JOIN` assumindo 100% de cobertura) e esteja ciente de que uma pequena fração das linhas (tipicamente 2%–5%) não vai casar — isso é comportamento normal da base, não erro de query.

### Colunas codificadas sem tabela de lookup nesta conexão
Estes campos guardam um código, mas a tabela que explicaria o código **não existe** neste schema — não adivinhe o significado, reporte o código bruto ou pergunte ao usuário se ele souber a legenda de origem (provavelmente vive no sistema ERP fonte, fora desta base):
- `clientes.pais` (valores `1`, `2`, `3` — pela nacionalidade dos nomes de cliente/projeto na amostra, provavelmente Brasil/Paraguai/Bolívia ou similar, mas **não confirmado**, não afirmar)
- `contratos.forma_pagamento_id`
- `contrato_fazendas.categoria` (`C`/`O`/`R`)
- `produtos.plano_conta_id`, `produtos.forma_base_calculo` (`1`–`4`), `produtos.opcao_valor_constante` (`C`/`F`)
- `colaboradores.motivo_desligamento` (`D`/`P`)

## Observações de qualidade de dado

- **Todas as tabelas foram carregadas/atualizadas na mesma janela de tempo** (`atualizado_em` na casa de `2026-08-11T01:34:xx` para praticamente todas as tabelas `erp`, exceto `clockify.time_entries` que atualiza continuamente até o dia corrente) — indício de pipeline de ETL batch diário para o `erp` e near-real-time para o `clockify`.
- **`deleted_at` existe em `clientes`, `contratos`, `produtos` e `usuarios` mas nunca está preenchido** na base inteira (checado via `count(*) FILTER (WHERE deleted_at IS NOT NULL)` = 0 em todas) — soft delete não está em uso aqui, ou os registros deletados na origem simplesmente não chegam pelo ETL. Não assumir que `deleted_at IS NULL` prova "cliente nunca foi removido" na origem.
- **Campos numéricos/booleanos como `text`** (ver seção de tipagem acima) — sempre fazer cast explícito antes de comparar/ordenar/somar.
- **`cliente` em `contratos` e `nome`/`tecnico` desnormalizados em outras tabelas** são cópias de texto capturadas no momento do ETL — para o nome atual e canônico, prefira sempre a tabela dimensão (`clientes.nome_cliente`, `tecnicos.nome`) via `JOIN` pelo ID, não a coluna de texto solto.
- **`clockify.time_entries.cliente` e `.projeto` são texto livre do Clockify**, não uma FK para `erp.clientes` — os nomes podem não bater exatamente (ex. abreviações, "TERRA - INTERNO" não existe em `erp.clientes`). Para cruzar horas trabalhadas com um cliente do ERP, normalizar nome antes de comparar, mesma lógica documentada em `mapeamento-lks-zeus-int.md` para o cruzamento Zeus↔Protector.
- **`funcao_id` em `colaboradores` tem órfãs (8) e nulas (2)** — nem todo colaborador tem função resolvível via `funcoes`.

## Cruzamento clockify ↔ erp (dentro da própria base)

Não há FK entre os dois schemas, mas existe uma chave de fato confiável: **`clockify.time_entries.email` = `erp.usuarios.email`** — testado nos dados: dos 50 e-mails distintos em `time_entries`, 49 batem exatamente com `usuarios.email` (a única exceção, `estagioterraparana@gmail.com`, é uma conta genérica de estágio, não um erro de dado). Como `erp.tecnicos.user_id` referencia `usuarios.id_usuario`, dá pra encadear `time_entries.email → usuarios.id_usuario → tecnicos.id_tecnico` (ou usar direto a view `tecnicos_completo`, que já expõe `email` resolvido — 48/50 batem com ela, a diferença de 1 a mais em relação a `usuarios` é porque nem todo usuário é técnico).

Use essa chave para perguntas que cruzam horas lançadas (Clockify) com dados de contrato/cliente/base do técnico no ERP — por exemplo "quantas horas o técnico responsável pelo cliente X lançou este mês": junte `clockify.time_entries.email` com `erp.tecnicos_completo.email` (ou `erp.usuarios.email`) para chegar em `id_tecnico`, e a partir daí em `clientes.tecnico_id`.

**Não** use `clockify.time_entries.tecnico` (nome em texto livre) nem `clockify.time_entries.cliente`/`.projeto` como chave de junção — normalização de nome é mais frágil que o e-mail, que já casa quase 1:1.
