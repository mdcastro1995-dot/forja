
/* ========== sheets ========== */
function ConfirmSheet({ title, body, ok, cancel, danger, onOk, onCancel, close }) {
  const no = () => { close(); if (onCancel) onCancel(); };
  return html`<${Sheet} title=${title} onClose=${no} footer=${html`<button class="btn" onClick=${no}>${cancel || 'Cancelar'}</button><button class=${'btn ' + (danger ? 'danger-fill' : 'primary')} onClick=${() => { close(); if (onOk) onOk(); }}>${ok || 'Confirmar'}</button>`}><p class="sheet-p">${body}</p><//>`;
}
function NewExercise({ name, onDone }) {
  const [n, setN] = useState(name || '');
  const [m, setM] = useState('pecho');
  const [eq, setEq] = useState('maquina');
  const [t, setT] = useState('wr');
  const save = () => {
    const nm = n.trim();
    if (!nm) { toast('Poné un nombre al ejercicio.', 'warn'); return; }
    const x = { id: 'c_' + uid(), n: nm.slice(0, 60), m, s: [], eq, t, k: 'i', g: 'cu_' + m, custom: true };
    A.profile(p => { p.custom.push(x); });
    CUSTOM_MAP[x.id] = x;
    onDone(x);
  };
  return html`<div class="card stack">
    <b>Nuevo ejercicio</b>
    <label class="field"><span class="lbl">Nombre</span><input id="nx-name" class="input" value=${n} onInput=${e => setN(e.target.value)} placeholder="Ej.: Remo en máquina Hammer" /></label>
    <div class="grid2">
      <label class="field"><span class="lbl">Músculo principal</span><select id="nx-m" class="input" value=${m} onChange=${e => setM(e.target.value)}>${MUSCLE_ORDER.map(k => html`<option key=${k} value=${k}>${MUSCLES[k]}</option>`)}</select></label>
      <label class="field"><span class="lbl">Equipo</span><select id="nx-eq" class="input" value=${eq} onChange=${e => setEq(e.target.value)}>${Object.keys(EQUIP).map(k => html`<option key=${k} value=${k}>${EQUIP[k]}</option>`)}</select></label>
    </div>
    <label class="field"><span class="lbl">Se registra con</span><select id="nx-t" class="input" value=${t} onChange=${e => setT(e.target.value)}>${Object.keys(KIND_NAMES).map(k => html`<option key=${k} value=${k}>${KIND_NAMES[k]}</option>`)}</select></label>
    <button class="btn primary" onClick=${save}><${Icon} n="check" />Crear y elegir</button>
  </div>`;
}
function PickerSheet({ title, multi, onPick, suggest, suggestTitle, s, idx, close }) {
  const [q, setQ] = useState('');
  const [m, setM] = useState('all');
  const [sel, setSel] = useState([]);
  const [creating, setCreating] = useState(false);
  const nq = norm(q.trim());
  const all = allExercises();
  const list = all.filter(x => (m === 'all' || x.m === m) && (!nq || norm(x.n).includes(nq) || norm(MUSCLES[x.m]).includes(nq) || norm(EQUIP[x.eq]).includes(nq))).sort((a, b) => a.n.localeCompare(b.n, 'es'));
  const freq = !nq && m === 'all' ? all.filter(x => idx.byEx[x.id]).sort((a, b) => idx.byEx[b.id].sessions.length - idx.byEx[a.id].sessions.length).slice(0, 6) : [];
  const pick = (id) => { if (!multi) { close(); onPick([id]); return; } setSel(v => v.includes(id) ? v.filter(z => z !== id) : v.concat([id])); };
  const row = (x, pre) => { const rec = idx.byEx[x.id]; return html`<button key=${pre + x.id} class="prow" aria-pressed=${sel.includes(x.id)} onClick=${() => pick(x.id)}>
    <span class="grow"><span class="t">${x.n}</span><span class="s">${MUSCLES[x.m]} · ${EQUIP[x.eq]}${rec && rec.last ? ' · última: ' + setTxt(rec.last.best, x) + ', ' + ago(rec.last.t) : ''}</span></span>
    ${multi ? html`<span class="ck"><${Icon} n="check" bold /></span>` : html`<${Icon} n="chevR" />`}</button>`; };
  const sug = (suggest || []).map(getEx).filter(x => !x.missing);
  return html`<${Sheet} title=${title} onClose=${close} full footer=${multi ? html`<button class="btn primary" disabled=${!sel.length} onClick=${() => { close(); onPick(sel); }}>${sel.length ? `Agregar ${sel.length} ${plural(sel.length, 'ejercicio', 'ejercicios')}` : 'Elegí uno o más ejercicios'}</button>` : null}>
    <div class="picker-top">
      <input id="pk-q" class="input" type="search" placeholder="Buscar ejercicio, músculo o equipo" aria-label="Buscar ejercicio" value=${q} onInput=${e => setQ(e.target.value)} />
      <div class="chips" role="group" aria-label="Filtrar por músculo">${['all'].concat(MUSCLE_ORDER).map(k => html`<button key=${k} class="chip" aria-pressed=${m === k} onClick=${() => setM(k)}>${k === 'all' ? 'Todos' : MUSCLES[k]}</button>`)}</div>
    </div>
    ${sug.length && !nq ? html`<div class="plist"><div class="eyebrow pl-h">${suggestTitle || 'Sugeridos'}</div>${sug.map(x => row(x, 's'))}</div>` : null}
    ${freq.length ? html`<div class="plist"><div class="eyebrow pl-h">Los que más hacés</div>${freq.map(x => row(x, 'f'))}</div>` : null}
    <div class="plist"><div class="eyebrow pl-h">${nq ? `Resultados (${list.length})` : m === 'all' ? 'Todos los ejercicios' : MUSCLES[m]}</div>${list.map(x => row(x, 'a'))}</div>
    ${creating ? html`<${NewExercise} name=${q} onDone=${x => { setCreating(false); pick(x.id); }} />` : html`<button class="btn" onClick=${() => setCreating(true)}><${Icon} n="plus" />${q.trim() ? `Crear “${q.trim()}”` : 'Crear un ejercicio propio'}</button>`}
  <//>`;
}
function FinishSheet({ s, idx, close }) {
  const a = s.active;
  const [feel, setFeel] = useState(a ? a.feel : null);
  const [note, setNote] = useState(a ? a.note || '' : '');
  const [mode, setMode] = useState('done');
  if (!a) return null;
  const pend = pendingCount(a);
  const prev = finalize(Object.assign({}, a, { feel, note }), mode);
  const st = workoutStats(prev);
  const prs = [];
  for (const e of prev.ex) {
    const rec = idx.byEx[e.id]; if (!rec) continue;
    const def = getEx(e.id); const work = e.sets.filter(x => x.t !== 'w'); if (!work.length) continue;
    if (def.t === 'wr') { const me = Math.max(...work.map(x => e1rm(x.w, x.r))); if (me > rec.best.e1 + 0.05) prs.push({ n: e.n, k: 'e1', v: me }); }
    else if (def.t === 'bw') { const mr = Math.max(...work.map(x => x.r)); if (mr > rec.best.r) prs.push({ n: e.n, k: 'r', v: mr }); }
    else if (def.t === 'time') { const ms = Math.max(...work.map(x => x.s)); if (ms > rec.best.s) prs.push({ n: e.n, k: 's', v: ms }); }
  }
  const FEEL = ['Muy duro', 'Duro', 'Normal', 'Bien', 'Excelente'];
  return html`<${Sheet} title=${a.editing ? 'Guardar cambios' : 'Terminar sesión'} onClose=${close} footer=${html`<button class="btn" onClick=${close}>Seguir</button><button class="btn primary" onClick=${() => finishWorkout(mode, feel, note)}><${Icon} n="check" />Guardar</button>`}>
    <div class="sum-tiles">
      <${Tile} label="Duración" value=${a.editing ? fMin(prev.dur) : fMin((Date.now() - a.start) / 1000)} />
      <${Tile} label="Volumen" value=${fVol(st.vol)} />
      <${Tile} label="Series" value=${st.sets} />
    </div>
    ${prs.length ? html`<div class="celebrate"><span class="display">${prs.length} ${plural(prs.length, 'récord', 'récords')}</span>${prs.map((p, i) => html`<span key=${i}>${p.n}: ${PR_LABEL[p.k]} ${prVal(p)}</span>`)}</div>` : null}
    ${pend ? html`<div class="warnbox"><span>Tenés ${pend} ${plural(pend, 'serie anotada sin marcar', 'series anotadas sin marcar')}.</span>
      <div class="seg" role="group" aria-label="Qué hacer con las series sin marcar"><button aria-pressed=${mode === 'done'} onClick=${() => setMode('done')}>Descartarlas</button><button aria-pressed=${mode === 'all'} onClick=${() => setMode('all')}>Guardarlas</button></div></div>` : null}
    <div class="field"><span class="lbl">¿Cómo te sentiste?</span>
      <div class="feel" role="group" aria-label="Sensación">${FEEL.map((l, i) => html`<button key=${i} aria-pressed=${feel === i + 1} onClick=${() => setFeel(feel === i + 1 ? null : i + 1)}>${i + 1}<small>${l}</small></button>`)}</div></div>
    <label class="field"><span class="lbl">Notas de la sesión</span><textarea id="fin-note" class="input" placeholder="Cómo dormiste, molestias, qué ajustar la próxima…" value=${note} onInput=${e => setNote(e.target.value)}></textarea></label>
  <//>`;
}
function DetailSheet({ id, fresh, s, idx, close }) {
  const w = s.workouts.find(x => x.id === id);
  if (!w) return html`<${Sheet} title="Entrenamiento" onClose=${close}><p class="sheet-p">Este entrenamiento ya no existe.</p><//>`;
  const st = workoutStats(w);
  const prs = idx.byW[w.id] || [];
  const del = () => openSheet('confirm', { title: 'Borrar entrenamiento', body: `Se borra “${w.name}” del ${DF_DAYS.format(new Date(w.start))}. Tus récords se recalculan.`, ok: 'Borrar', danger: true, onOk: () => { A.delWorkout(w.id); close(); toast('Entrenamiento borrado'); } });
  return html`<${Sheet} title=${w.name} onClose=${close} full footer=${html`<button class="btn" onClick=${() => { close(); editWorkout(w); }}><${Icon} n="edit" />Editar</button><button class="btn primary" onClick=${() => { close(); repeatWorkout(w); }}><${Icon} n="refresh" />Repetir</button>`}>
    ${fresh ? html`<div class="celebrate"><span class="display">Sesión guardada</span><span>${prs.length ? `${prs.length} ${plural(prs.length, 'récord nuevo', 'récords nuevos')}. ` : ''}${w.routineId ? 'La rotación ya avanzó a la próxima rutina.' : ''}</span></div>` : null}
    <p class="muted">${cap(DF_LONG.format(new Date(w.start)))} · ${DF_TIME.format(new Date(w.start))}${w.example ? ' · dato de ejemplo' : ''}</p>
    <button class="btn" onClick=${() => { close(); openSheet('day', { date: dayKey(w.start) }); }}><${Icon} n="note" />Registrar cómo te fue y ajustar la rutina</button>
    <div class="sum-tiles"><${Tile} label="Duración" value=${fMin(w.dur)} /><${Tile} label="Volumen" value=${fVol(st.vol)} /><${Tile} label="Series" value=${st.sets} /></div>
    ${w.feel || w.note ? html`<div class="card stack">${w.feel ? html`<span><b>Sensación:</b> ${w.feel}/5</span>` : null}${w.note ? html`<span>${w.note}</span>` : null}</div>` : null}
    <div class="exlist">${(w.ex || []).map((e, k) => { const def = getEx(e.id); const ep = prs.filter(p => p.ex === e.id); let wn = 0; return html`<div class="exd" key=${k}>
      <div class="t"><span>${e.n || def.n}</span>${ep.length ? html`<span class="pr-badge"><${Icon} n="trophy" />${ep.map(p => PR_LABEL[p.k]).join(' · ')}</span>` : null}</div>
      <ol>${e.sets.map((x, j) => html`<li key=${j}><span class=${'k' + (x.t === 'w' ? ' w' : '')}>${x.t === 'w' ? 'C' : x.t === 'n' ? ++wn : (++wn, TYPE_KEYS[x.t])}</span><span>${setTxt(x, def)}</span>${def.t === 'wr' && x.t !== 'w' ? html`<span class="muted sm">1RM est. ${NF1.format(e1rm(x.w, x.r))}</span>` : null}${x.rpe ? html`<span class="muted sm">RPE ${f2(x.rpe)}</span>` : null}</li>`)}</ol>
      ${e.note ? html`<span class="muted sm">${e.note}</span>` : null}</div>`; })}</div>
    <button class="btn ghost danger" onClick=${del}><${Icon} n="trash" />Borrar entrenamiento</button>
  <//>`;
}
function SmartSheet({ s, close }) {
  const [dur, setDur] = useState(LS.get('smartDur', 60));
  const [focus, setFocus] = useState('auto');
  const [seed, setSeed] = useState(1);
  const plan = useMemo(() => smartPlan(s, { dur, focus, seed }), [dur, focus, seed, s.workouts, s.profile.settings.equipment]);
  const idx = INDEX(s.workouts);
  const go = () => {
    LS.set('smartDur', dur);
    const name = focus === 'sup' ? 'Inteligente · Tren superior' : focus === 'inf' ? 'Inteligente · Tren inferior' : focus === 'full' ? 'Inteligente · Cuerpo completo' : 'Inteligente';
    startActive({ name, routineId: null, ex: plan.items.map(it => makeEx(it.id, { range: { rmin: it.rmin, rmax: it.rmax }, sets: it.sets, rest: it.rest })) });
  };
  return html`<${Sheet} title="Entrenamiento inteligente" onClose=${close} footer=${html`<button class="btn" onClick=${() => setSeed(x => x + 1)}><${Icon} n="refresh" />Otra opción</button><button class="btn primary" disabled=${!plan.items.length} onClick=${go}><${Icon} n="play" fill />Empezar</button>`}>
    <p class="sheet-p">Elige los músculos más recuperados y con menos series esta semana, y prioriza ejercicios que no hiciste en los últimos 7 días para ir alternando.</p>
    <div class="field"><span class="lbl">Duración</span><div class="seg" role="group" aria-label="Duración">${[30, 45, 60, 75].map(d => html`<button key=${d} aria-pressed=${dur === d} onClick=${() => setDur(d)}>${d} min</button>`)}</div></div>
    <div class="field"><span class="lbl">Enfoque</span><div class="seg" role="group" aria-label="Enfoque">${[['auto', 'Auto'], ['sup', 'Superior'], ['inf', 'Inferior'], ['full', 'Completo']].map(f => html`<button key=${f[0]} aria-pressed=${focus === f[0]} onClick=${() => setFocus(f[0])}>${f[1]}</button>`)}</div></div>
    ${plan.why.length ? html`<p class="muted sm">Prioriza ${plan.why.map(w => `${MUSCLES[w.m].toLowerCase()} (${w.r}% recuperado, ${NF1.format(w.sets)} series esta semana)`).join(', ')}.</p>` : null}
    ${plan.items.length ? html`<div class="menu">${plan.items.map((it, i) => { const def = getEx(it.id); const sug = suggest(it.id, it, idx, s.profile.settings); return html`<button key=${it.id} onClick=${() => openSheet('exInfo', { id: it.id })}><span class="num muted">${i + 1}</span><span class="grow"><span>${def.n}</span><br /><span class="muted sm">${MUSCLES[def.m]} · ${it.sets}×${rangeTxt(it, def)}${sug && sug.w ? ' · ' + fKg(sug.w) : ''}</span></span><${Icon} n="chevR" /></button>`; })}</div>`
      : html`<div class="empty"><b>No hay ejercicios para esa combinación.</b><span>Revisá el equipamiento marcado en Ajustes.</span></div>`}
  <//>`;
}
function ProgramsSheet({ s, focus, close }) {
  const [open, setOpen] = useState(focus || null);
  const use = (pr) => {
    if (!s.profile.routines.length) { applyProgram(pr, true); close(); return; }
    openSheet('confirm', { title: 'Usar ' + pr.name, body: `Ya tenés ${s.profile.routines.length} ${plural(s.profile.routines.length, 'rutina', 'rutinas')}. ¿Las reemplazás por este programa o lo sumás al final de la rotación?`, ok: 'Reemplazar', cancel: 'Sumar al final', onOk: () => { applyProgram(pr, true); close(); }, onCancel: () => { applyProgram(pr, false); close(); } });
  };
  return html`<${Sheet} title="Programas" onClose=${close} full>
    <p class="sheet-p">Programas armados con variantes que rotan. Al usarlos se crean rutinas que podés editar.</p>
    <div class="prog-list">${PROGRAMS.map(pr => html`<div key=${pr.id} class="card stack">
      <span class="eyebrow">${pr.freq} · ${pr.level}</span>
      <b style="font-size:18px">${pr.name}</b>
      <p class="sheet-p">${pr.desc}</p>
      ${open === pr.id ? html`<div class="stack">${pr.routines.map(r => html`<div key=${r.name}><b>${r.name}</b><p class="muted sm">${r.slots.map(sl => `${getEx(sl.ex[0]).n} ${sl.sets}×${rangeTxt(sl, getEx(sl.ex[0]))}${sl.ex.length > 1 ? ' (+' + (sl.ex.length - 1) + ' ' + plural(sl.ex.length - 1, 'variante', 'variantes') + ')' : ''}`).join(' · ')}</p></div>`)}</div>` : null}
      <div class="row wrap"><button class="btn primary sm" onClick=${() => use(pr)}>Usar este programa</button><button class="btn ghost sm" onClick=${() => setOpen(open === pr.id ? null : pr.id)}>${open === pr.id ? 'Ocultar detalle' : 'Ver ejercicios'}</button></div>
    </div>`)}</div>
  <//>`;
}
function RoutineEditor({ id, s, close }) {
  const orig = id ? s.profile.routines.find(r => r.id === id) : null;
  const [r, setR] = useState(() => orig ? clone(orig) : { id: uid(), name: '', inRot: true, slots: [] });
  const upd = (fn) => setR(prev => { const c = clone(prev); fn(c); return c; });
  const st = s.profile.settings;
  const save = () => {
    if (!r.name.trim()) { toast('Poné un nombre a la rutina.', 'warn'); return; }
    if (!r.slots.length) { toast('Agregá al menos un ejercicio.', 'warn'); return; }
    const clean = Object.assign({}, r, { name: r.name.trim().slice(0, 40), slots: r.slots.map(sl => Object.assign({}, sl, { rmin: clamp(sl.rmin || 1, 1, 300), rmax: Math.max(sl.rmin || 1, sl.rmax || 1), idx: clamp(sl.idx, 0, sl.ex.length - 1) })) });
    A.profile(p => { const i = p.routines.findIndex(x => x.id === clean.id); if (i >= 0) p.routines[i] = clean; else p.routines.push(clean); });
    toast('Rutina guardada'); close();
  };
  const del = () => openSheet('confirm', { title: 'Borrar rutina', body: `“${r.name || 'Sin nombre'}” sale de tus rutinas. Tu historial no se toca.`, ok: 'Borrar', danger: true, onOk: () => { A.profile(p => { p.routines = p.routines.filter(x => x.id !== r.id); }); close(); } });
  const addEx = () => openSheet('picker', { title: 'Agregar ejercicios', multi: true, onPick: (ids) => upd(c => { for (const exId of ids) { const def = getEx(exId); const rg = defRange(def); c.slots.push({ id: uid(), label: MUSCLES[def.m], ex: [exId], idx: 0, cnt: 0, rot: 1, sets: 3, rmin: rg.rmin, rmax: rg.rmax, rest: restFor(def, st), ss: false }); } }) });
  const addVar = (k) => { const sl = r.slots[k]; openSheet('picker', { title: 'Agregar variante', multi: true, suggest: alternatives(sl.ex[0]).filter(x => !sl.ex.includes(x)), suggestTitle: 'Para el mismo músculo', onPick: (ids) => upd(c => { const x = c.slots[k]; for (const i2 of ids) if (!x.ex.includes(i2)) x.ex.push(i2); }) }); };
  const mv = (k, d) => upd(c => { const j = k + d; if (j < 0 || j >= c.slots.length) return; const t = c.slots[k]; c.slots[k] = c.slots[j]; c.slots[j] = t; });
  return html`<${Sheet} title=${orig ? 'Editar rutina' : 'Nueva rutina'} onClose=${close} full footer=${html`${orig ? html`<button class="btn danger" onClick=${del}><${Icon} n="trash" />Borrar</button>` : html`<button class="btn" onClick=${close}>Cancelar</button>`}<button class="btn primary" onClick=${save}><${Icon} n="check" />Guardar</button>`}>
    <label class="field"><span class="lbl">Nombre</span><input id="re-name" class="input" value=${r.name} placeholder="Ej.: Torso A" onInput=${e => { const v = e.target.value; upd(c => { c.name = v; }); }} /></label>
    <label class="rot-switch"><input id="re-rot" type="checkbox" class="toggle" checked=${r.inRot !== false} onChange=${e => { const v = e.target.checked; upd(c => { c.inRot = v; }); }} />Incluir en la rotación</label>
    ${r.slots.map((sl, k) => { const def0 = getEx(sl.ex[0]); return html`<div key=${sl.id} class=${'slot' + (sl.ss || (k > 0 && r.slots[k - 1].ss) ? ' ss' : '')}>
      <div class="slot-head">
        <span class="num muted" style="width:20px">${k + 1}</span>
        <input class="input grow" aria-label=${'Nombre del bloque ' + (k + 1)} value=${sl.label} onInput=${e => { const v = e.target.value; upd(c => { c.slots[k].label = v; }); }} />
        <button class="icon-btn sm" aria-label="Subir" disabled=${k === 0} onClick=${() => mv(k, -1)}><${Icon} n="up" /></button>
        <button class="icon-btn sm" aria-label="Bajar" disabled=${k === r.slots.length - 1} onClick=${() => mv(k, 1)}><${Icon} n="down" /></button>
        <button class="icon-btn sm" aria-label="Quitar bloque" onClick=${() => upd(c => { c.slots.splice(k, 1); })}><${Icon} n="trash" /></button>
      </div>
      <div class="variants">${sl.ex.map((exId, vi) => html`<div key=${exId} class=${'var' + (vi === sl.idx ? ' cur' : '')}>
        <button class="var-name" aria-pressed=${vi === sl.idx} onClick=${() => upd(c => { c.slots[k].idx = vi; c.slots[k].cnt = 0; })}><span class="rd"></span><span class="grow">${getEx(exId).n}</span>${vi === sl.idx ? html`<span class="pill">Próxima</span>` : null}</button>
        ${sl.ex.length > 1 ? html`<button class="icon-btn sm" aria-label=${'Quitar variante ' + getEx(exId).n} onClick=${() => upd(c => { const x = c.slots[k]; x.ex.splice(vi, 1); x.idx = clamp(x.idx >= vi && x.idx > 0 ? x.idx - 1 : x.idx, 0, x.ex.length - 1); })}><${Icon} n="x" /></button>` : null}
      </div>`)}
        <button class="btn ghost sm" style="align-self:flex-start" onClick=${() => addVar(k)}><${Icon} n="plus" />Variante para alternar</button>
      </div>
      <div class="slot-cfg">
        ${sl.ex.length > 1 ? html`<label class="field full"><span class="lbl">Alternar variantes</span><select class="input" value=${sl.rot} onChange=${e => { const v = Number(e.target.value); upd(c => { c.slots[k].rot = v; }); }}>${ROT_OPTS.map(o => html`<option key=${o[0]} value=${o[0]}>${o[1]}</option>`)}</select></label>` : null}
        <div class="field"><span class="lbl">Series</span><${Stepper} value=${sl.sets} min=${1} max=${10} label="series" onChange=${v => upd(c => { c.slots[k].sets = v; })} /></div>
        <div class="field"><span class="lbl">${def0.t === 'time' ? 'Segundos' : def0.t === 'cardio' ? 'Minutos' : 'Repeticiones'}</span><div class="reps">
          <input class="input" inputmode="numeric" aria-label="Mínimo" value=${sl.rmin} onInput=${e => { const v = Math.round(num(e.target.value) || 0); upd(c => { c.slots[k].rmin = v; }); }} /><span>a</span>
          <input class="input" inputmode="numeric" aria-label="Máximo" value=${sl.rmax} onInput=${e => { const v = Math.round(num(e.target.value) || 0); upd(c => { c.slots[k].rmax = v; }); }} /></div></div>
        <label class="field"><span class="lbl">Descanso</span><select class="input" value=${sl.rest} onChange=${e => { const v = Number(e.target.value); upd(c => { c.slots[k].rest = v; }); }}>${REST_OPTS.map(o => html`<option key=${o} value=${o}>${fDur(o)}</option>`)}</select></label>
        ${k < r.slots.length - 1 ? html`<label class="rot-switch field" style="flex-direction:row;align-items:center"><input type="checkbox" class="toggle" checked=${!!sl.ss} onChange=${e => { const v = e.target.checked; upd(c => { c.slots[k].ss = v; }); }} />Superserie con el siguiente</label>` : null}
      </div>
    </div>`; })}
    <button class="btn block dashed" onClick=${addEx}><${Icon} n="plus" />Agregar ejercicio</button>
    <p class="muted sm">Para medir bien la progresión, dejá fijos los básicos pesados o rotalos cada 4 sesiones. Los accesorios pueden rotar en cada sesión.</p>
  <//>`;
}
function ExMenuSheet({ exKey, s, close }) {
  const a = s.active; if (!a) return null;
  const i = a.ex.findIndex(z => z.key === exKey); if (i < 0) return null;
  const e = a.ex[i], def = getEx(e.id);
  const act = (fn) => { close(); fn(); };
  return html`<${Sheet} title=${e.n || def.n} onClose=${close}>
    <div class="menu">
      <button onClick=${() => act(() => openSheet('exInfo', { id: e.id }))}><${Icon} n="trend" />Ver historial y récords</button>
      <button onClick=${() => act(() => openSheet('exInfo', { id: e.id, editNote: true }))}><${Icon} n="note" />${s.profile.exNotes[e.id] ? 'Editar nota fija' : 'Agregar nota fija (asiento, agarre…)'}</button>
      ${i < a.ex.length - 1 ? html`<button aria-pressed=${!!e.ss} onClick=${() => act(() => updActive(c => { c.ex[i].ss = !c.ex[i].ss; }))}><${Icon} n="link" />${e.ss ? 'Quitar superserie' : 'Superserie con el siguiente'}</button>` : null}
      <button disabled=${i === 0} onClick=${() => act(() => updActive(c => { const t = c.ex[i]; c.ex[i] = c.ex[i - 1]; c.ex[i - 1] = t; }))}><${Icon} n="up" />Mover arriba</button>
      <button disabled=${i === a.ex.length - 1} onClick=${() => act(() => updActive(c => { const t = c.ex[i]; c.ex[i] = c.ex[i + 1]; c.ex[i + 1] = t; }))}><${Icon} n="down" />Mover abajo</button>
      <button class="danger" onClick=${() => act(() => updActive(c => { c.ex.splice(i, 1); }))}><${Icon} n="trash" />Quitar de esta sesión</button>
    </div>
  <//>`;
}
function SetMenuSheet({ exKey, setKey, s, close }) {
  const a = s.active; if (!a) return null;
  const e = a.ex.find(z => z.key === exKey); const x = e && e.sets.find(z => z.key === setKey); if (!x) return null;
  const setType = (t) => { close(); updActive(c => { const xx = c.ex.find(z => z.key === exKey).sets.find(z => z.key === setKey); xx.t = t; }); };
  return html`<${Sheet} title="Tipo de serie" onClose=${close}>
    <div class="menu">${Object.keys(TYPE_NAMES).map(t => html`<button key=${t} aria-pressed=${x.t === t} onClick=${() => setType(t)}><span class=${'set-n ' + t} style="width:30px;height:30px;display:grid;place-items:center">${t === 'n' ? '1' : TYPE_KEYS[t]}</span><span class="grow">${TYPE_NAMES[t]}</span>${x.t === t ? html`<${Icon} n="check" />` : null}</button>`)}
      <button class="danger" onClick=${() => { close(); updActive(c => { const ee = c.ex.find(z => z.key === exKey); ee.sets = ee.sets.filter(z => z.key !== setKey); }); }}><${Icon} n="trash" />Borrar esta serie</button></div>
    <p class="muted sm">Las series de calentamiento no cuentan para volumen, récords ni recuperación.</p>
  <//>`;
}
function RestPickSheet({ exKey, s, close }) {
  const a = s.active; const e = a && a.ex.find(z => z.key === exKey); if (!e) return null;
  return html`<${Sheet} title="Descanso" onClose=${close}>
    <p class="sheet-p">Tiempo entre series para ${e.n}. Para fuerza (1 a 6 reps) conviene 2 a 4 minutos; para hipertrofia, 1 a 3.</p>
    <div class="chips wrap">${REST_OPTS.map(o => html`<button key=${o} class="chip" aria-pressed=${e.rest === o} onClick=${() => { close(); updActive(c => { c.ex.find(z => z.key === exKey).rest = o; }); }}>${fDur(o)}</button>`)}</div>
  <//>`;
}
function ExInfoSheet({ id, editNote, s, idx, close }) {
  const def = getEx(id), rec = idx.byEx[id];
  const [metric, setMetric] = useState('e1');
  const [note, setNote] = useState(s.profile.exNotes[id] || '');
  const [editing, setEditing] = useState(!!editNote);
  const saveNote = () => { const v = note.trim().slice(0, 200); A.profile(p => { if (v) p.exNotes[id] = v; else delete p.exNotes[id]; }); setEditing(false); toast(v ? 'Nota guardada' : 'Nota borrada'); };
  return html`<${Sheet} title=${def.n} onClose=${close} full>
    <p class="muted">${MUSCLES[def.m]}${def.s.length ? ' · también ' + def.s.map(m => MUSCLES[m].toLowerCase()).join(', ') : ''} · ${EQUIP[def.eq]}</p>
    ${editing ? html`<div class="card stack"><label class="field"><span class="lbl">Nota fija (aparece cada vez que hacés este ejercicio)</span><textarea id="ex-note" class="input" value=${note} placeholder="Ej.: asiento en 4, agarre neutro" onInput=${e => setNote(e.target.value)}></textarea></label><div class="row"><button class="btn primary sm" onClick=${saveNote}>Guardar nota</button><button class="btn ghost sm" onClick=${() => setEditing(false)}>Cancelar</button></div></div>`
      : html`<button class="btn sm" style="align-self:flex-start" onClick=${() => setEditing(true)}><${Icon} n="note" />${s.profile.exNotes[id] ? 'Nota: ' + s.profile.exNotes[id] : 'Agregar nota fija'}</button>`}
    ${rec ? html`
      <div class="tiles">${def.t === 'wr' ? html`<${Tile} label="Mejor 1RM estimado" value=${fKg(Math.round(rec.best.e1 * 10) / 10)} /><${Tile} label="Peso máximo" value=${fKg(rec.best.w)} />` : def.t === 'bw' ? html`<${Tile} label="Más repeticiones" value=${rec.best.r} /><${Tile} label="Lastre máximo" value=${rec.best.w ? fKg(rec.best.w) : '–'} />` : def.t === 'time' ? html`<${Tile} label="Mejor tiempo" value=${rec.best.s + ' s'} /><${Tile} label="Sesiones" value=${rec.sessions.length} />` : html`<${Tile} label="Más minutos" value=${f2(rec.best.m)} /><${Tile} label="Más km" value=${f2(rec.best.d)} />`}</div>
      <${ExerciseChart} id=${id} idx=${idx} from=${0} metric=${metric} onMetric=${setMetric} compact />
      <div class="stack">${rec.sessions.slice(-5).reverse().map(x => html`<div key=${x.wid} class="exd"><div class="t"><span>${cap(DF_DAYS.format(new Date(x.t)))}</span><span class="muted sm">${ago(x.t)}</span></div><span class="num">${x.all.map(z => (z.t === 'w' ? 'C ' : '') + setTxt(z, def)).join('  ·  ')}</span></div>`)}</div>`
      : html`<div class="empty"><b>Todavía no lo registraste.</b><span>Después de la primera sesión vas a ver acá tu evolución y tus récords.</span></div>`}
  <//>`;
}
function ExportTextSheet({ filename, data, close }) {
  const ref = useRef(null);
  const copy = async () => { try { await navigator.clipboard.writeText(data); toast('Copiado'); } catch (e) { if (ref.current) { ref.current.focus(); ref.current.select(); } toast('Seleccioná el texto y copialo.', 'warn'); } };
  return html`<${Sheet} title="Exportar" onClose=${close} footer=${html`<button class="btn primary" onClick=${copy}><${Icon} n="copy" />Copiar</button>`}>
    <p class="sheet-p">Esta vista no puede descargar archivos. Copiá el contenido y guardalo como <b>${filename}</b>.</p>
    <textarea ref=${ref} class="input" readonly style="min-height:260px;font-family:ui-monospace,monospace;font-size:12px" value=${data.length > 400000 ? data.slice(0, 400000) : data}></textarea>
  <//>`;
}
function CoachSheet({ s, mode, close }) {
  const sample = s.caps.sample;
  const [tab, setTab] = useState(mode === 'plan' ? 'plan' : 'ask');
  const [q, setQ] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ days: 4, goal: 'Hipertrofia', level: 'Intermedio', min: 60, focus: '', weeks: 8, cardio: 1 });
  const [plan, setPlan] = useState(null);
  const ctl = useRef(null);
  useEffect(() => () => { if (ctl.current) ctl.current.abort(); }, []);
  const QUICK = ['Analizá mi progreso de las últimas 4 semanas: qué mejoró, qué se estancó y qué cambiarías.', '¿Qué me conviene entrenar hoy según mi recuperación y mi rotación?', '¿Mi volumen semanal por músculo está bien para ganar músculo? Decime dónde sumar o quitar series.', 'Detectá ejercicios estancados y proponé cómo romper la meseta.'];
  const ask = async (question) => {
    if (!sample || busy || !question.trim()) return;
    setErr(''); setOut(''); setBusy(true);
    const c = new AbortController(); ctl.current = c;
    try { const r = await sample(coachPrompt(S(), question.trim()), { signal: c.signal, onText: ({ text }) => setOut(text) }); setOut(r.text); if (r.truncated) setErr('La respuesta quedó cortada. Probá con una pregunta más acotada.'); }
    catch (e) { setOut(e && e.code !== 'refused' && e.text ? e.text : ''); if (!e || e.code !== 'cancelled') setErr(sampleErr(e)); }
    finally { setBusy(false); }
  };
  const build = async () => {
    if (!sample || busy) return;
    setErr(''); setPlan(null); setBusy(true);
    const c = new AbortController(); ctl.current = c;
    try { const o = await sample.json(planPrompt(S(), form), { signal: c.signal }); const p = cleanPlan(o); if (!p) setErr('No llegó un programa usable. Probá de nuevo.'); else setPlan(Object.assign(p, { weeks: form.weeks, goal: form.goal, minutes: form.min })); }
    catch (e) { if (!e || e.code !== 'cancelled') setErr(sampleErr(e)); }
    finally { setBusy(false); }
  };
  const importPlan = () => {
    if (!plan) return;
    if (!s.profile.routines.length) { applyProgram(plan, true); close(); return; }
    openSheet('confirm', { title: 'Importar ' + plan.name, body: '¿Reemplazás tus rutinas actuales o sumás este programa al final de la rotación?', ok: 'Reemplazar', cancel: 'Sumar al final', onOk: () => { applyProgram(plan, true); close(); }, onCancel: () => { applyProgram(plan, false); close(); } });
  };
  const F = (k, v) => setForm(f => Object.assign({}, f, { [k]: v }));
  if (!sample) return html`<${Sheet} title="Coach" onClose=${close}><p class="sheet-p">${AI_HINT}</p><//>`;
  return html`<${Sheet} title=${mode === 'plan' ? 'Generar plan' : 'Coach con Claude'} onClose=${close} full footer=${busy ? html`<button class="btn" onClick=${() => ctl.current && ctl.current.abort()}><${Icon} n="stop" />Detener</button>` : null}>
    <div class="seg" role="group" aria-label="Modo">${[['ask', 'Consultar'], ['plan', 'Armar programa']].map(t => html`<button key=${t[0]} aria-pressed=${tab === t[0]} disabled=${busy} onClick=${() => setTab(t[0])}>${t[1]}</button>`)}</div>
    ${tab === 'ask' ? html`
      <p class="muted sm">Claude recibe un resumen de tus datos (no tus notas completas) y responde con tu plan de Claude.</p>
      <div class="menu">${QUICK.map((t, i) => html`<button key=${i} disabled=${busy} onClick=${() => { setQ(t); ask(t); }}><${Icon} n="chat" /><span class="grow">${t}</span></button>`)}</div>
      <label class="field"><span class="lbl">O escribí tu pregunta</span><textarea id="coach-q" class="input" value=${q} placeholder="Ej.: ¿Cómo subo mi press de banca sin dolor de hombro?" onInput=${e => setQ(e.target.value)}></textarea></label>
      <button class="btn primary" disabled=${busy || !q.trim()} onClick=${() => ask(q)}><${Icon} n="spark" />Preguntar</button>
      ${busy && !out ? html`<p class="thinking">Claude está analizando tu historial…</p>` : null}
      ${out ? html`<div class="card coach-out" aria-live="polite">${md(out)}</div>` : null}`
    : html`
      <p class="muted sm">Claude arma un programa con ejercicios de la biblioteca, variantes que rotan y volumen por músculo. Lo revisás antes de importarlo.</p>
      <div class="grid2">
        <label class="field"><span class="lbl">Días de gimnasio por semana</span><select class="input" value=${form.days} onChange=${e => F('days', Number(e.target.value))}>${[2, 3, 4, 5, 6].map(d => html`<option key=${d} value=${d}>${d}</option>`)}</select></label>
        <label class="field"><span class="lbl">Minutos por sesión</span><select class="input" value=${form.min} onChange=${e => F('min', Number(e.target.value))}>${[30, 45, 60, 75, 90].map(d => html`<option key=${d} value=${d}>${d} min</option>`)}</select></label>
        <label class="field"><span class="lbl">Días de cardio aparte</span><select class="input" value=${form.cardio} onChange=${e => F('cardio', Number(e.target.value))}>${[0, 1, 2, 3].map(d => html`<option key=${d} value=${d}>${d}</option>`)}</select></label>
        <label class="field"><span class="lbl">Duración del plan</span><select class="input" value=${form.weeks} onChange=${e => F('weeks', Number(e.target.value))}>${[4, 6, 8, 12].map(d => html`<option key=${d} value=${d}>${d} semanas</option>`)}</select></label>
        <label class="field"><span class="lbl">Objetivo</span><select class="input" value=${form.goal} onChange=${e => F('goal', e.target.value)}>${['Hipertrofia', 'Fuerza', 'Recomposición corporal', 'Salud general'].map(d => html`<option key=${d} value=${d}>${d}</option>`)}</select></label>
        <label class="field"><span class="lbl">Nivel</span><select class="input" value=${form.level} onChange=${e => F('level', e.target.value)}>${['Principiante', 'Intermedio', 'Avanzado'].map(d => html`<option key=${d} value=${d}>${d}</option>`)}</select></label>
      </div>
      <label class="field"><span class="lbl">Énfasis o limitaciones (opcional)</span><input id="plan-focus" class="input" value=${form.focus} placeholder="Ej.: priorizar espalda y glúteos, cuidar la rodilla" onInput=${e => F('focus', e.target.value)} /></label>
      <button class="btn primary" disabled=${busy} onClick=${build}><${Icon} n="spark" />Generar programa</button>
      ${busy ? html`<p class="thinking">Claude está diseñando tu programa. Puede tardar hasta un minuto…</p>` : null}
      ${plan ? html`<div class="card stack"><b style="font-size:18px">${plan.name}</b><span class="muted sm">${plan.weeks} semanas · ${plan.goal} · unos ${plan.minutes} min por sesión</span>${plan.desc ? html`<p class="sheet-p">${plan.desc}</p>` : null}
        ${plan.phases && plan.phases.length ? html`<div class="phases">${plan.phases.map((ph, i) => html`<div key=${i} class="phase"><b>Semanas ${ph.weeks}${ph.title ? ' · ' + ph.title : ''}</b><span class="muted sm">${ph.notes}</span></div>`)}</div>` : null}
        ${plan.routines.map((r, i) => html`<div key=${i}><b>${r.name}</b><p class="muted sm">${r.slots.map(sl => `${getEx(sl.ex[0]).n} ${sl.sets}×${rangeTxt(sl, getEx(sl.ex[0]))}${sl.ex.length > 1 ? ' ⇄ ' + sl.ex.slice(1).map(z => getEx(z).n).join(' / ') : ''}`).join(' · ')}</p></div>`)}
        <button class="btn primary" onClick=${importPlan}><${Icon} n="download" />Importar a mis rutinas</button></div>` : null}`}
    ${err ? html`<p class="muted" role="alert">${err}</p>` : null}
  <//>`;
}

/* ========== app ========== */
function RoutinePickSheet({ cur, onPick, s, close }) {
  const rk = rankRoutines(s.profile, s.workouts);
  const inRot = new Set(rk.map(x => x.r.id));
  const off = s.profile.routines.filter(r => !inRot.has(r.id));
  const row = (r, x, k) => html`<button key=${r.id} aria-pressed=${r.id === cur} onClick=${() => { close(); onPick(r.id); }}>
    <span class="grow rp-row"><b>${r.name}${k === 0 ? html` <span class="pill">Recomendada</span>` : null}</b>
    <small>${x && x.last ? 'La hiciste ' + ago(x.last) : x ? 'Todavía no la hiciste' : 'Fuera de la rotación'}${x && x.tired.length ? ' · ' + x.tired.map(m => MUSCLES[m].toLowerCase()).join(', ') + ' todavía se ' + plural(x.tired.length, 'recupera', 'recuperan') : ''}</small></span>
    ${r.id === cur ? html`<${Icon} n="check" />` : html`<${Icon} n="chevR" />`}</button>`;
  return html`<${Sheet} title="Elegir día" onClose=${close}>
    <p class="sheet-p">Primero va la que hace más que no hacés, salteando las que cargan músculos que todavía se recuperan.</p>
    <div class="menu">${rk.map((x, k) => row(x.r, x, k))}${off.map(r => row(r, null, -1))}</div>
  <//>`;
}
function QuickDoneSheet({ rid, onDone, s, idx, close }) {
  const p = s.profile, st = p.settings;
  const r = p.routines.find(x => x.id === rid);
  const [when, setWhen] = useState('hoy');
  const [mins, setMins] = useState(() => r ? String(estMinutes(r)) : '60');
  const [feel, setFeel] = useState(null);
  const [note, setNote] = useState('');
  const [rows, setRows] = useState(() => r ? r.slots.map(sl => {
    const exId = sl.ex[sl.idx % sl.ex.length], def = getEx(exId), sug = suggest(exId, sl, idx, st) || {};
    return { slot: sl.id, id: exId, on: true, n: String(sl.sets), w: sug.w ? toStr(sug.w) : '', r: String(sug.r || sug.s || sl.rmin), m: String(sl.rmin) };
  }) : []);
  if (!r) return null;
  const upd = (k, f, v) => setRows(rs => rs.map((x, j) => j === k ? Object.assign({}, x, { [f]: v }) : x));
  const save = () => {
    const dur = Math.round(num(mins) || 0);
    if (dur <= 0) { toast('Anotá cuántos minutos duró.', 'warn'); return; }
    const on = rows.filter(x => x.on);
    if (!on.length) { toast('Marcá al menos un ejercicio.', 'warn'); return; }
    const ex = [];
    for (const x of on) {
      const def = getEx(x.id), n = clamp(Math.round(num(x.n) || 1), 1, 20);
      let set1;
      if (def.t === 'cardio') { const m = num(x.m); if (!m) { toast(`Anotá los minutos de ${def.n}.`, 'warn'); return; } ex.push({ id: x.id, n: def.n, slot: x.slot, note: '', ss: false, sets: [{ t: 'n', m, d: 0 }] }); continue; }
      if (def.t === 'time') set1 = { t: 'n', s: Math.round(num(x.r) || 0) };
      else {
        const w = num(x.w), rp = Math.round(num(x.r) || 0);
        if (!rp) { toast(`Anotá las reps de ${def.n}.`, 'warn'); return; }
        if (def.t === 'wr' && w == null) { toast(`Anotá el peso de ${def.n} o destildalo.`, 'warn'); return; }
        set1 = { t: 'n', w: Math.max(0, w || 0), r: rp };
      }
      ex.push({ id: x.id, n: def.n, slot: x.slot, note: '', ss: false, sets: Array.from({ length: n }, () => Object.assign({}, set1)) });
    }
    const end = when === 'hoy' ? Date.now() : Date.now() - DAY;
    const w = { id: uid(), name: r.name, routineId: r.id, start: end - dur * 60000, end, dur: dur * 60, ex, note: note.trim().slice(0, 2000), feel };
    const wst = workoutStats(w); w.vol = Math.round(wst.vol); w.nsets = wst.sets;
    A.putWorkout(w);
    A.profile(q => advanceSlots(q, r.id, { ex: ex.map(e => ({ id: e.id, slot: e.slot, sets: [{ done: true }] })) }));
    close();
    if (onDone) onDone();
    toast(`Guardado: ${r.name} · ${dur} min`);
  };
  const FEEL = ['Muy duro', 'Duro', 'Normal', 'Bien', 'Excelente'];
  const inp = (k, f, aria, w) => html`<input class="inp" style=${w ? `width:${w}px` : ''} inputmode="decimal" aria-label=${aria} value=${rows[k][f]} onInput=${e => upd(k, f, e.target.value)} />`;
  return html`<${Sheet} title="Ya la hice" onClose=${close} full footer=${html`<button class="btn" onClick=${close}>Cancelar</button><button class="btn primary" onClick=${save}><${Icon} n="check" />Guardar</button>`}>
    <p class="muted">${r.name}. Ajustá solo lo que haya cambiado.</p>
    <div class="grid2">
      <div class="field"><span class="lbl">Cuándo</span><div class="seg" role="group" aria-label="Cuándo">${[['hoy', 'Hoy'], ['ayer', 'Ayer']].map(([k, l]) => html`<button key=${k} aria-pressed=${when === k} onClick=${() => setWhen(k)}>${l}</button>`)}</div></div>
      <label class="field"><span class="lbl">Duración (min)</span><input id="qd-min" class="input" inputmode="numeric" value=${mins} onInput=${e => setMins(e.target.value)} /></label>
    </div>
    <div class="stack" style="gap:8px">
      <span class="eyebrow">Qué hiciste</span>
      ${rows.map((x, k) => { const def = getEx(x.id); return html`<div key=${x.slot} class=${'qd-row' + (x.on ? '' : ' off')}>
        <button class="chk" aria-pressed=${x.on} aria-label=${(x.on ? 'Quitar ' : 'Incluir ') + def.n} onClick=${() => upd(k, 'on', !x.on)}><${Icon} n="check" bold /></button>
        <div class="grow qd-main"><span class="qd-name">${def.n}</span>
          ${x.on ? html`<div class="qd-vals">${def.t === 'cardio' ? html`${inp(k, 'm', 'Minutos de ' + def.n, 64)}<span>min</span>`
            : def.t === 'time' ? html`${inp(k, 'n', 'Series de ' + def.n, 44)}<span>×</span>${inp(k, 'r', 'Segundos de ' + def.n, 58)}<span>s</span>`
            : html`${inp(k, 'n', 'Series de ' + def.n, 44)}<span>×</span>${inp(k, 'w', (def.t === 'bw' ? 'Lastre' : 'Peso') + ' de ' + def.n, 64)}<span>kg ×</span>${inp(k, 'r', 'Reps de ' + def.n, 48)}<span>reps</span>`}</div>` : html`<span class="sm muted">No lo hiciste</span>`}
        </div></div>`; })}
    </div>
    <div class="field"><span class="lbl">¿Cómo te sentiste?</span>
      <div class="feel" role="group" aria-label="Sensación">${FEEL.map((l, i) => html`<button key=${i} aria-pressed=${feel === i + 1} onClick=${() => setFeel(feel === i + 1 ? null : i + 1)}>${i + 1}<small>${l}</small></button>`)}</div></div>
    <label class="field"><span class="lbl">Notas</span><textarea id="qd-note" class="input" placeholder="Molestias, qué cambiaste… (podés dictar con el micrófono del teclado)" value=${note} onInput=${e => setNote(e.target.value)}></textarea></label>
  <//>`;
}
const SHEETS = { photo: PhotoSheet, day: DaySheet, confirm: ConfirmSheet, picker: PickerSheet, finish: FinishSheet, detail: DetailSheet, smart: SmartSheet, programs: ProgramsSheet, routine: RoutineEditor, exMenu: ExMenuSheet, setMenu: SetMenuSheet, restPick: RestPickSheet, exInfo: ExInfoSheet, routinePick: RoutinePickSheet, quickDone: QuickDoneSheet, exportText: ExportTextSheet, coach: CoachSheet };
const TABS = [['hoy', 'Hoy', 'plate'], ['rutinas', 'Rutinas', 'list'], ['progreso', 'Progreso', 'trend'], ['historial', 'Historial', 'clock'], ['mas', 'Más', 'sliders']];
function SyncBadge({ s }) {
  const map = { loading: ['local', 'Conectando…'], ok: ['', 'Guardado'], saving: ['saving', 'Guardando…'], error: ['error', 'Sin conexión'], local: ['local', 'Solo este dispositivo'], memory: ['error', 'Sin guardar'], idle: ['local', '…'] };
  const [cls, txt] = map[s.sync] || map.idle;
  const info = () => { if (s.mode === 'cloud') Sync.flush(); toast(s.sync === 'error' ? 'No hay conexión con tu base de datos. Lo que registres queda en este dispositivo y se sube al reconectar.' : s.mode === 'cloud' ? 'Tus datos están guardados en tu espacio privado.' : s.mode === 'local' ? 'Tus datos se guardan solo en este navegador.' : 'Esta vista no guarda datos.'); };
  return html`<button class=${'sync ' + cls} onClick=${info}><span class="dot"></span>${s.slow && s.mode === 'cloud' ? 'Conexión lenta' : txt}</button>`;
}
function App() {
  const s = useStore();
  const idx = INDEX(s.workouts);
  useEffect(() => {
    const f = (e) => { if (e.key === 'Escape' && S().sheets.length) { e.preventDefault(); closeSheet(); } };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);
  const overlay = !!(s.active && s.activeOpen);
  useEffect(() => { document.body.style.overflow = overlay || s.sheets.length ? 'hidden' : ''; }, [overlay, s.sheets.length]);
  let view = null;
  if (!overlay) {
    if (s.tab === 'rutinas') view = html`<${Routines} s=${s} />`;
    else if (s.tab === 'progreso') view = html`<${Progress} s=${s} idx=${idx} />`;
    else if (s.tab === 'historial') view = html`<${History} s=${s} idx=${idx} />`;
    else if (s.tab === 'mas') view = html`<${More} s=${s} />`;
    else view = html`<${Home} s=${s} idx=${idx} />`;
  }
  return html`
    <header class="top"><div class="top-in"><div class="brand"><${Logo} /><span>FORJA</span></div><${SyncBadge} s=${s} /></div></header>
    <main class="view" id="main" aria-busy=${!s.ready}>${s.ready ? view : html`<div class="empty"><b>Cargando tus entrenamientos…</b><span>Rutinas, historial y récords aparecen en un momento.</span></div>`}</main>
    ${s.active && !s.activeOpen ? html`<${MiniBar} a=${s.active} />` : null}
    <nav class="tabs" aria-label="Secciones"><div class="tabs-in">${TABS.map(([id, label, icon]) => html`<button key=${id} class="tab" aria-current=${s.tab === id ? 'page' : null} onClick=${() => goTab(id)}><${Icon} n=${icon} /><span>${label}</span></button>`)}</div></nav>
    ${overlay ? html`<${Workout} s=${s} idx=${idx} />` : null}
    ${s.sheets.map(sh => { const C = SHEETS[sh.type]; return C ? html`<${C} key=${sh.id} ...${sh.props} s=${s} idx=${idx} close=${() => closeSheet(sh.id)} />` : null; })}
    <${Toasts} items=${s.toasts} />`;
}
const root = document.getElementById('app');
root.textContent = '';
render(html`<${App} />`, root);
boot().catch(err => { console.error(err); set({ mode: LS.ok ? 'local' : 'memory', ready: true }); syncStatus(); });
