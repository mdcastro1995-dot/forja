
/* ========== views: Más ========== */
function BodySection({ s }) {
  const entries = s.body.entries;
  const [d, setD] = useState(dayKey(Date.now()));
  const [kg, setKg] = useState('');
  const [bf, setBf] = useState('');
  const [waist, setWaist] = useState('');
  const hcm = s.profile.height || null;
  const [hIn, setHIn] = useState(hcm ? toStr(hcm / 100) : '');
  const saveH = () => { let v = num(hIn); if (v && v < 3) v = v * 100; if (!v || v < 100 || v > 230) { toast('Ingresá tu altura en metros (por ejemplo 1,69).', 'warn'); return; } A.profile(p => { p.height = Math.round(v); }); toast('Altura guardada'); };
  const lastKg = entries.length ? entries[entries.length - 1].kg : null;
  const bmi = hcm && lastKg ? lastKg / Math.pow(hcm / 100, 2) : null;
  const save = (ev) => {
    ev.preventDefault();
    const w = num(kg);
    if (!w || w < 25 || w > 350) { toast('Ingresá tu peso en kg (por ejemplo 78,4).', 'warn'); return; }
    const e = { d, kg: w };
    if (num(bf)) e.bf = num(bf);
    if (num(waist)) e.waist = num(waist);
    A.body(b => { b.entries = b.entries.filter(x => x.d !== d); b.entries.push(e); });
    setKg(''); setBf(''); setWaist('');
    toast('Peso guardado');
  };
  const pts = entries.map(e => ({ x: keyTime(e.d), y: e.kg }));
  const trend = pts.map(p => { const win = pts.filter(q => q.x <= p.x && q.x > p.x - 7 * DAY); return { x: p.x, y: Math.round(win.reduce((a, q) => a + q.y, 0) / win.length * 10) / 10 }; });
  const lastT = trend[trend.length - 1];
  const t30 = lastT ? trend.find(t => t.x >= lastT.x - 30 * DAY) : null;
  const chg = lastT && t30 && t30 !== lastT ? lastT.y - t30.y : null;
  const weeks = lastT && t30 && t30 !== lastT ? (lastT.x - t30.x) / (7 * DAY) : 0;
  return html`<section class="section" id="cuerpo">
    <div class="sec-head"><h2 class="sec-title">Peso corporal</h2>${entries.some(e => e.ex) ? html`<span class="pill">Incluye ejemplos</span>` : null}</div>
    <div class="card row wrap">
      <label class="field grow"><span class="lbl">Altura (m)</span><input id="b-height" class="input" inputmode="decimal" placeholder="1,75" value=${hIn} onInput=${e => setHIn(e.target.value)} /></label>
      <button class="btn sm" style="align-self:flex-end;min-height:44px" onClick=${saveH}><${Icon} n="check" />Guardar</button>
      ${bmi ? html`<p class="muted sm" style="flex-basis:100%">IMC: <b>${NF1.format(bmi)}</b> con ${f2(lastKg)} kg. Es una referencia general: con mucha masa muscular sobrestima la grasa.</p>` : hcm ? html`<p class="muted sm" style="flex-basis:100%">Registrá tu peso para ver el IMC.</p>` : null}
    </div>
    <form class="card stack" onSubmit=${save}>
      <div class="grid2">
        <label class="field"><span class="lbl">Fecha</span><input id="b-date" class="input" type="date" value=${d} max=${dayKey(Date.now())} onInput=${e => setD(e.target.value || dayKey(Date.now()))} /></label>
        <label class="field"><span class="lbl">Peso (kg)</span><input id="b-kg" class="input" inputmode="decimal" placeholder=${entries.length ? toStr(entries[entries.length - 1].kg) : '78,5'} value=${kg} onInput=${e => setKg(e.target.value)} /></label>
        <label class="field"><span class="lbl">Grasa corporal (%)</span><input id="b-bf" class="input" inputmode="decimal" placeholder="Opcional" value=${bf} onInput=${e => setBf(e.target.value)} /></label>
        <label class="field"><span class="lbl">Cintura (cm)</span><input id="b-waist" class="input" inputmode="decimal" placeholder="Opcional" value=${waist} onInput=${e => setWaist(e.target.value)} /></label>
      </div>
      <button class="btn primary" type="submit"><${Icon} n="check" />Guardar peso</button>
    </form>
    ${entries.length ? html`<div class="tiles">
      <${Tile} label="Tendencia actual" value=${fKg(lastT.y)} />
      <${Tile} label="Últimos 30 días" value=${chg == null ? '–' : (chg > 0 ? '+' : '') + NF1.format(chg) + ' kg'} />
    </div>` : null}
    <div class="chart-card">
      <h3>Evolución</h3><p class="cap">${weeks >= 1 && chg != null ? `Ritmo: ${chg > 0 ? '+' : ''}${NF1.format(chg / weeks)} kg por semana. ` : ''}La línea es el promedio de 7 días, que suaviza la variación diaria de agua y comida.</p>
      <${LineChart} data=${trend} dots=${pts} fmtTip=${v => NF1.format(v) + ' kg'} fmtY=${v => NF0.format(v)} label="Peso corporal y tendencia de 7 días" empty="Registrá tu peso un par de veces por semana, en ayunas, para ver la tendencia." />
      ${entries.length ? html`<div class="legend"><span><i class="sw line"></i>Tendencia (7 días)</span><span><i class="sw dotk"></i>Pesajes</span></div>` : null}
    </div>
    ${entries.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th class="r">Peso</th><th class="r">Grasa</th><th class="r">Cintura</th><th><span class="sr">Borrar</span></th></tr></thead>
      <tbody>${entries.slice(-8).reverse().map(e => html`<tr key=${e.d}><td>${cap(DF_DAYS.format(new Date(keyTime(e.d))))}</td><td class="r">${f2(e.kg)} kg</td><td class="r">${e.bf ? f2(e.bf) + '%' : '–'}</td><td class="r">${e.waist ? f2(e.waist) + ' cm' : '–'}</td>
        <td class="r"><button class="icon-btn sm" aria-label=${'Borrar registro del ' + e.d} onClick=${() => A.body(b => { b.entries = b.entries.filter(x => x.d !== e.d); })}><${Icon} n="trash" /></button></td></tr>`)}</tbody></table></div>` : null}
  </section>`;
}
const PLATE_STYLE = { 25: ['#D7262E', 120, 20], 20: ['#1F5FC9', 120, 18], 15: ['#F2C230', 120, 16], 10: ['#2E9B4F', 120, 14], 5: ['#F4F4F1', 84, 12], 2.5: ['#D7262E', 64, 10], 1.25: ['#A9B1B6', 52, 9], 2: ['#1F5FC9', 60, 9], 1.5: ['#F2C230', 56, 9], 1: ['#2E9B4F', 50, 8], 0.5: ['#F4F4F1', 44, 7] };
function plateBreakdown(target, bar, plates) {
  let per = (target - bar) / 2;
  if (per < 0) return { per: [], rem: per };
  const out = [];
  for (const p of plates.slice().sort((a, b) => b - a)) while (per >= p - 1e-9) { out.push(p); per = Math.round((per - p) * 1000) / 1000; }
  return { per: out, rem: per };
}
function Barbell({ plates }) {
  const [ref, W] = useWidth();
  let g = null;
  if (W > 0) {
    const cy = 75; let x = 64;
    const items = plates.map(p => { const [c, hh, ww] = PLATE_STYLE[p] || ['#888', 60, 10]; const it = { p, c, hh, ww, x }; x += ww + 2; return it; });
    g = html`<svg width=${W} height="150" class="barbell" role="img" aria-label=${'Discos por lado: ' + (plates.length ? plates.map(f2).join(', ') + ' kg' : 'ninguno')}>
      <rect x="0" y=${cy - 6} width="40" height="12" rx="2" fill="var(--axis)" />
      <rect x="40" y=${cy - 16} width="12" height="32" rx="2" fill="var(--ink-3)" />
      <rect x="52" y=${cy - 9} width=${Math.max(W - 52, 40)} height="18" rx="3" fill="var(--axis)" />
      <rect x="56" y=${cy - 12} width="6" height="24" rx="1" fill="var(--ink-2)" />
      ${items.map((it, i) => html`<g key=${i}><rect x=${it.x} y=${cy - it.hh / 2} width=${it.ww} height=${it.hh} rx="3" fill=${it.c} stroke="var(--ink-3)" stroke-opacity=${it.p === 5 || it.p === 0.5 ? 0.9 : 0.25} stroke-width="1" />
        <text x=${it.x + it.ww / 2} y=${cy + it.hh / 2 + 14} text-anchor="middle">${f2(it.p)}</text></g>`)}
    </svg>`;
  }
  return html`<div ref=${ref} style="width:100%;height:150px">${g}</div>`;
}
function Tools({ s }) {
  const st = s.profile.settings;
  const [tab, setTab] = useState('discos');
  const [target, setTarget] = useState('100');
  const [bar, setBar] = useState(st.bar);
  const [w1, setW1] = useState('80');
  const [r1, setR1] = useState('8');
  const [ww, setWw] = useState('100');
  const tv = num(target) || 0;
  const pb = plateBreakdown(tv, bar, st.plates);
  const e = e1rm(num(w1) || 0, Math.round(num(r1) || 0));
  const PCT = [[1, 100], [2, 95], [3, 93], [4, 90], [5, 87], [6, 85], [8, 80], [10, 75], [12, 70]];
  const wu = warmupSets(num(ww) || 0, { eq: 'barra' }, { ...st, bar });
  return html`<section class="section" id="herramientas">
    <h2 class="sec-title">Herramientas</h2>
    <div class="seg" role="group" aria-label="Herramienta">${[['discos', 'Discos'], ['1rm', '1RM'], ['cal', 'Calentamiento']].map(t => html`<button key=${t[0]} aria-pressed=${tab === t[0]} onClick=${() => setTab(t[0])}>${t[1]}</button>`)}</div>
    ${tab === 'discos' ? html`<div class="card stack">
      <div class="grid2">
        <label class="field"><span class="lbl">Peso total (kg)</span><input id="t-target" class="input" inputmode="decimal" value=${target} onInput=${e2 => setTarget(e2.target.value)} /></label>
        <label class="field"><span class="lbl">Barra</span><select id="t-bar" class="input" value=${bar} onChange=${e2 => setBar(Number(e2.target.value))}>${[20, 15, 10, 7].map(b => html`<option key=${b} value=${b}>${b} kg</option>`)}</select></label>
      </div>
      <${Barbell} plates=${pb.per} />
      <p>${tv < bar ? `El peso es menor que la barra (${bar} kg).` : pb.per.length ? html`Por lado: <b>${pb.per.map(f2).join(' + ')}</b> kg` : 'Solo la barra.'}${pb.rem > 0.001 ? html`<br /><span class="muted">Con tus discos faltan ${f2(pb.rem)} kg por lado: cargá ${fKg(tv - pb.rem * 2)}.</span>` : null}</p>
      <p class="muted sm">Colores de discos olímpicos: 25 rojo, 20 azul, 15 amarillo, 10 verde, 5 blanco. Ajustá los discos disponibles en Ajustes.</p>
    </div>` : null}
    ${tab === '1rm' ? html`<div class="card stack">
      <div class="grid2">
        <label class="field"><span class="lbl">Peso (kg)</span><input id="t-w1" class="input" inputmode="decimal" value=${w1} onInput=${e2 => setW1(e2.target.value)} /></label>
        <label class="field"><span class="lbl">Repeticiones</span><input id="t-r1" class="input" inputmode="numeric" value=${r1} onInput=${e2 => setR1(e2.target.value)} /></label>
      </div>
      <p>1RM estimado (fórmula de Epley): <b class="num">${e ? fKg(Math.round(e * 10) / 10) : '–'}</b></p>
      ${e ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Reps</th><th class="r">% del 1RM</th><th class="r">Peso</th></tr></thead><tbody>${PCT.map(([r, p]) => html`<tr key=${r}><td>${r}</td><td class="r">${p}%</td><td class="r">${fKg(Math.round(e * p / 100 / 2.5) * 2.5)}</td></tr>`)}</tbody></table></div>` : null}
      <p class="muted sm">Es una estimación: es más precisa con series de 3 a 10 repeticiones.</p>
    </div>` : null}
    ${tab === 'cal' ? html`<div class="card stack">
      <label class="field"><span class="lbl">Peso de trabajo (kg)</span><input id="t-ww" class="input" inputmode="decimal" value=${ww} onInput=${e2 => setWw(e2.target.value)} /></label>
      ${wu.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Serie</th><th class="r">Peso</th><th class="r">Reps</th><th>Por lado</th></tr></thead><tbody>${wu.map((x, i) => html`<tr key=${i}><td>C${i + 1}</td><td class="r">${fKg(x.w)}</td><td class="r">${x.r}</td><td>${plateBreakdown(x.w, bar, st.plates).per.map(f2).join(' + ') || 'barra'}</td></tr>`)}</tbody></table></div>` : html`<p class="muted">Ingresá un peso mayor a la barra.</p>`}
      <p class="muted sm">Aproximación progresiva: 40, 60 y 80% del peso de trabajo, con menos repeticiones a medida que sube.</p>
    </div>` : null}
  </section>`;
}
function SetRowLi({ title, sub, children }) {
  return html`<div class="li"><span class="grow"><span class="t">${title}</span>${sub ? html`<span class="sub">${sub}</span>` : null}</span>${children}</div>`;
}
function Settings({ s }) {
  const st = s.profile.settings;
  const setS = (k, v) => A.profile(p => { p.settings[k] = v; });
  const toggleArr = (k, v) => A.profile(p => { const a = new Set(p.settings[k]); if (a.has(v)) a.delete(v); else a.add(v); p.settings[k] = [...a]; });
  const sel = (id, k, opts, fmt) => html`<select id=${id} class="input" value=${st[k]} onChange=${e => setS(k, Number(e.target.value))}>${opts.map(o => html`<option key=${o} value=${o}>${fmt ? fmt(o) : o}</option>`)}</select>`;
  const tg = (id, k, l) => html`<input id=${id} type="checkbox" class="toggle" checked=${!!st[k]} onChange=${e => setS(k, e.target.checked)} aria-label=${l} />`;
  return html`<section class="section" id="ajustes">
    <h2 class="sec-title">Ajustes</h2>
    <div class="list">
      <${SetRowLi} title="Objetivo semanal" sub="Sesiones por semana para la racha"><${Stepper} value=${st.weeklyGoal} min=${1} max=${7} label="sesiones" onChange=${v => setS('weeklyGoal', v)} /><//>
      <${SetRowLi} title="Descanso por defecto" sub="Para ejercicios nuevos">${sel('s-rest', 'rest', REST_OPTS, fDur)}<//>
      <${SetRowLi} title="Modo guía" sub="Sin descansos ni pesos obligatorios: tildás series o ejercicios completos">${tg('s-guide', 'guide', 'Modo guía')}<//>
      <${SetRowLi} title="Iniciar descanso al marcar una serie">${tg('s-auto', 'autoRest', 'Iniciar descanso al marcar una serie')}<//>
      <${SetRowLi} title="Sonido al terminar el descanso">${tg('s-sound', 'sound', 'Sonido al terminar el descanso')}<//>
      <${SetRowLi} title="Vibración">${tg('s-vib', 'vibrate', 'Vibración')}<//>
      <${SetRowLi} title="Pantalla encendida durante la sesión" sub="Si tu dispositivo lo permite">${tg('s-awake', 'keepAwake', 'Pantalla encendida durante la sesión')}<//>
      <${SetRowLi} title="Registrar RPE" sub="Esfuerzo percibido de 1 a 10 por serie">${tg('s-rpe', 'showRpe', 'Registrar RPE')}<//>
    </div>
    <div class="list">
      <${SetRowLi} title="Barra olímpica">${sel('s-bar', 'bar', [20, 15, 10], v => v + ' kg')}<//>
      <${SetRowLi} title="Salto de peso: tren superior" sub="Barra, polea y máquinas">${sel('s-incu', 'incUpper', [1, 1.25, 2, 2.5, 5], v => f2(v) + ' kg')}<//>
      <${SetRowLi} title="Salto de peso: tren inferior" sub="Sentadilla, peso muerto, prensa">${sel('s-incl', 'incLower', [2.5, 5, 10], v => f2(v) + ' kg')}<//>
      <${SetRowLi} title="Salto de peso: mancuernas">${sel('s-incd', 'incDb', [1, 1.5, 2, 2.5], v => f2(v) + ' kg')}<//>
    </div>
    <div class="card stack">
      <span class="lbl">Discos disponibles (por unidad)</span>
      <div class="chips wrap" role="group" aria-label="Discos disponibles">${[25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5].map(p => html`<button key=${p} class="chip" aria-pressed=${st.plates.includes(p)} onClick=${() => toggleArr('plates', p)}>${f2(p)} kg</button>`)}</div>
      <span class="lbl">Equipamiento de tu gimnasio</span>
      <p class="muted sm">El entrenamiento inteligente y las alternativas usan solo lo que marques.</p>
      <div class="chips wrap" role="group" aria-label="Equipamiento disponible">${Object.keys(EQUIP).map(k => html`<button key=${k} class="chip" aria-pressed=${st.equipment.includes(k)} onClick=${() => toggleArr('equipment', k)}>${EQUIP[k]}</button>`)}</div>
    </div>
  </section>`;
}
function DataSection({ s }) {
  const fileRef = useRef(null);
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importBackup(String(r.result || '')); r.readAsText(f); e.target.value = ''; };
  const where = s.mode === 'cloud' ? 'Tus datos se guardan en tu espacio privado de esta app: solo vos los ves, aunque compartas el enlace. Se sincronizan entre tus dispositivos.' : s.mode === 'local' ? 'Tus datos están solo en este navegador. Exportá un respaldo de vez en cuando.' : 'Esta vista no guarda datos. Exportá antes de cerrar.';
  const wipe = () => openSheet('confirm', { title: 'Borrar todos mis datos', body: 'Se borran entrenamientos, pesos, rutinas y ajustes. Esto no se puede deshacer. Si querés, exportá un respaldo antes.', ok: 'Borrar todo', danger: true, onOk: () => {
    A.active(null);
    for (const w of S().workouts) A.delWorkout(w.id);
    A.body(b => { b.entries = []; });
    A.profile(p => { const d = defaultProfile(); Object.keys(p).forEach(k => delete p[k]); Object.assign(p, d); });
    toast('Datos borrados');
  } });
  return html`<section class="section" id="datos">
    <h2 class="sec-title">Tus datos</h2>
    <p class="lead">${where}</p>
    <div class="menu">
      <button onClick=${() => offerFile('forja-series.csv', toCSV(S().workouts))}><${Icon} n="download" />Exportar series a CSV (Excel, Google Sheets)</button>
      <button onClick=${() => offerFile('forja-respaldo.json', backupJSON())}><${Icon} n="download" />Exportar respaldo completo (JSON)</button>
      <button onClick=${() => fileRef.current && fileRef.current.click()}><${Icon} n="upload" />Importar respaldo</button>
      ${s.workouts.some(w => w.example) ? html`<button onClick=${clearExamples}><${Icon} n="trash" />Borrar datos de ejemplo</button>` : null}
      <button class="danger" onClick=${wipe}><${Icon} n="trash" />Borrar todos mis datos</button>
    </div>
    <input ref=${fileRef} id="import-file" type="file" accept=".json,application/json" hidden onChange=${onFile} />
  </section>`;
}
function More({ s }) {
  return html`
    <section class="section"><h1 class="display h1">Más</h1>
      <div class="chips" role="navigation" aria-label="Ir a sección">${[...(SHELL ? [['cuenta', 'Cuenta']] : []), ['lesion', 'Lesión'], ['cuerpo', 'Peso corporal'], ['herramientas', 'Herramientas'], ['coach', 'Coach'], ['ajustes', 'Ajustes'], ['datos', 'Datos']].map(([id, l]) => html`<button key=${id} class="chip" onClick=${() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>${l}</button>`)}</div>
    </section>
    <${InjurySection} s=${s} />
    <${BodySection} s=${s} />
    <${Tools} s=${s} />
    <section class="section" id="coach">
      <h2 class="sec-title">Coach con Claude</h2>
      ${s.caps.sample ? html`<p class="lead">Le pasa a Claude un resumen de tu historial (volumen, series por músculo, récords, recuperación) y te devuelve ajustes concretos. También puede armarte un programa a medida que se importa directo a tus rutinas. Usa tu propio plan de Claude y te pide permiso la primera vez.</p>
        <div class="row wrap"><button class="btn primary" onClick=${() => openSheet('coach', {})}><${Icon} n="chat" />Consultar al coach</button><button class="btn" onClick=${() => openSheet('coach', { mode: 'plan' })}><${Icon} n="spark" />Armar programa con IA</button></div>`
        : html`<p class="lead">${AI_HINT}</p>`}
    </section>
    ${SHELL ? html`<section class="section" id="cuenta"><h2 class="sec-title">Cuenta y conexiones</h2><div class="list"><div class="li"><span class="grow"><span class="t">${window.forjaShell.email() || 'Sin cuenta (solo este teléfono)'}</span><span class="sub">${s.mode === 'cloud' ? 'Tus datos se sincronizan con Supabase' : 'Datos guardados en este teléfono'} · ${window.forjaShell.hasAI() ? 'Claude activado' : 'Claude sin configurar'}</span></span><button class="btn sm" onClick=${() => window.forjaShell.openSettings()}>Configurar</button></div></div></section>` : null}
    <${Settings} s=${s} />
    <${DataSection} s=${s} />
    <p class="muted sm">Forja · registro de entrenamiento. Récords con 1RM estimado por fórmula de Epley; recuperación muscular estimada a partir de tus series de las últimas 72 horas. Es una guía, no un diagnóstico.</p>`;
}
