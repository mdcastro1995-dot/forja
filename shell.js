/* Forja · capa de la app independiente.
   Expone window.claude.use(name) con la misma forma que usa la app dentro de claude.ai:
   - db / user  → Supabase (tabla forja_docs, cada fila privada por usuario con RLS)
   - sample     → API de Anthropic con la clave que guardás en el teléfono
   - downloads  → descarga normal del navegador
   Si algo de esto falta, la app funciona en modo local. */
(function () {
  'use strict';
  var CFG_KEY = 'forja.cfg';
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm';
  var MODEL_DEFAULT = 'claude-opus-5-5';
  function cfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; } }
  function saveCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {} }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

  var sb = null, session = null, localOnly = false;
  var resolveReady; var ready = new Promise(function (r) { resolveReady = r; });

  /* ---------- UI de cuenta (setup, login, ajustes) ---------- */
  var css = '.sh-wrap{position:fixed;inset:0;z-index:200;background:var(--bg);overflow-y:auto;padding:calc(24px + env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px));font-family:var(--f-ui);color:var(--ink)}' +
    '.sh-in{max-width:440px;margin:0 auto;display:flex;flex-direction:column;gap:14px}' +
    '.sh-in h1{font-family:var(--f-display);font-size:28px;margin:8px 0 0}.sh-in p{margin:0;color:var(--ink-2);font-size:15px;line-height:1.45}' +
    '.sh-msg{min-height:20px;font-size:14px;color:var(--bad)}.sh-ok{color:var(--good)}.sh-row{display:flex;gap:10px;flex-wrap:wrap}.sh-row .btn{flex:1}' +
    '.sh-logo{width:56px;height:56px}.sh-small{font-size:13px;color:var(--ink-3)}';
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function overlay(inner) {
    close();
    if (!document.getElementById('sh-css')) { var s = document.createElement('style'); s.id = 'sh-css'; s.textContent = css; document.head.appendChild(s); }
    var o = el('<div class="sh-wrap" id="sh-overlay" role="dialog" aria-modal="true"><div class="sh-in">' +
      '<svg class="sh-logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="var(--accent)"/><circle cx="16" cy="16" r="10" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/><circle cx="16" cy="16" r="3.6" fill="var(--surface)"/></svg>' +
      inner + '</div></div>');
    document.body.appendChild(o);
    return o;
  }
  function close() { var o = document.getElementById('sh-overlay'); if (o) o.remove(); }
  function field(id, label, type, value, ph) {
    return '<label class="field"><span class="lbl">' + label + '</span><input id="' + id + '" class="input" type="' + type + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + (value || '').replace(/"/g, '&quot;') + '" placeholder="' + (ph || '') + '"></label>';
  }
  function msg(o, t, ok) { var m = o.querySelector('.sh-msg'); m.textContent = t || ''; m.className = 'sh-msg' + (ok ? ' sh-ok' : ''); }

  function showSetup(fromSettings) {
    var c = cfg();
    var o = overlay('<h1>' + (fromSettings ? 'Conexiones' : 'Configurar Forja') + '</h1>' +
      '<p>Pegá los datos de tu proyecto de Supabase (Project Settings → API) y, si querés usar dictado, foto, coach y planes, tu clave de Anthropic. Todo queda guardado solo en este teléfono.</p>' +
      field('sh-url', 'Supabase · Project URL', 'url', c.sbUrl, 'https://xxxx.supabase.co') +
      field('sh-key', 'Supabase · anon public key', 'text', c.sbKey, 'eyJhbGci…') +
      field('sh-ai', 'Anthropic · API key (opcional)', 'password', c.aiKey, 'sk-ant-…') +
      '<p class="sh-small">Las funciones con Claude usan el modelo Claude Opus 5.5 y se cobran en tu cuenta de Anthropic por uso (unos centavos por consulta).</p>' +
      '<div class="sh-msg" role="alert"></div>' +
      '<div class="sh-row">' + (fromSettings ? '<button class="btn" id="sh-cancel">Cancelar</button>' : '<button class="btn" id="sh-local">Usar sin cuenta</button>') + '<button class="btn primary" id="sh-save">Guardar</button></div>' +
      (fromSettings && session ? '<button class="btn ghost danger" id="sh-logout">Cerrar sesión (' + (session.user.email || '') + ')</button>' : ''));
    o.querySelector('#sh-save').onclick = function () {
      var url = o.querySelector('#sh-url').value.trim().replace(/\/+$/, '');
      var key = o.querySelector('#sh-key').value.trim();
      var ai = o.querySelector('#sh-ai').value.trim();
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) { msg(o, 'La URL tiene que ser como https://xxxx.supabase.co'); return; }
      if (key.length < 30) { msg(o, 'Pegá la clave "anon public" completa.'); return; }
      if (ai && !/^sk-ant-/.test(ai)) { msg(o, 'La clave de Anthropic empieza con sk-ant-'); return; }
      var prev = cfg();
      saveCfg({ sbUrl: url, sbKey: key, aiKey: ai, model: prev.model || MODEL_DEFAULT });
      location.reload();
    };
    var cancel = o.querySelector('#sh-cancel'); if (cancel) cancel.onclick = close;
    var loc = o.querySelector('#sh-local'); if (loc) loc.onclick = function () { localOnly = true; close(); resolveReady(); };
    var lo = o.querySelector('#sh-logout'); if (lo) lo.onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
  }
  function showLogin() {
    var o = overlay('<h1>Entrá a Forja</h1><p>Tu cuenta guarda tus rutinas y entrenamientos para verlos en cualquier dispositivo.</p>' +
      field('sh-mail', 'Email', 'email', '', 'vos@ejemplo.com') + field('sh-pass', 'Contraseña', 'password', '', 'Mínimo 6 caracteres') +
      '<div class="sh-msg" role="alert"></div>' +
      '<div class="sh-row"><button class="btn" id="sh-new">Crear cuenta</button><button class="btn primary" id="sh-in">Entrar</button></div>' +
      '<button class="btn ghost" id="sh-cfg">Cambiar conexiones</button>');
    function creds() { return { email: o.querySelector('#sh-mail').value.trim(), password: o.querySelector('#sh-pass').value }; }
    o.querySelector('#sh-in').onclick = function () {
      msg(o, 'Entrando…', true);
      sb.auth.signInWithPassword(creds()).then(function (r) {
        if (r.error) { msg(o, r.error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : r.error.message); return; }
        session = r.data.session; close(); resolveReady();
      });
    };
    o.querySelector('#sh-new').onclick = function () {
      var c = creds(); if (c.password.length < 6) { msg(o, 'La contraseña necesita al menos 6 caracteres.'); return; }
      msg(o, 'Creando cuenta…', true);
      sb.auth.signUp(c).then(function (r) {
        if (r.error) { msg(o, r.error.message); return; }
        if (r.data.session) { session = r.data.session; close(); resolveReady(); }
        else msg(o, 'Cuenta creada. Revisá tu email para confirmarla y después tocá Entrar.', true);
      });
    };
    o.querySelector('#sh-cfg').onclick = function () { showSetup(false); };
  }

  /* ---------- db sobre Supabase ---------- */
  var META = { fromCache: false, hasPendingWrites: false };
  function parentOf(p) { return p.split('/').slice(0, -1).join('/'); }
  function dbErr(e) { var s = e && (e.status || e.code); return { code: String(s).indexOf('42') === 0 || s === 400 ? 'invalid_argument' : 'unavailable', message: (e && e.message) || 'Error de red' }; }
  function dsnap(path, d) { return { id: path.split('/').pop(), exists: !!d, data: function () { return d || undefined; }, metadata: META }; }
  function qsnap(rows, order, lim) {
    var docs = rows.map(function (r) { return dsnap(r.path, r.data); });
    if (order) docs.sort(function (a, b) { var x = a.data()[order.f], y = b.data()[order.f]; var c = x < y ? -1 : x > y ? 1 : 0; return order.dir === 'desc' ? -c : c; });
    if (lim) docs = docs.slice(0, lim);
    return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: META };
  }
  function fetchDoc(path) { return sb.from('forja_docs').select('data').eq('path', path).maybeSingle().then(function (r) { if (r.error) throw dbErr(r.error); return r.data ? r.data.data : null; }); }
  function fetchCol(path) { return sb.from('forja_docs').select('path,data').eq('parent', path).limit(5000).then(function (r) { if (r.error) throw dbErr(r.error); return r.data || []; }); }
  var subs = new Set();
  function refresh(l) {
    var p = l.kind === 'doc' ? fetchDoc(l.path).then(function (d) { l.cb(dsnap(l.path, d)); }) : fetchCol(l.path).then(function (rows) { l.cb(qsnap(rows, l.order, l.lim)); });
    return p.catch(function () {});
  }
  function notify(path) { subs.forEach(function (l) { if (l.path === path || l.path === parentOf(path)) refresh(l); }); }
  setInterval(function () { if (session && document.visibilityState === 'visible') subs.forEach(refresh); }, 45000);
  document.addEventListener('visibilitychange', function () { if (session && document.visibilityState === 'visible') subs.forEach(refresh); });
  function writeRow(path, data) {
    return sb.from('forja_docs').upsert({ user_id: session.user.id, path: path, parent: parentOf(path), data: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id,path' })
      .then(function (r) { if (r.error) throw dbErr(r.error); notify(path); });
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(), path: path,
      get: function () { return fetchDoc(path).then(function (d) { return dsnap(path, d); }); },
      set: function (d) { return writeRow(path, d); },
      update: function (d) { return fetchDoc(path).then(function (cur) { if (!cur) throw { code: 'invalid_argument', message: 'No existe' }; return writeRow(path, Object.assign({}, cur, d)); }); },
      delete: function () { return sb.from('forja_docs').delete().eq('path', path).then(function (r) { if (r.error) throw dbErr(r.error); notify(path); }); },
      onSnapshot: function (cb, err) { var l = { kind: 'doc', path: path, cb: cb, err: err }; subs.add(l); refresh(l); return function () { subs.delete(l); }; },
      collection: function (s) { return colRef(path + '/' + s); },
      acquire: function () { return Promise.resolve({ acquired: true }); },
    };
  }
  function colRef(path, order, lim) {
    return {
      path: path,
      doc: function (id) { return docRef(path + '/' + (id || rid())); },
      add: function (d) { var r = docRef(path + '/' + rid()); return r.set(d).then(function () { return r; }); },
      orderBy: function (f, dir) { return colRef(path, { f: f, dir: dir }, lim); },
      limit: function (n) { return colRef(path, order, n); },
      where: function () { return colRef(path, order, lim); },
      get: function () { return fetchCol(path).then(function (rows) { return qsnap(rows, order, lim); }); },
      onSnapshot: function (cb, err) { var l = { kind: 'col', path: path, order: order, lim: lim, cb: cb, err: err }; subs.add(l); refresh(l); return function () { subs.delete(l); }; },
    };
  }
  var db = { doc: docRef, collection: function (p) { return colRef(p); } };
  var user = {
    id: function () { return Promise.resolve(session ? session.user.id : null); },
    isOwner: function () { return Promise.resolve(true); }, canEdit: function () { return Promise.resolve(true); }, can: function () { return Promise.resolve(true); },
    me: function () { return Promise.resolve({ id: session ? session.user.id : null, name: '', email: session ? session.user.email : null, isOwner: true, canEdit: true, avatarUrl: '', color: '#0E7C73' }); },
    profiles: function (ids) { var o = {}; [].concat(ids).forEach(function (i) { o[i] = { id: i, name: '', isMe: true }; }); return Promise.resolve(o); },
  };

  /* ---------- Claude por la API de Anthropic ---------- */
  var clientP = null;
  function client() {
    if (!clientP) clientP = import(SDK_URL).then(function (m) { var A = m.default || m.Anthropic; return new A({ apiKey: cfg().aiKey, dangerouslyAllowBrowser: true }); });
    return clientP;
  }
  function toJpegB64(blob) {
    return createImageBitmap(blob).then(function (bmp) {
      var max = 1568, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.86); });
    }).then(function (jb) {
      return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.onerror = rej; fr.readAsDataURL(jb); });
    }).catch(function () { throw { code: 'image_rejected', message: 'No se pudo leer la imagen' }; });
  }
  function sample(input, opts) {
    opts = opts || {};
    if (!cfg().aiKey) return Promise.reject({ code: 'not_granted', message: 'Falta la clave de Anthropic' });
    var imgs = opts.images ? Array.prototype.slice.call(opts.images) : [];
    return Promise.all(imgs.map(toJpegB64)).then(function (b64s) {
      var turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input.slice();
      var messages = turns.map(function (t, i) {
        if (i === turns.length - 1 && t.role === 'user' && b64s.length) {
          return { role: 'user', content: b64s.map(function (d) { return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } }; }).concat([{ type: 'text', text: t.content }]) };
        }
        return { role: t.role, content: t.content };
      });
      return client().then(function (c) {
        return c.beta.messages.create({
          model: cfg().model || MODEL_DEFAULT,
          max_tokens: 16000,
          output_config: { effort: 'medium' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          messages: messages,
        }, { signal: opts.signal });
      });
    }).then(function (resp) {
      if (resp.stop_reason === 'refusal') throw { code: 'refused', message: 'Claude declinó la consulta' };
      var text = resp.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
      if (!text.trim()) throw { code: 'empty_completion', message: 'Respuesta vacía' };
      if (opts.onText) opts.onText({ text: text, delta: text });
      return { text: text, truncated: resp.stop_reason === 'max_tokens', modelTierApplied: 'default', modelApplied: resp.model };
    }).catch(function (e) {
      if (e && e.code && typeof e.code === 'string' && !e.status) throw e;
      if (opts.signal && opts.signal.aborted) throw { code: 'cancelled', message: 'Cancelado' };
      var st = e && e.status;
      if (st === 401 || st === 403) throw { code: 'not_granted', message: 'La clave de Anthropic no es válida. Revisala en Más → Cuenta y conexiones.' };
      if (st === 429) throw { code: 'rate_limited', message: 'Límite de uso alcanzado' };
      if (st === 400 && e.message && /credit|balance/i.test(e.message)) throw { code: 'rate_limited', message: 'Tu cuenta de Anthropic no tiene saldo.' };
      throw { code: 'upstream_error', message: (e && e.message) || 'Error de red' };
    });
  }
  function parseJSON(t) {
    try { return JSON.parse(t); } catch (e) {}
    var f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch (e) {} }
    var a = Math.min.apply(null, ['{', '['].map(function (ch) { var i = t.indexOf(ch); return i < 0 ? Infinity : i; }));
    var b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (a !== Infinity && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
    throw { code: 'invalid_json', message: 'La respuesta no es JSON', text: t };
  }
  sample.json = function (input, opts) {
    var extra = '\n\nTu respuesta se va a leer automáticamente: respondé solo con el JSON pedido, sin texto antes ni después.';
    var inp = typeof input === 'string' ? input + extra : input.slice(0, -1).concat([{ role: 'user', content: input[input.length - 1].content + extra }]);
    return sample(inp, opts).then(function (r) { if (r.truncated) throw { code: 'invalid_json', message: 'Respuesta cortada', text: r.text }; return parseJSON(r.text); });
  };
  sample.limits = function () { return Promise.resolve({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 20000000, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] } }); };

  var downloads = {
    save: function (o) {
      var b = o.data instanceof Blob ? o.data : new Blob([o.data], { type: /\.json$/.test(o.filename) ? 'application/json' : /\.csv$/.test(o.filename) ? 'text/csv' : 'text/plain' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = o.filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return Promise.resolve({ status: 'saved' });
    },
  };

  window.claude = {
    use: function (name) {
      if (name === 'db') return ready.then(function () { return !localOnly && session ? db : null; });
      if (name === 'user') return ready.then(function () { return !localOnly && session ? user : null; });
      if (name === 'sample') return ready.then(function () { return cfg().aiKey ? sample : null; });
      if (name === 'downloads') return Promise.resolve(downloads);
      return Promise.resolve(null);
    },
  };
  window.forjaShell = {
    openSettings: function () { showSetup(true); },
    email: function () { return session ? session.user.email : null; },
    hasAI: function () { return !!cfg().aiKey; },
  };

  function start() {
    var c = cfg();
    if (!c.sbUrl || !c.sbKey || !window.supabase) { showSetup(false); return; }
    try { sb = window.supabase.createClient(c.sbUrl, c.sbKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'forja.auth' } }); }
    catch (e) { showSetup(false); return; }
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) { session = r.data.session; resolveReady(); }
      else showLogin();
    }).catch(function () { showLogin(); });
    sb.auth.onAuthStateChange(function (_ev, s) { if (s) session = s; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
