(function () {
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

/* ========== base UI ========== */
const IC = {
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6L6 18',
  chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6', chevU: 'M6 15l6-6 6 6',
  swap: 'M4 8h14l-4-4M20 16H6l4 4', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z', dots: 'M5 12h.01M12 12h.01M19 12h.01',
  plate: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  play: 'M7 4.5v15l12.5-7.5z', timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 1.5M9 2.5h6',
  trophy: 'M8 4h8v4.5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 3.5M16 6h2.5A2.5 2.5 0 0 1 16 9.5M12 12.5V16M8.5 20h7M10 16h4v4h-4z',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  flame: 'M12 3c.6 3 4.5 5.2 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 .9-3.3 2-4.3.2 1.7 1 2.8 2.2 3.2-.5-2.8-.2-5.6.3-8.4z',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 10a3.5 3.5 0 0 1 7 0zM12 10l1.2-2',
  calc: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 16V5M7 10l5-5 5 5M5 20h14',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01', note: 'M5 4h14v11l-5 5H5zM14 20v-5h5',
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', chat: 'M4 5h16v11H9l-5 4z',
  link: 'M9.5 14.5l5-5M10 6.5l1.5-1.5a4 4 0 0 1 5.7 5.7L15.5 12.5M14 17.5l-1.5 1.5a4 4 0 0 1-5.7-5.7L8.5 11.5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', stop: 'M7 7h10v10H7z', copy: 'M9 9h10v10H9zM5 15V5h10',
  refresh: 'M20 11a8 8 0 0 0-14.7-4.3L4 8M4 3v5h5M4 13a8 8 0 0 0 14.7 4.3L20 16M20 21v-5h-5',
  arrowR: 'M5 12h14M13 6l6 6-6 6', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3', dumbbell: 'M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11',
};
function Icon({ n, fill, bold, size }) {
  return html`<svg class=${'ic' + (fill ? ' fill' : '') + (bold ? ' bold' : '')} viewBox="0 0 24 24" aria-hidden="true" style=${size ? `width:${size}px;height:${size}px` : null}><path d=${IC[n]} /></svg>`;
}
function Logo() {
  return html`<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="var(--accent)" /><circle cx="16" cy="16" r="10" fill="none" stroke="var(--on-accent-line)" stroke-width="2" /><circle cx="16" cy="16" r="3.6" fill="var(--bg)" /></svg>`;
}
function PlateDeco() {
  return html`<svg class="plate-deco" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="97" fill="none" stroke="var(--on-accent-line)" stroke-width="2" />
    <circle cx="100" cy="100" r="80" fill="none" stroke="var(--on-accent-line)" stroke-width="12" />
    <circle cx="100" cy="100" r="34" fill="none" stroke="var(--on-accent-line)" stroke-width="2" />
    <circle cx="100" cy="100" r="14" fill="var(--on-accent-line)" />
    <text x="100" y="56" text-anchor="middle">20 KG</text>
  </svg>`;
}
function Sheet({ title, onClose, full, footer, children, label }) {
  const ref = useRef(null);
  useEffect(() => { try { ref.current && ref.current.focus({ preventScroll: true }); } catch (e) {} }, []);
  return html`<div class="sheet-wrap" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class=${'sheet' + (full ? ' full' : '')} role="dialog" aria-modal="true" aria-label=${label || title} tabindex="-1" ref=${ref}>
      <div class="sheet-head"><h2>${title}</h2><button class="icon-btn" onClick=${onClose} aria-label="Cerrar"><${Icon} n="x" /></button></div>
      <div class="sheet-body">${children}</div>
      ${footer ? html`<div class="sheet-foot">${footer}</div>` : null}
    </div>
  </div>`;
}
function Toasts({ items }) {
  return html`<div class="toasts" role="status" aria-live="polite">${items.map(t => html`<div key=${t.id} class=${'toast ' + t.kind}>${t.kind === 'pr' ? html`<${Icon} n="trophy" />` : null}<span>${t.msg}</span></div>`)}</div>`;
}
function Tile({ label, value, delta, deltaLabel }) {
  let dl = null;
  if (delta != null && isFinite(delta)) {
    const cls = Math.abs(delta) < 0.5 ? 'flat' : delta > 0 ? 'up' : 'down';
    dl = html`<span class=${'dl ' + cls}>${cls !== 'flat' ? html`<${Icon} n=${delta > 0 ? 'up' : 'down'} />` : null}${(delta > 0 ? '+' : '') + NF0.format(delta)}% ${deltaLabel || ''}</span>`;
  }
  return html`<div class="tile"><span class="lab">${label}</span><span class="val">${value}</span>${dl}</div>`;
}
function Stepper({ value, min, max, onChange, label }) {
  return html`<span class="stepper" role="group" aria-label=${label}>
    <button aria-label=${'Menos ' + label} onClick=${() => onChange(clamp(value - 1, min, max))}><${Icon} n="minus" /></button>
    <span>${value}</span>
    <button aria-label=${'Más ' + label} onClick=${() => onChange(clamp(value + 1, min, max))}><${Icon} n="plus" /></button>
  </span>`;
}
function useTick(ms) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return t;
}
function md(text) {
  const out = []; let list = null, ol = false;
  const inline = (t) => { const parts = []; const re = /\*\*(.+?)\*\*/g; let last = 0, m; while ((m = re.exec(t))) { if (m.index > last) parts.push(t.slice(last, m.index)); parts.push(html`<strong>${m[1]}</strong>`); last = re.lastIndex; } if (last < t.length) parts.push(t.slice(last)); return parts; };
  const flush = () => { if (list) { out.push(ol ? html`<ol>${list}</ol>` : html`<ul>${list}</ul>`); list = null; } };
  for (const raw of String(text || '').split('\n')) {
    const l = raw.trim(); let m;
    if (!l) { flush(); continue; }
    if ((m = l.match(/^#{1,4}\s+(.*)/))) { flush(); out.push(html`<h4>${inline(m[1])}</h4>`); }
    else if ((m = l.match(/^[-*•]\s+(.*)/))) { if (!list || ol) { flush(); list = []; ol = false; } list.push(html`<li>${inline(m[1])}</li>`); }
    else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (!list || !ol) { flush(); list = []; ol = true; } list.push(html`<li>${inline(m[1])}</li>`); }
    else { flush(); out.push(html`<p>${inline(l)}</p>`); }
  }
  flush();
  return out;
}

/* ========== charts (hand-drawn SVG, measured to the container) ========== */
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    setW(Math.floor(el.getBoundingClientRect().width));
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(es => { const nw = Math.floor(es[0].contentRect.width); setW(v => v === nw ? v : nw); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
function niceStep(range, count) { const raw = range / Math.max(1, count); const mag = Math.pow(10, Math.floor(Math.log10(raw || 1))); const f = raw / mag; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag; }
function ticks(min, max, count) {
  if (!(max > min)) { min = min - 1; max = max + 1; }
  const st = niceStep(max - min, count || 4);
  const lo = Math.floor(min / st) * st, hi = Math.ceil(max / st) * st;
  const out = []; for (let v = lo; v <= hi + st / 2; v += st) out.push(+v.toFixed(6));
  return out;
}
const fCompact = (v) => Math.abs(v) >= 10000 ? NF0.format(v / 1000) + 'K' : NF0.format(v);
function chartKeys(e, hi, n, setHi) {
  if (!n) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); setHi(Math.min(n - 1, hi < 0 ? n - 1 : hi + 1)); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setHi(Math.max(0, hi < 0 ? n - 1 : hi - 1)); }
  else if (e.key === 'Home') { e.preventDefault(); setHi(0); }
  else if (e.key === 'End') { e.preventDefault(); setHi(n - 1); }
}
// Line: one series (accent) + optional muted dots series. Crosshair snaps to the nearest point of the main series.
function LineChart({ data, dots, fmtY, fmtTip, h, label, empty }) {
  h = h || 210;
  const [ref, W] = useWidth();
  const [hi, setHi] = useState(-1);
  let body = null;
  const has = data.length > 0 || (dots && dots.length > 0);
  if (!has) body = html`<div class="chart-empty">${empty || 'Sin datos todavía'}</div>`;
  else if (W > 0) {
    const padL = 44, padR = 22, padT = 26, padB = 26;
    const iw = Math.max(20, W - padL - padR), ih = h - padT - padB;
    const D = dots || [];
    const xs = data.map(p => p.x).concat(D.map(p => p.x));
    const ys = data.map(p => p.y).concat(D.map(p => p.y));
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 - x0 < DAY) { x0 -= 3 * DAY; x1 += 3 * DAY; }
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    const padY = (ymax - ymin) * 0.12 || Math.max(1, Math.abs(ymax) * 0.05);
    const yt = ticks(Math.max(0, ymin - padY), ymax + padY, 4);
    const y0 = yt[0], y1 = yt[yt.length - 1];
    const X = x => padL + (x - x0) / (x1 - x0) * iw;
    const Y = y => padT + (1 - (y - y0) / ((y1 - y0) || 1)) * ih;
    const line = data.length ? 'M' + data.map(p => X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('L') : '';
    const area = data.length > 1 ? line + `L${X(data[data.length - 1].x).toFixed(1)},${padT + ih}L${X(data[0].x).toFixed(1)},${padT + ih}Z` : '';
    const nT = W < 360 ? 3 : 4;
    const xt = Array.from({ length: nT }, (_, i) => x0 + (x1 - x0) * i / (nT - 1));
    const last = data[data.length - 1];
    const move = (e) => {
      if (!data.length) return;
      const r = e.currentTarget.getBoundingClientRect(); const px = e.clientX - r.left;
      let bi = 0, bd = Infinity; data.forEach((p, i) => { const d = Math.abs(X(p.x) - px); if (d < bd) { bd = d; bi = i; } });
      setHi(bi);
    };
    const hp = hi >= 0 && data[hi] ? data[hi] : null;
    const tipX = hp ? clamp(X(hp.x), 72, W - 72) : 0;
    body = html`
      <svg width=${W} height=${h} role="img" aria-label=${label} tabindex="0"
        onPointerMove=${move} onPointerDown=${move} onPointerLeave=${() => setHi(-1)}
        onFocus=${() => setHi(data.length - 1)} onBlur=${() => setHi(-1)} onKeyDown=${e => chartKeys(e, hi, data.length, setHi)}>
        ${yt.map(v => html`<g key=${'y' + v}><line class="gl" x1=${padL} x2=${padL + iw} y1=${Y(v)} y2=${Y(v)} /><text x=${padL - 8} y=${Y(v) + 4} text-anchor="end">${fmtY ? fmtY(v) : fCompact(v)}</text></g>`)}
        ${xt.map((t, i) => html`<text key=${'x' + i} x=${X(t)} y=${h - 6} text-anchor=${i === 0 ? 'start' : i === nT - 1 ? 'end' : 'middle'}>${DF_SHORT.format(new Date(t))}</text>`)}
        ${area ? html`<path class="ar" d=${area} />` : null}
        ${D.map((p, i) => html`<circle key=${'d' + i} class="dt2" cx=${X(p.x)} cy=${Y(p.y)} r="4" />`)}
        ${line ? html`<path class="ln" d=${line} />` : null}
        ${data.length === 1 ? html`<circle class="dt" cx=${X(data[0].x)} cy=${Y(data[0].y)} r="5" />` : null}
        ${last && data.length > 1 ? html`<circle class="dt" cx=${X(last.x)} cy=${Y(last.y)} r="5" />` : null}
        ${last ? html`<text class="lbl-strong" x=${Math.min(X(last.x), padL + iw)} y=${Math.max(14, Y(last.y) - 11)} text-anchor="end">${fmtTip ? fmtTip(last.y) : NF1.format(last.y)}</text>` : null}
        ${hp ? html`<g><line class="xh" x1=${X(hp.x)} x2=${X(hp.x)} y1=${padT} y2=${padT + ih} /><circle class="dt" cx=${X(hp.x)} cy=${Y(hp.y)} r="6" /></g>` : null}
      </svg>
      ${hp ? html`<div class="tip" style=${`left:${tipX}px`}><b>${fmtTip ? fmtTip(hp.y) : NF1.format(hp.y)}</b>${DF_DAYS.format(new Date(hp.x))}${hp.note ? html`<br />${hp.note}` : null}</div>` : null}`;
  }
  return html`<div class="chart" ref=${ref} style=${`height:${h}px`}>${body}</div>`;
}
// Columns: one series; the hovered/focused column lifts, the current period is labelled.
function ColumnChart({ data, fmtY, fmtTip, h, label, empty }) {
  h = h || 190;
  const [ref, W] = useWidth();
  const [hi, setHi] = useState(-1);
  let body = null;
  const any = data.some(d => d.y > 0);
  if (!any) body = html`<div class="chart-empty">${empty || 'Sin datos todavía'}</div>`;
  else if (W > 0) {
    const padL = 44, padR = 8, padT = 24, padB = 24;
    const iw = Math.max(20, W - padL - padR), ih = h - padT - padB;
    const yt = ticks(0, Math.max(...data.map(d => d.y)) * 1.08, 4);
    const y1 = yt[yt.length - 1];
    const Y = v => padT + (1 - v / (y1 || 1)) * ih;
    const n = data.length, band = iw / n, bw = Math.max(3, Math.min(24, band * 0.62));
    const every = Math.max(1, Math.ceil(n / (W < 360 ? 4 : 6)));
    const colPath = (x, y, w, hh) => { const r = Math.min(4, w / 2, hh); return `M${x},${y + hh}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh}Z`; };
    const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.floor((e.clientX - r.left - padL) / band); setHi(i >= 0 && i < n ? i : -1); };
    const hd = hi >= 0 ? data[hi] : null;
    const lastI = n - 1;
    body = html`
      <svg width=${W} height=${h} role="img" aria-label=${label} tabindex="0" onPointerMove=${move} onPointerDown=${move} onPointerLeave=${() => setHi(-1)}
        onFocus=${() => setHi(lastI)} onBlur=${() => setHi(-1)} onKeyDown=${e => chartKeys(e, hi, n, setHi)}>
        ${yt.map(v => html`<g key=${'y' + v}><line class=${v === 0 ? 'base' : 'gl'} x1=${padL} x2=${padL + iw} y1=${Y(v)} y2=${Y(v)} /><text x=${padL - 8} y=${Y(v) + 4} text-anchor="end">${fmtY ? fmtY(v) : fCompact(v)}</text></g>`)}
        ${data.map((d, i) => { const x = padL + band * i + (band - bw) / 2; const y = Y(d.y); const hh = padT + ih - y; return d.y > 0 ? html`<path key=${'b' + i} class=${'bar' + (hi >= 0 && hi !== i ? ' dim' : '') + (hi === i ? ' hi' : '')} d=${colPath(x, y, bw, hh)} />` : null; })}
        ${data.map((d, i) => (i % every === 0 || i === lastI) && !(i !== lastI && lastI - i < every) ? html`<text key=${'x' + i} x=${padL + band * i + band / 2} y=${h - 6} text-anchor="middle">${d.label}</text>` : null)}
        ${data[lastI].y > 0 && hi < 0 ? html`<text class="lbl-strong" x=${padL + band * lastI + band / 2} y=${Y(data[lastI].y) - 7} text-anchor=${lastI > 0 ? 'end' : 'middle'}>${fmtTip ? fmtTip(data[lastI].y) : NF0.format(data[lastI].y)}</text>` : null}
      </svg>
      ${hd ? html`<div class="tip" style=${`left:${clamp(padL + band * hi + band / 2, 70, W - 70)}px`}><b>${fmtTip ? fmtTip(hd.y) : NF0.format(hd.y)}</b>${hd.tip || hd.label}</div>` : null}`;
  }
  return html`<div class="chart" ref=${ref} style=${`height:${h}px`}>${body}</div>`;
}
// Horizontal bars: weekly sets per muscle against the 10–20 sets/week band.
function MuscleBars({ rows, lo, hiB, label }) {
  lo = lo || 10; hiB = hiB || 20;
  const [ref, W] = useWidth();
  const rh = 26, padT = 22, h = padT + rows.length * rh + 4;
  let body = null;
  if (W > 0) {
    const labW = 92, valW = 34, iw = Math.max(40, W - labW - valW);
    const max = Math.max(hiB + 4, ...rows.map(r => r.v));
    const X = v => labW + v / max * iw;
    const barPath = (x, y, w, hh) => { const r = Math.min(4, w / 2, hh / 2); return w <= 0 ? '' : `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh - r}Q${x + w},${y + hh} ${x + w - r},${y + hh}H${x}Z`; };
    body = html`<svg width=${W} height=${h} role="img" aria-label=${label}>
      <rect class="band" x=${X(lo)} y=${padT - 4} width=${X(hiB) - X(lo)} height=${rows.length * rh + 4} rx="4" />
      <text x=${X(lo)} y="12" text-anchor="middle">${lo}</text><text x=${X(hiB)} y="12" text-anchor="middle">${hiB}</text>
      <line class="base" x1=${labW} x2=${labW} y1=${padT - 4} y2=${padT + rows.length * rh} />
      ${rows.map((r, i) => { const y = padT + i * rh; return html`<g key=${r.m}>
        <text x=${labW - 8} y=${y + 15} text-anchor="end" class=${r.v >= lo ? 'lbl-strong' : ''}>${MUSCLES[r.m]}</text>
        ${r.v > 0 ? html`<path class="bar" d=${barPath(labW, y + 6, X(r.v) - labW, 12)} />` : null}
        <text x=${X(r.v) + 6} y=${y + 16}>${NF1.format(r.v)}</text></g>`; })}
    </svg>`;
  }
  return html`<div class="chart" ref=${ref} style=${`height:${h}px`}>${body}</div>`;
}
// Calendar: 7 rows × N weeks, single-hue sequential steps by session volume.
function CalendarHeat({ workouts, weeks }) {
  const [ref, W] = useWidth();
  const [hi, setHi] = useState(null);
  const byDay = useMemo(() => { const m = {}; for (const w of workouts) { const k = dayKey(w.start); (m[k] || (m[k] = [])).push(w); } return m; }, [workouts]);
  let body = null;
  const h = 7 * 18 + 22;
  if (W > 0) {
    const labW = 18, gap = 3;
    const cell = Math.max(8, Math.min(18, Math.floor((W - labW) / weeks) - gap));
    const wk0 = startOfWeek(Date.now()) - (weeks - 1) * 7 * DAY;
    const vols = Object.values(byDay).map(ws => ws.reduce((t, w) => t + (w.vol || workoutStats(w).vol), 0)).filter(v => v > 0).sort((a, b) => a - b);
    const q = (p) => vols.length ? vols[Math.min(vols.length - 1, Math.floor(p * vols.length))] : 0;
    const qs = [q(0.25), q(0.5), q(0.75)];
    const level = (v) => v <= 0 ? 1 : v <= qs[0] ? 1 : v <= qs[1] ? 2 : v <= qs[2] ? 3 : 4;
    const today = startOfDay(Date.now());
    const cells = [], months = [];
    let lastMonth = -1;
    for (let c = 0; c < weeks; c++) {
      const ws = startOfWeek(wk0 + c * 7 * DAY + 3 * DAY);
      const mo = new Date(ws).getMonth();
      if (mo !== lastMonth) { months.push({ c, label: cap(new Intl.DateTimeFormat('es-UY', { month: 'short' }).format(new Date(ws))).replace('.', '') }); lastMonth = mo; }
      for (let r = 0; r < 7; r++) {
        const d = new Date(ws); d.setDate(d.getDate() + r);
        const t = d.getTime(); if (t > today) continue;
        const k = dayKey(t); const list = byDay[k];
        const v = list ? list.reduce((a, w) => a + (w.vol || workoutStats(w).vol), 0) : 0;
        cells.push({ k, t, c, r, list, lv: list ? level(v) : 0, v });
      }
    }
    const cx = c => labW + c * (cell + gap), cy = r => 18 + r * (cell + gap);
    const hc = hi && cells.find(z => z.k === hi);
    body = html`<svg width=${Math.min(W, labW + weeks * (cell + gap))} height=${18 + 7 * (cell + gap)} role="img" aria-label=${'Días entrenados en las últimas ' + weeks + ' semanas'} onPointerLeave=${() => setHi(null)}>
      ${months.map(m => html`<text key=${'m' + m.c} x=${cx(m.c)} y="11">${m.label}</text>`)}
      ${['L', '', 'X', '', 'V', '', 'D'].map((l, r) => l ? html`<text key=${'l' + r} x="0" y=${cy(r) + cell - 2}>${l}</text>` : null)}
      ${cells.map(z => html`<rect key=${z.k} x=${cx(z.c)} y=${cy(z.r)} width=${cell} height=${cell} rx="3" fill=${`var(--heat-${z.lv})`} tabindex=${z.list ? 0 : null}
        onPointerEnter=${() => setHi(z.k)} onFocus=${() => setHi(z.k)} onBlur=${() => setHi(null)}><title>${DF_DAYS.format(new Date(z.t)) + (z.list ? ': ' + z.list.map(w => w.name).join(', ') : ': descanso')}</title></rect>`)}
    </svg>
    ${hc ? html`<div class="tip" style=${`left:${clamp(cx(hc.c) + cell / 2, 80, W - 80)}px;top:${cy(hc.r) + cell + 22}px`}><b>${hc.list ? hc.list.map(w => w.name).join(' + ') : 'Descanso'}</b>${cap(DF_DAYS.format(new Date(hc.t)))}${hc.list ? ' · ' + fVol(hc.v) : ''}</div>` : null}`;
  }
  return html`<div class="chart" ref=${ref} style=${`height:${h}px`}>${body}</div>`;
}

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
  const mic = useMic(text, setText, 'day-text');
  const cardio = allExercises().filter(x => x.t === 'cardio');
  const build = () => {
    const out = Object.assign({}, saved || {}, { d, text: text.trim().slice(0, 2000), pain: pain, energy: energy, sleep: num(sleep), workouts: ws.map(w => w.id) });
    if (out.pain == null) delete out.pain;
    if (out.sleep == null) delete out.sleep;
    return out;
  };
  const toHistory = () => openSheet('photo', { mode: 'voz', text: text.trim(), day: d });
  // Guardar: si contaste ejercicios y ese día no hay sesiones cargadas, pasa a la pantalla de ejercicios para confirmarlos.
  const save = () => { mic.stop(); A.putDay(build()); if (text.trim() && !ws.length && s.caps.sample) toHistory(); else toast('Día guardado'); };
  const ask = async () => {
    mic.stop();
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
    <${MicButton} rec=${mic.rec} onClick=${mic.toggle} has=${!!text.trim()} />
    <label class="field"><span class="lbl">¿Qué hiciste y cómo te fue?</span><textarea id="day-text" class="input" placeholder="Ej.: Hice Piernas + Hombros pero salteé el hip thrust porque molestó el tobillo. Después caminé 15 minutos." value=${text} onInput=${e => setText(e.target.value)}></textarea></label>
    ${text.trim() ? html`<button class="btn sm" style="align-self:flex-start" onClick=${() => { A.putDay(build()); toHistory(); }}><${Icon} n="dumbbell" />${ws.length ? 'Pasar al historial lo que falte' : 'Pasar los ejercicios al historial'}</button>` : null}
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
  const stop = () => { try { if (srRef.current) srRef.current.stop(); } catch (e) {} };
  const toggle = () => {
    if (rec) { stop(); return; }
    if (!SR) { const t = document.getElementById(inputId); if (t) t.focus(); toast('En este teléfono se dicta con el micrófono del teclado: tocá el ícono 🎤 abajo a la derecha del teclado.', 'info', 6000); return; }
    const r = new SR();
    const nl = (navigator.language || '').toLowerCase();
    r.lang = nl.startsWith('es') ? navigator.language : 'es-AR';
    r.continuous = true; r.interimResults = true;
    base.current = (value || '').trim() ? value.trim() + ' ' : '';
    r.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setValue(base.current + t.trim()); };
    r.onerror = (e) => {
      setRec(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Forja no tiene permiso para usar el micrófono. Habilitalo en Ajustes o usá el micrófono del teclado.', 'warn', 6500);
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('No se pudo escuchar. Probá de nuevo o usá el micrófono del teclado.', 'warn');
    };
    r.onend = () => setRec(false);
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
  const [durEd, setDurEd] = useState(null);
  if (!w) return html`<${Sheet} title="Entrenamiento" onClose=${close}><p class="sheet-p">Este entrenamiento ya no existe.</p><//>`;
  const st = workoutStats(w);
  const prs = idx.byW[w.id] || [];
  const del = () => openSheet('confirm', { title: 'Borrar entrenamiento', body: `Se borra “${w.name}” del ${DF_DAYS.format(new Date(w.start))}. Tus récords se recalculan.`, ok: 'Borrar', danger: true, onOk: () => { A.delWorkout(w.id); close(); toast('Entrenamiento borrado'); } });
  return html`<${Sheet} title=${w.name} onClose=${close} full footer=${html`<button class="btn" onClick=${() => { close(); editWorkout(w); }}><${Icon} n="edit" />Editar</button><button class="btn primary" onClick=${() => { close(); repeatWorkout(w); }}><${Icon} n="refresh" />Repetir</button>`}>
    ${fresh ? html`<div class="celebrate"><span class="display">Sesión guardada</span><span>${prs.length ? `${prs.length} ${plural(prs.length, 'récord nuevo', 'récords nuevos')}. ` : ''}${w.routineId ? 'La rotación ya avanzó a la próxima rutina.' : ''}</span></div>` : null}
    <p class="muted">${cap(DF_LONG.format(new Date(w.start)))} · ${DF_TIME.format(new Date(w.start))}${w.example ? ' · dato de ejemplo' : ''}</p>
    <button class="btn" onClick=${() => { close(); openSheet('day', { date: dayKey(w.start) }); }}><${Icon} n="note" />Registrar cómo te fue y ajustar la rutina</button>
    <div class="sum-tiles"><${Tile} label="Duración" value=${fMin(w.dur)} /><${Tile} label="Volumen" value=${fVol(st.vol)} /><${Tile} label="Series" value=${st.sets} /></div>
    ${durEd == null
      ? html`<button class="btn ghost sm" style="align-self:flex-start" onClick=${() => setDurEd(w.dur ? String(Math.round(w.dur / 60)) : '')}><${Icon} n="edit" />${w.dur ? 'Cambiar duración' : 'Agregar duración'}</button>`
      : html`<div class="card stack"><label class="field"><span class="lbl">Duración (minutos)</span><input id="detail-dur" class="input" inputmode="numeric" placeholder="Ej.: 45" value=${durEd} onInput=${e => setDurEd(e.target.value)} /></label>
        <div class="row"><button class="btn sm" onClick=${() => setDurEd(null)}>Cancelar</button><button class="btn primary sm" onClick=${() => saveDur(w, durEd, () => setDurEd(null))}><${Icon} n="check" />Guardar duración</button></div></div>`}
    ${w.feel || w.note ? html`<div class="card stack">${w.feel ? html`<span><b>Sensación:</b> ${w.feel}/5</span>` : null}${w.note ? html`<span>${w.note}</span>` : null}</div>` : null}
    <div class="exlist">${(w.ex || []).map((e, k) => { const def = getEx(e.id); const ep = prs.filter(p => p.ex === e.id); let wn = 0; return html`<div class="exd" key=${k}>
      <div class="t"><span>${e.n || def.n}</span>${ep.length ? html`<span class="pr-badge"><${Icon} n="trophy" />${ep.map(p => PR_LABEL[p.k]).join(' · ')}</span>` : null}</div>
      <ol>${e.sets.map((x, j) => html`<li key=${j}><span class=${'k' + (x.t === 'w' ? ' w' : '')}>${x.t === 'w' ? 'C' : x.t === 'n' ? ++wn : (++wn, TYPE_KEYS[x.t])}</span><span>${setTxt(x, def)}</span>${def.t === 'wr' && x.t !== 'w' ? html`<span class="muted sm">1RM est. ${NF1.format(e1rm(x.w, x.r))}</span>` : null}${x.rpe ? html`<span class="muted sm">RPE ${f2(x.rpe)}</span>` : null}</li>`)}</ol>
      ${e.note ? html`<span class="muted sm">${e.note}</span>` : null}</div>`; })}</div>
    <button class="btn ghost danger" onClick=${del}><${Icon} n="trash" />Borrar entrenamiento</button>
  <//>`;
}
function saveDur(w, val, done) {
  const m = num(val);
  if (m == null || m < 0 || m > 600) { toast('Poné los minutos que duró, entre 0 y 600.', 'warn'); return; }
  const sec = Math.round(m * 60);
  A.putWorkout(Object.assign({}, w, { dur: sec, end: w.start + sec * 1000 }));
  done();
  toast('Duración guardada');
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
})();
