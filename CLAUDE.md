# Forja

App de gimnasio (PWA) publicada en https://mdcastro1995-dot.github.io/forja/ desde el repo `mdcastro1995-dot/forja` (GitHub Pages, rama `main`).

## Código

- El código fuente está en `src/`:
  - `p1_head.html` = estilos y estructura.
  - `p2_core.js` … `pC_photo.js` = lógica y pantallas (Preact + htm, sin compilador).
- **Nunca edites `app.js` ni `index.html` a mano**: se generan con `./src/build.sh`, que además actualiza la versión de caché de `sw.js` para que el iPhone baje la versión nueva.
- Para publicar: `./src/build.sh`, probar que cargue (servidor local `forja-local` en `.claude/launch.json`, puerto 8765), commit y push a `main`.

## Datos (Supabase, proyecto "forja", ref `jwwsbmutqdfvirxuugtg`)

- Acceso desde la Mac: `npx -y supabase@latest db query --remote=jwwsbmutqdfvirxuugtg "<sql>"` (agregá `--read-only` para consultas; para escribir, el CLI pide `--yes`, que se pasa solo después de mi OK).
- Todo está en la tabla `public.forja_docs` (`user_id`, `path`, `parent`, `data` jsonb, `updated_at`). Hay un solo usuario.
- Rutas, donde `<uid>` es el `user_id`:
  - `data/users/<uid>/profile` → rutinas (`routines[].slots[]` con `ex[]` = ids de ejercicios, `sets`, `rmin`, `rmax`, `rest`, `rot`), `settings`, `injury {area, side, since, status}` (`side`: `"der"` | `"izq"` | null), `height` (cm), `custom` (ejercicios propios), `exNotes`, `plan`
  - `data/users/<uid>/body` → `entries [{d: "AAAA-MM-DD", kg}]`
  - `data/users/<uid>/profile/workouts/<id>` → entrenamientos `{id, name, routineId, start (ms), end, dur (s), ex: [{id, n, sets: [{t: "n"|"w"|"d"|"f", w (kg), r}]}], note, vol, nsets}`
  - `data/users/<uid>/profile/days/<AAAA-MM-DD>` → registro del día (texto, dolor, energía)
- La columna `parent` es la ruta sin el último segmento.
- Al editar un documento, poné `data.device = "mac"` y `data.updatedAt = Date.now()` en ms, así la app del iPhone toma el cambio.

## Reglas

- Antes de cualquier cambio en los datos, mostrame qué vas a modificar y esperá mi OK.
- Nunca borres datos sin preguntar.
- No guardes claves en archivos del repo.
