#!/bin/bash
# Arma app.js e index.html de la app (carpeta de arriba) a partir de estas partes.
set -e
cd "$(dirname "$0")"
{ echo "(function () {"; cat p2_core.js p3_logic.js p4_ui.js p5_views.js p6_more.js p7_workout.js p9_day.js pB_body.js pC_photo.js p8_sheets.js; echo "})();"; } > app.js
node --check app.js && echo "sintaxis ok"
python3 build-pwa.py
