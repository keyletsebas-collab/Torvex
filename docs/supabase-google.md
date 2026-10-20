# Acceso con Google

Torvex delega el inicio de sesión a Google mediante Supabase Auth. No guardes el secreto de Google en el código de la app.

## Configuración

1. En Google Cloud, crea un cliente OAuth de tipo **Aplicación web**.
2. En **URIs de redireccionamiento autorizados**, agrega esta URL de callback de Supabase: `https://inzshtlemnibqjfnzctp.supabase.co/auth/v1/callback`.
3. En Supabase, activa el proveedor Google y guarda allí el Client ID y el Client Secret de Google.
4. En **Authentication → URL Configuration → Redirect URLs**, permite los destinos de Torvex que uses:
   - Sitio web: `https://tu-dominio/**`
   - Desarrollo web en esta máquina: `http://localhost:3000/**`
   - Android: `com.torvex.app://login-callback`
   - Windows MAUI: `http://127.0.0.1:*/auth-callback/**`
5. Vuelve a ejecutar `docs/supabase-cuentas.sql` en el editor SQL de Supabase para que el perfil nuevo tome el nombre que entrega Google.

La clave publishable que usa la página puede permanecer en `legacy-web/src/js/00-config.js`. El Client Secret de Google solo se configura en Supabase.

## Flujo de Torvex

- En la web, Supabase devuelve al usuario a la misma página y completa la sesión con PKCE.
- En MAUI, Google se abre en el navegador del sistema. Android vuelve por el esquema `com.torvex.app`; Windows devuelve el código a un puerto local temporal. La sesión se canjea desde el `HybridWebView` con PKCE.
- Si Google crea una cuenta nueva, el trigger crea el perfil con estado `sin_colegio`. Torvex muestra **Termina tu registro** y exige elegir el colegio, unirse con código o crear un colegio como organizador.
- Las cuentas creadas con correo y contraseña conservan el registro actual.

Supabase puede asociar automáticamente una identidad Google con una cuenta existente cuando el correo verificado coincide.
