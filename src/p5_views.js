
/* ========== views: Hoy ========== */
function ExampleBanner() {
  return html`<div class="banner"><${Icon} n="info" /><div class="grow">
    <b>Estás viendo datos de ejemplo.</b> Son 4 semanas de Torso / Pierna cargadas para que explores progreso, récords y recuperación. Borralos cuando empieces a registrar los tuyos.
    <div><button class="btn sm" onClick=${clearExamples}><${Icon} n="trash" />Borrar ejemplos</button></div></div></div>`;
}
function clearExamples() {
  openSheet('confirm', { title: 'Borrar datos de ejemplo', body: 'Se borran los entrenamientos y pesos de ejemplo. Tus rutinas quedan como están, listas para usar.', ok: 'Borrar ejemplos', danger: true, onOk: () => {
    for (const w of S().workouts.filter(w => w.example)) A.delWorkout(w.id);
    A.body(b => { b.entries = b.entries.filter(e => !e.ex); });
    A.profile(p => { for (const r of p.routines) for (const sl of r.slots) { sl.idx = 0; sl.cnt = 0; } });
    toast('Ejemplos borrados. Ahora sí: a registrar los tuyos.');
  } });
}
function WeekStrip({ workouts }) {
  const wk0 = startOfWeek(Date.now()), today = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(wk0); d.setDate(d.getDate() + i); return d.getTime(); });
  const done = new Set(workouts.filter(w => w.start >= wk0).map(w => dayKey(w.start)));
  const L = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  return html`<div class="week" role="list" aria-label="Días entrenados esta semana">${days.map((t, i) => html`<div role="listitem" key=${t} class=${'day' + (done.has(dayKey(t)) ? ' done' : '') + (t === today ? ' today' : '')} aria-label=${cap(DF_LONG.format(new Date(t))) + (done.has(dayKey(t)) ? ': entrenaste' : '')}><span>${L[i]}</span><span class="d">${done.has(dayKey(t)) ? html`<${Icon} n="check" />` : new Date(t).getDate()}</span></div>`)}</div>`;
}
function NextCard({ s, idx }) {
  const p = s.profile;
  const auto = nextRoutine(p, s.workouts);
  const [pick, setPick] = useState(null);
  const r = (pick && p.routines.find(x => x.id === pick)) || auto || p.routines[0];
  if (!r) return null;
  const last = s.workouts.find(w => w.routineId === r.id);
  const st = p.settings;
  const choose = () => openSheet('routinePick', { cur: r.id, onPick: (id) => setPick(id === (auto && auto.id) ? null : id) });
  return html`<section class="next" aria-label="Próximo entrenamiento">
    <${PlateDeco} />
    <div>
      <span class="eyebrow">${auto && r.id === auto.id ? 'Te toca' : 'Elegiste'} · ${last ? 'la hiciste ' + ago(last.start) : 'todavía no la hiciste'}</span>
      <h2 class="display">${r.name}</h2>
      <span class="next-sub">${r.slots.length} ejercicios · unos ${estMinutes(r)} min</span>
    </div>
    <ol>${r.slots.map(sl => { const exId = sl.ex[sl.idx % sl.ex.length]; const def = getEx(exId); const sug = suggest(exId, sl, idx, st);
      return html`<li key=${sl.id}><span class="nm">${def.n}${sl.ex.length > 1 && sl.rot > 0 ? html`<${Icon} n="swap" />` : null}</span><span class="meta">${sl.sets}×${rangeTxt(sl, def)}${sug && sug.w ? ' · ' + fKg(sug.w) : ''}</span></li>`; })}</ol>
    <div class="next-actions">
      <button class="btn light" onClick=${() => startRoutine(r)}><${Icon} n="play" fill />Empezar</button>
      <button class="btn outline-light" onClick=${() => openSheet('quickDone', { rid: r.id, onDone: () => setPick(null) })}><${Icon} n="check" />Ya la hice</button>
      ${p.routines.length > 1 ? html`<button class="btn ghost next-pick" onClick=${choose}><${Icon} n="list" />Elegir otro día</button>` : null}
    </div>
  </section>`;
}
function Onboard() {
  return html`<section class="onb">
    <span class="eyebrow">Para empezar</span>
    <h2 class="display">Elegí un programa</h2>
    <p class="lead">Las rutinas se alternan solas y cada ejercicio puede rotar entre variantes. Después podés editar todo.</p>
    <div class="prog-list">${PROGRAMS.map(pr => html`<button class="prog" key=${pr.id} onClick=${() => openSheet('programs', { focus: pr.id })}><span class="m">${pr.freq} · ${pr.level}</span><span class="t">${pr.name}</span><span class="d">${pr.desc}</span></button>`)}</div>
    <button class="btn" onClick=${() => openSheet('routine', {})}><${Icon} n="plus" />Crear mi propia rutina</button>
  </section>`;
}
function recClass(v) { return v >= 80 ? 'ok' : v >= 50 ? 'mid' : 'low'; }
function RecoveryGrid({ rec }) {
  return html`<div class="rec-grid">${MAP_MUSCLES.map(m => { const v = rec[m], c = recClass(v); return html`<div key=${m} class=${'rec ' + c}>
    <span class="nm">${MUSCLES[m]}</span>
    <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${v} aria-label=${'Recuperación de ' + MUSCLES[m]}><i style=${`width:${v}%`}></i></div>
    <span class="st"><span>${c === 'ok' ? 'Listo' : c === 'mid' ? 'Recuperando' : 'Fatigado'}</span><span class="pc">${v}%</span></span></div>`; })}</div>`;
}
function Home({ s, idx }) {
  const p = s.profile, W = s.workouts;
  const now = Date.now();
  const goal = p.settings.weeklyGoal;
  const wk0 = startOfWeek(now);
  const done = W.filter(w => w.start >= wk0).length;
  const streak = useMemo(() => weekStreak(W, goal), [W, goal]);
  const rec = useMemo(() => recovery(W, Date.now()), [W]);
  const groups = useMemo(() => {
    const m = new Map();
    for (const pr of idx.prs.slice().reverse()) { const k = pr.wid + '|' + pr.ex; if (!m.has(k)) m.set(k, { t: pr.t, n: pr.n, ex: pr.ex, items: [] }); m.get(k).items.push(pr); if (m.size > 5) break; }
    return [...m.values()].slice(0, 5);
  }, [idx]);
  return html`
    ${W.some(w => w.example) ? html`<${ExampleBanner} />` : null}
    ${s.mode === 'local' || s.mode === 'memory' ? html`<div class="banner info"><${Icon} n="info" /><div class="grow">${s.mode === 'local' ? (SHELL ? 'Estás usando Forja sin cuenta: tus datos quedan solo en este teléfono. Entrá con tu cuenta desde Más → Cuenta y conexiones para sincronizarlos.' : 'Tus datos se guardan solo en este navegador. Abrí la app desde claude.ai con tu sesión iniciada para guardarlos en tu espacio privado.') : 'Esta vista no puede guardar datos: lo que registres se pierde al cerrar.'}</div></div>` : null}
    <section class="section" aria-label="Tu semana">
      <span class="eyebrow">${cap(DF_LONG.format(now))}</span>
      <div class="wk-line"><h1 class="display h1">Tu cuerpo hoy</h1><span class="wk-sub">${done} de ${goal} sesiones esta semana${streak ? html` · <${Icon} n="flame" />racha de ${streak} ${plural(streak, 'semana', 'semanas')}` : null}</span></div>
    </section>
    <${BodyMap} s=${s} />
    <${GoalRings} s=${s} />
    <${WeekStrip} workouts=${W} />
    ${p.routines.length ? html`<${NextCard} s=${s} idx=${idx} />` : html`<${Onboard} />`}
    <${DayCard} s=${s} />
    ${s.caps.sample ? html`<button class="coach-card voice-card" onClick=${() => openSheet('photo', { mode: 'voz' })}><${Icon} n="mic" /><span class="grow"><b>Dictar entrenamiento</b><small>Contá lo que hiciste con el micrófono del teclado y confirmá.</small></span><${Icon} n="chevR" /></button>` : null}
    ${s.caps.sample ? html`<button class="coach-card photo-card" onClick=${() => openSheet('photo', {})}><${Icon} n="upload" /><span class="grow"><b>Cargar desde foto</b><small>Foto de un WOD, pizarra o planilla: la convierto en rutina, sesión o registro.</small></span><${Icon} n="chevR" /></button>` : null}
    <div class="quick">
      <button class="qbtn" onClick=${() => openSheet('smart', {})}><${Icon} n="spark" /><span><b>Inteligente</b><small>Según tu recuperación de hoy</small></span></button>
      <button class="qbtn" onClick=${startEmpty}><${Icon} n="plus" /><span><b>Libre</b><small>Armala sobre la marcha</small></span></button>
    </div>
    <section class="section">
      <details class="rec-details"><summary class="sec-head"><h2 class="sec-title">Recuperación por músculo</h2><span class="muted sm">ver porcentajes</span></summary>
      <div class="stack" style="margin-top:12px"><${RecoveryGrid} rec=${rec} />
      <div class="legend"><span><i class="sw good"></i>Listo: 80% o más</span><span><i class="sw mid"></i>Recuperando: 50–79%</span><span><i class="sw low"></i>Fatigado: menos de 50%</span></div></div></details>
    </section>
    ${groups.length ? html`<section class="section">
      <div class="sec-head"><h2 class="sec-title">Récords recientes</h2></div>
      <div class="prlist">${groups.map(g => html`<button class="pritem" key=${g.t + g.ex} onClick=${() => openSheet('exInfo', { id: g.ex })}><${Icon} n="trophy" /><span class="grow"><span class="t">${g.n}</span><br /><span class="s">${g.items.map(i => PR_LABEL[i.k] + ' ' + prVal(i)).join(' · ')} · ${ago(g.t)}</span></span><${Icon} n="chevR" /></button>`)}</div>
    </section>` : null}
    ${s.caps.sample ? html`<button class="coach-card" onClick=${() => openSheet('coach', {})}><${Icon} n="chat" /><span class="grow"><b>Coach con Claude</b><small>Analiza tu historial y te dice qué ajustar: volumen, estancamientos, qué entrenar hoy.</small></span><${Icon} n="chevR" /></button>` : null}`;
}

/* ========== views: Rutinas ========== */
function moveRoutine(i, d) { A.profile(p => { const j = i + d; if (j < 0 || j >= p.routines.length) return; const t = p.routines[i]; p.routines[i] = p.routines[j]; p.routines[j] = t; }); }
function Routines({ s }) {
  const rs = s.profile.routines;
  const nx = nextRoutine(s.profile, s.workouts);
  return html`
    <section class="section">
      <h1 class="display h1">Rutinas</h1>
      <p class="lead">Las rutinas en rotación se alternan solas: al terminar una, la app te propone la siguiente. Dentro de cada rutina, los ejercicios con variantes rotan según la regla que elijas.</p>
      <${PlanCard} s=${s} />
      <div class="row wrap"><button class="btn primary" onClick=${() => openSheet('routine', {})}><${Icon} n="plus" />Nueva rutina</button><button class="btn" onClick=${() => openSheet('photo', {})}><${Icon} n="upload" />Desde foto</button></div>
    </section>
    ${rs.length === 0 ? html`<div class="empty"><b>Todavía no tenés rutinas.</b><span>Elegí un programa armado o creá la tuya desde cero.</span></div>` : html`<div class="rlist">${rs.map((r, i) => html`
      <article key=${r.id} class=${'rcard' + (r.inRot === false ? ' off' : '')}>
        <div class="rcard-head">
          <div class="grow"><h3>${r.name}</h3><span class="meta">${r.slots.length} ejercicios · unos ${estMinutes(r)} min${r.slots.some(sl => sl.ex.length > 1 && sl.rot > 0) ? ' · con variantes que rotan' : ''}</span></div>
          ${nx && nx.id === r.id ? html`<span class="pill">Próxima</span>` : null}
        </div>
        <p class="exs">${r.slots.map(sl => getEx(sl.ex[sl.idx % sl.ex.length]).n).join(' · ')}</p>
        <div class="row wrap">
          <button class="btn primary sm" onClick=${() => startRoutine(r)}><${Icon} n="play" fill />Empezar</button>
          <button class="btn sm" onClick=${() => openSheet('routine', { id: r.id })}><${Icon} n="edit" />Editar</button>
          <label class="rot-switch grow"><input type="checkbox" class="toggle" checked=${r.inRot !== false} onChange=${e => A.profile(p => { const x = p.routines.find(z => z.id === r.id); if (x) x.inRot = e.target.checked; })} />En rotación</label>
          <button class="icon-btn sm" aria-label=${'Subir ' + r.name} disabled=${i === 0} onClick=${() => moveRoutine(i, -1)}><${Icon} n="up" /></button>
          <button class="icon-btn sm" aria-label=${'Bajar ' + r.name} disabled=${i === rs.length - 1} onClick=${() => moveRoutine(i, 1)}><${Icon} n="down" /></button>
        </div>
      </article>`)}</div>`}
    <section class="section">
      <h2 class="sec-title">Cómo se alternan</h2>
      <div class="help">
        <p><b>Entre días:</b> el orden de la lista es el orden de la rotación. Si hoy hiciste Torso A, la próxima es la que sigue.</p>
        <p><b>Entre ejercicios:</b> cada ejercicio de una rutina puede tener variantes (por ejemplo, press con barra, con mancuernas o en máquina). Con “Cada sesión” cambia siempre; con “Cada 4 sesiones” mantenés un básico un mes y después rotás.</p>
        <p><b>Durante la sesión:</b> el botón de flechas en cada ejercicio te ofrece variantes y alternativas para el mismo músculo, útil si la máquina está ocupada.</p>
        <p><b>Recomendación:</b> dejá fijos los básicos pesados para medir bien la progresión y rotá los accesorios para sumar variedad.</p>
      </div>
    </section>`;
}

/* ========== views: Progreso ========== */
const PERIODS = [['4s', '4 sem', 4], ['12s', '12 sem', 12], ['6m', '6 meses', 26], ['1a', '1 año', 52], ['todo', 'Todo', 0]];
function Progress({ s, idx }) {
  const [per, setPer] = useState(LS.get('period', '12s'));
  const W = s.workouts;
  const now = Date.now(), curWk = startOfWeek(now);
  const def = PERIODS.find(p => p[0] === per) || PERIODS[1];
  const firstWk = W.length ? startOfWeek(W[W.length - 1].start) : curWk;
  const nW = def[2] || Math.max(1, Math.round((curWk - firstWk) / (7 * DAY)) + 1);
  const from = curWk - (nW - 1) * 7 * DAY;
  const inP = W.filter(w => w.start >= from);
  const prevP = def[2] ? W.filter(w => w.start >= from - nW * 7 * DAY && w.start < from) : [];
  const sum = (list) => list.reduce((a, w) => { const st = workoutStats(w); a.vol += st.vol; a.sets += st.sets; a.dur += w.dur || 0; return a; }, { vol: 0, sets: 0, dur: 0 });
  const A1 = sum(inP), A0 = sum(prevP);
  const dl = (a, b) => def[2] && b > 0 ? (a - b) / b * 100 : null;
  const weeksShown = Math.min(nW, 52);
  const cols = Array.from({ length: weeksShown }, (_, i) => { const a = curWk - (weeksShown - 1 - i) * 7 * DAY, b = a + 7 * DAY; const ws = W.filter(w => w.start >= a && w.start < b); return { x: a, y: Math.round(ws.reduce((t, w) => t + workoutStats(w).vol, 0)), label: DF_SHORT.format(new Date(a)).replace('.', ''), tip: `Semana del ${DF_SHORT.format(new Date(a))} · ${ws.length} ${plural(ws.length, 'sesión', 'sesiones')}` }; });
  const ms = muscleSets(W, from, now + 1);
  const weeksElapsed = Math.max(1, (now - Math.max(from, firstWk)) / (7 * DAY));
  const rows = MAP_MUSCLES.map(m => ({ m, v: Math.round((ms[m] || 0) / weeksElapsed * 10) / 10 }));
  const choose = (k) => { setPer(k); LS.set('period', k); };
  return html`
    <section class="section">
      <h1 class="display h1">Progreso</h1>
      ${W.some(w => w.example) ? html`<${ExampleBanner} />` : null}
      <div class="chart-card">
        <h3>Constancia</h3><p class="cap">Días entrenados en las últimas 18 semanas. Más oscuro, más volumen ese día.</p>
        <${CalendarHeat} workouts=${W} weeks=${18} />
        <div class="legend"><span>Menos</span>${[1, 2, 3, 4].map(l => html`<i key=${l} class="sw" style=${`background:var(--heat-${l})`}></i>`)}<span>Más</span><span class="muted">Racha: ${weekStreak(W, s.profile.settings.weeklyGoal)} sem. cumpliendo ${s.profile.settings.weeklyGoal} sesiones</span></div>
      </div>
    </section>
    <section class="section">
      <div class="seg" role="group" aria-label="Período">${PERIODS.map(p => html`<button key=${p[0]} aria-pressed=${per === p[0]} onClick=${() => choose(p[0])}>${p[1]}</button>`)}</div>
      <div class="tiles">
        <${Tile} label="Sesiones" value=${NF0.format(inP.length)} delta=${dl(inP.length, prevP.length)} deltaLabel="vs. período anterior" />
        <${Tile} label="Volumen" value=${fVol(A1.vol)} delta=${dl(A1.vol, A0.vol)} />
        <${Tile} label="Series de trabajo" value=${NF0.format(A1.sets)} delta=${dl(A1.sets, A0.sets)} />
        <${Tile} label="Tiempo entrenando" value=${fMin(A1.dur)} delta=${dl(A1.dur, A0.dur)} />
      </div>
      <div class="chart-card">
        <h3>Volumen por semana</h3><p class="cap">Kilos levantados (peso × repeticiones) en series de trabajo.</p>
        <${ColumnChart} data=${cols} fmtTip=${fVol} label="Volumen semanal en kilos" empty="Completá tu primera sesión para ver el volumen semanal." />
      </div>
      <div class="chart-card">
        <h3>Series por músculo</h3><p class="cap">Promedio semanal del período. La franja marca 10 a 20 series, el rango habitual para ganar músculo.</p>
        <${MuscleBars} rows=${rows} label="Series semanales por músculo" />
        <div class="legend"><span><i class="sw band"></i>10–20 series por semana</span><span class="muted">Músculos secundarios suman media serie</span></div>
      </div>
      <${ExerciseProgress} idx=${idx} from=${from} />
    </section>`;
}
function exMetrics(def) {
  return def.t === 'wr' ? [['e1', '1RM estimado'], ['w', 'Peso máx.'], ['vol', 'Volumen']] : def.t === 'bw' ? [['r', 'Reps máx.'], ['reps', 'Reps totales']] : def.t === 'time' ? [['s', 'Mejor tiempo']] : [['m', 'Minutos'], ['d', 'Kilómetros']];
}
function metricVal(mk, x) { return mk === 'e1' ? x.e1 : mk === 'w' ? x.maxW : mk === 'vol' ? x.vol : mk === 'r' ? x.maxR : mk === 'reps' ? x.reps : mk === 's' ? x.maxS : mk === 'm' ? x.maxM : x.maxD; }
function metricFmt(mk) { return mk === 'e1' || mk === 'w' ? (v => fKg(Math.round(v * 10) / 10)) : mk === 'vol' ? fVol : mk === 's' ? (v => NF0.format(v) + ' s') : mk === 'd' ? (v => f2(v) + ' km') : mk === 'm' ? (v => NF0.format(v) + ' min') : (v => NF0.format(v) + ' reps'); }
function ExerciseChart({ id, idx, from, metric, onMetric, compact }) {
  const def = getEx(id), rec = idx.byEx[id];
  const metrics = exMetrics(def);
  const mk = metrics.some(m => m[0] === metric) ? metric : metrics[0][0];
  const sess = rec ? rec.sessions.filter(x => x.t >= (from || 0)) : [];
  const data = sess.map(x => ({ x: x.t, y: Math.round(metricVal(mk, x) * 10) / 10, note: 'Mejor serie: ' + setTxt(x.best, def) }));
  const fmt = metricFmt(mk);
  return html`<div class="stack">
    ${metrics.length > 1 ? html`<div class="seg" role="group" aria-label="Métrica">${metrics.map(m => html`<button key=${m[0]} aria-pressed=${mk === m[0]} onClick=${() => onMetric(m[0])}>${m[1]}</button>`)}</div>` : null}
    <${LineChart} data=${data} fmtTip=${fmt} fmtY=${mk === 'vol' ? fCompact : null} h=${compact ? 180 : 220} label=${def.n + ': ' + (metrics.find(m => m[0] === mk) || metrics[0])[1]} empty="Sin sesiones en este período." />
  </div>`;
}
function ExerciseProgress({ idx, from }) {
  const options = useMemo(() => Object.values(idx.byEx).sort((a, b) => b.sessions.length - a.sessions.length).map(r => r.id), [idx]);
  const [sel, setSel] = useState(null);
  const [metric, setMetric] = useState('e1');
  const id = sel && idx.byEx[sel] ? sel : options[0];
  if (!id) return html`<div class="chart-card"><h3>Progreso por ejercicio</h3><div class="chart-empty" style="height:140px">Cuando registres series vas a ver acá tu 1RM estimado, tu peso máximo y tus récords por ejercicio.</div></div>`;
  const def = getEx(id), rec = idx.byEx[id], B = rec.best;
  const bestSet = rec.sessions.reduce((a, x) => (x.e1 > (a ? a.e1 : -1) ? x : a), null);
  const recent = rec.sessions.slice(-6).reverse();
  return html`<div class="chart-card">
    <h3>Progreso por ejercicio</h3>
    <select class="input" aria-label="Ejercicio" value=${id} onChange=${e => setSel(e.target.value)}>${options.map(o => html`<option key=${o} value=${o}>${getEx(o).n} (${idx.byEx[o].sessions.length})</option>`)}</select>
    <${ExerciseChart} id=${id} idx=${idx} from=${from} metric=${metric} onMetric=${setMetric} />
    <div class="tiles">
      ${def.t === 'wr' ? html`<${Tile} label="Mejor 1RM estimado" value=${fKg(Math.round(B.e1 * 10) / 10)} /><${Tile} label="Peso máximo" value=${fKg(B.w)} /><${Tile} label="Mejor serie" value=${bestSet ? setTxt(bestSet.best, def) : '–'} />` : def.t === 'bw' ? html`<${Tile} label="Más repeticiones" value=${B.r + ' reps'} /><${Tile} label="Lastre máximo" value=${B.w ? fKg(B.w) : '–'} />` : def.t === 'time' ? html`<${Tile} label="Mejor tiempo" value=${B.s + ' s'} />` : html`<${Tile} label="Más minutos" value=${f2(B.m) + ' min'} /><${Tile} label="Más distancia" value=${f2(B.d) + ' km'} />`}
      <${Tile} label="Sesiones" value=${rec.sessions.length} />
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Mejor serie</th>${def.t === 'wr' ? html`<th class="r">1RM est.</th>` : null}<th class="r">Series</th></tr></thead>
      <tbody>${recent.map(x => html`<tr key=${x.wid}><td>${cap(DF_DAYS.format(new Date(x.t)))}</td><td>${setTxt(x.best, def)}</td>${def.t === 'wr' ? html`<td class="r">${NF1.format(x.e1)}</td>` : null}<td class="r">${x.n}</td></tr>`)}</tbody></table></div>
  </div>`;
}

/* ========== views: Historial ========== */
function History({ s, idx }) {
  const W = s.workouts;
  const [q, setQ] = useState('');
  const nq = norm(q.trim());
  const list = nq ? W.filter(w => norm(w.name).includes(nq) || (w.ex || []).some(e => norm(e.n || getEx(e.id).n).includes(nq))) : W;
  const groups = [];
  for (const w of list.slice(0, 400)) { const k = DF_MONTH.format(new Date(w.start)); let g = groups[groups.length - 1]; if (!g || g.k !== k) { g = { k, items: [] }; groups.push(g); } g.items.push(w); }
  return html`
    <section class="section">
      <h1 class="display h1">Historial</h1>
      ${W.length ? html`<input class="input" type="search" placeholder="Buscar por rutina o ejercicio" aria-label="Buscar en el historial" value=${q} onInput=${e => setQ(e.target.value)} />` : null}
    </section>
    ${!W.length ? html`<div class="empty"><b>Todavía no hay entrenamientos.</b><span>Cuando termines tu primera sesión, aparece acá con sus series, récords y notas.</span><button class="btn primary" onClick=${() => goTab('hoy')}>Ir a entrenar</button></div>` : null}
    ${W.length && !list.length ? html`<p class="muted">Nada coincide con “${q}”.</p>` : null}
    ${groups.map(g => html`<section class="section" key=${g.k}>
      <div class="sec-head"><h2 class="sec-title">${cap(g.k)}</h2><span class="muted sm">${g.items.length} ${plural(g.items.length, 'sesión', 'sesiones')}</span></div>
      <div class="hgroup">${g.items.map(w => { const st = workoutStats(w); const prs = (idx.byW[w.id] || []).length; return html`
        <button class="hrow" key=${w.id} onClick=${() => openSheet('detail', { id: w.id })}>
          <span class="date"><span class="dd">${new Date(w.start).getDate()}</span><span class="wd">${DF_WD.format(new Date(w.start)).replace('.', '')}</span></span>
          <span class="main"><span class="t">${w.name}</span><br /><span class="s">${fMin(w.dur)} · ${fVol(st.vol)} · ${st.sets} series${w.example ? ' · ejemplo' : ''}</span></span>
          ${prs ? html`<span class="pr-badge"><${Icon} n="trophy" />${prs}</span>` : null}
          <${Icon} n="chevR" />
        </button>`; })}</div>
    </section>`)}`;
}

function planWeek(plan) { if (!plan || !plan.start) return null; return Math.floor((startOfDay(Date.now()) - keyTime(plan.start) + 12 * 36e5) / (7 * DAY)) + 1; }
function currentPhase(plan, wk) {
  for (const ph of plan.phases || []) { const m = String(ph.weeks).match(/(\d+)\D+(\d+)/); const one = String(ph.weeks).match(/^\s*(\d+)\s*$/); if (m && wk >= +m[1] && wk <= +m[2]) return ph; if (one && wk === +one[1]) return ph; }
  return null;
}
function PlanCard({ s }) {
  const plan = s.profile.plan, ai = !!s.caps.sample;
  const wk = planWeek(plan);
  const ph = plan ? currentPhase(plan, wk) : null;
  return html`<div class="card plan-card stack">
    ${plan ? html`<div class="row"><span class="grow"><span class="eyebrow">Plan actual</span><b class="plan-name">${plan.name}</b></span>${plan.weeks ? html`<span class="pill">Semana ${Math.min(wk, plan.weeks)} de ${plan.weeks}</span>` : null}</div>
      ${plan.weeks ? html`<div class="meter plan-meter"><i style=${`width:${clamp(wk / plan.weeks * 100, 3, 100)}%`}></i></div>` : null}
      ${ph ? html`<p class="sheet-p"><b>${ph.title || 'Fase actual'}:</b> ${ph.notes}</p>` : null}
      ${plan.weeks && wk > plan.weeks ? html`<p class="sheet-p">Terminaste el plan. Es buen momento para generar el siguiente bloque.</p>` : null}`
    : html`<span class="eyebrow">Plan a medida</span><b class="plan-name">Generá rutinas según tu objetivo y tu tiempo</b><p class="sheet-p">Elegís objetivo, días por semana, minutos por sesión, cardio y duración. ${ai ? 'Claude arma las rutinas, las fases y las semanas de descarga, teniendo en cuenta tu lesión.' : 'En esta vista Claude no está disponible: podés elegir un programa armado.'}</p>`}
    <div class="row wrap">${ai ? html`<button class="btn primary sm" onClick=${() => openSheet('coach', { mode: 'plan' })}><${Icon} n="spark" />${plan ? 'Generar nuevo plan' : 'Generar plan'}</button>` : null}<button class="btn sm" onClick=${() => openSheet('programs', {})}><${Icon} n="list" />Programas armados</button></div>
  </div>`;
}
