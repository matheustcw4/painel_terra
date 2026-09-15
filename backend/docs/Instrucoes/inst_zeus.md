## Fórmulas de cálculo — cuidado com agregação ingênua

Métricas climáticas (pluviometria, temperatura, umidade) têm ~24 leituras por dia por PIC, e cada fazenda tem várias PICs. Uma agregação direta mistura essas duas dimensões e devolve um número plausível, mas errado.

### Pluviometria diária por fazenda

**Errado** — soma tudo de uma vez, mistura leitura×tempo com leitura×estação:
```sql
SELECT SUM(pluviometria) FROM vw_pluviometria WHERE unidade = 'dourado' AND data = '2026-01-18'
```

**Correto** — duas etapas: reduz as leituras do dia a um valor por PIC, só depois soma entre PICs:
```sql
SELECT unidade, SUM(pluviometria) AS pluviometria
FROM (
    SELECT unidade, pic, AVG(pluviometria) AS pluviometria
    FROM vw_pluviometria
    WHERE unidade = 'dourado' AND data = '2026-01-18'
    GROUP BY unidade, pic
) t
GROUP BY unidade
```

Por quê: a média por PIC reduz as ~24 leituras do dia a um valor representativo daquela estação; só então soma-se entre estações pra obter o total da fazenda.