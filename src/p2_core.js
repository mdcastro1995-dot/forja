'use strict';
if (!window.htmPreact) {
  var bm = document.getElementById('boot-msg');
  if (bm) bm.textContent = 'No se pudo cargar la app. Revisá tu conexión y volvé a abrirla.';
  throw new Error('htmPreact no disponible');
}
const { html, render, useState, useEffect, useMemo, useRef } = window.htmPreact;
/* no zoom: pinch and double-tap behave like an app, not a web page */
(() => {
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, stop, { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) stop(e); }, { passive: false });
  let last = 0;
  document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - last < 320 && !(e.target.closest && e.target.closest('input,textarea,select'))) stop(e); last = now; }, { passive: false });
})();

/* ========== helpers ========== */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const DEVICE = uid();
const clone = (o) => { if (o == null) return o; try { return structuredClone(o); } catch (e) { return JSON.parse(JSON.stringify(o)); } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const num = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; const n = parseFloat(String(v).replace(',', '.').trim()); return isFinite(n) ? n : null; };
const NF = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 });
const NF1 = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 });
const NF0 = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 });
const f2 = (v) => v == null || isNaN(v) ? '–' : NF.format(v);
const fKg = (v) => v == null || isNaN(v) ? '–' : NF.format(Math.round(v * 100) / 100) + ' kg';
const fVol = (kg) => !kg ? '0 kg' : kg >= 10000 ? NF1.format(kg / 1000) + ' t' : NF0.format(kg) + ' kg';
const toStr = (v) => v == null || v === '' ? '' : String(v).replace('.', ',');
const pad2 = (n) => String(n).padStart(2, '0');
const fDur = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`; };
const fMin = (sec) => { const m = Math.round((sec || 0) / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${pad2(m % 60)} min` : `${m} min`; };
const DF_LONG = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
const DF_SHORT = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' });
const DF_DAYS = new Intl.DateTimeFormat('es-UY', { weekday: 'short', day: 'numeric', month: 'short' });
const DF_MONTH = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' });
const DF_WD = new Intl.DateTimeFormat('es-UY', { weekday: 'short' });
const DF_TIME = new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit' });
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const DAY = 864e5;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfWeek = (t) => { const d = new Date(startOfDay(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const prevWeek = (wk) => startOfWeek(wk - 3 * DAY);
const nextWeek = (wk) => startOfWeek(wk + 9 * DAY);
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const keyTime = (k) => new Date(k + 'T12:00:00').getTime();
const ago = (t) => { const d = Math.round((startOfDay(Date.now()) - startOfDay(t)) / DAY); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 7 ? `hace ${d} días` : d < 14 ? 'hace 1 semana' : d < 60 ? `hace ${Math.floor(d / 7)} semanas` : `hace ${Math.floor(d / 30)} meses`; };
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const e1rm = (w, r) => (w > 0 && r > 0) ? (r === 1 ? w : w * (1 + Math.min(r, 15) / 30)) : 0;
const plural = (n, a, b) => n === 1 ? a : b;
const SHELL = !!window.forjaShell;
const AI_HINT = SHELL ? 'Para usar Claude, cargá tu clave de Anthropic en Más → Cuenta y conexiones.' : 'Para usar Claude, abrí la app desde claude.ai con tu sesión iniciada.';

/* ========== exercise library ========== */
const MUSCLES = { pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', antebrazos: 'Antebrazos', trapecio: 'Trapecio', core: 'Core', lumbar: 'Lumbares', gluteos: 'Glúteos', cuadriceps: 'Cuádriceps', isquios: 'Isquios', gemelos: 'Gemelos', cardio: 'Cardio' };
const MUSCLE_ORDER = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'antebrazos', 'trapecio', 'core', 'lumbar', 'gluteos', 'cuadriceps', 'isquios', 'gemelos', 'cardio'];
const MAP_MUSCLES = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'trapecio', 'core', 'lumbar', 'gluteos', 'cuadriceps', 'isquios', 'gemelos'];
const BIG = new Set(['pecho', 'espalda', 'cuadriceps', 'isquios', 'gluteos', 'lumbar']);
const UPPER = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'trapecio'];
const LOWER = ['cuadriceps', 'isquios', 'gluteos', 'gemelos', 'lumbar'];
const EQUIP = { barra: 'Barra', mancuernas: 'Mancuernas', maquina: 'Máquina', polea: 'Polea', corporal: 'Peso corporal', kettlebell: 'Kettlebell', smith: 'Smith', ez: 'Barra Z', otro: 'Otro' };
const TYPE_NAMES = { n: 'Normal', w: 'Calentamiento', d: 'Drop set', f: 'Al fallo' };
const TYPE_KEYS = { n: '', w: 'C', d: 'D', f: 'F' };
const FIELDS = { wr: ['w', 'r'], bw: ['w', 'r'], time: ['s'], cardio: ['m', 'd'] };
const KIND_NAMES = { wr: 'Peso y repeticiones', bw: 'Peso corporal (+ lastre)', time: 'Tiempo', cardio: 'Cardio (min y km)' };

// id|nombre|músculo principal|secundarios|equipo|tipo|c(ompuesto)/i(solado)|grupo de movimiento
const LIB = `
press_banca|Press de banca con barra|pecho|triceps,hombros|barra|wr|c|ph
press_banca_manc|Press de banca con mancuernas|pecho|triceps,hombros|mancuernas|wr|c|ph
press_pecho_maq|Press de pecho en máquina|pecho|triceps,hombros|maquina|wr|c|ph
press_declinado|Press declinado con barra|pecho|triceps|barra|wr|c|ph
flexiones|Flexiones de brazos|pecho|triceps,hombros,core|corporal|bw|c|ph
press_incl_barra|Press inclinado con barra|pecho|hombros,triceps|barra|wr|c|pi
press_incl_manc|Press inclinado con mancuernas|pecho|hombros,triceps|mancuernas|wr|c|pi
press_incl_smith|Press inclinado en Smith|pecho|hombros,triceps|smith|wr|c|pi
press_incl_maq|Press inclinado en máquina|pecho|hombros,triceps|maquina|wr|c|pi
aperturas_manc|Aperturas con mancuernas|pecho|hombros|mancuernas|wr|i|ap
cruce_poleas|Cruce de poleas|pecho|hombros|polea|wr|i|ap
pec_deck|Pec deck (contractora)|pecho||maquina|wr|i|ap
fondos|Fondos en paralelas|pecho|triceps,hombros|corporal|bw|c|fd
dominadas|Dominadas|espalda|biceps,antebrazos|corporal|bw|c|jv
dominadas_supinas|Dominadas supinas|espalda|biceps|corporal|bw|c|jv
dominadas_asistidas|Dominadas asistidas en máquina|espalda|biceps|maquina|wr|c|jv
jalon_pecho|Jalón al pecho|espalda|biceps|polea|wr|c|jv
jalon_neutro|Jalón con agarre neutro|espalda|biceps|polea|wr|c|jv
jalon_unilateral|Jalón unilateral en polea|espalda|biceps|polea|wr|c|jv
remo_barra|Remo con barra|espalda|biceps,lumbar,trapecio|barra|wr|c|rm
remo_t|Remo en T|espalda|biceps,trapecio|barra|wr|c|rm
remo_manc|Remo con mancuerna a una mano|espalda|biceps|mancuernas|wr|c|rm
remo_polea|Remo sentado en polea|espalda|biceps,trapecio|polea|wr|c|rm
remo_maq|Remo con pecho apoyado en máquina|espalda|biceps,trapecio|maquina|wr|c|rm
remo_invertido|Remo invertido|espalda|biceps,core|corporal|bw|c|rm
pullover_polea|Pullover en polea alta|espalda||polea|wr|i|pl
peso_muerto|Peso muerto|lumbar|gluteos,isquios,espalda,trapecio,antebrazos|barra|wr|c|hg
hiperextensiones|Hiperextensiones|lumbar|gluteos,isquios|corporal|bw|i|hx
press_militar|Press militar con barra|hombros|triceps,core|barra|wr|c|pv
press_hombro_manc|Press de hombros con mancuernas|hombros|triceps|mancuernas|wr|c|pv
press_hombro_maq|Press de hombros en máquina|hombros|triceps|maquina|wr|c|pv
press_arnold|Press Arnold|hombros|triceps|mancuernas|wr|c|pv
elev_laterales|Elevaciones laterales con mancuernas|hombros|trapecio|mancuernas|wr|i|le
elev_laterales_polea|Elevaciones laterales en polea|hombros||polea|wr|i|le
elev_laterales_maq|Elevaciones laterales en máquina|hombros||maquina|wr|i|le
elev_frontales|Elevaciones frontales|hombros||mancuernas|wr|i|fr
face_pull|Face pull|hombros|trapecio,espalda|polea|wr|i|po
pajaros|Pájaros con mancuernas|hombros|espalda,trapecio|mancuernas|wr|i|po
contractora_inversa|Contractora inversa|hombros|espalda|maquina|wr|i|po
encogimientos_manc|Encogimientos con mancuernas|trapecio|antebrazos|mancuernas|wr|i|tr
encogimientos_barra|Encogimientos con barra|trapecio|antebrazos|barra|wr|i|tr
curl_barra|Curl con barra|biceps|antebrazos|barra|wr|i|cb
curl_ez|Curl con barra Z|biceps|antebrazos|ez|wr|i|cb
curl_manc|Curl con mancuernas|biceps|antebrazos|mancuernas|wr|i|cb
curl_inclinado|Curl inclinado con mancuernas|biceps||mancuernas|wr|i|cb
curl_predicador|Curl predicador|biceps||ez|wr|i|cb
curl_polea|Curl en polea|biceps|antebrazos|polea|wr|i|cb
curl_concentrado|Curl concentrado|biceps||mancuernas|wr|i|cb
curl_martillo|Curl martillo|biceps|antebrazos|mancuernas|wr|i|cm
curl_martillo_cuerda|Curl martillo en polea con cuerda|biceps|antebrazos|polea|wr|i|cm
ext_polea_cuerda|Extensión de tríceps en polea con cuerda|triceps||polea|wr|i|tx
ext_polea_barra|Extensión de tríceps en polea con barra|triceps||polea|wr|i|tx
patada_triceps|Patada de tríceps|triceps||mancuernas|wr|i|tx
press_frances|Press francés con barra Z|triceps||ez|wr|i|to
ext_sobre_cabeza|Extensión sobre la cabeza en polea|triceps||polea|wr|i|to
ext_manc_cabeza|Extensión con mancuerna sobre la cabeza|triceps||mancuernas|wr|i|to
press_cerrado|Press de banca con agarre cerrado|triceps|pecho,hombros|barra|wr|c|tc
fondos_banco|Fondos en banco|triceps|pecho,hombros|corporal|bw|c|tc
curl_muneca|Curl de muñeca|antebrazos||mancuernas|wr|i|fa
sentadilla|Sentadilla con barra|cuadriceps|gluteos,lumbar,core|barra|wr|c|sq
sentadilla_frontal|Sentadilla frontal|cuadriceps|gluteos,core|barra|wr|c|sq
sentadilla_hack|Sentadilla hack|cuadriceps|gluteos|maquina|wr|c|sq
sentadilla_smith|Sentadilla en Smith|cuadriceps|gluteos|smith|wr|c|sq
sentadilla_goblet|Sentadilla goblet|cuadriceps|gluteos,core|mancuernas|wr|c|sq
prensa|Prensa de piernas|cuadriceps|gluteos|maquina|wr|c|sq
bulgaras|Sentadilla búlgara|cuadriceps|gluteos|mancuernas|wr|c|ul
zancadas|Zancadas con mancuernas|cuadriceps|gluteos,isquios|mancuernas|wr|c|ul
step_up|Subidas al cajón|cuadriceps|gluteos|mancuernas|wr|c|ul
ext_cuadriceps|Extensión de cuádriceps|cuadriceps||maquina|wr|i|eq
peso_muerto_rumano|Peso muerto rumano|isquios|gluteos,lumbar|barra|wr|c|hg
peso_muerto_rumano_manc|Peso muerto rumano con mancuernas|isquios|gluteos,lumbar|mancuernas|wr|c|hg
buenos_dias|Buenos días|isquios|lumbar,gluteos|barra|wr|c|hg
curl_femoral_tumbado|Curl femoral tumbado|isquios|gemelos|maquina|wr|i|cf
curl_femoral_sentado|Curl femoral sentado|isquios||maquina|wr|i|cf
curl_nordico|Curl nórdico|isquios||corporal|bw|i|cf
hip_thrust|Hip thrust con barra|gluteos|isquios|barra|wr|c|ht
hip_thrust_maq|Hip thrust en máquina|gluteos|isquios|maquina|wr|c|ht
puente_gluteo|Puente de glúteos|gluteos|isquios|corporal|bw|i|ht
peso_muerto_sumo|Peso muerto sumo|gluteos|cuadriceps,isquios,lumbar,espalda|barra|wr|c|hg
kb_swing|Swing con kettlebell|gluteos|isquios,core,hombros|kettlebell|wr|c|hg
patada_gluteo|Patada de glúteo en polea|gluteos|isquios|polea|wr|i|pg
abduccion_maq|Abducción de cadera en máquina|gluteos||maquina|wr|i|ab
gemelos_pie|Elevación de talones de pie|gemelos||maquina|wr|i|gm
gemelos_sentado|Elevación de talones sentado|gemelos||maquina|wr|i|gm
gemelos_prensa|Gemelos en prensa|gemelos||maquina|wr|i|gm
plancha|Plancha|core|hombros|corporal|time|i|cr
plancha_lateral|Plancha lateral|core||corporal|time|i|cr
crunch|Crunch abdominal|core||corporal|bw|i|co
crunch_polea|Crunch en polea|core||polea|wr|i|co
elev_piernas|Elevación de piernas colgado|core|antebrazos|corporal|bw|i|co
rueda_abdominal|Rueda abdominal|core|hombros,espalda|otro|bw|i|cs
pallof|Press Pallof|core||polea|wr|i|cs
dead_bug|Dead bug|core||corporal|bw|i|cs
cinta|Cinta (caminadora)|cardio||maquina|cardio|i|ca
bici|Bicicleta fija|cardio||maquina|cardio|i|ca
eliptico|Elíptico|cardio||maquina|cardio|i|ca
remo_ergo|Remo ergómetro|cardio||maquina|cardio|i|ca
escaladora|Escaladora|cardio||maquina|cardio|i|ca
soga|Saltar la soga|cardio||otro|cardio|i|ca
`.trim().split('\n').map(l => { const [id, n, m, s, eq, t, k, g] = l.split('|'); return { id, n, m, s: s ? s.split(',') : [], eq, t, k, g }; });
const LIB_MAP = Object.fromEntries(LIB.map(x => [x.id, x]));
let CUSTOM_MAP = {};
function getEx(id) { return LIB_MAP[id] || CUSTOM_MAP[id] || { id, n: 'Ejercicio eliminado', m: 'core', s: [], eq: 'otro', t: 'wr', k: 'i', g: 'zz', missing: true }; }
function allExercises() { return LIB.concat(Object.values(CUSTOM_MAP)); }
function defRange(def) { return def.t === 'time' ? { rmin: 30, rmax: 60 } : def.t === 'cardio' ? { rmin: 10, rmax: 30 } : def.t === 'bw' ? { rmin: 6, rmax: 12 } : def.k === 'c' ? { rmin: 6, rmax: 10 } : { rmin: 10, rmax: 15 }; }
function restFor(def, st) { return def.k === 'c' ? Math.max(90, st.rest) : Math.min(st.rest, 90); }
function incFor(def, st) { if (def.eq === 'mancuernas' || def.eq === 'kettlebell') return st.incDb; if ((def.eq === 'barra' || def.eq === 'smith' || def.eq === 'maquina') && LOWER.includes(def.m)) return st.incLower; return st.incUpper; }
function rangeTxt(r, def) { if (def.t === 'time') return `${r.rmin}–${r.rmax} s`; if (def.t === 'cardio') return `${r.rmin}–${r.rmax} min`; return r.rmin === r.rmax ? `${r.rmin}` : `${r.rmin}–${r.rmax}`; }

/* ========== programs ========== */
const P = (label, ex, sets, rmin, rmax, rest, rot = 1, ss = false) => ({ label, ex, sets, rmin, rmax, rest, rot, ss });
const PROGRAMS = [
  { id: 'fb', name: 'Full Body A/B', freq: '3 días por semana', level: 'Principiante', desc: 'Dos sesiones de cuerpo completo que se alternan: A, B, A… Cada músculo trabaja cada 2 o 3 días con los ejercicios básicos.', routines: [
    { name: 'Full Body A', slots: [
      P('Sentadilla', ['sentadilla', 'sentadilla_goblet', 'prensa'], 3, 6, 10, 150, 0),
      P('Press horizontal', ['press_banca', 'press_banca_manc'], 3, 6, 10, 150, 0),
      P('Remo', ['remo_polea', 'remo_manc', 'remo_maq'], 3, 8, 12, 120, 1),
      P('Hombro lateral', ['elev_laterales', 'elev_laterales_polea'], 3, 12, 15, 60, 1),
      P('Bíceps', ['curl_manc', 'curl_ez', 'curl_martillo'], 2, 10, 12, 60, 1),
      P('Core', ['plancha', 'plancha_lateral'], 2, 30, 60, 60, 1)] },
    { name: 'Full Body B', slots: [
      P('Bisagra de cadera', ['peso_muerto_rumano', 'peso_muerto_rumano_manc'], 3, 8, 10, 150, 0),
      P('Press inclinado', ['press_incl_manc', 'press_incl_maq'], 3, 8, 12, 120, 0),
      P('Tracción vertical', ['jalon_pecho', 'jalon_neutro', 'dominadas_asistidas'], 3, 8, 12, 120, 1),
      P('Pierna unilateral', ['bulgaras', 'zancadas', 'step_up'], 2, 8, 12, 90, 1),
      P('Tríceps', ['ext_polea_cuerda', 'press_frances', 'ext_sobre_cabeza'], 2, 10, 12, 60, 1),
      P('Gemelos', ['gemelos_pie', 'gemelos_sentado'], 3, 10, 15, 60, 1)] }] },
  { id: 'f5', name: 'Fuerza 5×5', freq: '3 días por semana', level: 'Principiante', desc: 'Básicos con barra en 5 series de 5. Si completás todas las repeticiones, la próxima sesión te propone más peso.', routines: [
    { name: 'Fuerza A', slots: [
      P('Sentadilla', ['sentadilla'], 5, 5, 5, 180, 0),
      P('Press de banca', ['press_banca'], 5, 5, 5, 180, 0),
      P('Remo con barra', ['remo_barra'], 5, 5, 5, 150, 0)] },
    { name: 'Fuerza B', slots: [
      P('Sentadilla', ['sentadilla'], 5, 5, 5, 180, 0),
      P('Press militar', ['press_militar'], 5, 5, 5, 180, 0),
      P('Peso muerto', ['peso_muerto'], 1, 5, 5, 180, 0)] }] },
  { id: 'tp', name: 'Torso / Pierna', freq: '4 días por semana', level: 'Intermedio', desc: 'Torso A, Pierna A, Torso B, Pierna B. Cada músculo dos veces por semana, con básicos fijos y accesorios que rotan.', routines: [
    { name: 'Torso A', slots: [
      P('Press horizontal', ['press_banca', 'press_banca_manc'], 4, 6, 8, 150, 0),
      P('Remo', ['remo_barra', 'remo_t', 'remo_maq'], 4, 6, 10, 150, 4),
      P('Press vertical', ['press_hombro_manc', 'press_militar'], 3, 8, 10, 120, 4),
      P('Tracción vertical', ['jalon_pecho', 'jalon_neutro'], 3, 8, 12, 120, 1),
      P('Bíceps', ['curl_ez', 'curl_manc'], 3, 10, 12, 60, 1, true),
      P('Tríceps', ['ext_polea_cuerda', 'ext_polea_barra'], 3, 10, 12, 60, 1)] },
    { name: 'Pierna A', slots: [
      P('Sentadilla', ['sentadilla', 'sentadilla_hack'], 4, 6, 8, 180, 0),
      P('Bisagra de cadera', ['peso_muerto_rumano'], 3, 8, 10, 150, 0),
      P('Prensa', ['prensa'], 3, 10, 12, 120, 0),
      P('Femoral', ['curl_femoral_tumbado', 'curl_femoral_sentado'], 3, 10, 15, 90, 1),
      P('Gemelos', ['gemelos_pie', 'gemelos_prensa'], 4, 10, 15, 60, 1),
      P('Core', ['rueda_abdominal', 'elev_piernas'], 3, 8, 15, 60, 1)] },
    { name: 'Torso B', slots: [
      P('Press inclinado', ['press_incl_manc', 'press_incl_barra', 'press_incl_smith'], 4, 8, 10, 120, 4),
      P('Tracción vertical', ['dominadas', 'dominadas_asistidas'], 4, 6, 10, 150, 0),
      P('Remo', ['remo_polea', 'remo_manc'], 3, 10, 12, 90, 1),
      P('Hombro lateral', ['elev_laterales', 'elev_laterales_polea', 'elev_laterales_maq'], 4, 12, 15, 60, 1),
      P('Deltoide posterior', ['face_pull', 'pajaros', 'contractora_inversa'], 3, 12, 15, 60, 1, true),
      P('Bíceps', ['curl_martillo', 'curl_inclinado'], 3, 10, 12, 60, 1)] },
    { name: 'Pierna B', slots: [
      P('Hip thrust', ['hip_thrust', 'hip_thrust_maq'], 4, 8, 10, 150, 0),
      P('Pierna unilateral', ['bulgaras', 'zancadas'], 3, 8, 12, 90, 1),
      P('Cuádriceps', ['ext_cuadriceps'], 3, 12, 15, 60, 0),
      P('Femoral', ['curl_femoral_sentado', 'curl_femoral_tumbado', 'curl_nordico'], 3, 8, 12, 90, 1),
      P('Gemelos', ['gemelos_sentado', 'gemelos_pie'], 4, 12, 15, 60, 1),
      P('Abducción', ['abduccion_maq', 'patada_gluteo'], 2, 12, 20, 60, 1)] }] },
  { id: 'ppl', name: 'Empuje / Tirón / Pierna', freq: '3 o 6 días por semana', level: 'Intermedio', desc: 'La división clásica por patrón de movimiento. Hacela una vez por semana (3 días) o dos veces (6 días).', routines: [
    { name: 'Empuje', slots: [
      P('Press horizontal', ['press_banca', 'press_banca_manc', 'press_pecho_maq'], 4, 6, 8, 150, 4),
      P('Press inclinado', ['press_incl_manc', 'press_incl_smith', 'press_incl_maq'], 3, 8, 12, 120, 1),
      P('Press vertical', ['press_hombro_manc', 'press_militar', 'press_hombro_maq'], 3, 8, 10, 120, 4),
      P('Hombro lateral', ['elev_laterales', 'elev_laterales_polea', 'elev_laterales_maq'], 4, 12, 15, 60, 1),
      P('Tríceps', ['ext_polea_cuerda', 'ext_polea_barra'], 3, 10, 12, 60, 1),
      P('Tríceps sobre cabeza', ['ext_sobre_cabeza', 'press_frances', 'ext_manc_cabeza'], 3, 10, 12, 60, 1)] },
    { name: 'Tirón', slots: [
      P('Tracción vertical', ['dominadas', 'jalon_pecho', 'jalon_neutro'], 4, 6, 10, 150, 4),
      P('Remo pesado', ['remo_barra', 'remo_t', 'remo_maq'], 3, 6, 10, 150, 4),
      P('Remo', ['remo_polea', 'remo_manc'], 3, 10, 12, 90, 1),
      P('Deltoide posterior', ['face_pull', 'pajaros', 'contractora_inversa'], 3, 12, 15, 60, 1),
      P('Bíceps', ['curl_ez', 'curl_inclinado', 'curl_polea'], 3, 8, 12, 60, 1),
      P('Bíceps martillo', ['curl_martillo', 'curl_martillo_cuerda'], 2, 10, 12, 60, 1)] },
    { name: 'Pierna', slots: [
      P('Sentadilla', ['sentadilla', 'sentadilla_hack', 'prensa'], 4, 6, 8, 180, 4),
      P('Bisagra de cadera', ['peso_muerto_rumano', 'hip_thrust'], 3, 8, 10, 150, 1),
      P('Pierna unilateral', ['bulgaras', 'zancadas'], 3, 8, 12, 90, 1),
      P('Femoral', ['curl_femoral_tumbado', 'curl_femoral_sentado'], 3, 10, 15, 90, 1),
      P('Cuádriceps', ['ext_cuadriceps'], 3, 12, 15, 60, 0),
      P('Gemelos', ['gemelos_pie', 'gemelos_sentado'], 4, 10, 15, 60, 1)] }] },
];
const ROT_OPTS = [[0, 'Fija'], [1, 'Cada sesión'], [2, 'Cada 2 sesiones'], [3, 'Cada 3 sesiones'], [4, 'Cada 4 sesiones'], [6, 'Cada 6 sesiones']];
const REST_OPTS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

/* ========== profile defaults ========== */
const DEFAULT_SETTINGS = { bar: 20, rest: 120, autoRest: true, weeklyGoal: 4, incUpper: 2.5, incLower: 5, incDb: 2, plates: [25, 20, 15, 10, 5, 2.5, 1.25], sound: true, vibrate: true, keepAwake: true, showRpe: false, guide: false, equipment: Object.keys(EQUIP) };
const defaultProfile = () => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, routines: [], custom: [], exNotes: {}, program: null });
function migrate(p0) {
  const p = p0 ? clone(p0) : defaultProfile();
  p.settings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
  p.routines = Array.isArray(p.routines) ? p.routines : [];
  p.custom = Array.isArray(p.custom) ? p.custom : [];
  p.exNotes = p.exNotes && typeof p.exNotes === 'object' ? p.exNotes : {};
  for (const r of p.routines) {
    if (!r.id) r.id = uid();
    if (r.inRot === undefined) r.inRot = true;
    r.slots = (r.slots || []).map(s => ({ id: uid(), label: '', idx: 0, cnt: 0, rot: 1, sets: 3, rmin: 8, rmax: 12, rest: p.settings.rest, ss: false, ...s, ex: (s.ex || []).filter(Boolean) })).filter(s => s.ex.length);
    for (const s of r.slots) s.idx = clamp(s.idx || 0, 0, s.ex.length - 1);
  }
  return p;
}
const normBody = (b) => ({ ...(b || {}), entries: Array.isArray(b && b.entries) ? b.entries.slice().sort((x, y) => x.d < y.d ? -1 : 1) : [] });

/* ========== local storage (per-device convenience) ========== */
const LS = {
  ok: (() => { try { const k = '__forja_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })(),
  get(k, d) { if (!this.ok) return d; try { const v = localStorage.getItem('forja.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (!this.ok) return; try { if (v == null) localStorage.removeItem('forja.' + k); else localStorage.setItem('forja.' + k, JSON.stringify(v)); } catch (e) { /* lleno o bloqueado */ } },
};

/* ========== store ========== */
let STATE = {
  ready: false, mode: 'loading', sync: 'idle', slow: false,
  profile: defaultProfile(), workouts: [], body: { entries: [] }, days: [], active: null, activeOpen: true,
  tab: LS.get('tab', 'hoy'), sheets: [], toasts: [], caps: { sample: null, downloads: null },
};
const SUBS = new Set();
const S = () => STATE;
function set(patch) {
  const p = typeof patch === 'function' ? patch(STATE) : patch;
  if (!p) return;
  STATE = Object.assign({}, STATE, p);
  if (p.profile) CUSTOM_MAP = Object.fromEntries((p.profile.custom || []).map(x => [x.id, x]));
  SUBS.forEach(f => f());
}
function useStore() {
  const [, force] = useState(0);
  const seen = useRef(STATE);
  seen.current = STATE;
  useEffect(() => {
    const f = () => force(n => n + 1);
    SUBS.add(f);
    if (seen.current !== STATE) f(); // state changed between render and subscription
    return () => SUBS.delete(f);
  }, []);
  return STATE;
}
function openSheet(type, props) { set(s => ({ sheets: s.sheets.concat([{ id: uid(), type, props: props || {} }]) })); }
function closeSheet(id) { set(s => ({ sheets: id ? s.sheets.filter(x => x.id !== id) : s.sheets.slice(0, -1) })); }
function closeAllSheets() { set({ sheets: [] }); }
function toast(msg, kind, ms) {
  const id = uid();
  set(s => ({ toasts: s.toasts.concat([{ id, msg, kind: kind || 'info' }]).slice(-3) }));
  setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), ms || 3400);
}
function goTab(tab) { set({ tab }); LS.set('tab', tab); try { window.scrollTo(0, 0); } catch (e) {} }

/* ========== cloud sync (artifact db, private per person) ========== */
const Sync = {
  on: false, db: null, uid: null, base: '',
  pending: LS.get('pending', {}) || {},
  rev: {}, busy: {}, timers: {}, inflight: 0, waiting: [], lastErr: null,
  path(key) {
    if (key === 'profile') return this.base + '/profile';
    if (key === 'body') return this.base + '/body';
    if (key === 'active') return this.base + '/active';
    if (key.startsWith('d/')) return this.base + '/profile/days/' + key.slice(2);
    return this.base + '/profile/workouts/' + key.slice(2);
  },
  save() { LS.set('pending', this.pending); },
  write(key, data) {
    clearTimeout(this.timers[key]);
    this.pending[key] = { d: data };
    this.save();
    this.rev[key] = (this.rev[key] || 0) + 1;
    this.pump(key);
  },
  writeSoon(key, data, ms) {
    this.pending[key] = { d: data };
    this.save();
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(() => { const it = this.pending[key]; if (it) this.write(key, it.d); }, ms);
    syncStatus();
  },
  async pump(key) {
    if (!this.on || this.busy[key] || !this.pending[key]) return;
    if (this.inflight >= 4) { if (!this.waiting.includes(key)) this.waiting.push(key); return; }
    const rev = this.rev[key] || 0;
    const item = this.pending[key];
    this.busy[key] = true; this.inflight++; syncStatus();
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const ref = this.db.doc(this.path(key));
        if (item.d === null) await ref.delete(); else await ref.set(item.d);
        ok = true;
      } catch (e) {
        const code = (e && e.code) || 'unavailable';
        if (code === 'unavailable' && attempt === 0) { await sleep(600 + Math.random() * 1400); continue; }
        this.lastErr = code;
        if (code === 'quota_exceeded') toast('Tu base de datos está llena y no se pudo guardar. Exportá un respaldo y borrá entrenamientos viejos.', 'bad', 6000);
        break;
      }
    }
    this.busy[key] = false; this.inflight--;
    if (ok) {
      if ((this.rev[key] || 0) === rev) { delete this.pending[key]; this.save(); }
      if (!Object.keys(this.pending).some(k => !this.busy[k])) this.lastErr = null;
    }
    if (ok && this.pending[key] && (this.rev[key] || 0) !== rev) this.pump(key);
    const next = this.waiting.shift();
    if (next) this.pump(next);
    syncStatus();
  },
  flush() { for (const k of Object.keys(this.pending)) this.pump(k); },
};
function syncStatus() {
  const s = S();
  let v;
  if (s.mode === 'cloud') v = Sync.inflight > 0 ? 'saving' : Sync.lastErr && Object.keys(Sync.pending).length ? 'error' : Object.keys(Sync.pending).length ? 'saving' : 'ok';
  else v = s.mode;
  if (v !== s.sync) set({ sync: v });
}
let cacheTimer = null;
function persistCache() {
  if (!LS.ok) return;
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    const s = S();
    LS.set('cache', { uid: Sync.uid, profile: s.profile, body: s.body, days: s.days.slice(0, 120), workouts: s.mode === 'cloud' ? s.workouts.slice(0, 250) : s.workouts });
  }, 350);
}

/* ========== actions ========== */
const A = {
  profile(mut) {
    const p = clone(S().profile);
    mut(p);
    p.updatedAt = Date.now(); p.device = DEVICE;
    set({ profile: p }); persistCache();
    if (Sync.on) Sync.writeSoon('profile', p, 500);
  },
  putWorkout(w) {
    w.updatedAt = Date.now(); w.device = DEVICE;
    const list = S().workouts.filter(x => x.id !== w.id);
    list.push(w); list.sort((a, b) => b.start - a.start);
    set({ workouts: list }); persistCache();
    if (Sync.on) Sync.write('w/' + w.id, w);
  },
  delWorkout(id) {
    set({ workouts: S().workouts.filter(x => x.id !== id) }); persistCache();
    if (Sync.on) Sync.write('w/' + id, null);
  },
  body(mut) {
    const b = normBody(clone(S().body));
    mut(b);
    b.entries.sort((x, y) => x.d < y.d ? -1 : 1);
    b.updatedAt = Date.now(); b.device = DEVICE;
    set({ body: b }); persistCache();
    if (Sync.on) Sync.writeSoon('body', b, 400);
  },
  putDay(day) {
    day = Object.assign({}, day, { updatedAt: Date.now(), device: DEVICE });
    const list = S().days.filter(x => x.d !== day.d); list.push(day); list.sort((a, b) => a.d < b.d ? 1 : -1);
    set({ days: list }); persistCache();
    if (Sync.on) Sync.write('d/' + day.d, day);
  },
  active(a) {
    if (a) { a.updatedAt = Date.now(); a.device = DEVICE; }
    set({ active: a });
    LS.set('active', a);
    if (Sync.on) { if (a) Sync.writeSoon('active', a, 2500); else Sync.write('active', null); }
  },
};
function updActive(fn) { const a = clone(S().active); if (!a) return; fn(a); A.active(a); }

/* ========== boot ========== */
function mergePending(list, pre, keyOf, sort) {
  pre = pre || 'w/'; keyOf = keyOf || (w => w.id);
  const map = new Map(list.map(w => [keyOf(w), w]));
  for (const [k, it] of Object.entries(Sync.pending)) {
    if (!k.startsWith(pre)) continue;
    const id = k.slice(2);
    if (it.d === null) map.delete(id); else map.set(id, it.d);
  }
  return [...map.values()].sort(sort || ((a, b) => b.start - a.start));
}
async function boot() {
  const cache = LS.get('cache', null);
  const draft = LS.get('active', null);
  if (cache && cache.profile) set({ profile: migrate(cache.profile), body: normBody(cache.body), days: Array.isArray(cache.days) ? cache.days : [], workouts: (cache.workouts || []).slice().sort((a, b) => b.start - a.start), ready: true });
  if (draft && Array.isArray(draft.ex)) set({ active: draft, activeOpen: false });
  const C = window.claude;
  const use = (n) => (C && typeof C.use === 'function') ? Promise.resolve(C.use(n)).catch(() => null) : Promise.resolve(null);
  use('sample').then(fn => set(s => ({ caps: { ...s.caps, sample: fn || null } })));
  use('downloads').then(d => set(s => ({ caps: { ...s.caps, downloads: d || null } })));
  const [db, user] = await Promise.all([use('db'), use('user')]);
  let id = null;
  if (user) { try { id = await user.id(); } catch (e) { id = null; } }
  if (!db || !id) { set({ mode: LS.ok ? 'local' : 'memory', ready: true }); syncStatus(); return; }

  const localOnly = !!(cache && !cache.uid && cache.profile);
  if (cache && cache.uid && cache.uid !== id) set({ profile: defaultProfile(), body: { entries: [] }, days: [], workouts: [] });
  Sync.on = true; Sync.db = db; Sync.uid = id; Sync.base = 'data/users/' + id;
  set({ mode: 'cloud' }); syncStatus();
  const base = Sync.base;
  const got = new Set(); const empty = {};
  const loadTimer = setTimeout(() => { if (got.size < 3) set({ slow: true, ready: true }); }, 10000);
  const firstSync = () => {
    clearTimeout(loadTimer);
    set({ slow: false, ready: true });
    if (localOnly) {
      if (empty.profile) Sync.write('profile', S().profile);
      if (empty.body && S().body.entries.length) Sync.write('body', S().body);
      const have = new Set(S().workouts.map(w => w.id));
      for (const w of (cache.workouts || [])) if (!have.has(w.id)) A.putWorkout(w);
    }
    Sync.flush();
  };
  const mark = (k) => { if (got.has(k)) return; got.add(k); if (got.size === 3) firstSync(); };
  const onErr = (k) => (e) => { mark(k); if (e && e.code !== 'revoked') Sync.lastErr = e.code; syncStatus(); };
  db.doc(base + '/profile').onSnapshot(snap => {
    if (snap.metadata.hasPendingWrites) return;
    const d = snap.exists ? snap.data() : null;
    if (!snap.metadata.fromCache && !d) empty.profile = true;
    if (d && d.device !== DEVICE && !Sync.pending.profile) { set({ profile: migrate(d) }); persistCache(); }
    if (!snap.metadata.fromCache) mark('profile');
  }, onErr('profile'));
  db.doc(base + '/body').onSnapshot(snap => {
    if (snap.metadata.hasPendingWrites) return;
    const d = snap.exists ? snap.data() : null;
    if (!snap.metadata.fromCache && !d) empty.body = true;
    if (d && d.device !== DEVICE && !Sync.pending.body) { set({ body: normBody(clone(d)) }); persistCache(); }
    if (!snap.metadata.fromCache) mark('body');
  }, onErr('body'));
  db.doc(base + '/profile').collection('workouts').orderBy('start', 'desc').limit(1000).onSnapshot(snap => {
    const list = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
    if (!snap.metadata.fromCache || list.length) { set({ workouts: mergePending(list) }); persistCache(); }
    if (!snap.metadata.fromCache) mark('workouts');
  }, onErr('workouts'));
  db.doc(base + '/profile').collection('days').orderBy('d', 'desc').limit(180).onSnapshot(snap => {
    const list = snap.docs.map(d => Object.assign({}, d.data(), { d: d.id }));
    if (!snap.metadata.fromCache || list.length) { set({ days: mergePending(list, 'd/', x => x.d, (a, b) => a.d < b.d ? 1 : -1) }); persistCache(); }
  }, () => {});
  db.doc(base + '/active').get().then(snap => {
    const d = snap.exists ? snap.data() : null;
    const loc = S().active;
    if (d && Array.isArray(d.ex) && (!loc || (d.updatedAt || 0) > (loc.updatedAt || 0))) {
      set({ active: clone(d), activeOpen: false }); LS.set('active', d);
      toast('Tenés un entrenamiento en curso: “' + (d.name || 'Entrenamiento') + '”');
    } else if (loc && !d) Sync.writeSoon('active', loc, 100);
  }).catch(() => {});
  addEventListener('online', () => Sync.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Sync.flush(); });
  setInterval(() => { if (Object.keys(Sync.pending).length && !Sync.inflight) Sync.flush(); }, 30000);
}
