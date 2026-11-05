
/* ========== derived data ========== */
function buildIndex(workouts) {
  const byEx = {}, byW = {}, prs = [];
  const asc = workouts.slice().sort((a, b) => a.start - b.start);
  for (const w of asc) {
    for (const e of (w.ex || [])) {
      const def = getEx(e.id);
      const all = e.sets || [];
      const work = all.filter(x => x.t !== 'w');
      if (!work.length) continue;
      const ss = { wid: w.id, t: w.start, all, sets: work, n: work.length, e1: 0, maxW: 0, maxR: 0, maxS: 0, maxM: 0, maxD: 0, vol: 0, reps: 0, best: null };
      for (const x of work) {
        const wt = x.w || 0, r = x.r || 0;
        if (def.t === 'wr' || def.t === 'bw') {
          ss.vol += wt * r; ss.reps += r;
          if (wt > ss.maxW) ss.maxW = wt;
          if (r > ss.maxR) ss.maxR = r;
          const v = e1rm(wt, r);
          if (v > ss.e1) { ss.e1 = v; ss.best = x; }
        } else if (def.t === 'time') {
          if ((x.s || 0) > ss.maxS) { ss.maxS = x.s || 0; ss.best = x; }
        } else {
          if ((x.m || 0) > ss.maxM) { ss.maxM = x.m || 0; ss.best = x; }
          if ((x.d || 0) > ss.maxD) ss.maxD = x.d || 0;
        }
      }
      if (!ss.best) ss.best = work.reduce((a, x) => ((x.r || 0) > (a.r || 0) ? x : a), work[0]);
      let rec = byEx[e.id];
      if (!rec) rec = byEx[e.id] = { id: e.id, sessions: [], best: { e1: 0, w: 0, r: 0, s: 0, m: 0, d: 0, vol: 0 } };
      const B = rec.best;
      if (rec.sessions.length) {
        const ev = (k, v) => { const p = { t: w.start, wid: w.id, ex: e.id, n: e.n || def.n, k, v }; prs.push(p); (byW[w.id] || (byW[w.id] = [])).push(p); };
        if (def.t === 'wr') { if (ss.e1 > B.e1 + 0.05) ev('e1', ss.e1); if (ss.maxW > B.w + 0.05) ev('w', ss.maxW); }
        else if (def.t === 'bw') { if (ss.maxR > B.r) ev('r', ss.maxR); if (ss.maxW > 0 && ss.maxW > B.w + 0.05) ev('w', ss.maxW); }
        else if (def.t === 'time') { if (ss.maxS > B.s) ev('s', ss.maxS); }
        else { if (ss.maxD > B.d + 0.01) ev('d', ss.maxD); if (ss.maxM > B.m + 0.01) ev('m', ss.maxM); }
      }
      B.e1 = Math.max(B.e1, ss.e1); B.w = Math.max(B.w, ss.maxW); B.r = Math.max(B.r, ss.maxR);
      B.s = Math.max(B.s, ss.maxS); B.m = Math.max(B.m, ss.maxM); B.d = Math.max(B.d, ss.maxD); B.vol = Math.max(B.vol, ss.vol);
      rec.sessions.push(ss); rec.last = ss;
    }
  }
  return { byEx, byW, prs };
}
let _idxW = null, _idx = null;
function INDEX(workouts) { if (workouts !== _idxW || !_idx) { _idx = buildIndex(workouts); _idxW = workouts; } return _idx; }

const PR_LABEL = { e1: '1RM estimado', w: 'Peso máximo', r: 'Más repeticiones', s: 'Mejor tiempo', d: 'Mayor distancia', m: 'Más minutos' };
function prVal(p) { return p.k === 'e1' || p.k === 'w' ? fKg(Math.round(p.v * 10) / 10) : p.k === 'r' ? p.v + ' reps' : p.k === 's' ? p.v + ' s' : p.k === 'd' ? f2(p.v) + ' km' : f2(p.v) + ' min'; }
function setTxt(x, def) {
  if (!x) return '—';
  if (def.t === 'time') return (x.s || 0) + ' s';
  if (def.t === 'cardio') return f2(x.m || 0) + ' min' + (x.d ? ' · ' + f2(x.d) + ' km' : '');
  if (def.t === 'bw') return (x.w ? '+' + f2(x.w) + ' kg × ' : '') + (x.r || 0) + ' reps';
  return f2(x.w || 0) + ' kg × ' + (x.r || 0);
}
function workoutStats(w) {
  let vol = 0, sets = 0;
  for (const e of w.ex || []) for (const x of e.sets || []) if (x.t !== 'w') { sets++; vol += (x.w || 0) * (x.r || 0); }
  return { vol, sets };
}

function recovery(workouts, now) {
  const F = {};
  const add = (m, n, h) => { const win = BIG.has(m) ? 72 : 48; const left = 1 - h / win; if (left > 0) F[m] = (F[m] || 0) + n * left; };
  for (const w of workouts) {
    const h = (now - (w.end || w.start)) / 36e5;
    if (h > 80) break;
    if (h < 0) continue;
    for (const e of (w.ex || [])) {
      const def = getEx(e.id);
      if (def.m === 'cardio') continue;
      const n = (e.sets || []).filter(x => x.t !== 'w').length;
      if (!n) continue;
      add(def.m, n, h);
      for (const m of def.s) add(m, n * 0.5, h);
    }
  }
  const out = {};
  for (const m of MAP_MUSCLES) out[m] = Math.round(clamp(100 - (F[m] || 0) / (BIG.has(m) ? 8 : 6) * 100, 0, 100));
  return out;
}
function muscleSets(workouts, from, to) {
  const o = {};
  for (const w of workouts) {
    if (w.start < from || w.start >= to) continue;
    for (const e of w.ex || []) {
      const def = getEx(e.id);
      if (def.m === 'cardio') continue;
      const n = (e.sets || []).filter(x => x.t !== 'w').length;
      if (!n) continue;
      o[def.m] = (o[def.m] || 0) + n;
      for (const m of def.s) o[m] = (o[m] || 0) + n * 0.5;
    }
  }
  return o;
}
function weekStreak(workouts, goal) {
  const counts = {};
  for (const w of workouts) { const k = startOfWeek(w.start); counts[k] = (counts[k] || 0) + 1; }
  let wk = startOfWeek(Date.now());
  let streak = (counts[wk] || 0) >= goal ? 1 : 0;
  wk = prevWeek(wk);
  while ((counts[wk] || 0) >= goal) { streak++; wk = prevWeek(wk); }
  return streak;
}
function estMinutes(r) {
  let sec = 0;
  for (const sl of r.slots) sec += sl.sets * (45 + (sl.rest || 90)) + 75;
  return Math.max(10, Math.round(sec / 300) * 5);
}

/* ========== progression ========== */
function suggest(exId, rg, idx, st) {
  const def = getEx(exId);
  const rec = idx.byEx[exId];
  const last = rec && rec.last;
  const rmin = rg.rmin, rmax = rg.rmax;
  if (!last) {
    if (def.t === 'wr') return { w: null, r: rmin, kind: 'new', text: 'Primera vez: elegí un peso que te deje 2 o 3 repeticiones en reserva y anotalo.' };
    if (def.t === 'bw') return { r: rmin, kind: 'new', text: null };
    if (def.t === 'time') return { s: rmin, kind: 'new', text: null };
    return { kind: 'new', text: null };
  }
  const sets = last.sets;
  if (def.t === 'wr') {
    const top = Math.max(...sets.map(x => x.w || 0));
    const atTop = sets.filter(x => (x.w || 0) === top);
    const minR = Math.min(...atTop.map(x => x.r || 0));
    const inc = incFor(def, st);
    if (top > 0 && atTop.every(x => (x.r || 0) >= rmax)) {
      const nw = Math.round((top + inc) * 4) / 4;
      return { w: nw, r: rmin, kind: 'up', text: `La última vez llegaste a ${rmax} reps en todas las series con ${fKg(top)}. Subí a ${fKg(nw)}.` };
    }
    const sess = rec.sessions.slice(-3);
    const stalled = sess.length === 3 && top > 0 && sess.every(z => z.maxW === top && Math.min(...z.sets.filter(x => (x.w || 0) === top).map(x => x.r || 0)) < rmin);
    if (stalled) {
      const dw = Math.round(top * 0.9 / 2.5) * 2.5 || Math.round(top * 0.9);
      return { w: dw, r: rmax, kind: 'down', text: `Tres sesiones por debajo de ${rmin} reps con ${fKg(top)}. Bajá a ${fKg(dw)} y volvé a construir.` };
    }
    const target = clamp(minR + 1, rmin, rmax);
    return { w: top || null, r: target, kind: 'same', text: top ? `Mantené ${fKg(top)} y buscá ${target} reps por serie.` : null };
  }
  if (def.t === 'bw') {
    const mr = Math.max(...sets.map(x => x.r || 0));
    const minR = Math.min(...sets.map(x => x.r || 0));
    const lw = Math.max(...sets.map(x => x.w || 0));
    if (mr >= rmax && minR >= rmax) return { w: lw ? lw + st.incUpper : st.incUpper, r: rmin, kind: 'up', text: lw ? `Llegaste a ${rmax} reps en todas: sumá ${f2(st.incUpper)} kg de lastre.` : `Llegaste a ${rmax} reps en todas: sumá ${f2(st.incUpper)} kg de lastre o pasá a una variante más difícil.` };
    return { w: lw || null, r: clamp(minR + 1, rmin, rmax), kind: 'same', text: `Buscá ${clamp(minR + 1, rmin, rmax)} reps por serie.` };
  }
  if (def.t === 'time') { const ms = Math.max(...sets.map(x => x.s || 0)); return { s: ms + 5, kind: 'up', text: `Mejor marca reciente: ${ms} s. Probá ${ms + 5} s.` }; }
  return { m: last.maxM || null, d: last.maxD || null, kind: 'same', text: null };
}

/* ========== rotation ========== */
/* Qué rutina toca: la que hace más que no hacés, salteando las que cargan músculos
   que todavía se recuperan (por ejemplo, si ayer entrenaste espalda por tu cuenta). */
function routineMuscles(r) {
  const ms = {};
  for (const sl of r.slots) { const d = getEx(sl.ex[sl.idx % sl.ex.length]); if (d.m === 'cardio') continue; ms[d.m] = (ms[d.m] || 0) + (sl.sets || 1); }
  return ms;
}
function rankRoutines(profile, workouts, now) {
  now = now || Date.now();
  const rot = profile.routines.filter(r => r.inRot !== false);
  const rec = recovery(workouts, now);
  const lastAt = {};
  for (const w of workouts) if (w.routineId && lastAt[w.routineId] == null) lastAt[w.routineId] = w.start;
  return rot.map((r, i) => {
    const ms = routineMuscles(r);
    let t = 0, n = 0, tired = [];
    for (const m in ms) { if (rec[m] == null) continue; t += rec[m] * ms[m]; n += ms[m]; if (rec[m] < 60) tired.push(m); }
    const ready = n ? Math.round(t / n) : 100;
    return { r, i, ready, ok: ready >= 70, tired, last: lastAt[r.id] || null };
  }).sort((a, b) => (b.ok - a.ok) || ((a.last || 0) - (b.last || 0)) || (a.i - b.i));
}
function nextRoutine(profile, workouts) {
  const rk = rankRoutines(profile, workouts);
  return rk.length ? rk[0].r : null;
}
function advanceSlots(profile, routineId, a) {
  const r = profile.routines.find(x => x.id === routineId);
  if (!r) return;
  for (const slot of r.slots) {
    const done = a.ex.find(e => e.slot === slot.id && e.sets.some(x => x.done));
    if (!done) continue;
    const di = slot.ex.indexOf(done.id);
    if (di >= 0 && di !== slot.idx) { slot.idx = di; slot.cnt = 0; }
    slot.cnt = (slot.cnt || 0) + 1;
    if (slot.rot > 0 && slot.ex.length > 1 && slot.cnt >= slot.rot) { slot.idx = (slot.idx + 1) % slot.ex.length; slot.cnt = 0; }
  }
}
function rotTxt(sl) {
  if (sl.ex.length < 2 || !sl.rot) return null;
  const left = sl.rot - (sl.cnt || 0);
  return sl.rot === 1 ? 'Rota en cada sesión' : `Rota en ${left} ${plural(left, 'sesión', 'sesiones')}`;
}

/* ========== building sessions ========== */
function newSet(p, t) { return { key: uid(), t: t || 'n', done: false, w: '', r: '', s: '', m: '', d: '', rpe: '', p: p || {} }; }
function phFrom(x) { const p = {}; if (!x) return p; if (x.w != null && x.w !== 0) p.w = toStr(x.w); if (x.r != null) p.r = String(x.r); if (x.s != null) p.s = String(x.s); if (x.m != null) p.m = toStr(x.m); if (x.d != null) p.d = toStr(x.d); return p; }
function makeEx(exId, o) {
  o = o || {};
  const s = S(), st = s.profile.settings, idx = INDEX(s.workouts), def = getEx(exId);
  const slot = o.slot || null;
  const rg = slot ? { rmin: slot.rmin, rmax: slot.rmax } : (o.range || defRange(def));
  const sug = suggest(exId, rg, idx, st);
  const rec = idx.byEx[exId];
  const n = slot ? slot.sets : (o.sets || (rec && rec.last ? Math.max(1, rec.last.n) : 3));
  const ph = phFrom(sug);
  const sets = o.prevSets ? o.prevSets.map(x => newSet(phFrom(x), x.t)) : Array.from({ length: n }, () => newSet({ ...ph }));
  return { key: uid(), id: exId, n: def.n, slot: slot ? slot.id : (o.slotId || null), rmin: rg.rmin, rmax: rg.rmax, rest: o.rest || (slot ? slot.rest : restFor(def, st)), ss: slot ? !!slot.ss : !!o.ss, sug, note: '', sets };
}
function findSlot(routineId, slotId) {
  const r = routineId && S().profile.routines.find(x => x.id === routineId);
  return r ? r.slots.find(x => x.id === slotId) || null : null;
}
function startActive(a) {
  const go = () => {
    A.active({ id: uid(), start: Date.now(), note: '', rest: null, feel: null, ...a });
    closeAllSheets(); set({ activeOpen: true });
    unlockAudio();
    if (S().profile.settings.keepAwake) wake(true);
  };
  const cur = S().active;
  if (cur) openSheet('confirm', { title: 'Ya hay un entrenamiento abierto', body: `“${cur.name}” sigue en curso. Si empezás otro, ese se descarta.`, ok: 'Descartar y empezar', danger: true, cancel: 'Volver al actual', onOk: go, onCancel: () => set({ activeOpen: true }) });
  else go();
}
function startRoutine(r) {
  const ex = r.slots.map(sl => makeEx(sl.ex[sl.idx % sl.ex.length], { slot: sl }));
  startActive({ name: r.name, routineId: r.id, ex });
}
function startEmpty() { startActive({ name: 'Entrenamiento libre', routineId: null, ex: [] }); }
function repeatWorkout(w) {
  const r = w.routineId ? S().profile.routines.find(x => x.id === w.routineId) : null;
  const ex = (w.ex || []).map(e => {
    const slot = r && e.slot ? r.slots.find(x => x.id === e.slot) : null;
    return makeEx(e.id, { slot: slot && slot.ex.includes(e.id) ? slot : null, slotId: e.slot, prevSets: e.sets, ss: e.ss });
  });
  startActive({ name: w.name, routineId: r ? r.id : null, ex });
}
function editWorkout(w) {
  const st = S().profile.settings;
  const ex = (w.ex || []).map(e => {
    const def = getEx(e.id);
    return { key: uid(), id: e.id, n: e.n || def.n, slot: e.slot || null, rmin: null, rmax: null, rest: restFor(def, st), ss: !!e.ss, sug: null, note: e.note || '',
      sets: (e.sets || []).map(x => ({ key: uid(), t: x.t || 'n', done: true, w: toStr(x.w), r: x.r != null ? String(x.r) : '', s: x.s != null ? String(x.s) : '', m: toStr(x.m), d: toStr(x.d), rpe: x.rpe != null ? toStr(x.rpe) : '', p: {} })) };
  });
  startActive({ id: w.id, editing: w.id, name: w.name, routineId: w.routineId || null, start: w.start, end: w.end, ex, note: w.note || '', feel: w.feel || null, example: !!w.example });
}
function setValues(x, def) {
  const v = (f) => num(x[f] !== '' && x[f] != null ? x[f] : (x.p && x.p[f]));
  const o = { t: x.t || 'n' };
  if (def.t === 'wr' || def.t === 'bw') { const r = v('r'); if (!r || r < 0) return null; const w = v('w'); if (def.t === 'wr' && w == null && !S().profile.settings.guide) return null; o.w = Math.max(0, w || 0); o.r = Math.round(r); }
  else if (def.t === 'time') { const sv = v('s'); if (!sv) return null; o.s = Math.round(sv); }
  else { const m = v('m'), d = v('d'); if (!m && !d) return null; o.m = m || 0; o.d = d || 0; }
  const rpe = num(x.rpe); if (rpe) o.rpe = clamp(rpe, 1, 10);
  return o;
}
function finalize(a, mode) {
  const ex = [];
  for (const e of a.ex) {
    const def = getEx(e.id);
    const sets = [];
    for (const x of e.sets) {
      if (!x.done && mode !== 'all') continue;
      const v = setValues(x, def);
      if (v) sets.push(v);
    }
    if (sets.length) ex.push({ id: e.id, n: e.n || def.n, slot: e.slot || null, note: e.note || '', ss: !!e.ss, sets });
  }
  const end = a.editing ? (a.end || Date.now()) : Date.now();
  const w = { id: a.editing || a.id, name: (a.name || 'Entrenamiento').trim() || 'Entrenamiento', routineId: a.routineId || null, start: a.start, end, dur: Math.round((end - a.start) / 1000), ex, note: a.note || '', feel: a.feel || null };
  const st = workoutStats(w); w.vol = Math.round(st.vol); w.nsets = st.sets;
  if (a.example) w.example = true;
  return w;
}
function missingFields(x, def) {
  const has = (f) => num(x[f] !== '' && x[f] != null ? x[f] : (x.p && x.p[f])) != null;
  if (def.t === 'wr') return ['w', 'r'].filter(f => !has(f) || (f === 'r' && !num(x.r !== '' ? x.r : x.p && x.p.r)));
  if (def.t === 'bw') return has('r') ? [] : ['r'];
  if (def.t === 'time') return has('s') ? [] : ['s'];
  return has('m') || has('d') ? [] : ['m', 'd'];
}
function pendingCount(a) {
  let n = 0;
  for (const e of a.ex) { const def = getEx(e.id); for (const x of e.sets) if (!x.done && setValues(x, def)) n++; }
  return n;
}
function finishWorkout(mode, feel, note) {
  const s = S();
  const a = Object.assign(clone(s.active), { feel, note });
  const w = finalize(a, mode);
  if (!w.ex.length) { toast('No hay series completas para guardar. Marcá al menos una serie.', 'warn'); return; }
  const before = INDEX(s.workouts);
  A.putWorkout(w);
  if (!a.editing && a.routineId) A.profile(p => advanceSlots(p, a.routineId, a));
  A.active(null); wake(false);
  closeAllSheets(); set({ activeOpen: true });
  const prs = INDEX(S().workouts).byW[w.id] || [];
  openSheet('detail', { id: w.id, fresh: !a.editing, prCount: prs.length, prevIdx: !!before });
}
function discardActive() {
  const a = S().active;
  if (!a) return;
  openSheet('confirm', {
    title: a.editing ? 'Descartar cambios' : 'Cancelar entrenamiento',
    body: a.editing ? 'El entrenamiento guardado queda como estaba.' : 'Se borran todas las series de esta sesión. Esto no se puede deshacer.',
    ok: a.editing ? 'Descartar cambios' : 'Cancelar entrenamiento', cancel: 'Seguir', danger: true,
    onOk: () => { A.active(null); wake(false); set({ activeOpen: true }); },
  });
}
function alternatives(id) {
  const d = getEx(id);
  const eq = new Set(S().profile.settings.equipment);
  return allExercises().filter(x => x.id !== id && x.t !== 'cardio' && (x.g === d.g || (x.m === d.m && x.k === d.k)))
    .sort((a, b) => ((b.g === d.g) - (a.g === d.g)) || (eq.has(b.eq) - eq.has(a.eq)) || a.n.localeCompare(b.n, 'es'))
    .slice(0, 8).map(x => x.id);
}
function warmupSets(work, def, st) {
  const bar = st.bar;
  const r25 = (v) => Math.max(def.eq === 'barra' ? bar : 0, Math.round(v / 2.5) * 2.5);
  const out = [];
  if (def.eq === 'barra' && work > bar * 1.6) out.push({ w: bar, r: 10 });
  for (const [pct, reps] of [[0.4, 8], [0.6, 5], [0.8, 3]]) { const v = r25(work * pct); if (v > 0 && v < work && !out.some(o => o.w === v)) out.push({ w: v, r: reps }); }
  return out;
}
function applyProgram(prog, replace) {
  A.profile(p => {
    const rs = prog.routines.map(r => ({ id: uid(), name: r.name, inRot: true, slots: r.slots.map(sl => ({ id: uid(), label: sl.label, ex: sl.ex.slice(), idx: 0, cnt: 0, rot: sl.rot, sets: sl.sets, rmin: sl.rmin, rmax: sl.rmax, rest: sl.rest, ss: !!sl.ss })) }));
    p.routines = replace ? rs : p.routines.concat(rs);
    p.program = prog.name;
    p.plan = { name: prog.name, start: dayKey(Date.now()), weeks: prog.weeks || null, goal: prog.goal || null, minutes: prog.minutes || null, phases: prog.phases || [], desc: prog.desc || '' };
  });
  toast(`Listo: “${prog.name}” está en tu rotación`);
}

/* ========== smart workout (recovery-driven) ========== */
function rng(seed) { let x = (seed * 2654435761) % 4294967296; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; }
function smartPlan(s, o) {
  const now = Date.now();
  const rec = recovery(s.workouts, now);
  const wk = muscleSets(s.workouts, now - 7 * DAY, now + 1);
  const R = rng(o.seed || 1);
  const eqOK = new Set(s.profile.settings.equipment);
  const idx = INDEX(s.workouts);
  const pool = o.focus === 'sup' ? UPPER.concat(['core']) : o.focus === 'inf' ? LOWER.concat(['core']) : MAP_MUSCLES;
  const nEx = o.dur <= 30 ? 4 : o.dur <= 45 ? 5 : o.dur <= 60 ? 6 : 7;
  const score = {};
  for (const m of pool) {
    const r = rec[m] == null ? 100 : rec[m];
    const deficit = Math.max(0, 10 - (wk[m] || 0));
    score[m] = (r < 55 ? 0.12 : 1) * (r / 100) * (1 + deficit / 8) * (BIG.has(m) ? 1.25 : 1) * (0.9 + R() * 0.2);
  }
  if (score.lumbar != null) score.lumbar *= 0.3;
  if (score.trapecio != null) score.trapecio *= 0.55;
  if (score.core != null) score.core *= 0.7;
  if (o.focus === 'full') { for (const m of UPPER) if (score[m] != null) score[m] *= 1; }
  const recent = new Set();
  for (const w of s.workouts) { if (now - w.start > 7 * DAY) break; for (const e of w.ex || []) recent.add(e.id); }
  const items = [], usedM = {}, usedG = new Set(), why = [];
  let guard = 0;
  while (items.length < nEx && guard++ < 60) {
    const cand = Object.keys(score).filter(m => score[m] > 0 && (usedM[m] || 0) < (BIG.has(m) ? 2 : 1)).sort((a, b) => score[b] - score[a]);
    if (o.focus === 'full' && items.length < 2) {
      const half = items.length === 0 ? LOWER : UPPER;
      const c2 = cand.filter(m => half.includes(m));
      if (c2.length) cand.unshift(c2[0]);
    }
    const m = cand[0];
    if (!m) break;
    const wantC = !usedM[m] && (BIG.has(m) || m === 'hombros');
    let cands = LIB.filter(x => x.m === m && eqOK.has(x.eq) && x.t !== 'cardio' && !usedG.has(x.g) && x.id !== 'dominadas_asistidas');
    if (wantC && cands.some(x => x.k === 'c')) cands = cands.filter(x => x.k === 'c');
    else if (!wantC && cands.some(x => x.k === 'i')) cands = cands.filter(x => x.k === 'i');
    if (!cands.length) { score[m] = 0; continue; }
    const sc = new Map(cands.map(x => [x.id, (recent.has(x.id) ? 0.35 : 1) * (idx.byEx[x.id] ? 1.2 : 1) * (0.55 + R() * 0.9)]));
    cands.sort((a, b) => sc.get(b.id) - sc.get(a.id));
    const ex = cands[0];
    items.push({ id: ex.id, m, k: ex.k });
    if (!usedM[m]) why.push({ m, r: rec[m] == null ? 100 : rec[m], sets: wk[m] || 0 });
    usedM[m] = (usedM[m] || 0) + 1; usedG.add(ex.g);
    score[m] *= 0.45;
    for (const s2 of ex.s) if (score[s2] != null) score[s2] *= 0.75;
  }
  const order = (x) => (x.k === 'c' ? 0 : 10) + (BIG.has(x.m) ? 0 : 1);
  items.sort((a, b) => order(a) - order(b));
  const cs = o.dur >= 60 ? 4 : 3;
  return {
    items: items.map(it => ({ ...it, sets: it.k === 'c' ? cs : 3, rmin: it.k === 'c' ? 6 : 10, rmax: it.k === 'c' ? 10 : 15, rest: it.k === 'c' ? 150 : 75 })),
    why: why.slice(0, 4),
  };
}

/* ========== audio, vibration, wake lock ========== */
let AC = null;
function unlockAudio() { try { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } if (AC && AC.state === 'suspended') AC.resume(); } catch (e) {} }
function beep() {
  try {
    if (!AC) return;
    const t0 = AC.currentTime + 0.02;
    [0, 0.26, 0.52].forEach((d, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2);
      o.connect(g); g.connect(AC.destination); o.start(t0 + d); o.stop(t0 + d + 0.22);
    });
  } catch (e) {}
}
function buzz(p) { try { if (S().profile.settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
let WL = null;
async function wake(on) {
  try {
    if (on && !WL && navigator.wakeLock && document.visibilityState === 'visible') { WL = await navigator.wakeLock.request('screen'); WL.addEventListener('release', () => { WL = null; }); }
    else if (!on && WL) { const l = WL; WL = null; await l.release(); }
  } catch (e) { WL = null; }
}
document.addEventListener('visibilitychange', () => { const s = S(); if (document.visibilityState === 'visible' && s.active && s.profile.settings.keepAwake) wake(true); });

/* ========== export / import ========== */
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCSV(workouts) {
  const rows = [['fecha', 'hora', 'entrenamiento', 'ejercicio', 'musculo', 'serie', 'tipo', 'peso_kg', 'reps', 'segundos', 'minutos', 'km', 'rpe', 'e1rm_kg', 'nota']];
  for (const w of workouts.slice().sort((a, b) => a.start - b.start)) {
    for (const e of w.ex || []) {
      const def = getEx(e.id);
      (e.sets || []).forEach((x, i) => rows.push([dayKey(w.start), DF_TIME.format(new Date(w.start)), w.name, e.n || def.n, MUSCLES[def.m] || '', i + 1, TYPE_NAMES[x.t || 'n'], x.w != null ? x.w : '', x.r != null ? x.r : '', x.s != null ? x.s : '', x.m != null ? x.m : '', x.d != null ? x.d : '', x.rpe != null ? x.rpe : '', def.t === 'wr' && x.r ? Math.round(e1rm(x.w || 0, x.r) * 10) / 10 : '', i === 0 ? (w.note || '') : '']));
    }
  }
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n');
}
function backupJSON() { const s = S(); return JSON.stringify({ app: 'forja', v: 1, exportedAt: new Date().toISOString(), profile: s.profile, body: s.body, workouts: s.workouts }, null, 1); }
async function offerFile(filename, data) {
  const d = S().caps.downloads;
  if (!d) { openSheet('exportText', { filename, data }); return; }
  try { await d.save({ filename, data }); }
  catch (e) {
    const code = e && e.code;
    if (code === 'declined') return;
    if (code === 'rate_limited') { toast('Esperá unos segundos y probá de nuevo.', 'warn'); return; }
    openSheet('exportText', { filename, data });
  }
}
function importBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { o = null; }
  if (!o || o.app !== 'forja' || !Array.isArray(o.workouts)) { toast('Ese archivo no es un respaldo de Forja.', 'bad'); return; }
  const ws = o.workouts.filter(w => w && w.id && w.start && Array.isArray(w.ex));
  const bodyN = o.body && Array.isArray(o.body.entries) ? o.body.entries.length : 0;
  openSheet('confirm', {
    title: 'Importar respaldo',
    body: `Se suman ${ws.length} entrenamientos y ${bodyN} registros de peso. Tus rutinas y ajustes se reemplazan por los del respaldo.`,
    ok: 'Importar',
    onOk: () => {
      if (o.profile) A.profile(p => { const m = migrate(o.profile); Object.keys(p).forEach(k => delete p[k]); Object.assign(p, m); });
      if (bodyN) A.body(b => { const map = new Map(b.entries.map(e => [e.d, e])); for (const e of o.body.entries) if (e && e.d && e.kg) map.set(e.d, e); b.entries = [...map.values()]; });
      for (const w of ws) A.putWorkout(clone(w));
      toast(`Importados ${ws.length} entrenamientos`);
    },
  });
}

/* ========== coach (Claude) ========== */
function athleteSummary(s) {
  const now = Date.now(), W = s.workouts, st = s.profile.settings, idx = INDEX(W);
  const L = [];
  L.push(`Hoy: ${DF_LONG.format(now)}.`);
  if (W.some(w => w.example)) L.push('Atención: parte del historial son datos de ejemplo cargados en la app.');
  const last28 = W.filter(w => now - w.start < 28 * DAY);
  L.push(`Objetivo: ${st.weeklyGoal} sesiones por semana. Sesiones en los últimos 28 días: ${last28.length}. Racha de semanas cumpliendo el objetivo: ${weekStreak(W, st.weeklyGoal)}.`);
  if (!W.length) { L.push('Todavía no registró entrenamientos.'); }
  const wk0 = startOfWeek(now), vols = [];
  for (let i = 7; i >= 0; i--) { const a = wk0 - i * 7 * DAY, b = a + 7 * DAY; vols.push(Math.round(W.filter(w => w.start >= a && w.start < b).reduce((t, w) => t + (w.vol || workoutStats(w).vol), 0))); }
  L.push(`Volumen semanal (kg·reps) de las últimas 8 semanas, de más vieja a actual: ${vols.join(', ')}.`);
  const ms = muscleSets(W, now - 7 * DAY, now + 1);
  L.push('Series efectivas por músculo en los últimos 7 días (secundarios cuentan 0,5): ' + MAP_MUSCLES.map(m => `${MUSCLES[m]} ${NF1.format(ms[m] || 0)}`).join(', ') + '.');
  const rec = recovery(W, now);
  L.push('Recuperación estimada ahora (%): ' + MAP_MUSCLES.map(m => `${MUSCLES[m]} ${rec[m]}`).join(', ') + '.');
  const top = Object.values(idx.byEx).filter(r => r.last && now - r.last.t < 56 * DAY).sort((a, b) => b.sessions.length - a.sessions.length).slice(0, 12);
  if (top.length) {
    L.push('Ejercicios recientes (última sesión y evolución):');
    for (const r of top) {
      const def = getEx(r.id);
      const ss = r.sessions.filter(z => now - z.t < 56 * DAY);
      const first = ss[0], last = r.last;
      let trend = '';
      if (def.t === 'wr' && first && first !== last && first.e1) trend = ` · 1RM est. ${NF1.format(first.e1)} → ${NF1.format(last.e1)} kg en ${ss.length} sesiones`;
      L.push(`- ${def.n} (${MUSCLES[def.m]}), ${ago(last.t)}: ${last.sets.map(x => setTxt(x, def)).join(' | ')}${trend}`);
    }
  }
  const prs = idx.prs.filter(p => now - p.t < 30 * DAY).slice(-8);
  if (prs.length) L.push('Récords de los últimos 30 días: ' + prs.map(p => `${p.n} ${PR_LABEL[p.k]} ${prVal(p)}`).join('; ') + '.');
  if (s.profile.height) L.push(`Altura: ${f2(s.profile.height / 100)} m.`);
  const be = s.body.entries;
  if (be.length) { const lastB = be[be.length - 1]; const old = be.find(e => keyTime(e.d) >= keyTime(lastB.d) - 30 * DAY); L.push(`Peso corporal: ${f2(lastB.kg)} kg (${lastB.d})${old && old !== lastB ? `, hace 30 días ${f2(old.kg)} kg` : ''}.`); }
  if (s.profile.routines.length) {
    L.push('Rutinas en su rotación:');
    for (const r of s.profile.routines) L.push(`- ${r.name}${r.inRot === false ? ' (fuera de rotación)' : ''}: ` + r.slots.map(sl => `${getEx(sl.ex[sl.idx % sl.ex.length]).n} ${sl.sets}×${sl.rmin}-${sl.rmax}`).join(', '));
  }
  const lastW = W.slice(0, 3);
  if (lastW.length) L.push('Últimas sesiones: ' + lastW.map(w => `${w.name} (${ago(w.start)}, ${fMin(w.dur)}${w.feel ? ', sensación ' + w.feel + '/5' : ''}${w.note ? ', nota: "' + w.note.slice(0, 120) + '"' : ''})`).join('; ') + '.');
  return L.join('\n');
}
function coachPrompt(s, question) {
  return 'Sos un entrenador de fuerza e hipertrofia que trabaja con evidencia (volumen por músculo, sobrecarga progresiva, RIR, recuperación). Hablá en español rioplatense, claro y directo, tuteando con voseo.\n' +
    'Usá solo los datos del atleta que siguen y no inventes números. Si algo no se puede saber con estos datos, decilo en una línea.\n' +
    'Formato: un título corto en negrita y después de 3 a 6 viñetas accionables con números concretos (series, repeticiones, kg, días). Máximo 230 palabras. No des diagnósticos médicos; ante dolor, recomendá consultar a un profesional.\n\n' +
    'DATOS DEL ATLETA (registrados en la app Forja)\n' + athleteSummary(s) + '\n\nPEDIDO\n' + question;
}
function planPrompt(s, f) {
  const eq = new Set(s.profile.settings.equipment);
  const lib = LIB.filter(x => eq.has(x.eq)).map(x => `${x.id} | ${x.n} | ${MUSCLES[x.m]} | ${EQUIP[x.eq]} | ${x.t === 'time' ? 'tiempo en s' : x.t === 'cardio' ? 'cardio' : 'reps'}`).join('\n');
  return 'Diseñá un programa de gimnasio para este atleta.\n' +
    `Parámetros: ${f.days} días de gimnasio por semana; objetivo: ${f.goal}; nivel: ${f.level}; ${f.min} minutos por sesión; duración del plan: ${f.weeks} semanas; días de cardio aparte: ${f.cardio}; énfasis o limitaciones: ${f.focus || 'ninguno'}.\n` +
    (s.profile.injury ? `LESIÓN ACTIVA: ${injuryLabel(s.profile.injury)}${s.profile.injury.side ? ' ' + SIDE_NAMES[s.profile.injury.side] : ''} · ${s.profile.injury.status || ''}. No incluyas ejercicios que carguen esa zona; si hacen falta, usá variantes sentadas, en máquina o unilaterales del lado sano.\n` : '') +
    (s.profile.height ? `Altura ${f2(s.profile.height / 100)} m${s.body.entries.length ? ', peso ' + f2(s.body.entries[s.body.entries.length - 1].kg) + ' kg' : ''}.\n` : '') +
    'Reglas:\n- Cada rutina es un día distinto; la app las alterna en rotación (A, B, C…). Hacé tantas rutinas distintas como tenga sentido para esos días (2 a 6).\n' +
    '- Cada slot es un patrón de movimiento con 1 a 3 variantes intercambiables (ids de la lista). La primera es la principal.\n' +
    '- "rot" es cada cuántas sesiones rota la variante: 0 = fija. Usá 0 o 4 para básicos pesados y 1 o 2 para accesorios.\n' +
    '- Entre 10 y 20 series de trabajo semanales por músculo grande. Entre 4 y 7 slots por rutina según el tiempo.\n' +
    '- "rmin" y "rmax" son repeticiones (o segundos si el ejercicio es de tiempo). "rest" en segundos.\n' +
    '- Si hay días de cardio, sumalos como rutinas aparte con ejercicios de tipo cardio (rmin/rmax en minutos), adecuados a la lesión si la hay.\n' +
    '- Las sesiones deben entrar en los minutos indicados (calculá unos 2 a 3 minutos por serie con descanso).\n' +
    '- Dividí la duración en fases ("phases"), con una semana de descarga cada 4 a 6 semanas, e indicá en cada fase el esfuerzo (RIR) y qué cambia.\n' +
    '- Usá SOLO ids de esta lista (id | nombre | músculo | equipo | tipo):\n' + lib + '\n\n' +
    'Contexto del atleta:\n' + athleteSummary(s).slice(0, 3500) + '\n\n' +
    'Respondé SOLO con JSON con esta forma exacta:\n{"name":"Nombre del programa","notes":"una o dos frases sobre la lógica","phases":[{"weeks":"1-3","title":"Acumulación","notes":"RIR 3-2, subir reps dentro del rango"}],"routines":[{"name":"Torso A","slots":[{"label":"Press horizontal","ex":["press_banca","press_banca_manc"],"sets":4,"rmin":6,"rmax":8,"rest":150,"rot":0}]}]}';
}
function cleanPlan(o) {
  if (!o || !Array.isArray(o.routines)) return null;
  const ids = new Set(LIB.map(x => x.id).concat(Object.keys(CUSTOM_MAP)));
  const rots = ROT_OPTS.map(r => r[0]);
  const routines = o.routines.slice(0, 7).map((r, i) => ({
    name: String(r && r.name || 'Rutina ' + String.fromCharCode(65 + i)).slice(0, 40),
    slots: (r && Array.isArray(r.slots) ? r.slots : []).slice(0, 10).map(sl => {
      const ex = (Array.isArray(sl.ex) ? sl.ex : []).map(String).filter(id => ids.has(id)).slice(0, 3);
      const rmin = clamp(Math.round(num(sl.rmin) || 8), 1, 120), rmax = clamp(Math.round(num(sl.rmax) || rmin), rmin, 180);
      return { label: String(sl.label || (ex[0] ? MUSCLES[getEx(ex[0]).m] : 'Ejercicio')).slice(0, 40), ex, sets: clamp(Math.round(num(sl.sets) || 3), 1, 8), rmin, rmax, rest: clamp(Math.round(num(sl.rest) || 90), 30, 300), rot: rots.includes(num(sl.rot)) ? num(sl.rot) : 1, ss: false };
    }).filter(sl => sl.ex.length),
  })).filter(r => r.slots.length);
  if (!routines.length) return null;
  const phases = (Array.isArray(o.phases) ? o.phases : []).slice(0, 8).map(ph => ({ weeks: String(ph && ph.weeks || '').slice(0, 12), title: String(ph && ph.title || '').slice(0, 40), notes: String(ph && ph.notes || '').slice(0, 200) })).filter(ph => ph.weeks || ph.title);
  return { id: 'ai', name: String(o.name || 'Programa a medida').slice(0, 60), desc: String(o.notes || '').slice(0, 400), phases, routines };
}
function sampleErr(e) {
  const c = e && e.code;
  if (c === 'not_granted') return 'No hay permiso para usar Claude desde esta app. Podés habilitarlo en los permisos del artifact.';
  if (c === 'rate_limited') return 'Llegaste al límite de consultas por ahora. Probá de nuevo en un rato.';
  if (c === 'sampling_disabled' || c === 'capability_disabled' || c === 'capability_removed' || c === 'not_declared') return 'Claude no está disponible en esta vista.';
  if (c === 'session_expired') return (SHELL ? 'Tu sesión expiró. Volvé a entrar.' : 'Tu sesión expiró. Volvé a iniciar sesión en claude.ai.');
  if (c === 'refused') return 'Claude no respondió esta consulta. Reformulala.';
  if (c === 'invalid_json') return 'La respuesta no vino en el formato esperado. Probá de nuevo.';
  if (c === 'prompt_too_large') return 'Hay demasiados datos para una sola consulta.';
  return 'No se pudo completar la consulta. Probá de nuevo.';
}
