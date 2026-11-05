import re, json, os, hashlib
import os
OUT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
head=open('p1_head.html').read()
app=open('app.js').read()
head=head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
head=head.replace('<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js"></script>','')
ver=hashlib.sha1((head+app+open(OUT+'/shell.js').read()).encode()).hexdigest()[:8]
doc=f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0E7C73">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Forja">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
{head}
<script src="vendor/htm-preact.js"></script>
<script src="vendor/supabase.js"></script>
<script src="shell.js"></script>
<script src="app.js?v={ver}"></script>
<script>if ('serviceWorker' in navigator) addEventListener('load', function () {{ navigator.serviceWorker.register('sw.js').catch(function () {{}}); }});</script>
</body>
</html>
'''
open(OUT+'/index.html','w').write(doc)
open(OUT+'/app.js','w').write(app)
man={"name":"Forja","short_name":"Forja","description":"Tu guía de entrenamiento: rutinas, progreso y recuperación.","lang":"es","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#EEF2F1","theme_color":"#0E7C73",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
open(OUT+'/manifest.webmanifest','w').write(json.dumps(man,ensure_ascii=False,indent=1))
sw=f'''/* Forja · funciona sin conexión: guarda la app en el teléfono. */
const CACHE = 'forja-{ver}';
const SHELL = ['./', 'index.html', 'app.js?v={ver}', 'shell.js', 'manifest.webmanifest', 'vendor/htm-preact.js', 'vendor/supabase.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const cdn = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'cdn.jsdelivr.net';
  if (u.origin !== location.origin && !cdn) return; // Supabase y Anthropic siempre por red
  if (e.request.mode === 'navigate') {{
    e.respondWith(fetch(e.request).then(r => {{ const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }}).catch(() => caches.match('index.html')));
    return;
  }}
  e.respondWith(caches.match(e.request).then(hit => {{
    const net = fetch(e.request).then(r => {{ if (r.ok || r.type === 'opaque') {{ const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }} return r; }}).catch(() => hit);
    return hit || net;
  }}));
}});
'''
open(OUT+'/sw.js','w').write(sw)
print('built', ver)
