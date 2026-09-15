# Mapeamento da base LKS_PROTECTOR_DATABASE

> Levantamento feito consultando `information_schema` (schemas, tabelas, views, colunas), contagem de linhas (`count(*)`) e amostras de dados (`LIMIT`) diretamente na conexão, em 2026-08-08. Banco **Postgres** usado como área de *staging* (prefixo `stg_`) alimentada por pipeline de ETL.

Origem dos dados: sistema **Protector** — monitoramento/scouting de pragas e doenças em campo (talhões, safras, variedades, pontos de amostragem). Cobre 9 propriedades/fazendas: Dourado, Bacaba, Globo, Pesquisa Guapirama, SM3, Nebraska, Siriema, Três Flechas, Guapirama.

## Schemas
- `DATABASE` — schema ativo, com a maioria dos dados atuais.
- `public` — schema legado/duplicado; a maior parte está vazia, exceto `public.stg_window` (ver observação abaixo).
- `information_schema`, `pg_catalog`, `pg_toast` — catálogo interno do Postgres, sem dado de negócio.

## Tabelas — schema `DATABASE`

| Tabela | Linhas | O que é | Colunas |
|---|---|---|---|
| `stg_property` | 9 | Cadastro mestre de propriedades/fazendas | `propriedade`, `id_propriedade` |
| `stg_fields` | 586 | Cadastro de talhões (fields) por propriedade | `propriedade`, `id_propriedade`, `field_name`, `field_id`, `field_area` |
| `stg_seasons` | 45 | Safras por propriedade (ex. "Soja 23/24", "Milho 24/25") | `propriedade`, `id_propriedade`, `season_name`, `season_id`, `active` (Y/N) |
| `stg_season_field` | 1.554 | Vínculo propriedade × safra × talhão | `propriedade`, `property_id`, `season_id`, `field_id` |
| `stg_variety` | 7.898 | Catálogo de variedades de cultivares (soja, milho, algodão, uva etc. — parece ser o catálogo global da plataforma Protector, não só das 9 fazendas) | `varietyid`, `variety` |
| `stg_varietyfield` | 915 | Vínculo variedade × talhão × safra | `propriedade`, `property_id`, `season_id`, `season_name`, `active`, `field_id`, `variety` |
| `stg_window` | 12.693 | Janelas de monitoramento (rodadas de vistoria) por área/safra | `idwindow`, `property_id`, `season_id`, `startdate`, `enddate`, `area_id`, `data_atualizacao` |
| `stg_monitoring` | 186.984 | Vínculo janela × vistoriador × ponto de amostragem | `idwindow`, `scouter`, `idpoint` |
| `stg_sc_points` | 3.692.532 | **Tabela fato principal** — leitura de indicadores de praga/doença por ponto de amostragem (ex. "Presença de ácaro", "% de plantas infestadas") | `idwindow`, `id`, `name` (praga), `id_indicator`, `indicator`, `value` |
| `stg_workers` | 190 | Cadastro de vistoriadores/scouts | `name`, `id` |
| `stg_fields_pims` | 7.863 | De/para entre unidades do sistema PIMS e nomenclatura de safra/variedade do Protector | `unidade`, `cd_upnivel3`, `de_upnivel3`, `de_per_safra`, `de_safra`, `safra_protector`, `de_variedade` |
| `stg_teste` | 34.084 | **Log técnico de ETL**, não é dado de negócio — guarda requisições feitas à API do Protector (token, endpoint, params, resultado bruto) | `Authorization`, `constant`, `property_id`, `area_id`, `season_id`, `startdate`, `enddate`, `idwindow`, `data_atualizacao`, `urlmonitoring`, `X-Company-Id`, `result`, `scouter`, `idpoint` |
| `stg_token` | 1 | Token Bearer atual usado pelo ETL para autenticar na API do Protector — **credencial sensível** | `Authorization` |

## Tabelas — schema `public` (legado)

| Tabela | Linhas | Observação |
|---|---|---|
| `stg_window` | 15.765 | Versão anterior de `DATABASE.stg_window`, colunas ligeiramente diferentes (tem `field_id` direto em vez de `area_id`). **Tem mais linhas que a versão em `DATABASE`** — checar com o time qual é a fonte de verdade antes de usar. |
| `lookup table` | 0 | Mesma estrutura de `stg_sc_points`, mas vazia — mirror não usado. |
| `stg_token` | 0 | Vazia — duplicata não usada. |

## Observações de qualidade de dado
- Colunas de texto como `propriedade`, `property_id`, `season_id`, `field_id` em algumas tabelas (`stg_season_field`, `stg_varietyfield`, `stg_seasons`) são `character` (fixed-width) e vêm **com espaços de padding à direita** — sempre usar `TRIM()` ao comparar/agrupar por esses campos.
- `stg_variety` parece ser um catálogo compartilhado da plataforma (tem variedades de uva, ex. "Malvasia Branca", que não fazem sentido para as 9 fazendas de grãos) — não assumir que toda variedade do catálogo está de fato plantada em algum talhão sem checar `stg_varietyfield`.
- `stg_teste` e `stg_token`, apesar do nome/localização, são artefatos técnicos do pipeline, não dados para responder pergunta de negócio.

## Fórmulas de cálculo

@docs/Instrucoes/inst_protector.md


## Cruzamento com LKS_ZEUS_INT

Não há chave técnica direta entre `LKS_PROTECTOR_DATABASE` e `LKS_ZEUS_INT` (base de clima — ver `docs/mapeamento-lks-zeus-int.md`) — o vínculo é pelo **nome da fazenda/propriedade**, e os nomes **não são idênticos** entre as duas bases:

| Protector (`stg_property.propriedade`) | Zeus (`stg_zeus_picarea.farm`) |
|---|---|
| Dourado | Fazenda Dourado |
| Bacaba | (não encontrado em `stg_zeus_picarea`, checar `BACABA` nas views) |
| Globo | Faz. Globo |
| SM3 | Faz_SM3 |
| Nebraska | Fazenda Nebraska |
| Siriema | SIRIEMA |
| Três Flechas | Três Flechas / Faz. Três Flechas |
| Guapirama | Faz. Guapirama |

Para cruzar praga/scouting (Protector) com clima (Zeus) por fazenda e data, normalize o nome da fazenda dos dois lados antes do `JOIN` — não dá para confiar em igualdade direta de string.
