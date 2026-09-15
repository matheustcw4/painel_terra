# Mapeamento da base LKS_ZEUS_INT

> Levantamento feito consultando `information_schema` (schemas, tabelas, views, colunas), contagem de linhas (`count(*)`) e amostras de dados (`LIMIT`) diretamente na conexão, em 2026-08-08. Banco **Postgres** usado como área de *staging* (prefixo `stg_`) alimentada por pipeline de ETL (Pentaho, a julgar por `stg_teste_pentaho`).

Origem dos dados: sistema **Zeus** — rede de estações meteorológicas em campo (identificadas por `picid`/`PIC`), cobrindo pluviometria, temperatura, umidade e radiação solar, mais previsão do tempo. Cobre as fazendas: Globo, Guapirama, Três Flechas, SM3, Dourado, Nebraska, Siriema (nomenclatura de fazenda inconsistente entre tabelas, ver observações).

## Schemas
- `DATABASE` — único schema com tabelas de negócio (13 tabelas + 4 views).
- `public`, `information_schema`, `pg_catalog`, `pg_toast` — sem tabelas de negócio.

## Tabelas — schema `DATABASE`

| Tabela | Linhas | O que é | Colunas |
|---|---|---|---|
| `stg_zeus_picarea` | 975 | **Dimensão central** — vincula cada estação (`picid`) à fazenda, talhão e coordenadas geográficas | `talhao`, `areaid`, `picid`, `picname`, `farmdid`, `farm`, `lat`, `lon` |
| `stg_climatemonitoring` | 2.285.733 | Leituras climáticas brutas por estação (versão original, tipos `numeric`) | `idprecipitation`, `picid`, `name`, `data`, `pluviometria`, `temperaturains`, `humidadeins`, `humidademax`, `humidademin`, `temperaturamax`, `temperaturamin`, `solarirradiation` |
| `stg_climatemonitoring2` | 5.882.794 | **Fonte usada pelas 4 views** — mesma estrutura de `stg_climatemonitoring`, tipos `double precision`, mais linhas (reprocessamento/nova ingestão). Contém linhas com todas as métricas nulas para um dado `picid`/data (estação sem leitura naquele momento). | idem |
| `stg_pluviometry_pims` | 24.182 | Pluviometria histórica agregada por fazenda vinda do sistema PIMS (linhagem separada das estações Zeus, dados desde 2015) | `de_uni_adm`, `dt_leitura`, `acumulado_diario_fazenda`, `qtd_diario_fazenda`, `media_diaria`, `class_data_10_10`, `mes_referencia`, `ano_safra`, `acumulado_10_10`, `acumulado_mensal` |
| `stg_field_data` | 472.901 | Pluviometria por talhão/data | `unidade`, `fieldname`, `data`, `pluviometry` |
| `stg_picstatus` | 964.660 | **Log de heartbeat/status** das estações — um snapshot por busca, não estado atual (precisa `MAX("data busca")` por `picid` para pegar o status corrente) | `picid`, `picname`, `location`, `onlymonitoring`, `hassolarsensor`, `haswindsensor`, `status`, `"data busca"`, `id` |
| `stg_log_alertpic` | 7.229 | Log de alertas por estação (ex. falha de comunicação — código `CNP`) | `id_alert`, `picid`, `picname`, `status`, `alert`, `date_start_event`, `date_end_event` |
| `stg_short_forecast` | 252 | Previsão de chuva diária por estação | `picid`, `name`, `day`, `forecast`, `rainprobability`, `rainprobabilitylabel` |
| `stg_middle_forecast` | 72 | Previsão de chuva semanal (janelas de 7 dias) por estação | `picid`, `name`, `startdate`, `enddate`, `rain` |
| `stg_long_forecast` | 126 | Previsão de chuva mensal por estação, com comparação à média histórica | `picid`, `name`, `date`, `rainhistoricalaverage`, `rain`, `rainmin`, `rainmax`, `rainminperformance` |
| `stg_forecast` | 0 | Vazia — parece substituída pelas 3 tabelas de forecast acima. |
| `stg_token` | 1 | Token Bearer usado pelo ETL para autenticar na API do Zeus — **credencial sensível** | `token` |
| `stg_teste_pentaho` | 1 | Heartbeat técnico do job Pentaho (timestamp da última execução) — não é dado de negócio | `"data agora"` |

## Views — schema `DATABASE`

Todas as 4 views combinam `stg_climatemonitoring2` com `stg_zeus_picarea` e normalizam o nome da fazenda via `CASE` fixo para: `SM3`, `SIRIEMA`, `BACABA`, `TRES FLECHAS`, `GLOBO`, `GUAPIRAMA`, `DOURADO`.

| View | Grão | Métrica |
|---|---|---|
| `vw_precipitacao` | fazenda × dia × safra | Pluviometria média diária da fazenda |
| `vw_precipitacao_talhao` | fazenda × talhão × dia × safra | Pluviometria média diária do talhão |
| `vw_humidade` | fazenda × dia | Umidade mín/média/máx diária da fazenda |
| `vw_humidade_talhao` | fazenda × talhão × dia × safra | Umidade mín/média/máx diária do talhão |

`ano_safra` é calculado nas views: meses ≥ setembro pertencem à safra `AAAA/AA+1`, meses < setembro à safra `AAAA-1/AA`.

## Observações de qualidade de dado
- **`farm` não é padronizado** entre `stg_zeus_picarea` e o restante do pipeline: valores observados incluem `Faz. Globo`, `Faz_SM3`, `Fazenda Nebraska`, `Três Flechas` **e** `Faz. Três Flechas` (dois `farmdid` distintos — 20348 e 2869 — mapeando para o mesmo talhão/estação), além de `Semi Confinamento`, que **não está** na lista de `CASE` das views.
- Como consequência, **qualquer estação cujo `farm` não bata exatamente com uma das 7 strings do `CASE` cai como `farm = NULL` nas 4 views** e é descartada dos agregados por fazenda — ex.: `Semi Confinamento` fica de fora. Antes de afirmar "não há dado de chuva/umidade para X", vale checar `stg_zeus_picarea` e `stg_climatemonitoring2` diretamente, não só as views.
- `stg_climatemonitoring2` tem linhas com todas as métricas nulas — não assumir que existência de linha implica leitura válida.
- `stg_pluviometry_pims` é uma linhagem de dado totalmente separada das estações Zeus (`stg_climatemonitoring*`) — não misturar as duas ao comparar pluviometria.

## Fórmulas de cálculo

@docs/Instrucoes/inst_zeus.md

## Cruzamento com LKS_PROTECTOR_DATABASE

Não há chave técnica direta entre `LKS_ZEUS_INT` e `LKS_PROTECTOR_DATABASE` (base de scouting de pragas — ver `docs/mapeamento-lks-protector-database.md`) — o vínculo é pelo **nome da fazenda/propriedade**, e os nomes **não são idênticos** entre as duas bases:

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

Para cruzar clima (Zeus) com praga/scouting (Protector) por fazenda e data, normalize o nome da fazenda dos dois lados antes do `JOIN` — não dá para confiar em igualdade direta de string.
