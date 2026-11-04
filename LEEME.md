# Forja · app independiente

Forja como app propia: ícono en el inicio, pantalla completa, sin zoom y funcionando sin señal en el gimnasio.
Tus datos se guardan en tu base de Supabase y las funciones con Claude (dictado, foto, coach, planes) usan tu clave de Anthropic.

Son 4 pasos. Ninguna clave va dentro de los archivos: las cargás en la app, y quedan guardadas solo en tu teléfono.

---

## 1. Base de datos (Supabase, gratis) · 5 min

1. Entrá a https://supabase.com, creá una cuenta y tocá **New project**. Ponele de nombre `forja`, inventá una contraseña de base de datos (no la vas a necesitar en la app) y elegí la región **São Paulo**, que es la más cercana.
2. Cuando termine de crearse, andá a **SQL Editor → New query**, pegá todo el contenido de `supabase-setup.sql` y tocá **Run**. Tiene que decir "Success".
3. Andá a **Authentication → Sign In / Providers → Email** y desactivá **Confirm email**. Así podés entrar sin confirmar el mail. Es opcional: si lo dejás activado, vas a tener que confirmar desde el mail.
4. Andá a **Project Settings → API** y copiá dos datos:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public** key (un texto largo que empieza con `eyJ...`)

   La clave "anon" se puede usar en el teléfono sin problema: la tabla tiene reglas para que cada usuario vea solo sus propios datos. **Nunca uses la clave "service_role" en la app.**

## 2. Clave de Claude (Anthropic) · 3 min · opcional

1. Entrá a https://console.anthropic.com y creá una cuenta.
2. En **Billing**, cargá saldo: con 5 USD alcanza para muchísimas consultas. Te recomiendo poner un **límite de gasto mensual**.
3. En **API Keys → Create Key**, creá una clave y copiala. Empieza con `sk-ant-`.

Sin esta clave la app funciona igual, pero sin dictado, sin cargar desde foto, sin coach y sin generar planes.

## 3. Publicar la app (GitHub Pages, gratis) · 5 min

1. Entrá a https://github.com, creá una cuenta y tocá **New repository**. Nombre: `forja`. Visibilidad: **Public**, porque las Pages gratis lo necesitan. El repositorio no lleva datos tuyos ni claves.
2. En el repositorio, tocá **Add file → Upload files** y arrastrá **todo el contenido de la carpeta `forja-app`**: `index.html`, `app.js`, `shell.js`, `sw.js`, `manifest.webmanifest` y las carpetas `icons` y `vendor`. Después tocá **Commit changes**.
   Este archivo y `supabase-setup.sql` también pueden subirse; no tienen nada privado.
3. Andá a **Settings → Pages**. En "Branch" elegí `main`, carpeta `/ (root)`, y tocá **Save**.
4. En 1 o 2 minutos aparece tu link: `https://TU-USUARIO.github.io/forja/`.

## 4. Instalarla en el iPhone · 2 min

1. Abrí el link en **Safari**.
2. Te aparece **Configurar Forja**. Pegá la Project URL, la anon key y, si la tenés, la clave de Anthropic. Tocá **Guardar**.
3. Tocá **Crear cuenta** con tu email y una contraseña (la próxima vez usás **Entrar**).
4. Tocá **Compartir → Agregar a inicio → Agregar**. Listo: el ícono de Forja queda en tu pantalla de inicio y se abre a pantalla completa.
5. Para traer lo que tenías en claude.ai: **Más → Tus datos → Importar respaldo** y elegí el archivo `forja-respaldo.json`. Pasátelo al teléfono por AirDrop, mail o iCloud Drive.
   **No subas ese archivo a GitHub:** tiene tus datos.

---

## Preguntas rápidas

- **¿Y en la computadora?** Abrí el mismo link y entrá con la misma cuenta: ves los mismos datos.
- **¿Funciona sin señal?** Sí. La app queda guardada en el teléfono; lo que registres sin conexión se sube cuando vuelve la señal (con la app abierta).
- **¿Cómo actualizo la app?** Cuando te pase archivos nuevos, subilos de nuevo al repositorio con **Upload files**, reemplazando los anteriores. El teléfono toma la versión nueva la próxima vez que abras la app con conexión.
- **¿Cambiar claves o cerrar sesión?** En **Más → Cuenta y conexiones → Configurar**.
- **¿Cuánto cuesta Claude?** La app usa Claude Opus 5.5 con esfuerzo medio. Dictar un entrenamiento o leer una foto cuesta del orden de 1 a 3 centavos de dólar, y generar un plan completo alrededor de 10 a 20 centavos.
