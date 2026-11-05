
/* ========== live session ========== */
function prevFor(lastAll, sets, j) {
  if (!lastAll || !lastAll.length) return null;
  const isW = sets[j].t === 'w';
  let ord = 0;
  for (let k = 0; k < j; k++) if ((sets[k].t === 'w') === isW) ord++;
  return lastAll.filter(x => (x.t === 'w') === isW)[ord] || null;
}
function toggleSet(exKey, setKey) {
  const s = S();
  const a = clone(s.active);
  const i = a.ex.findIndex(z => z.key === exKey); if (i < 0) return;
  const e = a.ex[i]; const x = e.sets.find(z => z.key === setKey); if (!x) return;
  const def = getEx(e.id);
  if (x.done) { x.done = false; x.pr = false; A.active(a); return; }
  for (const f of FIELDS[def.t]) if ((x[f] === '' || x[f] == null) && x.p && x.p[f] != null && x.p[f] !== '') x[f] = x.p[f];
  if (s.profile.settings.guide) { if ((def.t === 'wr' || def.t === 'bw') && !x.r) x.r = String(e.rmin || 10); if (def.t === 'time' && !x.s) x.s = String(e.rmin || 30); if (def.t === 'cardio' && !x.m && !x.d) x.m = String(e.rmin || 20); }
  const v = setValues(x, def);
  if (!v) {
    const miss = missingFields(x, def);
    x.err = miss.length ? miss : FIELDS[def.t].slice(-1); A.active(a);
    toast(def.t === 'time' ? 'Anotá los segundos antes de marcar la serie.' : def.t === 'cardio' ? 'Anotá minutos o kilómetros.' : miss.includes('w') ? 'Anotá el peso y las repeticiones antes de marcar la serie.' : 'Anotá las repeticiones antes de marcar la serie.', 'warn');
    return;
  }
  x.err = null; x.done = true; x.pr = false;
  const rec = INDEX(s.workouts).byEx[e.id];
  if (rec && x.t !== 'w') {
    const B = rec.best;
    if (def.t === 'wr') x.pr = e1rm(v.w, v.r) > B.e1 + 0.05 || v.w > B.w + 0.05;
    else if (def.t === 'bw') x.pr = v.r > B.r;
    else if (def.t === 'time') x.pr = v.s > B.s;
  }
  const at = e.sets.indexOf(x);
  if (x.t !== 'w') for (const nx of e.sets.filter((z, k) => k > at && !z.done && z.t === x.t)) { nx.p = { ...nx.p }; for (const f of FIELDS[def.t]) if (x[f] !== '' && x[f] != null) nx.p[f] = x[f]; }
  const st = s.profile.settings;
  const chain = e.ss && a.ex[i + 1];
  if (chain) { a.rest = null; toast('Superserie: seguí con ' + getEx(chain.id).n); }
  else if (st.autoRest && !st.guide) { const dur = x.t === 'w' ? Math.min(60, e.rest) : e.rest; a.rest = { end: Date.now() + dur * 1000, dur, label: def.n }; }
  A.active(a);
  unlockAudio();
  if (x.pr) { buzz([40, 60, 40]); toast('Récord nuevo en ' + def.n, 'pr'); } else buzz(12);
}
function updSet(exKey, setKey, f, val) { updActive(a => { const e = a.ex.find(z => z.key === exKey); const x = e && e.sets.find(z => z.key === setKey); if (x) { x[f] = val; if (x.err) x.err = x.err.filter ? x.err.filter(z => z !== f) : null; } }); }
function Elapsed({ a }) {
  const now = useTick(1000);
  return html`<div class="tm">${a.editing ? 'Editando · ' + cap(DF_DAYS.format(new Date(a.start))) : fDur((now - a.start) / 1000)}</div>`;
}
function RestBar({ rest, st }) {
  const now = useTick(250);
  const left = Math.max(0, Math.ceil((rest.end - now) / 1000));
  const fired = useRef(0);
  useEffect(() => {
    if (left > 0 || fired.current === rest.end) return;
    fired.current = rest.end;
    if (Date.now() - rest.end < 4000) { if (st.sound) beep(); buzz([250, 120, 250]); }
    const t = setTimeout(() => updActive(a => { if (a.rest && a.rest.end === rest.end) a.rest = null; }), 3500);
    return () => clearTimeout(t);
  }, [left, rest.end]);
  const pct = clamp(100 - (rest.end - now) / (rest.dur * 10), 0, 100);
  const adj = (d) => updActive(a => { if (a.rest) { a.rest.end = Math.max(Date.now() + 1000, a.rest.end + d * 1000); a.rest.dur = Math.max(5, a.rest.dur + d); } });
  const txt = fDur(left);
  return html`<div class=${'rest' + (left === 0 ? ' over' : '')} role="timer" aria-live="off">
    <div class="rest-in">
      <div class="rest-ring"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><g transform="rotate(-90 38 38)"><circle cx="38" cy="38" r="31" fill="none" stroke="var(--surface-3)" stroke-width="7" /><circle class="arc" cx="38" cy="38" r="31" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-dasharray=${2 * Math.PI * 31} stroke-dashoffset=${2 * Math.PI * 31 * pct / 100} style="transition:stroke-dashoffset .25s linear" /></g></svg><div class="rest-time" aria-label=${'Quedan ' + txt}>${txt}</div></div>
      <div class="rest-txt"><b>${left === 0 ? 'A la barra' : 'Descanso'}</b><div class="l">${rest.label} · de ${fDur(rest.dur)}</div></div>
      <button class="btn sm" onClick=${() => adj(-15)} aria-label="Restar 15 segundos">−15</button>
      <button class="btn sm" onClick=${() => adj(15)} aria-label="Sumar 15 segundos">+15</button>
      <button class="btn sm primary" onClick=${() => updActive(a => { a.rest = null; })}>${left === 0 ? 'Listo' : 'Saltar'}</button>
    </div>
  </div>`;
}
function SetRow({ e, x, j, label, prev, def, showRpe }) {
  const f1 = def.t === 'time' ? 's' : def.t === 'cardio' ? 'm' : 'w';
  const f2_ = def.t === 'cardio' ? 'd' : def.t === 'time' ? null : 'r';
  const ph = x.p || {};
  const copyPrev = () => { if (!prev || x.done) return; updActive(a => { const ee = a.ex.find(z => z.key === e.key); const xx = ee && ee.sets.find(z => z.key === x.key); if (!xx) return; for (const f of FIELDS[def.t]) if (prev[f] != null) xx[f] = f === 'r' || f === 's' ? String(prev[f]) : toStr(prev[f]); }); };
  const inp = (f, mode, aria) => html`<input class=${'inp' + (x.err && x.err.includes && x.err.includes(f) ? ' err' : '')} inputmode=${mode} enterkeyhint="done" autocomplete="off" aria-label=${aria + ', serie ' + label} placeholder=${ph[f] || (f === 'w' && def.t === 'bw' ? '0' : '')} value=${x[f]} onInput=${ev => updSet(e.key, x.key, f, ev.target.value)} />`;
  return html`<div class=${'set-row' + (x.done ? ' done' : '') + (showRpe ? ' rpe' : '') + ' t-' + def.t}>
    <button class=${'set-n ' + x.t} onClick=${() => openSheet('setMenu', { exKey: e.key, setKey: x.key })} aria-label=${'Serie ' + label + ' (' + TYPE_NAMES[x.t] + '). Cambiar tipo o borrar'}>${label}</button>
    ${x.done && x.pr ? html`<span class="prev"><span class="pr-badge"><${Icon} n="trophy" />Récord</span></span>` : html`<button class="prev" onClick=${copyPrev} aria-label=${prev ? 'Copiar la vez anterior: ' + setTxt(prev, def) : 'Sin registro anterior'}>${prev ? setTxt(prev, def) : '—'}</button>`}
    ${inp(f1, f1 === 's' ? 'numeric' : 'decimal', def.t === 'time' ? 'Segundos' : def.t === 'cardio' ? 'Minutos' : def.t === 'bw' ? 'Lastre en kg' : 'Peso en kg')}
    ${f2_ ? inp(f2_, f2_ === 'r' ? 'numeric' : 'decimal', f2_ === 'r' ? 'Repeticiones' : 'Kilómetros') : null}
    ${showRpe ? html`<input class="inp" inputmode="decimal" aria-label=${'RPE, serie ' + label} placeholder="RPE" value=${x.rpe} onInput=${ev => updSet(e.key, x.key, 'rpe', ev.target.value)} />` : null}
    <button class="chk" aria-pressed=${!!x.done} aria-label=${(x.done ? 'Desmarcar' : 'Marcar hecha') + ' la serie ' + label} onClick=${() => toggleSet(e.key, x.key)}><${Icon} n="check" bold /></button>
  </div>`;
}
function ExBlock({ e, i, a, idx, s, routine }) {
  const def = getEx(e.id);
  const rec = idx.byEx[e.id];
  const lastAll = rec && rec.last ? rec.last.all : null;
  const showRpe = s.profile.settings.showRpe && (def.t === 'wr' || def.t === 'bw');
  const note = s.profile.exNotes[e.id];
  const prevSS = i > 0 && a.ex[i - 1].ss;
  const slot = routine && e.slot ? routine.slots.find(z => z.id === e.slot) : null;
  const vi = slot ? slot.ex.indexOf(e.id) : -1;
  const cols = def.t === 'time' ? ['Seg', null] : def.t === 'cardio' ? ['Min', 'Km'] : def.t === 'bw' ? ['+Kg', 'Reps'] : ['Kg', 'Reps'];
  let wn = 0;
  const swap = () => openSheet('picker', {
    title: 'Cambiar ejercicio', multi: false,
    suggest: slot ? slot.ex.filter(z => z !== e.id).concat(alternatives(e.id).filter(z => !slot.ex.includes(z))).slice(0, 8) : alternatives(e.id),
    suggestTitle: slot && slot.ex.length > 1 ? 'Variantes de la rutina y alternativas' : 'Alternativas para el mismo músculo',
    onPick: ([id]) => updActive(c => {
      const k = c.ex.findIndex(z => z.key === e.key); if (k < 0) return;
      const old = c.ex[k];
      const sl = old.slot ? findSlot(c.routineId, old.slot) : null;
      const ne = makeEx(id, { slot: sl && sl.ex.includes(id) ? sl : null, range: { rmin: old.rmin || defRange(getEx(id)).rmin, rmax: old.rmax || defRange(getEx(id)).rmax }, sets: old.sets.length, rest: old.rest });
      ne.slot = old.slot; ne.ss = old.ss;
      c.ex[k] = ne;
    }),
  });
  const addSet = () => updActive(c => { const ee = c.ex.find(z => z.key === e.key); const lastS = ee.sets.filter(z => z.t !== 'w').slice(-1)[0] || ee.sets[ee.sets.length - 1]; const p = {}; if (lastS) for (const f of FIELDS[def.t]) { const v = lastS[f] !== '' ? lastS[f] : lastS.p && lastS.p[f]; if (v != null && v !== '') p[f] = v; } ee.sets.push(newSet(p)); });
  const addWarm = () => updActive(c => {
    const ee = c.ex.find(z => z.key === e.key);
    const first = ee.sets.find(z => z.t !== 'w');
    const w = first ? num(first.w !== '' ? first.w : first.p && first.p.w) : null;
    if (!w) { toast('Anotá el peso de trabajo de la primera serie y volvé a tocar Calentamiento.', 'warn'); return; }
    const wu = warmupSets(w, def, s.profile.settings);
    if (!wu.length) { toast('Con ese peso no hace falta calentamiento con carga.', 'info'); return; }
    ee.sets = ee.sets.filter(z => z.t !== 'w' || z.done);
    ee.sets.unshift(...wu.map(o => newSet({ w: toStr(o.w), r: String(o.r) }, 'w')));
  });
  return html`<article class=${'exb' + (e.ss || prevSS ? ' ss' : '')} aria-label=${def.n}>
    ${e.ss ? html`<div class="ss-tag"><${Icon} n="link" />Superserie con el siguiente</div>` : null}
    <div class="exb-head">
      <button class="exb-name" onClick=${() => openSheet('exInfo', { id: e.id })}><span class="t">${e.n || def.n}</span><span class="m">${MUSCLES[def.m]} · ${EQUIP[def.eq]}${slot && slot.ex.length > 1 ? ` · variante ${vi + 1} de ${slot.ex.length}` : ''}${e.rmin ? ' · objetivo ' + rangeTxt(e, def) : ''}</span></button>
      <button class="icon-btn" aria-label=${'Cambiar ' + def.n + ' por otro ejercicio'} onClick=${swap}><${Icon} n="swap" /></button>
      <button class="icon-btn" aria-label=${'Opciones de ' + def.n} onClick=${() => openSheet('exMenu', { exKey: e.key })}><${Icon} n="dots" bold /></button>
    </div>
    ${note ? html`<div class="exnote"><${Icon} n="note" /><span>${note}</span></div>` : null}
    ${e.sug && e.sug.text && !a.editing && !(s.profile.settings.guide && e.sug.kind === 'new') ? html`<div class="sug"><${Icon} n=${e.sug.kind === 'up' ? 'trend' : e.sug.kind === 'down' ? 'down' : 'bolt'} /><span>${e.sug.text}</span></div>` : null}
    <div class=${'set-row hdr' + (showRpe ? ' rpe' : '') + ' t-' + def.t} aria-hidden="true"><span>Serie</span><span>Anterior</span><span>${cols[0]}</span>${cols[1] ? html`<span>${cols[1]}</span>` : null}${showRpe ? html`<span>RPE</span>` : null}<span>✓</span></div>
    ${e.sets.map((x, j) => { const lab = x.t === 'w' ? 'C' : x.t === 'n' ? String(++wn) : (++wn, TYPE_KEYS[x.t]); return html`<${SetRow} key=${x.key} e=${e} x=${x} j=${j} label=${lab} prev=${prevFor(lastAll, e.sets, j)} def=${def} showRpe=${showRpe} />`; })}
    <div class="exb-foot">
      ${s.profile.settings.guide && e.sets.some(x => !x.done) ? html`<button class="btn sm primary" onClick=${() => e.sets.filter(x => !x.done).forEach(x => toggleSet(e.key, x.key))}><${Icon} n="check" />Completar</button>` : null}
      <button class="btn ghost sm" onClick=${addSet}><${Icon} n="plus" />Serie</button>
      ${def.t === 'wr' && !a.editing ? html`<button class="btn ghost sm" onClick=${addWarm}>Calentamiento</button>` : null}
      ${s.profile.settings.guide ? null : html`<button class="btn ghost sm push" onClick=${() => openSheet('restPick', { exKey: e.key })} aria-label=${'Descanso de ' + def.n + ': ' + fDur(e.rest)}><${Icon} n="timer" />${fDur(e.rest)}</button>`}
    </div>
  </article>`;
}
function Workout({ s, idx }) {
  const a = s.active;
  const routine = a.routineId ? s.profile.routines.find(r => r.id === a.routineId) : null;
  const doneN = a.ex.reduce((t, e) => t + e.sets.filter(x => x.done && x.t !== 'w').length, 0);
  const addEx = () => openSheet('picker', { title: 'Agregar ejercicios', multi: true, onPick: (ids) => updActive(c => { for (const id of ids) c.ex.push(makeEx(id)); }) });
  return html`<div class="wo" role="dialog" aria-modal="true" aria-label=${'Entrenamiento: ' + a.name}>
    <div class="wo-head"><div class="wo-head-in">
      <button class="icon-btn" aria-label="Minimizar el entrenamiento" onClick=${() => set({ activeOpen: false })}><${Icon} n="chevD" /></button>
      <div class="wo-title"><div class="nm">${a.name}</div><${Elapsed} a=${a} /></div>
      <button class="btn primary sm" onClick=${() => openSheet('finish', {})}>${a.editing ? 'Guardar' : 'Terminar'}</button>
    </div>
    ${a.ex.length ? html`<div class="wo-prog" role="progressbar" aria-label="Series hechas" aria-valuemin="0" aria-valuemax=${a.ex.reduce((t, e) => t + e.sets.length, 0)} aria-valuenow=${a.ex.reduce((t, e) => t + e.sets.filter(x => x.done).length, 0)}>${a.ex.map(e => html`<span key=${e.key} style=${`flex:${Math.max(1, e.sets.length)}`}><i style=${`width:${e.sets.length ? e.sets.filter(x => x.done).length / e.sets.length * 100 : 0}%`}></i></span>`)}</div>` : null}
    </div>
    <div class="wo-body"><div class="wo-body-in">
      ${a.ex.length === 0 ? html`<div class="empty"><b>Sesión libre</b><span>Agregá los ejercicios que vayas haciendo. Cada uno trae tus últimos números y una sugerencia de progresión.</span></div>` : null}
      ${a.ex.map((e, i) => html`<${ExBlock} key=${e.key} e=${e} i=${i} a=${a} idx=${idx} s=${s} routine=${routine} />`)}
      <button class="btn block dashed" onClick=${addEx}><${Icon} n="plus" />Agregar ejercicio</button>
      ${doneN ? html`<button class="btn primary block" onClick=${() => openSheet('finish', {})}><${Icon} n="check" />${a.editing ? 'Guardar cambios' : 'Terminar entrenamiento'}</button>` : null}
      <button class="btn ghost danger block" onClick=${discardActive}>${a.editing ? 'Descartar cambios' : 'Cancelar entrenamiento'}</button>
    </div></div>
    ${a.rest ? html`<${RestBar} rest=${a.rest} st=${s.profile.settings} />` : null}
  </div>`;
}
function MiniBar({ a }) {
  const now = useTick(1000);
  return html`<div class="minibar"><button class="minibar-in" onClick=${() => set({ activeOpen: true })}>
    <span class="live-dot"></span><span class="mb-name">${a.name}</span><span class="num">${a.editing ? 'Editando' : fDur((now - a.start) / 1000)}</span><span class="mb-go">Volver<${Icon} n="chevU" /></span>
  </button></div>`;
}
