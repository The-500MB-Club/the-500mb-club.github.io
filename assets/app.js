/*
 * The 500MB Club — leaderboard dashboard.
 *
 * leaderboard.json is the single source of truth: columns, metadata and raw
 * submission data. This script fetches that file and builds a filterable,
 * sortable table. All derived values — rank (#), medals 🥇, bold/italic
 * emphasis — are computed here from raw numbers. No external dependencies.
 */
(function () {
  'use strict';

  var MEDAL = '\u{1F947}'; // 🥇
  var DASH = '—';

  // ---------------------------------------------------------------- i18n
  var STRINGS = {
    pt: {
      colRank: '#', colUser: 'Participante', colId: 'Submissão', colScore: 'Score',
      colLabels: {
        capacity: 'Capacidade', efficiency: 'Eficiência', tail_latency: 'Latência p99',
        resilience: 'Resiliência', stability: 'Estabilidade', footprint: 'Footprint'
      },
      filterPlaceholder: 'Filtrar por participante, submissão ou stack… (ex.: gandarez, zig, redis)',
      countAll:      function (n) { return n + ' submissões'; },
      countFiltered: function (n, total) { return n + ' de ' + total + ' submissões'; },
      noMatch:    'Nenhuma submissão corresponde ao filtro.',
      noMetrics:  'Sem métricas observadas.',
      loadError:  'Não foi possível carregar o leaderboard.json. Verifique a conexão e recarregue a página.',
      gatedTitle: 'falhou uma pré-condição',
      dimLeader:  'líder da dimensão',
      updatedAt:  'atualizado em ',
      deadlinePrefix: 'Encerramento das submissões: ',
      deadlineSuffix: ' UTC',
      source:     'Fonte',
      repository: 'repositório',
      sponsorsTitle: 'Patrocínio',
      howToRead:     'Como ler',
      detailMetrics: 'Métricas no detalhe',
      clickToExpand: '(clique em qualquer linha para expandir)',
      viewFinal: 'Final',
      viewPreview: 'Prévia',
      disclaimerPreview: 'Resultados de prévia gerados automaticamente pelo runner a cada submissão. **Não contam para o ranking final** — métricas podem estar incompletas e variar entre execuções. O **score não é exibido** na prévia, pois nem todas as dimensões são medidas.',
      locale: 'pt-BR',
      intro:  null,   // null = usa do JSON
      legend: null,   // null = usa do JSON
      obsLabels: {
        steady_error:     'Taxa de erro',
        capacity_max_rps: 'RPS máx (cap.)',
        p99_post:         'p99 POST (ms)',
        p99_batch:        'p99 batch (ms)',
        p99_range:        'p99 range (ms)',
        p99_anomaly:      'p99 anomaly (ms)',
        spike_p99:        'p99 spike (ms)',
        spike_error:      'Erro no spike',
        rss_p95_mb:       'RSS p95 (MB)',
        cpu_avg_pct:      'CPU médio (%)',
        image_mb:         'Imagem (MB)',
        cold_start_s:     'Cold start (s)',
        latency_drift:    'Drift latência',
        rss_drift:        'Drift RSS'
      },
      obsGroups: [
        { label: 'Capacidade', entries: [
          { key: 'capacity_max_rps', label: 'RPS máx (cap.)', desc: 'Throughput máximo sustentável encontrado no teste de capacidade — o "joelho" da curva dentro do SLO (p99 < alvo e erro < 0,5%).' }
        ]},
        { label: 'Erros', entries: [
          { key: 'steady_error', label: 'Taxa de erro',  desc: 'Fração de requisições com erro durante o steady-state (200 RPS alvo). Valores esperados abaixo de 0,5%.' },
          { key: 'spike_error',  label: 'Erro no spike', desc: 'Fração de erros durante o pico súbito de carga.' }
        ]},
        { label: 'Latência p99', entries: [
          { key: 'p99_post',    label: 'p99 POST',    desc: 'Percentil 99 das escritas individuais de telemetria, em ms.' },
          { key: 'p99_batch',   label: 'p99 batch',   desc: 'Percentil 99 das escritas em lote, em ms.' },
          { key: 'p99_range',   label: 'p99 range',   desc: 'Percentil 99 das consultas de intervalo temporal, em ms.' },
          { key: 'p99_anomaly', label: 'p99 anomaly', desc: 'Percentil 99 das consultas de detecção de anomalia, em ms.' },
          { key: 'spike_p99',   label: 'p99 spike',   desc: 'Percentil 99 durante o pico de carga, em ms.' }
        ]},
        { label: 'Recursos', entries: [
          { key: 'rss_p95_mb',   label: 'RSS p95 (MB)',   desc: 'Memória física (Resident Set Size) no percentil 95 durante o steady-state.' },
          { key: 'cpu_avg_pct',  label: 'CPU médio (%)',  desc: 'Uso médio de CPU durante o steady-state.' },
          { key: 'image_mb',     label: 'Imagem (MB)',    desc: 'Tamanho da imagem Docker publicada no registry.' },
          { key: 'cold_start_s', label: 'Cold start (s)', desc: 'Tempo até o serviço responder à primeira requisição após o start.' }
        ]},
        { label: 'Estabilidade', entries: [
          { key: 'latency_drift', label: 'Drift latência', desc: 'Variação do p99 entre início e fim do steady-state. Positivo = latência cresceu (possível degradação).' },
          { key: 'rss_drift',     label: 'Drift RSS',      desc: 'Variação da memória RSS entre início e fim do steady-state. Positivo = crescimento de memória (possível leak).' }
        ]}
      ]
    },
    en: {
      colRank: '#', colUser: 'Participant', colId: 'Submission', colScore: 'Score',
      colLabels: {
        capacity: 'Capacity', efficiency: 'Efficiency', tail_latency: 'Tail Latency p99',
        resilience: 'Resilience', stability: 'Stability', footprint: 'Footprint'
      },
      filterPlaceholder: 'Filter by participant, submission or stack… (e.g.: gandarez, zig, redis)',
      countAll:      function (n) { return n + ' submissions'; },
      countFiltered: function (n, total) { return n + ' of ' + total + ' submissions'; },
      noMatch:    'No submissions match the filter.',
      noMetrics:  'No observed metrics.',
      loadError:  'Could not load leaderboard.json. Check your connection and reload the page.',
      gatedTitle: 'failed a pre-condition',
      dimLeader:  'dimension leader',
      updatedAt:  'updated at ',
      deadlinePrefix: 'Submissions close: ',
      deadlineSuffix: ' UTC',
      source:     'Source',
      repository: 'repository',
      sponsorsTitle: 'Sponsored by',
      howToRead:     'How to read',
      detailMetrics: 'Detail metrics',
      clickToExpand: '(click any row to expand)',
      viewFinal: 'Final',
      viewPreview: 'Preview',
      disclaimerPreview: 'Preview results are auto-generated by the runner for each submission. **They do not count toward the final ranking** — metrics may be incomplete and vary between runs. The **score is not shown** in the preview, since not all dimensions are measured.',
      locale: 'en-US',
      intro: 'Score relative to an **absolute target profile** (latency SLO + budget of 2 CPU / 500 MB). **100 = meets the target**, >100 = exceeds it. The **global score** (weighted average of dimensions × 100) is the **sole ranking criterion**; 🥇 marks the leader of each dimension.',
      legend: [
        '**Score** is the weighted average of dimensions × 100, anchored to **absolute targets** (SLO + budget), not to any implementation. Weights: efficiency 32%, capacity 27%, p99 latency 20%, resilience 13%, stability 8%.',
        '**100 = meets the target profile** (fulfills SLOs and fits the budget). Above 100 = exceeds the target; efficiency and capacity drive the separation at the top.',
        '🥇 marks the **leader of each dimension** — different languages can win different axes.',
        'A dimension **in bold** is ≥15% above target; _in italics_ >40% below; **—** = not yet measured (excluded, weights renormalized).',
        '⚠️ _gated_ = failed a pre-condition (error > 0.5% under load, or exceeded 500 MB / 2 CPU): removed from the podium, not silently disqualified.',
        'Metric-by-metric detail for each submission is in the corresponding `observed`.'
      ],
      obsLabels: {
        steady_error:     'Error rate',
        capacity_max_rps: 'Max RPS (cap.)',
        p99_post:         'p99 POST (ms)',
        p99_batch:        'p99 batch (ms)',
        p99_range:        'p99 range (ms)',
        p99_anomaly:      'p99 anomaly (ms)',
        spike_p99:        'p99 spike (ms)',
        spike_error:      'Spike error',
        rss_p95_mb:       'RSS p95 (MB)',
        cpu_avg_pct:      'Avg CPU (%)',
        image_mb:         'Image (MB)',
        cold_start_s:     'Cold start (s)',
        latency_drift:    'Latency drift',
        rss_drift:        'RSS drift'
      },
      obsGroups: [
        { label: 'Capacity', entries: [
          { key: 'capacity_max_rps', label: 'Max RPS (cap.)', desc: 'Maximum sustainable throughput found in the capacity test — the "knee" of the curve within the SLO (p99 < target and error < 0.5%).' }
        ]},
        { label: 'Errors', entries: [
          { key: 'steady_error', label: 'Error rate',  desc: 'Fraction of requests with errors during steady-state (target 200 RPS). Expected values below 0.5%.' },
          { key: 'spike_error',  label: 'Spike error', desc: 'Fraction of errors during a sudden load spike.' }
        ]},
        { label: 'p99 Latency', entries: [
          { key: 'p99_post',    label: 'p99 POST',    desc: '99th percentile of individual telemetry writes, in ms.' },
          { key: 'p99_batch',   label: 'p99 batch',   desc: '99th percentile of batch writes, in ms.' },
          { key: 'p99_range',   label: 'p99 range',   desc: '99th percentile of time-range queries, in ms.' },
          { key: 'p99_anomaly', label: 'p99 anomaly', desc: '99th percentile of anomaly-detection queries, in ms.' },
          { key: 'spike_p99',   label: 'p99 spike',   desc: '99th percentile during a load spike, in ms.' }
        ]},
        { label: 'Resources', entries: [
          { key: 'rss_p95_mb',   label: 'RSS p95 (MB)',   desc: 'Physical memory (Resident Set Size) at the 95th percentile during steady-state.' },
          { key: 'cpu_avg_pct',  label: 'Avg CPU (%)',    desc: 'Average CPU usage during steady-state.' },
          { key: 'image_mb',     label: 'Image (MB)',     desc: 'Size of the published Docker image in the registry.' },
          { key: 'cold_start_s', label: 'Cold start (s)', desc: 'Time until the service responds to the first request after starting.' }
        ]},
        { label: 'Stability', entries: [
          { key: 'latency_drift', label: 'Latency drift', desc: 'Change in p99 between start and end of steady-state. Positive = latency increased (possible degradation).' },
          { key: 'rss_drift',     label: 'RSS drift',     desc: 'Change in RSS memory between start and end of steady-state. Positive = memory growth (possible leak).' }
        ]}
      ]
    }
  };

  var OBS_FMT = {
    steady_error:  function (v) { return v === 0 ? '0 %' : (v * 100).toFixed(3) + ' %'; },
    spike_error:   function (v) { return v === 0 ? '0 %' : (v * 100).toFixed(3) + ' %'; },
    cpu_avg_pct:   function (v) { return Math.round(v) + ' %'; },
    latency_drift: function (v) {
      var pct = (v - 1) * 100;
      return (pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(1) + ' %';
    },
    rss_drift: function (v) {
      var pct = (v - 1) * 100;
      return (pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(1) + ' %';
    }
  };

  // ---------------------------------------------------------------- helpers
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inlineMd(s) {
    var h = escapeHtml(s);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/_([^_]+)_/g, '<em>$1</em>');
    return h;
  }
  function fmtScore(v) { return v == null ? DASH : Number(v).toFixed(1); }
  function fmtDim(v)   { return v == null ? DASH : Number(v).toFixed(2); }
  function fmtInfo(v)  { return v == null ? DASH : String(+Number(v).toFixed(4)); }
  function fmtUpdated(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    try {
      return d.toLocaleString(STRINGS[state.lang].locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  // --------------------------------------------------------------- state
  var state = {
    data: null,
    cols: [],
    medals: {},
    above: 1.15,
    below: 0.6,
    filter: '',
    sortCol: 0,
    sortDir: 'asc',
    expanded: {},
    lang: (function () { try { return localStorage.getItem('lang') || 'pt'; } catch (e) { return 'pt'; } })(),
    view: (function () { try { return localStorage.getItem('view') || 'final'; } catch (e) { return 'final'; } })()
  };

  function t(key) { return STRINGS[state.lang][key]; }

  // activeSubmissions devolve o array de linhas da visao atual. Defensivo
  // contra `data.preview` ausente (leaderboard.json antigo, ou primeira
  // execucao ainda sem prévia escrita).
  function activeSubmissions(data) {
    if (!data) return [];
    if (state.view === 'preview') {
      return (data.preview && data.preview.submissions) || [];
    }
    return data.submissions || [];
  }

  // activeUpdated devolve o timestamp "updated" da visao atual. Cada visao
  // tem o seu (Final = meta.updated curado a mao; Prévia = preview.updated
  // do ultimo PUT do runner).
  function activeUpdated(data) {
    if (!data) return '';
    if (state.view === 'preview') {
      return (data.preview && data.preview.updated) || '';
    }
    return (data.meta && data.meta.updated) || '';
  }

  function buildColumns(data) {
    var s = STRINGS[state.lang];
    var cols = [
      { kind: 'rank',  label: s.colRank,  align: 'center', def: 'asc' },
      { kind: 'user',  label: s.colUser,  align: 'left',   def: 'asc' },
      { kind: 'id',    label: s.colId,    align: 'left',   def: 'asc' },
      { kind: 'score', label: s.colScore, align: 'right',  def: 'desc' }
    ];
    (data.columns || []).forEach(function (c) {
      var label = (s.colLabels && s.colLabels[c.key]) || c.label;
      cols.push({
        kind: c.scored ? 'dim' : 'info',
        key: c.key, label: label, scored: !!c.scored, weight: c.weight,
        align: 'right', def: 'desc'
      });
    });
    return cols;
  }

  function colValue(col, sub) {
    switch (col.kind) {
      case 'rank':  return sub._rank;
      case 'id':    return sub.id;
      case 'user':  return sub.user || '';
      case 'score': return sub.score;
      case 'dim':   return sub.dimensions ? sub.dimensions[col.key] : null;
      case 'info':  return sub.observed   ? sub.observed[col.key]   : null;
    }
    return null;
  }

  function computeDerived(data) {
    var subs = activeSubmissions(data);
    subs.filter(function (s) { return !s.gated; })
      .slice()
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); })
      .forEach(function (s, i) { s._rank = i + 1; });
    subs.forEach(function (s) { if (s.gated) s._rank = null; });
    state.medals = {};
    var eps = 1e-9;
    (data.columns || []).forEach(function (c) {
      if (!c.scored) return;
      var vals = subs
        .filter(function (s) { return !s.gated && s.dimensions && s.dimensions[c.key] != null; })
        .map(function (s) { return { v: s.dimensions[c.key], id: s.id }; })
        .sort(function (a, b) { return b.v - a.v; });
      if (!vals.length) return;
      if (vals.length === 1 || vals[0].v - vals[1].v > eps) state.medals[c.key] = vals[0].id;
    });
  }

  // --------------------------------------------------------------- render
  function renderHead() {
    var tr = document.createElement('tr');
    state.cols.forEach(function (col, idx) {
      var th = document.createElement('th');
      th.className = 'col-' + col.kind + ' a-' + col.align;
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      th.dataset.col = idx;
      var active = idx === state.sortCol;
      th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      if (active) th.classList.add('sorted');
      th.innerHTML = '<span class="th-label">' + escapeHtml(col.label) + '</span>' +
        '<span class="arrow" aria-hidden="true">' +
        (active ? (state.sortDir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
      tr.appendChild(th);
    });
    var thead = document.querySelector('#board thead');
    thead.innerHTML = '';
    thead.appendChild(tr);
  }

  function subCell(sub) {
    var id = escapeHtml(sub.id || '');
    var idHtml = sub.repo_url
      ? '<a class="sub-link" href="' + escapeHtml(sub.repo_url) + '" target="_blank" rel="noopener"><code class="sub">' + id + '</code></a>'
      : '<code class="sub">' + id + '</code>';
    var gated = sub.gated
      ? ' <span class="badge-gated" title="' +
        escapeHtml((sub.gate_reasons || []).join('; ') || t('gatedTitle')) +
        '">⚠️ gated</span>'
      : '';
    var stack = (sub.stack && sub.stack.length)
      ? '<div class="stack">' + sub.stack.map(escapeHtml).join(' · ') + '</div>'
      : '';
    return '<div class="sub-cell">' + idHtml + gated + stack + '</div>';
  }

  function buildDetailRow(sub, colSpan) {
    var tr = document.createElement('tr');
    tr.className = 'detail-row';
    if (!state.expanded[sub.id]) tr.hidden = true;
    var td = document.createElement('td');
    td.colSpan = colSpan;
    td.className = 'detail-cell';

    // Score breakdown
    var scoredCols = state.cols.filter(function (c) { return c.kind === 'dim'; });
    var chips = scoredCols.map(function (c) {
      var v = sub.dimensions ? sub.dimensions[c.key] : null;
      var pts = v != null ? (v * c.weight * 100).toFixed(1) : DASH;
      var formula = v != null
        ? '(' + Number(v).toFixed(2) + '×' + Math.round(c.weight * 100) + '%)'
        : '';
      return '<div class="bd-chip">' +
        '<span class="bd-label">' + escapeHtml(c.label) + '</span>' +
        '<span class="bd-pts">' + pts + '</span>' +
        '<span class="bd-formula">' + formula + '</span>' +
        '</div>';
    }).join('');
    var breakdownHtml = '<div class="score-breakdown">' +
      '<div class="bd-chips">' + chips +
        '<div class="bd-total">= ' + fmtScore(sub.score) + ' pts</div>' +
      '</div>' +
      '</div>';

    // Observed metrics
    var obsLabels = STRINGS[state.lang].obsLabels;
    var obs = sub.observed || {};
    var keys = Object.keys(obsLabels).filter(function (k) { return k in obs; });
    var observedHtml = keys.length === 0
      ? '<div class="detail-panel"><span class="detail-empty">' + escapeHtml(t('noMetrics')) + '</span></div>'
      : '<div class="detail-panel">' + keys.map(function (k) {
          var v = obs[k];
          var fmt = OBS_FMT[k];
          var rendered = v == null ? DASH : (fmt ? fmt(v) : fmtInfo(v));
          return '<div class="detail-item">' +
            '<span class="detail-key">' + escapeHtml(obsLabels[k] || k) + '</span>' +
            '<span class="detail-val">' + rendered + '</span>' +
            '</div>';
        }).join('') + '</div>';

    td.innerHTML = breakdownHtml + observedHtml;
    tr.appendChild(td);
    return tr;
  }

  function compare(a, b, col, dir) {
    var va = colValue(col, a), vb = colValue(col, b);
    var na = va == null, nb = vb == null;
    if (na && nb) return 0;
    if (na) return 1;
    if (nb) return -1;
    var res = (typeof va === 'string') ? va.localeCompare(vb) : (va - vb);
    return dir === 'asc' ? res : -res;
  }

  function renderBody() {
    var tbody = document.querySelector('#board tbody');
    var q = state.filter.trim().toLowerCase();
    var s = STRINGS[state.lang];

    var rows = activeSubmissions(state.data).filter(function (sub) {
      if (!q) return true;
      if ((sub.id   || '').toLowerCase().indexOf(q) !== -1) return true;
      if ((sub.user || '').toLowerCase().indexOf(q) !== -1) return true;
      return (sub.stack || []).some(function (tag) { return tag.toLowerCase().indexOf(q) !== -1; });
    });

    var col = state.cols[state.sortCol], dir = state.sortDir;
    rows.sort(function (a, b) { return compare(a, b, col, dir); });

    tbody.innerHTML = '';
    rows.forEach(function (sub) {
      var tr = document.createElement('tr');
      tr.dataset.id = sub.id;
      if (sub.gated) tr.classList.add('gated');
      if (state.expanded[sub.id]) tr.classList.add('row-expanded');
      state.cols.forEach(function (c) {
        var td = document.createElement('td');
        td.className = 'col-' + c.kind + ' a-' + c.align;
        var v = colValue(c, sub);
        if (c.kind === 'rank') {
          td.innerHTML = '<span class="expand-chevron" aria-hidden="true">›</span>' +
            (v == null ? DASH : String(v));
        } else if (c.kind === 'id') {
          td.innerHTML = subCell(sub);
        } else if (c.kind === 'user') {
          td.innerHTML = '<span class="user">' + escapeHtml(sub.user || '') + '</span>';
        } else if (c.kind === 'score') {
          td.innerHTML = '<span class="score-val">' + fmtScore(v) + '</span>';
        } else if (c.kind === 'dim') {
          if (v == null) td.classList.add('missing');
          else if (v >= state.above) td.classList.add('above');
          else if (v < state.below) td.classList.add('below');
          var isMedal = state.medals[c.key] === sub.id;
          if (isMedal) td.classList.add('medal');
          var inner = fmtDim(v);
          if (isMedal) inner = '<span class="medal-icon" aria-label="' + escapeHtml(t('dimLeader')) + '">' + MEDAL + '</span> ' + inner;
          td.innerHTML = inner;
        } else {
          if (v == null) td.classList.add('missing');
          td.textContent = fmtInfo(v);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      tbody.appendChild(buildDetailRow(sub, state.cols.length));
    });

    var total = activeSubmissions(state.data).length;
    var emptyEl = document.getElementById('empty');
    document.getElementById('count').textContent = q
      ? s.countFiltered(rows.length, total)
      : s.countAll(total);
    emptyEl.textContent = s.noMatch;
    emptyEl.hidden = rows.length !== 0;
  }

  function renderObsLegend() {
    var dlEl = document.getElementById('obs-legend-body');
    if (!dlEl) return;
    dlEl.innerHTML = '';
    STRINGS[state.lang].obsGroups.forEach(function (group) {
      var groupDiv = document.createElement('div');
      groupDiv.className = 'obs-group-label';
      groupDiv.textContent = group.label;
      dlEl.appendChild(groupDiv);
      group.entries.forEach(function (entry) {
        var entryDiv = document.createElement('div');
        entryDiv.className = 'obs-entry';
        var dt = document.createElement('dt');
        dt.textContent = entry.label;
        var dd = document.createElement('dd');
        dd.textContent = entry.desc;
        entryDiv.appendChild(dt);
        entryDiv.appendChild(dd);
        dlEl.appendChild(entryDiv);
      });
    });
  }

  function setSort(idx) {
    if (state.sortCol === idx) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortCol = idx;
      state.sortDir = state.cols[idx].def;
    }
    renderHead();
    renderBody();
  }

  function renderStatic() {
    var meta = state.data.meta || {};
    var s = STRINGS[state.lang];

    document.documentElement.lang = s.locale;
    document.getElementById('title').textContent = meta.title || 'Leaderboard';
    document.title = (meta.title || 'Leaderboard') + ' — The 500MB Club';

    var introEl = document.getElementById('intro');
    var introText = s.intro || meta.intro;
    if (introText) { introEl.innerHTML = inlineMd(introText); introEl.hidden = false; }
    else introEl.hidden = true;

    var deadlineEl = document.getElementById('deadline');
    if (deadlineEl) {
      if (meta.deadline) {
        var dl = new Date(meta.deadline);
        var formatted = isNaN(dl)
          ? meta.deadline
          : dl.toLocaleString(s.locale, {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
            });
        deadlineEl.textContent = s.deadlinePrefix + formatted + s.deadlineSuffix;
        deadlineEl.hidden = false;
      } else {
        deadlineEl.hidden = true;
        deadlineEl.textContent = '';
      }
    }

    var legendTitleEl = document.getElementById('legend-title');
    if (legendTitleEl) legendTitleEl.textContent = s.howToRead;

    var legendEl = document.getElementById('legend');
    legendEl.innerHTML = '';
    var legendItems = s.legend || meta.legend || [];
    legendItems.forEach(function (item) {
      var li = document.createElement('li');
      li.innerHTML = inlineMd(item);
      legendEl.appendChild(li);
    });

    var obsH2 = document.getElementById('obs-legend-title');
    if (obsH2) {
      obsH2.innerHTML = escapeHtml(s.detailMetrics) +
        ' <span class="legend-hint">' + escapeHtml(s.clickToExpand) + '</span>';
    }
    renderObsLegend();

    var filterEl = document.getElementById('filter');
    if (filterEl) filterEl.placeholder = s.filterPlaceholder;

    var updEl = document.getElementById('updated');
    var activeUpd = activeUpdated(state.data);
    if (updEl) updEl.textContent = activeUpd ? s.updatedAt + fmtUpdated(activeUpd) : '';

    // Disclaimer aparece SO na visao "preview". A Final segue limpa.
    var disclaimerEl = document.getElementById('disclaimer');
    if (disclaimerEl) {
      if (state.view === 'preview') {
        disclaimerEl.innerHTML = inlineMd(s.disclaimerPreview);
        disclaimerEl.hidden = false;
      } else {
        disclaimerEl.hidden = true;
        disclaimerEl.innerHTML = '';
      }
    }

    // Rotulos do toggle Final/Prévia (i18n).
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      if (btn.dataset.view === 'final') btn.textContent = s.viewFinal;
      else if (btn.dataset.view === 'preview') btn.textContent = s.viewPreview;
    });

    var srcEl = document.getElementById('footer-source');
    if (srcEl) srcEl.textContent = s.source + ':';
    var repoEl = document.getElementById('footer-repo');
    if (repoEl) repoEl.textContent = s.repository;

    var sponsorsEl = document.getElementById('sponsors-title');
    if (sponsorsEl) sponsorsEl.textContent = s.sponsorsTitle;
  }

  function setLang(lang) {
    if (!STRINGS[lang]) return;
    state.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('lang-active', btn.dataset.lang === lang);
    });
    state.cols = buildColumns(state.data);
    renderStatic();
    renderHead();
    renderBody();
  }

  // applyViewClass marca o #board com `preview-view` na visao Prévia. O CSS
  // usa essa classe pra esconder as colunas # (rank) e Score (a prévia não
  // publica score; sem score o rank derivado tb perde sentido). As colunas
  // continuam no array state.cols — só ficam ocultas, sem mexer em sortCol.
  function applyViewClass() {
    var board = document.getElementById('board');
    if (board) board.classList.toggle('preview-view', state.view === 'preview');
  }

  function setView(view) {
    if (view !== 'final' && view !== 'preview') return;
    if (state.view === view) return;
    state.view = view;
    try { localStorage.setItem('view', view); } catch (e) {}
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('view-active', btn.dataset.view === view);
    });
    applyViewClass();
    // Cada visao tem seu proprio rank/medal pool: recomputa antes de
    // renderizar a tabela.
    computeDerived(state.data);
    renderStatic();
    renderBody();
  }

  function wireEvents() {
    var thead = document.querySelector('#board thead');
    thead.addEventListener('click', function (e) {
      var th = e.target.closest('th');
      if (th) setSort(Number(th.dataset.col));
    });
    thead.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var th = e.target.closest('th');
      if (th) { e.preventDefault(); setSort(Number(th.dataset.col)); }
    });

    var tbody = document.querySelector('#board tbody');
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var dataRow = e.target.closest('tr[data-id]');
      if (!dataRow) return;
      var id = dataRow.dataset.id;
      var wasExpanded = !!state.expanded[id];
      if (wasExpanded) delete state.expanded[id];
      else state.expanded[id] = true;
      dataRow.classList.toggle('row-expanded', !wasExpanded);
      var detailRow = dataRow.nextElementSibling;
      if (detailRow && detailRow.classList.contains('detail-row')) {
        detailRow.hidden = wasExpanded;
      }
    });

    document.getElementById('filter').addEventListener('input', function (e) {
      state.filter = e.target.value;
      renderBody();
    });

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
    });

    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.dataset.view); });
    });
  }

  // ----------------------------------------------------------------- boot
  function loadData() {
    // leaderboard.json e a unica fonte da verdade. Sem fallback inline: se o
    // fetch falhar (ex.: abrir o index.html via file://, onde o navegador
    // bloqueia o fetch; ou rede/404), o erro propaga e o boot exibe uma
    // mensagem em vez de renderizar dados defasados.
    return fetch('leaderboard.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  // showLoadError troca a tela pelo aviso de falha de carga: esconde toolbar,
  // tabela e legendas e mostra a mensagem no #empty. Usado quando loadData
  // rejeita (fetch bloqueado em file://, rede, 404, JSON invalido).
  function showLoadError(err) {
    var s = STRINGS[state.lang] || STRINGS.pt;
    document.querySelectorAll('.toolbar, .table-scroll, .legend').forEach(function (el) {
      el.hidden = true;
    });
    var emptyEl = document.getElementById('empty');
    if (emptyEl) {
      emptyEl.textContent = s.loadError;
      emptyEl.hidden = false;
    }
    if (typeof console !== 'undefined' && console.error) {
      console.error('leaderboard load failed:', err);
    }
  }

  loadData().then(function (data) {
    state.data = data;
    var th = data.thresholds || {};
    if (th.above != null) state.above = th.above;
    if (th.below != null) state.below = th.below;
    state.cols = buildColumns(data);
    computeDerived(data);
    state.sortCol = 0;
    state.sortDir = 'asc';
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('lang-active', btn.dataset.lang === state.lang);
    });
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('view-active', btn.dataset.view === state.view);
    });
    applyViewClass();
    renderStatic();
    renderHead();
    renderBody();
    wireEvents();
  }).catch(function (err) {
    showLoadError(err);
  });
})();
