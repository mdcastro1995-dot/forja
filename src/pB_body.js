
/* ========== B · mapa corporal y anillos ========== */
const SIDE_NAMES = { der: 'derecho', izq: 'izquierdo' };
// [muscle key, shape, attrs, athlete side ('der'|'izq'|null)]
const BM_FRONT = [
  ['hombros', 'ellipse', { cx: 34, cy: 53, rx: 11, ry: 12 }, 'der'], ['hombros', 'ellipse', { cx: 86, cy: 53, rx: 11, ry: 12 }, 'izq'],
  ['pecho', 'path', { d: 'M59,44 L59,72 Q48,77 40,69 Q35,58 42,48 Q50,42 59,44Z' }, 'der'], ['pecho', 'path', { d: 'M61,44 L61,72 Q72,77 80,69 Q85,58 78,48 Q70,42 61,44Z' }, 'izq'],
  ['core', 'rect', { x: 48, y: 77, width: 24, height: 40, rx: 9 }, null],
  ['biceps', 'ellipse', { cx: 27, cy: 81, rx: 7, ry: 15 }, 'der'], ['biceps', 'ellipse', { cx: 93, cy: 81, rx: 7, ry: 15 }, 'izq'],
  ['antebrazos', 'ellipse', { cx: 22, cy: 113, rx: 6, ry: 15 }, 'der'], ['antebrazos', 'ellipse', { cx: 98, cy: 113, rx: 6, ry: 15 }, 'izq'],
  ['mano', 'circle', { cx: 19, cy: 133, r: 5 }, 'der'], ['mano', 'circle', { cx: 101, cy: 133, r: 5 }, 'izq'],
  ['cadera', 'path', { d: 'M46,117 L74,117 L76,131 L44,131Z' }, null],
  ['cuadriceps', 'path', { d: 'M44,131 Q40,161 46,190 L58,190 Q60,160 58,131Z' }, 'der'], ['cuadriceps', 'path', { d: 'M76,131 Q80,161 74,190 L62,190 Q60,160 62,131Z' }, 'izq'],
  ['rodilla', 'circle', { cx: 52, cy: 196, r: 5 }, 'der'], ['rodilla', 'circle', { cx: 68, cy: 196, r: 5 }, 'izq'],
  ['tibial', 'ellipse', { cx: 50, cy: 220, rx: 6, ry: 17 }, 'der'], ['tibial', 'ellipse', { cx: 70, cy: 220, rx: 6, ry: 17 }, 'izq'],
  ['pie', 'ellipse', { cx: 48, cy: 242, rx: 8, ry: 4 }, 'der'], ['pie', 'ellipse', { cx: 72, cy: 242, rx: 8, ry: 4 }, 'izq'],
];
const BM_BACK = [
  ['trapecio', 'path', { d: 'M47,37 L73,37 L85,49 L60,59 L35,49Z' }, null],
  ['hombros', 'ellipse', { cx: 33, cy: 54, rx: 10, ry: 11 }, 'izq'], ['hombros', 'ellipse', { cx: 87, cy: 54, rx: 10, ry: 11 }, 'der'],
  ['espalda', 'path', { d: 'M40,59 Q38,85 52,105 L59,105 L59,61Z' }, 'izq'], ['espalda', 'path', { d: 'M80,59 Q82,85 68,105 L61,105 L61,61Z' }, 'der'],
  ['lumbar', 'rect', { x: 50, y: 106, width: 20, height: 13, rx: 5 }, null],
  ['triceps', 'ellipse', { cx: 27, cy: 81, rx: 7, ry: 15 }, 'izq'], ['triceps', 'ellipse', { cx: 93, cy: 81, rx: 7, ry: 15 }, 'der'],
  ['antebrazos', 'ellipse', { cx: 22, cy: 113, rx: 6, ry: 15 }, 'izq'], ['antebrazos', 'ellipse', { cx: 98, cy: 113, rx: 6, ry: 15 }, 'der'],
  ['mano', 'circle', { cx: 19, cy: 133, r: 5 }, 'izq'], ['mano', 'circle', { cx: 101, cy: 133, r: 5 }, 'der'],
  ['gluteos', 'ellipse', { cx: 52, cy: 129, rx: 10, ry: 11 }, 'izq'], ['gluteos', 'ellipse', { cx: 68, cy: 129, rx: 10, ry: 11 }, 'der'],
  ['isquios', 'path', { d: 'M43,141 Q41,166 47,190 L58,190 Q59,165 59,141Z' }, 'izq'], ['isquios', 'path', { d: 'M77,141 Q79,166 73,190 L62,190 Q61,165 61,141Z' }, 'der'],
  ['gemelos', 'ellipse', { cx: 51, cy: 218, rx: 7, ry: 16 }, 'izq'], ['gemelos', 'ellipse', { cx: 69, cy: 218, rx: 7, ry: 16 }, 'der'],
  ['pie', 'ellipse', { cx: 50, cy: 242, rx: 7, ry: 4 }, 'izq'], ['pie', 'ellipse', { cx: 70, cy: 242, rx: 7, ry: 4 }, 'der'],
];
const INJ_REGION = { tobillo: 'pie', rodilla: 'rodilla', muneca: 'mano', mano: 'mano', hombro: 'hombros', lumbar: 'lumbar' };
const BM_LABEL = { tibial: 'Tibial', pie: 'Tobillo', rodilla: 'Rodilla', mano: 'Muñeca', cadera: 'Cadera' };
function muscleStates(s) {
  const rec = recovery(s.workouts, Date.now());
  const r = nextRoutine(s.profile, s.workouts);
  const today = new Set(), sec = new Set();
  if (r) for (const sl of r.slots) { const d = getEx(sl.ex[sl.idx % sl.ex.length]); if (d.m === 'cardio') continue; today.add(d.m); d.s.forEach(m => sec.add(m)); }
  const st = {};
  for (const m of Object.keys(MUSCLES)) {
    const v = rec[m];
    st[m] = v != null && v < 50 ? 'fatigued' : today.has(m) ? 'today' : sec.has(m) ? 'sec' : v != null && v < 80 ? 'tired' : 'idle';
  }
  return { st, rec, routine: r };
}
const BM_FILL = { today: 'var(--m-today)', sec: 'var(--m-sec)', tired: 'var(--m-tired)', fatigued: 'var(--m-fatigued)', idle: 'var(--m-idle)' };
const BM_STATE_TXT = { today: 'hoy entrenás', sec: 'secundario hoy', tired: 'recuperando', fatigued: 'fatigado', idle: 'listo' };
function BodyFig({ shapes, st, rec, inj, pid, label, caption }) {
  const reg = inj ? INJ_REGION[inj.area] : null;
  const hit = (k, side) => reg && k === reg && (!side || !inj.side || inj.side === side);
  const ring = shapes.filter(([k, , , side]) => hit(k, side));
  return html`<figure><svg viewBox="0 0 120 250" role="img" aria-label=${label}>
    <defs><pattern id=${pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--surface-2)" /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--m-hatch)" stroke-width="1.6" /></pattern></defs>
    <circle cx="60" cy="20" r="14" fill="var(--m-idle)" /><rect x="54" y="33" width="12" height="9" rx="3" fill="var(--m-idle)" />
    ${shapes.map(([k, tag, a, side], i) => {
      const fill = hit(k, side) ? `url(#${pid})` : (st[k] ? BM_FILL[st[k]] : 'var(--m-idle)');
      const t = (MUSCLES[k] || BM_LABEL[k] || k) + (hit(k, side) ? ': en rehabilitación' : st[k] ? ': ' + BM_STATE_TXT[st[k]] + (rec[k] != null ? ` (${rec[k]}%)` : '') : '');
      const p = Object.assign({ key: i, fill, 'data-m': k }, a);
      return tag === 'ellipse' ? html`<ellipse ...${p}><title>${t}</title></ellipse>` : tag === 'circle' ? html`<circle ...${p}><title>${t}</title></circle>` : tag === 'rect' ? html`<rect ...${p}><title>${t}</title></rect>` : html`<path ...${p}><title>${t}</title></path>`;
    })}
    ${ring.map(([, , a], i) => html`<circle key=${'r' + i} class="rehab-ring" cx=${a.cx != null ? a.cx : a.x + a.width / 2} cy=${a.cy != null ? a.cy : a.y + a.height / 2} r="12" fill="none" stroke="var(--accent-fg)" stroke-width="1.8" stroke-dasharray="3 3" />`)}
  </svg><figcaption>${caption}</figcaption></figure>`;
}
function BodyMap({ s }) {
  const { st, rec, routine } = useMemo(() => muscleStates(s), [s.workouts, s.profile]);
  const inj = s.profile.injury;
  const list = (v) => MAP_MUSCLES.filter(m => st[m] === v).map(m => MUSCLES[m].toLowerCase()).join(', ');
  const lp = lastPain(s);
  const injTxt = inj ? `${injuryLabel(inj)}${inj.side ? ' ' + SIDE_NAMES[inj.side] : ''}` : null;
  return html`<section class="bodymap" aria-label="Mapa de recuperación">
    <div class="bm-figs">
      <${BodyFig} shapes=${BM_FRONT} st=${st} rec=${rec} inj=${inj} pid="hatchF" caption="Frente" label=${'Vista frontal. ' + (list('today') ? 'Hoy entrenás: ' + list('today') + '. ' : '') + (list('fatigued') ? 'Fatigados: ' + list('fatigued') + '.' : '')} />
      <${BodyFig} shapes=${BM_BACK} st=${st} rec=${rec} inj=${inj} pid="hatchB" caption="Espalda" label=${'Vista dorsal. ' + (list('tired') ? 'Recuperando: ' + list('tired') + '.' : '')} />
    </div>
    <div class="bm-legend">
      <span><i style="background:var(--m-today)"></i>Hoy entrenás${routine ? '' : ''}</span>
      <span><i style="background:var(--m-sec)"></i>Secundario</span>
      <span><i style="background:var(--m-tired)"></i>Recuperando</span>
      <span><i style="background:var(--m-fatigued)"></i>Fatigado</span>
    </div>
    ${inj ? html`<button class="bm-inj" onClick=${() => openSheet('day', {})}><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent-fg)" stroke-width="1.8" stroke-dasharray="3 3" /><circle cx="10" cy="10" r="4" fill="var(--m-hatch)" /></svg>${injTxt} · <b>${lp ? `dolor ${lp.pain}/10 ${ago(keyTime(lp.d))}` : 'registrá el dolor de hoy'}</b></button>` : null}
  </section>`;
}
function weekStats(s) {
  const wk0 = startOfWeek(Date.now());
  let cardio = 0; const rehab = new Set();
  const ws = s.workouts.filter(w => w.start >= wk0);
  for (const w of ws) for (const e of w.ex || []) { const d = getEx(e.id); if (d.t === 'cardio') { const m = e.sets.reduce((t, x) => t + (x.m || 0), 0); if (d.g === 'rh') rehab.add(dayKey(w.start)); else if (d.g !== 'mv') cardio += m; } }
  return { sessions: ws.length, cardio: Math.round(cardio), rehab: rehab.size };
}
function GoalRings({ s }) {
  const g = s.profile.settings.weeklyGoal, ws = weekStats(s), inj = s.profile.injury;
  const rows = [{ v: ws.sessions, max: g, c: 'var(--ring-1)', t: `${ws.sessions}/${g}`, l: 'sesiones' }, { v: ws.cardio, max: 90, c: 'var(--ring-2)', t: `${ws.cardio}/90`, l: 'min de cardio sin impacto' }];
  if (inj) rows.push({ v: ws.rehab, max: 3, c: 'var(--ring-3)', t: `${ws.rehab}/3`, l: 'días de rehab' });
  const R = [42, 31, 20];
  return html`<section class="rings" aria-label="Objetivos de la semana">
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label=${rows.map(r => r.t + ' ' + r.l).join(', ')}><g transform="rotate(-90 48 48)">
      ${rows.map((r, i) => { const len = 2 * Math.PI * R[i]; const off = len * (1 - Math.min(1, r.v / r.max)); return html`<g key=${i}><circle cx="48" cy="48" r=${R[i]} fill="none" stroke="var(--surface-3)" stroke-width="8" /><circle class="ring-arc" style=${`--len:${len}`} cx="48" cy="48" r=${R[i]} fill="none" stroke=${r.c} stroke-width="8" stroke-linecap="round" stroke-dasharray=${len} stroke-dashoffset=${r.v > 0 ? off : len} /></g>`; })}
    </g></svg>
    <div class="rl"><span class="muted sm">Esta semana</span>${rows.map((r, i) => html`<span key=${i}><i class="dotc" style=${`background:${r.c}`}></i><b>${r.t}</b> ${r.l}</span>`)}</div>
  </section>`;
}
