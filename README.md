# The 500MB Club — Leaderboard

Dashboard estático (GitHub Pages) do Pi-Bench. Mostra o ranking das submissões
com **filtro** (participante / submissão / stack) e **ordenação por coluna**.

🔗 <https://the500mbclub.github.io>

## Como funciona

- [`leaderboard.json`](leaderboard.json) é a **única fonte da verdade** —
  metadados, colunas e dados crus por submissão.
- [`index.html`](index.html) + [`assets/app.js`](assets/app.js) buscam esse JSON
  e montam o dashboard. Sem build, sem dependências.
- Tudo que é **derivado** é calculado na página a partir dos números crus:
  posição (#) pelo `score`, medalha 🥇 pelo maior valor de cada dimensão, e
  ênfase **negrito**/_itálico_ pelos limiares em `thresholds`. Você só edita
  números.

## Schema do `leaderboard.json`

```jsonc
{
  "meta": {
    "title": "Pi-Bench — Leaderboard",
    "updated": "2026-05-25T15:22:47-03:00",   // ISO 8601 data+hora
    "intro": "… markdown inline …",
    "legend": ["… markdown inline …"]
  },
  "thresholds": { "above": 1.15, "below": 0.6 }, // ≥above → negrito; <below → itálico
  "columns": [                                    // colunas de dimensão/info (ordem importa)
    { "key": "capacity", "label": "Capacidade", "weight": 0.25, "scored": true }
    // scored:false → coluna informativa (lê de observed, sem medalha/ênfase)
  ],
  "submissions": [
    {
      "id": "zig",                 // submissão (linguagem); coluna Submissão
      "user": "gandarez",          // participante; coluna Participante
      "repo_url": "https://…",     // opcional; vira link no id
      "stack": ["zig", "redis"],   // exibida como texto pequeno abaixo do id
      "score": 211.3,              // score global (base do ranking)
      "gated": false,
      "gate_reasons": [],          // tooltip do badge ⚠️ gated
      "dimensions": { "capacity": 1.2, "efficiency": 3.61 },  // valores das colunas scored
      "observed": { "rss_p95_mb": 132.3, "image_mb": 2.04 }   // métricas cruas (espelha profile.json)
    }
  ],
  "preview": {
    "updated": "2026-05-25T15:22:47-03:00",       // ISO 8601; timestamp do último PUT do runner
    "submissions": [                              // mesmo shape de `submissions`; score NÃO é exibido na Prévia
      { "id": "zig", "user": "gandarez", "dimensions": { "capacity": 1.2 }, "observed": { "rss_p95_mb": 132.3 } }
    ]
  }
}
```

As colunas fixas `#`, `Submissão` (id), `Participante` (user) e `Score` são do
layout; o array `columns` define só as dimensões/colunas informativas.

O nó `preview` é **opcional** e alimenta a aba **Prévia** do dashboard: resultados
auto-gerados pelo runner a cada submissão, que **não contam para o ranking final**
(métricas podem estar incompletas e variar entre execuções). Suas linhas usam o
mesmo shape de `submissions`, mas o **score não é mostrado** e cada aba tem seu
próprio `updated` (Final = `meta.updated`; Prévia = `preview.updated`). Ausência do
nó simplesmente esconde a aba — `leaderboard.json` antigo continua válido.

## Atualizar o ranking

Edite [`leaderboard.json`](leaderboard.json) (ou regenere a partir dos
`profile.json`/`me.json` do pipeline) e dê commit. O dashboard reflete no próximo
deploy do Pages — não há nada para recompilar.

## Rodar localmente

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```
