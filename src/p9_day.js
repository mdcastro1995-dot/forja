
/* ========== registro del día + ajustes sugeridos ========== */
const INJ_AREAS = { tobillo: 'Tobillo', rodilla: 'Rodilla', muneca: 'Muñeca', hombro: 'Hombro', lumbar: 'Espalda baja', mano: 'Mano o dedos', otra: 'Otra zona' };
const ACCIONES = ['cambiar', 'series', 'reps', 'quitar', 'agregar', 'descanso', 'nota'];
function injuryLabel(inj) { return inj ? (INJ_AREAS[inj.area] || cap(inj.area || 'Lesión')) : null; }
function dayWorkouts(s, d) { return s.workouts.filter(w => dayKey(w.start) === d); }
function lastPain(s) { const x = s.days.find(z => z.pain != null); return x ? x : null; }
function routineCatalog(p) {
  return p.routines.map((r, i) => `- rutina ${r.id} "${r.name}" (orden ${i + 1}${r.inRot === false ? ', fuera de rotación' : ''}):\n` + r.slots.map(sl => {
    const def = getEx(sl.ex[sl.idx % sl.ex.length]);
    return `   · slot ${sl.id} "${sl.label}": ${def.id} (${def.n}) ${sl.sets}×${sl.rmin}-${sl.rmax}${def.t === 'time' ? ' s' : def.t === 'cardio' ? ' min' : ''}, descanso ${sl.rest} s${sl.ex.length > 1 ? ', variantes: ' + sl.ex.join(', ') : ''}`;
  }).join('\n')).join('\n');
}
function sessionTxt(w) {
  return `${w.name} (${fMin(w.dur)}${w.feel ? ', sensación ' + w.feel + '/5' : ''}${w.note ? ', nota: "' + w.note.slice(0, 160) + '"' : ''}): ` +
    (w.ex || []).map(e => { const def = getEx(e.id); return `${e.n || def.n} ${e.sets.filter(x => x.t !== 'w').map(x => setTxt(x, def)).join(' | ')}`; }).join('; ');
}
function dayPrompt(s, day) {
  const p = s.profile, inj = p.injury;
  const eq = new Set(p.settings.equipment);
  const lib = allExercises().filter(x => eq.has(x.eq) || x.custom).map(x => `${x.id} | ${x.n} | ${MUSCLES[x.m]} | ${EQUIP[x.eq] || x.eq}`).join('\n');
  const ws = dayWorkouts(s, day.d);
  const prev = s.days.filter(z => z.d < day.d).slice(0, 6).map(z => `${z.d}: dolor ${z.pain != null ? z.pain + '/10' : '–'}, energía ${z.energy || '–'}/5${z.text ? ', "' + z.text.slice(0, 120) + '"' : ''}`).join('\n') || 'sin registros previos';
  const nx = nextRoutine(p, s.workouts);
  return 'Sos un entrenador de fuerza e hipertrofia con criterio de readaptación de lesiones. Hablá en español rioplatense con voseo, claro y breve.\n' +
    'El atleta registró su día y quiere saber cómo adaptar su rutina. Respetá las pautas de su fisio: si hay dolor en la zona lesionada, no indiques ejercicios que la carguen. Si el dolor es 7/10 o más, o menciona hinchazón que aumenta, inestabilidad o no poder apoyar, completá "alerta" recomendando consultar al fisio antes de seguir y no entrenar esa zona.\n' +
    'No inventes datos. Los "cambios" se guardan en la rutina hasta el próximo registro: proponé solo los que tenga sentido sostener. Lo puntual (por ejemplo "mañana hacé una serie menos") va en "consejo".\n\n' +
    `LESIÓN ACTIVA: ${inj ? `${injuryLabel(inj)} desde ${inj.since || '¿?'} · ${inj.status || ''}` : 'ninguna'}\n` +
    `REGISTRO DEL ${day.d}: "${(day.text || '').slice(0, 1200)}" · dolor ${day.pain != null ? day.pain + '/10' : 'sin dato'} · energía ${day.energy || 'sin dato'}/5 · sueño ${day.sleep != null ? day.sleep + ' h' : 'sin dato'}\n` +
    `SESIONES CARGADAS EN LA APP ESE DÍA:\n${ws.length ? ws.map(sessionTxt).join('\n') : 'ninguna'}\n` +
    `REGISTROS ANTERIORES:\n${prev}\n\n` +
    `RUTINAS (la próxima en la rotación es "${nx ? nx.name : '–'}"):\n${routineCatalog(p)}\n\n` +
    `EJERCICIOS DISPONIBLES (id | nombre | músculo | equipo):\n${lib}\n\n` +
    `CONTEXTO DEL HISTORIAL:\n${athleteSummary(s).slice(0, 2500)}\n\n` +
    'Respondé SOLO con JSON con esta forma:\n{"resumen":"1 o 2 frases sobre el día","consejo":["2 a 4 viñetas concretas"],"alerta":null,"cambios":[{"rutina":"<id de rutina>","slot":"<id de slot o null>","accion":"cambiar","ejercicio":"<id de ejercicio o null>","series":null,"rmin":null,"rmax":null,"descanso":null,"nota":null,"motivo":"por qué, en una frase"}]}\n' +
    'Acciones válidas: cambiar (slot + ejercicio), series (slot + series), reps (slot + rmin + rmax), descanso (slot + descanso en segundos), quitar (slot), agregar (rutina + ejercicio + series + rmin + rmax), nota (slot o ejercicio + nota corta). Máximo 5 cambios; si no hace falta cambiar nada, devolvé "cambios": [].';
}
function cleanAdvice(o, p) {
  if (!o || typeof o !== 'object') return null;
  const ids = new Set(allExercises().map(x => x.id));
  const changes = (Array.isArray(o.cambios) ? o.cambios : []).slice(0, 6).map(c => {
    if (!c || !ACCIONES.includes(c.accion)) return null;
    const r = p.routines.find(x => x.id === c.rutina); if (!r) return null;
    const sl = c.slot ? r.slots.find(x => x.id === c.slot) : null;
    const needSlot = ['cambiar', 'series', 'reps', 'quitar', 'descanso'].includes(c.accion);
    if (needSlot && !sl) return null;
    const ex = c.ejercicio && ids.has(String(c.ejercicio)) ? String(c.ejercicio) : null;
    if ((c.accion === 'cambiar' || c.accion === 'agregar') && !ex) return null;
    if (c.accion === 'nota' && (!c.nota || (!sl && !ex))) return null;
    const out = { id: uid(), rutina: r.id, slot: sl ? sl.id : null, accion: c.accion, ejercicio: ex, motivo: String(c.motivo || '').slice(0, 220) };
    if (c.accion === 'series' || c.accion === 'agregar') out.series = clamp(Math.round(num(c.series) || 3), 1, 8);
    if (c.accion === 'reps' || c.accion === 'agregar') { out.rmin = clamp(Math.round(num(c.rmin) || 8), 1, 120); out.rmax = clamp(Math.round(num(c.rmax) || out.rmin), out.rmin, 180); }
    if (c.accion === 'descanso' || (c.accion === 'agregar' && c.descanso)) out.descanso = clamp(Math.round(num(c.descanso) || 90), 20, 360);
    if (c.accion === 'nota') out.nota = String(c.nota).slice(0, 200);
    return out;
  }).filter(Boolean);
  return { resumen: String(o.resumen || '').slice(0, 500), consejo: (Array.isArray(o.consejo) ? o.consejo : []).map(x => String(x).slice(0, 300)).slice(0, 5), alerta: o.alerta ? String(o.alerta).slice(0, 400) : null, cambios: changes, at: Date.now(), by: 'claude' };
}
function quickAdvice(day, inj) {
  const consejo = []; let alerta = null;
  const zona = inj ? injuryLabel(inj).toLowerCase() : 'la zona';
  if (day.pain != null && day.pain >= 7) alerta = `Dolor alto (${day.pain}/10): no cargues ${zona === 'la zona' ? 'la zona' : 'el ' + zona} y consultá a tu fisio antes de seguir.`;
  else if (day.pain != null && day.pain >= 4) consejo.push(`Dolor moderado (${day.pain}/10): en la próxima sesión salteá lo que cargue ${zona === 'la zona' ? 'la zona' : 'el ' + zona} y quedate con las variantes sentadas o en máquina.`);
  else if (day.pain != null && inj) consejo.push(`Dolor bajo (${day.pain}/10): seguí con la rutina adaptada y la rehab que te indicó el fisio.`);
  if ((day.energy && day.energy <= 2) || (day.sleep != null && day.sleep < 6)) consejo.push('Energía o sueño bajos: hacé la próxima sesión con una serie menos por ejercicio y dejá 2 o 3 repeticiones en reserva.');
  if (!consejo.length && !alerta) consejo.push('Todo en orden: seguí con la rotación tal como está.');
  return { resumen: '', consejo, alerta, cambios: [], at: Date.now(), by: 'reglas' };
}
function changeTxt(c, p) {
  const r = p.routines.find(x => x.id === c.rutina);
  const sl = r && c.slot ? r.slots.find(x => x.id === c.slot) : null;
  const where = (r ? r.name : 'Rutina borrada') + (sl ? ' · ' + (sl.label || getEx(sl.ex[sl.idx % sl.ex.length]).n) : '');
  const exn = c.ejercicio ? getEx(c.ejercicio).n : '';
  switch (c.accion) {
    case 'cambiar': return `${where}: pasar a ${exn}`;
    case 'series': return `${where}: ${c.series} series`;
    case 'reps': return `${where}: ${c.rmin}–${c.rmax} repeticiones`;
    case 'quitar': return `${where}: sacar de la rutina`;
    case 'agregar': return `${where}: sumar ${exn} ${c.series}×${c.rmin}–${c.rmax}`;
    case 'descanso': return `${where}: descanso de ${fDur(c.descanso)}`;
    default: return `${where}: nota “${c.nota}”`;
  }
}
function applyChange(p, c) {
  const r = p.routines.find(x => x.id === c.rutina); if (!r) return false;
  const sl = c.slot ? r.slots.find(x => x.id === c.slot) : null;
  switch (c.accion) {
    case 'cambiar': { if (!sl) return false; const i = sl.ex.indexOf(c.ejercicio); if (i >= 0) sl.idx = i; else sl.ex.splice(sl.idx % sl.ex.length, 0, c.ejercicio); sl.rot = 0; sl.cnt = 0; return true; }
    case 'series': if (!sl) return false; sl.sets = c.series; return true;
    case 'reps': if (!sl) return false; sl.rmin = c.rmin; sl.rmax = c.rmax; return true;
    case 'descanso': if (!sl) return false; sl.rest = c.descanso; return true;
    case 'quitar': if (!sl) return false; r.slots = r.slots.filter(x => x.id !== sl.id); return true;
    case 'agregar': { const def = getEx(c.ejercicio); const rg = defRange(def); r.slots.push({ id: uid(), label: MUSCLES[def.m] || def.n, ex: [c.ejercicio], idx: 0, cnt: 0, rot: 0, sets: c.series || 3, rmin: c.rmin || rg.rmin, rmax: c.rmax || rg.rmax, rest: c.descanso || restFor(def, p.settings), ss: false }); return true; }
    case 'nota': { const exId = c.ejercicio || (sl && sl.ex[sl.idx % sl.ex.length]); if (!exId) return false; p.exNotes[exId] = c.nota; return true; }
  }
  return false;
}
function InjuryChip({ s }) {
  const inj = s.profile.injury; if (!inj) return null;
  const lp = lastPain(s);
  return html`<button class="inj-chip" onClick=${() => openSheet('day', {})}><span class="inj-dot"></span><span class="grow"><b>${injuryLabel(inj)} en recuperación</b><small>${lp ? `Último dolor: ${lp.pain}/10 · ${ago(keyTime(lp.d))}` : 'Registrá el dolor de cada día para ajustar la rutina'}</small></span><${Icon} n="chevR" /></button>`;
}
function DayCard({ s }) {
  const today = dayKey(Date.now());
  const d = s.days.find(z => z.d === today);
  return html`<button class="coach-card day-card" onClick=${() => openSheet('day', {})}><${Icon} n="note" /><span class="grow"><b>${d ? 'Registro de hoy' : 'Registrá tu día'}</b><small>${d ? (d.advice ? `${d.advice.cambios.length} ${plural(d.advice.cambios.length, 'ajuste sugerido', 'ajustes sugeridos')} · tocá para revisarlos` : 'Guardado. Podés pedir sugerencias de ajuste.') : 'Contá qué hiciste y cómo te sentiste: te sugiero cómo adaptar la rutina.'}</small></span><${Icon} n="chevR" /></button>`;
}
function DaySheet({ s, date, close }) {
  const p = s.profile, inj = p.injury;
  const [d, setD] = useState(date || dayKey(Date.now()));
  const saved = s.days.find(z => z.d === d) || null;
  const [text, setText] = useState(saved ? saved.text || '' : '');
  const [pain, setPain] = useState(saved && saved.pain != null ? saved.pain : null);
  const [energy, setEnergy] = useState(saved ? saved.energy || null : null);
  const [sleep, setSleep] = useState(saved && saved.sleep != null ? toStr(saved.sleep) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [act, setAct] = useState({ id: 'bici', m: '', km: '' });
  const ctl = useRef(null);
  const loaded = useRef(d);
  useEffect(() => () => { if (ctl.current) ctl.current.abort(); }, []);
  useEffect(() => {
    if (loaded.current === d) return;
    loaded.current = d;
    const z = s.days.find(x => x.d === d);
    setText(z ? z.text || '' : ''); setPain(z && z.pain != null ? z.pain : null); setEnergy(z ? z.energy || null : null); setSleep(z && z.sleep != null ? toStr(z.sleep) : ''); setErr('');
  }, [d]);
  const ws = dayWorkouts(s, d);
  const cardio = allExercises().filter(x => x.t === 'cardio');
  const build = () => {
    const out = Object.assign({}, saved || {}, { d, text: text.trim().slice(0, 2000), pain: pain, energy: energy, sleep: num(sleep), workouts: ws.map(w => w.id) });
    if (out.pain == null) delete out.pain;
    if (out.sleep == null) delete out.sleep;
    return out;
  };
  const save = () => { A.putDay(build()); toast('Día guardado'); };
  const ask = async () => {
    const day = build();
    A.putDay(day);
    const sample = s.caps.sample;
    if (!sample) { A.putDay(Object.assign({}, day, { advice: quickAdvice(day, inj) })); return; }
    setErr(''); setBusy(true);
    const c = new AbortController(); ctl.current = c;
    try {
      const o = await sample.json(dayPrompt(S(), day), { signal: c.signal });
      const adv = cleanAdvice(o, S().profile);
      if (!adv) throw { code: 'invalid_json' };
      A.putDay(Object.assign({}, day, { advice: adv, applied: [] }));
    } catch (e) {
      if (e && e.code === 'cancelled') return;
      setErr(sampleErr(e) + ' Te dejo una sugerencia básica.');
      A.putDay(Object.assign({}, day, { advice: quickAdvice(day, inj) }));
    } finally { setBusy(false); }
  };
  const applyOne = (c) => {
    const cur = S().days.find(z => z.d === d); if (!cur) return;
    let ok = false;
    const backup = cur.backup || { routines: clone(S().profile.routines), exNotes: clone(S().profile.exNotes) };
    A.profile(pp => { ok = applyChange(pp, c); });
    if (!ok) { toast('No se pudo aplicar: la rutina cambió desde la sugerencia.', 'warn'); return; }
    A.putDay(Object.assign({}, cur, { backup, applied: (cur.applied || []).concat([c.id]) }));
    toast('Rutina actualizada');
  };
  const applyAll = () => {
    const cur = S().days.find(z => z.d === d); if (!cur || !cur.advice) return;
    const todo = cur.advice.cambios.filter(c => !(cur.applied || []).includes(c.id));
    const backup = cur.backup || { routines: clone(S().profile.routines), exNotes: clone(S().profile.exNotes) };
    const done = [];
    A.profile(pp => { for (const c of todo) if (applyChange(pp, c)) done.push(c.id); });
    A.putDay(Object.assign({}, cur, { backup, applied: (cur.applied || []).concat(done) }));
    toast(`${done.length} ${plural(done.length, 'cambio aplicado', 'cambios aplicados')}`);
  };
  const undo = () => {
    const cur = S().days.find(z => z.d === d); if (!cur || !cur.backup) return;
    A.profile(pp => { pp.routines = clone(cur.backup.routines); pp.exNotes = clone(cur.backup.exNotes); });
    const nd = Object.assign({}, cur, { applied: [] }); delete nd.backup;
    A.putDay(nd);
    toast('Cambios deshechos: la rutina volvió a como estaba');
  };
  const addActivity = () => {
    const m = num(act.m), km = num(act.km);
    if (!m && !km) { toast('Anotá minutos o kilómetros de la actividad.', 'warn'); return; }
    const def = getEx(act.id);
    const t = keyTime(d) + 6 * 36e5;
    const w = { id: uid(), name: def.n, routineId: null, start: t, end: t + (m || 0) * 60000, dur: Math.round((m || 0) * 60), ex: [{ id: def.id, n: def.n, slot: null, note: '', ss: false, sets: [{ t: 'n', m: m || 0, d: km || 0 }] }], note: 'Cargado desde el registro del día', feel: null, vol: 0, nsets: 1 };
    A.putWorkout(w);
    setAct({ id: act.id, m: '', km: '' });
    toast('Actividad agregada al historial');
  };
  const adv = saved && saved.advice;
  const applied = (saved && saved.applied) || [];
  const ENERGY = ['Agotado', 'Bajo', 'Normal', 'Bien', 'A full'];
  return html`<${Sheet} title="Registro del día" onClose=${close} full footer=${busy ? html`<button class="btn" onClick=${() => ctl.current && ctl.current.abort()}><${Icon} n="stop" />Detener</button>` : html`<button class="btn" onClick=${save}><${Icon} n="check" />Guardar</button><button class="btn primary" onClick=${ask}><${Icon} n="spark" />${s.caps.sample ? 'Sugerir ajustes' : 'Ver sugerencias'}</button>`}>
    <label class="field"><span class="lbl">Fecha</span><input id="day-date" class="input" type="date" value=${d} max=${dayKey(Date.now())} onInput=${e => setD(e.target.value || dayKey(Date.now()))} /></label>
    <div class="field"><span class="lbl">Cargado en la app ese día</span>
      ${ws.length ? html`<div class="stack">${ws.map(w => html`<button key=${w.id} class="pritem day-w" onClick=${() => openSheet('detail', { id: w.id })}><${Icon} n="dumbbell" /><span class="grow"><span class="t">${w.name}</span><br /><span class="s">${fMin(w.dur)} · ${workoutStats(w).sets} series</span></span><${Icon} n="chevR" /></button>`)}</div>` : html`<p class="muted sm">No hay sesiones cargadas este día. Contalo abajo o sumá una actividad.</p>`}
    </div>
    <label class="field"><span class="lbl">¿Qué hiciste y cómo te fue?</span><textarea id="day-text" class="input" placeholder="Ej.: Hice Piernas + Hombros pero salteé el hip thrust porque molestó el tobillo. Después caminé 15 minutos." value=${text} onInput=${e => setText(e.target.value)}></textarea></label>
    <div class="field"><span class="lbl">${inj ? `Dolor de ${injuryLabel(inj).toLowerCase()} (0 = nada, 10 = máximo)` : 'Dolor o molestia (0 = nada, 10 = máximo)'}</span>
      <div class="pain" role="group" aria-label="Nivel de dolor">${Array.from({ length: 11 }, (_, i) => html`<button key=${i} class=${i >= 7 ? 'hi' : i >= 4 ? 'mid' : ''} aria-pressed=${pain === i} onClick=${() => setPain(pain === i ? null : i)}>${i}</button>`)}</div></div>
    <div class="grid2">
      <div class="field"><span class="lbl">Energía</span><select id="day-energy" class="input" value=${energy || ''} onChange=${e => setEnergy(e.target.value ? Number(e.target.value) : null)}><option value="">Sin dato</option>${ENERGY.map((l, i) => html`<option key=${i} value=${i + 1}>${i + 1} · ${l}</option>`)}</select></div>
      <label class="field"><span class="lbl">Sueño (horas)</span><input id="day-sleep" class="input" inputmode="decimal" placeholder="7,5" value=${sleep} onInput=${e => setSleep(e.target.value)} /></label>
    </div>
    <details class="card act-box"><summary><b>Sumar una actividad hecha fuera de la app</b></summary>
      <div class="stack" style="margin-top:10px">
        <select id="day-act" class="input" value=${act.id} onChange=${e => setAct(Object.assign({}, act, { id: e.target.value }))}>${cardio.map(x => html`<option key=${x.id} value=${x.id}>${x.n}</option>`)}</select>
        <div class="grid2"><input id="day-act-m" class="input" inputmode="decimal" placeholder="Minutos" value=${act.m} onInput=${e => setAct(Object.assign({}, act, { m: e.target.value }))} /><input id="day-act-km" class="input" inputmode="decimal" placeholder="Km (opcional)" value=${act.km} onInput=${e => setAct(Object.assign({}, act, { km: e.target.value }))} /></div>
        <button class="btn sm" onClick=${addActivity}><${Icon} n="plus" />Agregar al historial</button>
      </div>
    </details>
    ${busy ? html`<p class="thinking">Claude está revisando tu día y tu rutina…</p>` : null}
    ${err ? html`<p class="muted" role="alert">${err}</p>` : null}
    ${adv ? html`<section class="stack advice" aria-live="polite">
      ${adv.alerta ? html`<div class="warnbox alert-box"><b>Atención</b><span>${adv.alerta}</span></div>` : null}
      ${adv.resumen || adv.consejo.length ? html`<div class="card coach-out">${adv.resumen ? html`<p><strong>${adv.resumen}</strong></p>` : null}${adv.consejo.length ? html`<ul>${adv.consejo.map((c, i) => html`<li key=${i}>${c}</li>`)}</ul>` : null}<p class="muted sm">${adv.by === 'claude' ? 'Sugerido por Claude a partir de tu registro y tu historial.' : 'Sugerencia básica. Con Claude disponible, también propone cambios concretos en tu rutina.'}</p></div>` : null}
      ${adv.cambios.length ? html`<div class="stack">
        <div class="sec-head"><h3 class="sec-title" style="font-size:20px">Cambios sugeridos</h3>${adv.cambios.some(c => !applied.includes(c.id)) ? html`<button class="btn sm primary" onClick=${applyAll}>Aplicar todos</button>` : null}</div>
        <div class="menu">${adv.cambios.map(c => { const on = applied.includes(c.id); return html`<div key=${c.id} class="chg"><span class="grow"><b>${changeTxt(c, p)}</b>${c.motivo ? html`<small>${c.motivo}</small>` : null}</span>${on ? html`<span class="pill ok"><${Icon} n="check" />Aplicado</span>` : html`<button class="btn sm" onClick=${() => applyOne(c)}>Aplicar</button>`}</div>`; })}</div>
        ${saved && saved.backup ? html`<button class="btn ghost sm" style="align-self:flex-start" onClick=${undo}><${Icon} n="refresh" />Deshacer los cambios de este día</button>` : null}
        <p class="muted sm">Los cambios quedan guardados en tus rutinas. Podés revisarlos en Rutinas → Editar.</p>
      </div>` : null}
    </section>` : null}
  <//>`;
}
function InjurySection({ s }) {
  const inj = s.profile.injury;
  const [editing, setEditing] = useState(false);
  const [area, setArea] = useState(inj ? inj.area : 'tobillo');
  const [status, setStatus] = useState(inj ? inj.status || '' : '');
  const [side, setSide] = useState(inj ? inj.side || '' : '');
  const save = () => { A.profile(p => { p.injury = { area, side: side || null, since: inj && inj.area === area ? inj.since : dayKey(Date.now()), status: status.trim().slice(0, 200) }; }); setEditing(false); toast('Lesión guardada: el coach y las sugerencias la tienen en cuenta'); };
  const heal = () => openSheet('confirm', { title: 'Marcar como recuperado', body: 'El coach deja de adaptar las sugerencias a esta lesión. Tus rutinas no cambian: si querés volver a los ejercicios originales, editalas en Rutinas.', ok: 'Marcar recuperado', onOk: () => { A.profile(p => { p.injury = null; }); toast('¡Bien ahí! Lesión marcada como recuperada'); } });
  const pains = s.days.filter(z => z.pain != null).slice(0, 14).reverse();
  return html`<section class="section" id="lesion">
    <h2 class="sec-title">Lesión</h2>
    ${inj && !editing ? html`<div class="card stack">
      <div class="row"><span class="inj-dot"></span><b class="grow">${injuryLabel(inj)}${inj.side ? ' ' + SIDE_NAMES[inj.side] : ''} en recuperación</b><span class="muted sm">desde ${inj.since ? DF_SHORT.format(new Date(keyTime(inj.since))) : '–'}</span></div>
      ${inj.status ? html`<p class="sheet-p">${inj.status}</p>` : null}
      ${pains.length > 1 ? html`<${LineChart} data=${pains.map(z => ({ x: keyTime(z.d), y: z.pain }))} fmtTip=${v => v + '/10'} fmtY=${v => NF0.format(v)} h=${150} label="Dolor registrado por día" />` : html`<p class="muted sm">Registrá el dolor en “Registro del día” para ver la evolución acá.</p>`}
      <div class="row wrap"><button class="btn sm" onClick=${() => openSheet('day', {})}><${Icon} n="note" />Registrar hoy</button><button class="btn sm" onClick=${() => setEditing(true)}><${Icon} n="edit" />Editar</button><button class="btn ghost sm" onClick=${heal}>Marcar recuperado</button></div>
    </div>` : html`<div class="card stack">
      ${!inj && !editing ? html`<p class="sheet-p">Si tenés una lesión, registrala: el coach y las sugerencias del día la van a tener en cuenta.</p><button class="btn sm" style="align-self:flex-start" onClick=${() => setEditing(true)}><${Icon} n="plus" />Registrar una lesión</button>` : html`
        <label class="field"><span class="lbl">Zona</span><select id="inj-area" class="input" value=${area} onChange=${e => setArea(e.target.value)}>${Object.keys(INJ_AREAS).map(k => html`<option key=${k} value=${k}>${INJ_AREAS[k]}</option>`)}</select></label>
        <label class="field"><span class="lbl">Lado</span><select id="inj-side" class="input" value=${side} onChange=${e => setSide(e.target.value)}><option value="">Sin especificar</option><option value="der">Derecho</option><option value="izq">Izquierdo</option></select></label>
        <label class="field"><span class="lbl">Detalle y pautas del fisio</span><textarea id="inj-status" class="input" placeholder="Ej.: esguince grado 1, nada de impacto por 3 semanas, bici permitida" value=${status} onInput=${e => setStatus(e.target.value)}></textarea></label>
        <div class="row"><button class="btn primary sm" onClick=${save}>Guardar</button><button class="btn ghost sm" onClick=${() => setEditing(false)}>Cancelar</button></div>`}
    </div>`}
  </section>`;
}
