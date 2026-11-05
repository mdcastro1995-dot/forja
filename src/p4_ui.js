
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
