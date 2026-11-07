
/* ========== cargar entrenamiento desde una foto (WOD, pizarra, planilla) ========== */
const KIND_KEYS = ['wr', 'bw', 'time', 'cardio'];
function photoPrompt(s, hint, dictated) {
  const lib = allExercises().map(x => `${x.id} | ${x.n} | ${MUSCLES[x.m]} | ${x.t}`).join('\n');
  const head = dictated
    ? `El atleta dictó por voz (o escribió) lo que entrenó. Hoy es ${DF_LONG.format(Date.now())} (${dayKey(Date.now())}). El texto puede tener errores de dictado ("x" dicho como "por", números en palabras, "kilos", "repes", "por lado"): interpretalo con criterio de gimnasio. Todo lo que menciona como hecho va en "realizado", una entrada por serie (si dice "4 series de 10 con 60", son 4 entradas de 10 reps con 60 kg). Si nombra un día ("ayer", "el lunes"), calculá la fecha; si no, usá la de hoy.\nTEXTO DICTADO:\n"${String(dictated).slice(0, 4000)}"\n`
    : 'Las imágenes son fotos de un entrenamiento de gimnasio: una pizarra con un WOD, una planilla, una hoja escrita a mano o una captura. Leé todo con cuidado (letra manuscrita, abreviaturas como "x", "@", "kg", "AMRAP", "EMOM", "For time", "RM", "%") y transcribilo a datos.\n';
  return head +
    (hint ? `Aclaración del atleta: "${hint.slice(0, 400)}"\n` : '') +
    'Para cada ejercicio elegí el id más parecido de esta lista (id | nombre | músculo | tipo). Si ninguno corresponde de verdad, poné "id": null y completá "musculo" (una de: ' + Object.keys(MUSCLES).join(', ') + ') y "tipo" (wr = peso y reps, bw = peso corporal, time = segundos, cardio = minutos/km).\n' + lib + '\n\n' +
    'Cada actividad distinta es un ejercicio aparte (por ejemplo "caminata" y "fisioterapia" son dos ejercicios, aunque se nombren juntas). Para cardio o actividades sin peso, poné minutos en "min", kilómetros en "km" y, si dice pasos, la cantidad en "pasos".\n' +
    'Si la foto trae cargas o repeticiones HECHAS (planilla completada), ponelas en "realizado", una entrada por serie. Si es solo lo planificado, dejá "realizado" vacío. Para formatos como AMRAP/EMOM/For time, describilo en "formato" del bloque y repartí los ejercicios igual. No inventes números que no estén en la foto: si no se ven, null.\n' +
    'Respondé SOLO con JSON:\n{"titulo":"nombre corto","fecha":"AAAA-MM-DD o null","notas":"formato del WOD, rondas, tiempo, observaciones","ejercicios":[{"id":"press_banca","nombre":"texto tal como aparece","musculo":null,"tipo":null,"series":3,"rmin":8,"rmax":10,"descanso":null,"bloque":"A","formato":null,"realizado":[{"kg":60,"reps":10,"seg":null,"min":null,"km":null,"pasos":null}]}]}';
}
function cleanPhoto(o) {
  if (!o || !Array.isArray(o.ejercicios)) return null;
  const items = o.ejercicios.slice(0, 30).map(e => {
    if (!e) return null;
    const known = e.id && getEx(String(e.id)).missing !== true ? String(e.id) : null;
    const name = String(e.nombre || (known ? getEx(known).n : 'Ejercicio')).slice(0, 60);
    const t = known ? getEx(known).t : (KIND_KEYS.includes(e.tipo) ? e.tipo : 'wr');
    const m = known ? getEx(known).m : (MUSCLES[e.musculo] ? e.musculo : 'core');
    let steps = 0;
    const done = (Array.isArray(e.realizado) ? e.realizado : []).slice(0, 12).map(x => {
      const o = { w: num(x && x.kg), r: num(x && x.reps), s: num(x && x.seg), m: num(x && x.min), d: num(x && x.km) };
      const p = num(x && x.pasos);
      // Pasos sin km: se estiman a 0,75 m por paso, y la nota del ejercicio lo aclara.
      if (p && p > 0) { steps += p; if (o.d == null) o.d = Math.round(p * 0.00075 * 10) / 10; }
      return o;
    }).filter(x => x.w != null || x.r != null || x.s != null || x.m != null || x.d != null);
    const def = defRange({ t, k: 'c' });
    const rmin = clamp(Math.round(num(e.rmin) || (done[0] && (done[0].r || done[0].s || done[0].m)) || def.rmin), 1, 300);
    return { key: uid(), id: known, name, t, m, sets: clamp(Math.round(num(e.series) || done.length || 3), 1, 12), rmin, rmax: clamp(Math.round(num(e.rmax) || rmin), rmin, 300), rest: e.descanso ? clamp(Math.round(num(e.descanso) || 90), 20, 360) : null, label: [e.bloque, e.formato].filter(Boolean).join(' · ').slice(0, 40), done, stepsNote: steps ? `${NF1.format(steps)} pasos (km estimados)` : '' };
  }).filter(Boolean);
  if (!items.length) return null;
  const f = typeof o.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.fecha) && o.fecha <= dayKey(Date.now()) ? o.fecha : null;
  return { title: String(o.titulo || 'Entrenamiento de la foto').slice(0, 40), date: f, notes: String(o.notas || '').slice(0, 400), items };
}
// Turns unmatched items into custom exercises; returns the exercise id per item.
function ensureExercises(items) {
  const add = [];
  const ids = items.map(it => {
    if (it.id) return it.id;
    const same = Object.values(CUSTOM_MAP).find(x => norm(x.n) === norm(it.name));
    if (same) return same.id;
    const x = { id: 'c_' + uid(), n: it.name, m: it.m, s: [], eq: 'otro', t: it.t, k: 'i', g: 'cu_' + it.m, custom: true };
    add.push(x); CUSTOM_MAP[x.id] = x;
    return x.id;
  });
  if (add.length) A.profile(p => { p.custom = p.custom.concat(add); });
  return ids;
}
/* Dictado con audio: reconocimiento de voz del navegador; si el teléfono no lo tiene, el micrófono del teclado. */
function useMic(value, setValue, inputId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const [rec, setRec] = useState(false);
  const srRef = useRef(null);
  const base = useRef('');
  useEffect(() => () => { try { if (srRef.current) srRef.current.abort(); } catch (e) {} }, []);
  // Terminar: el botón vuelve a "hablar" al instante, aunque el iPhone tarde (o no llegue) a cerrar el micrófono.
  const stop = () => {
    const r = srRef.current;
    setRec(false);
    if (!r) return;
    srRef.current = null;
    try { r.stop(); } catch (e) {}
    setTimeout(() => { try { r.onresult = null; r.onend = null; r.onerror = null; r.abort(); } catch (e) {} }, 1200);
  };
  const toggle = () => {
    if (rec || srRef.current) { stop(); return; }
    if (!SR) { const t = document.getElementById(inputId); if (t) t.focus(); toast('En este teléfono se dicta con el micrófono del teclado: tocá el ícono 🎤 abajo a la derecha del teclado.', 'info', 6000); return; }
    const r = new SR();
    const nl = (navigator.language || '').toLowerCase();
    r.lang = nl.startsWith('es') ? navigator.language : 'es-AR';
    r.continuous = true; r.interimResults = true;
    base.current = (value || '').trim() ? value.trim() + ' ' : '';
    r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setValue(base.current + t.trim()); };
    r.onerror = (e) => {
      if (srRef.current === r) srRef.current = null;
      setRec(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Forja no tiene permiso para usar el micrófono. Habilitalo en Ajustes o usá el micrófono del teclado.', 'warn', 6500);
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('No se pudo escuchar. Probá de nuevo o usá el micrófono del teclado.', 'warn');
    };
    r.onend = () => { if (srRef.current === r) srRef.current = null; setRec(false); };
    srRef.current = r;
    try { r.start(); setRec(true); } catch (err) { setRec(false); toast('No se pudo abrir el micrófono. Usá el micrófono del teclado.', 'warn'); }
  };
  return { rec, toggle, stop };
}
function MicButton({ rec, onClick, has }) {
  return html`<button class=${'mic-btn' + (rec ? ' on' : '')} aria-pressed=${rec} onClick=${onClick}><${Icon} n=${rec ? 'stop' : 'mic'} size=${26} /><span>${rec ? 'Escuchando… tocá para terminar' : has ? 'Seguir dictando' : 'Tocá para hablar'}</span></button>`;
}
function PhotoSheet({ s, close, mode, text, day }) {
  const voice = mode === 'voz';
  const [said, setSaid] = useState(text || '');
  const sample = s.caps.sample;
  const [can, setCan] = useState(null);
  const [files, setFiles] = useState([]);
  const [urls, setUrls] = useState([]);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const [date, setDate] = useState(day || dayKey(Date.now()));
  const ctl = useRef(null);
  const inRef = useRef(null);
  useEffect(() => { if (voice) { setCan(sample ? {} : false); return () => { if (ctl.current) ctl.current.abort(); }; } if (!sample || !sample.limits) { setCan(false); return; } sample.limits().then(l => setCan(l && l.images ? l.images : false)).catch(() => setCan(false)); return () => { if (ctl.current) ctl.current.abort(); }; }, []);
  useEffect(() => { const u = files.map(f => URL.createObjectURL(f)); setUrls(u); return () => u.forEach(x => URL.revokeObjectURL(x)); }, [files]);
  const pick = (e) => { const max = (can && can.maxCount) || 4; const fl = [...(e.target.files || [])].filter(f => /^image\//.test(f.type)).slice(0, max); if (fl.length) { setFiles(fl); setRes(null); setErr(''); } e.target.value = ''; };
  const { rec, toggle: toggleMic, stop: stopMic } = useMic(said, setSaid, 'voice-text');
  const read = async () => {
    if ((voice ? !said.trim() : !files.length) || busy) return;
    if (voice) stopMic();
    setBusy(true); setErr(''); setRes(null);
    const c = new AbortController(); ctl.current = c;
    try {
      const o = voice ? await sample.json(photoPrompt(S(), '', said.trim()), { signal: c.signal }) : await sample.json(photoPrompt(S(), hint.trim()), { images: files, signal: c.signal });
      const r = cleanPhoto(o);
      if (!r) setErr(voice ? 'No encontré ejercicios en lo que dictaste. Nombrá cada ejercicio con sus series, repeticiones y kilos.' : 'No encontré ejercicios en la foto. Probá con una foto más cerca, derecha y con buena luz.');
      else { setRes(r); if (r.date) setDate(r.date); }
    } catch (e) {
      if (e && e.code === 'cancelled') return;
      setErr(e && e.code === 'image_rejected' ? 'Esa imagen no se pudo leer. Probá con otra (JPG o PNG).' : sampleErr(e));
    } finally { setBusy(false); }
  };
  // Viene del registro del día: lee el texto apenas se abre.
  const autoRead = useRef(!!(text && voice));
  useEffect(() => { if (autoRead.current && sample) { autoRead.current = false; read(); } }, []);
  const upd = (key, patch) => setRes(r => Object.assign({}, r, { items: r.items.map(it => it.key === key ? Object.assign({}, it, patch) : it) }));
  const remove = (key) => setRes(r => Object.assign({}, r, { items: r.items.filter(it => it.key !== key) }));
  const remap = (it) => openSheet('picker', { title: 'Elegir ejercicio', multi: false, onPick: ([id]) => { const d = getEx(id); upd(it.key, { id, t: d.t, m: d.m }); } });
  const hasDone = res && res.items.some(it => it.done.length);
  const asRoutine = () => {
    const ids = ensureExercises(res.items);
    const st = S().profile.settings;
    const r = { id: uid(), name: res.title, inRot: false, slots: res.items.map((it, i) => ({ id: uid(), label: it.label || MUSCLES[getEx(ids[i]).m] || it.name, ex: [ids[i]], idx: 0, cnt: 0, rot: 0, sets: it.sets, rmin: it.rmin, rmax: it.rmax, rest: it.rest || restFor(getEx(ids[i]), st), ss: false })) };
    A.profile(p => { p.routines.push(r); });
    close(); goTab('rutinas');
    toast(`“${r.name}” guardada en Rutinas. Activá “En rotación” si querés que se alterne.`);
  };
  const startNow = () => {
    const ids = ensureExercises(res.items);
    const ex = res.items.map((it, i) => { const e = makeEx(ids[i], { range: { rmin: it.rmin, rmax: it.rmax }, sets: it.sets, rest: it.rest }); if (it.label) e.note = it.label; return e; });
    close();
    startActive({ name: res.title, routineId: null, ex, note: res.notes });
  };
  const logDone = () => {
    const ids = ensureExercises(res.items);
    const ex = [];
    res.items.forEach((it, i) => {
      const def = getEx(ids[i]);
      const sets = it.done.map(x => ({ t: 'n', w: x.w || 0, r: x.r != null ? Math.round(x.r) : undefined, s: x.s != null ? Math.round(x.s) : undefined, m: x.m != null ? x.m : undefined, d: x.d != null ? x.d : undefined }))
        .filter(x => def.t === 'time' ? x.s : def.t === 'cardio' ? (x.m || x.d) : x.r);
      sets.forEach(x => Object.keys(x).forEach(k => x[k] === undefined && delete x[k]));
      if (sets.length) ex.push({ id: def.id, n: def.n, slot: null, note: [it.label, it.stepsNote].filter(Boolean).join(' · '), ss: false, sets });
    });
    if (!ex.length) { toast(voice ? 'No encontré series, minutos ni kilómetros para registrar.' : 'La foto no trae series hechas con repeticiones o tiempos para registrar.', 'warn'); return; }
    const t0 = keyTime(date) + 6 * 36e5;
    const src = (voice ? 'Cargado por dictado. ' : 'Cargado desde foto. ') + res.notes;
    const isCardio = (e) => getEx(e.id).t === 'cardio';
    const cardioSec = (list) => Math.round(list.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.m || 0), 0), 0) * 60);
    const mk = (name, list, start) => {
      // Si todo es cardio o actividad por minutos, la duración es la suma de esos minutos.
      const dur = list.every(isCardio) ? cardioSec(list) : 0;
      const w = { id: uid(), name, routineId: null, start, end: start + dur * 1000, dur, ex: list, note: src.trim(), feel: null };
      const st = workoutStats(w); w.vol = Math.round(st.vol); w.nsets = st.sets;
      return w;
    };
    // Varias actividades sueltas (caminata, fisio, natación…): una sesión por actividad, una después de la otra.
    if (ex.length > 1 && ex.every(isCardio)) {
      let t = t0;
      const ws = ex.map(e => { const w = mk(e.n, [e], t); t = w.end + 60000; return w; });
      ws.forEach(w => A.putWorkout(w));
      close();
      toast(`Se guardaron ${ws.length} actividades por separado`);
      return;
    }
    const w = mk(res.title, ex, t0);
    A.putWorkout(w);
    close(); openSheet('detail', { id: w.id });
  };
  const doneTxt = (it) => { const def = it.id ? getEx(it.id) : { t: it.t }; return it.done.map(x => setTxt({ w: x.w, r: x.r, s: x.s, m: x.m, d: x.d }, def)).join(' · '); };
  if (can === false) return html`<${Sheet} title=${voice ? (text ? 'Ejercicios del día' : 'Dictar entrenamiento') : 'Cargar desde foto'} onClose=${close}><p class="sheet-p">${AI_HINT}</p><//>`;
  return html`<${Sheet} title=${voice ? (text ? 'Ejercicios del día' : 'Dictar entrenamiento') : 'Cargar desde foto'} onClose=${close} full footer=${busy ? html`<button class="btn" onClick=${() => ctl.current && ctl.current.abort()}><${Icon} n="stop" />Detener</button>` : res ? (voice && hasDone ? html`<button class="btn" onClick=${() => setRes(null)}><${Icon} n="edit" />Corregir</button><button class="btn primary" onClick=${logDone}><${Icon} n="check" />Confirmar y guardar</button>` : html`<button class="btn" onClick=${asRoutine}><${Icon} n="list" />Guardar rutina</button><button class="btn primary" onClick=${startNow}><${Icon} n="play" fill />Empezar</button>`) : html`<button class="btn primary" disabled=${(voice ? !said.trim() : !files.length) || can == null} onClick=${read}><${Icon} n="spark" />${voice ? (said.trim() ? 'Armar el registro' : 'Primero dictá o escribí') : 'Leer la foto'}</button>`}>
    ${voice ? html`<p class="sheet-p">Tocá el micrófono y contá lo que hiciste, como se lo contarías a un amigo. Claude arma las series y vos confirmás.</p>
    <${MicButton} rec=${rec} onClick=${toggleMic} has=${!!said.trim()} />
    <textarea id="voice-text" class="input voice-box" rows="6" placeholder="Lo que digas aparece acá. También podés escribirlo." value=${said} onInput=${e => setSaid(e.target.value)}></textarea>
    <p class="muted sm">Decí el ejercicio, cuántas series, repeticiones y kilos, sin formato. Por ejemplo: “press banca 4 series de 10 con 50 kilos, después remo con mancuerna 3 de 10 con 15”. Si fue otro día, decilo (“ayer”, “el lunes”).</p>` : html`<p class="sheet-p">Sacale una foto a la pizarra del WOD, a tu planilla o a una hoja escrita. Claude la lee y te arma el entrenamiento para que lo revises.</p>`}
    ${voice ? null : html`<input ref=${inRef} id="photo-in" type="file" accept=${can && can.mediaTypes ? can.mediaTypes.join(',') : 'image/*'} multiple hidden onChange=${pick} />
    <button class="photo-drop" onClick=${() => inRef.current && inRef.current.click()} aria-label=${files.length ? 'Cambiar fotos' : 'Elegir o sacar una foto'}>
      ${urls.length ? html`<span class="photo-thumbs">${urls.map((u, i) => html`<img key=${i} src=${u} alt=${'Foto ' + (i + 1)} />`)}</span><span class="muted sm">Tocá para cambiar las fotos</span>` : html`<${Icon} n="upload" size=${28} /><b>Elegir o sacar una foto</b><span class="muted sm">${can && can.maxCount > 1 ? `Hasta ${can.maxCount} fotos (por ejemplo, las dos caras de la planilla)` : 'JPG o PNG'}</span>`}
    </button>
    <label class="field"><span class="lbl">Aclaración (opcional)</span><input id="photo-hint" class="input" placeholder="Ej.: es el WOD del jueves; los pesos están en libras" value=${hint} onInput=${e => setHint(e.target.value)} /></label>`}
    ${busy ? html`<p class="thinking">Claude está leyendo la foto…</p>` : null}
    ${err ? html`<p class="muted" role="alert">${err}</p>` : null}
    ${res ? html`<section class="stack">
      <label class="field"><span class="lbl">Nombre</span><input id="photo-title" class="input" value=${res.title} onInput=${e => { const v = e.target.value; setRes(r => Object.assign({}, r, { title: v })); }} /></label>
      ${res.notes ? html`<p class="sheet-p"><b>Notas:</b> ${res.notes}</p>` : null}
      <div class="menu">${res.items.map(it => html`<div key=${it.key} class="chg">
        <span class="grow"><b>${it.id ? getEx(it.id).n : it.name}</b>
          <small>${it.id ? (norm(getEx(it.id).n) !== norm(it.name) ? `En la foto: “${it.name}” · ` : '') : 'Nuevo ejercicio propio · '}${it.label ? it.label + ' · ' : ''}${it.sets}×${it.rmin === it.rmax ? it.rmin : it.rmin + '–' + it.rmax}${it.t === 'time' ? ' s' : it.t === 'cardio' ? ' min' : ''}${it.done.length ? ' · hecho: ' + doneTxt(it) : ''}${it.stepsNote ? ' · ' + it.stepsNote : ''}</small></span>
        <button class="icon-btn sm" aria-label=${'Cambiar el ejercicio de ' + it.name} onClick=${() => remap(it)}><${Icon} n="swap" /></button>
        <button class="icon-btn sm" aria-label=${'Quitar ' + it.name} onClick=${() => remove(it.key)}><${Icon} n="x" /></button>
      </div>`)}</div>
      <p class="muted sm">Revisá cada línea: con las flechas cambiás el ejercicio si Claude eligió otro. Lo que no está en la biblioteca se crea como ejercicio propio.</p>
      ${hasDone ? html`<div class="card stack"><b>${voice ? 'Fecha del entrenamiento' : 'La foto trae series hechas'}</b><div class="row"><input id="photo-date" class="input" type="date" value=${date} max=${dayKey(Date.now())} onInput=${e => setDate(e.target.value || dayKey(Date.now()))} />${voice ? null : html`<button class="btn primary sm" onClick=${logDone}><${Icon} n="check" />Registrar como hecho</button>`}</div></div>` : null}
      <button class="btn ghost sm" style="align-self:flex-start" onClick=${read}><${Icon} n="refresh" />Volver a leer</button>
    </section>` : null}
  <//>`;
}
