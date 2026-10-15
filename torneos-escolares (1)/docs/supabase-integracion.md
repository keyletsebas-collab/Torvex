# Conectar Supabase: qué falta exactamente

**Hoy la página NO está conectada a Supabase.** Los datos se guardan en la base compartida de la plataforma donde está publicada. No hay código de Supabase en `src/`, y no lo escribí a ciegas porque no puedo probarlo desde aquí (sin acceso a internet ni a tu cuenta).

## Por qué no se puede conectar desde la página publicada
La página publicada en claude.ai solo puede comunicarse con servicios propios de esa plataforma. Una llamada a Supabase se bloquea. Para usar Supabase hay que **publicar `index.html` en otro lugar**, por ejemplo GitHub Pages o Netlify.

## Lo que necesito de ti (no lo compartas por aquí en público)
1. Un proyecto de Supabase creado por ti.
2. La **URL del proyecto** y la **clave pública `anon`**. Esas dos sí pueden ir en el código. **Nunca** pongas la clave `service_role` en la página ni en GitHub.
3. Dónde vas a publicar la página (GitHub Pages u otro).
4. Decidir cómo iniciarán sesión las personas (correo y contraseña, o enlace por correo). Supabase Auth guarda las contraseñas cifradas.

## Pasos
1. Ejecuta `docs/supabase-esquema.sql` en un proyecto **de prueba** y revisa las reglas de acceso con una cuenta de cada rol. El SQL no está probado.
2. Con la URL y la clave, se escribe una capa de datos que reemplace `save()`, `put()` y las suscripciones de `boot()` por llamadas a Supabase. La lógica de formatos, tablas y marcador se conserva.
3. Se exportan los datos actuales (panel de administración, Configuración, Respaldo) y se cargan con un script.
4. Se prueba con `npm test` y con `docs/prueba-manual.md`.

## Costos
Supabase tiene un plan gratuito con límites. **Revisa los precios y las condiciones vigentes** antes de decidir. No usaré ningún servicio de pago sin tu autorización.

## Roles en el servidor
El esquema ya incluye los roles: superadmin, coordinador, anotador, árbitro, representante, jugador y visitante. Con las reglas de acceso por fila, un colaborador ya no podría saltarse su rol, que es la limitación principal de la versión actual.
