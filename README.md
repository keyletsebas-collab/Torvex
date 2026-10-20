# Torvex

Aplicación para organizar torneos escolares de Baseball5, Basket 3x3 y voleibol. La app de escritorio y móvil usa .NET MAUI con `HybridWebView`; la interfaz y la lógica del torneo son HTML, CSS y JavaScript. No usa Blazor.

## Estructura

- `src/Torvex.App/`: contenedor MAUI y recursos de la app.
- `src/Torvex.Core/`: modelos, formatos, resultados, clasificación y marcador en vivo.
- `tests/Torvex.Core.Tests/`: pruebas del núcleo .NET.
- `legacy-web/`: interfaz web activa, con acceso por correo y contraseña usando Supabase, y pruebas de navegador simuladas. Su compilación también actualiza la página que carga MAUI.
- `torneos-escolares (1)/`: copia antigua con inicio de sesión de Claude; no es la fuente activa.
- `docs/`: arquitectura, reglas, integración con Supabase y guía de revisión manual.

## Compilar la interfaz web y sincronizarla con MAUI

Se necesita Node.js 20 o posterior. Desde PowerShell, ejecuta:

```powershell
Set-Location "legacy-web"
npm run build
```

El comando genera `legacy-web/index.html` y sincroniza ese mismo archivo en `src/Torvex.App/wwwroot/index.html`, que es la interfaz inicial de `HybridWebView`. Edita los archivos de `legacy-web/src/`, no los HTML generados.

Para abrir la solución MAUI, usa `Torvex.sln` en Visual Studio. La app conserva el almacenamiento local del navegador cuando se ejecuta en modo local. El acceso web usa correo y contraseña con Supabase.

## Pruebas

Las pruebas web se ejecutan desde `legacy-web/` con `npm test`. Las pruebas del núcleo .NET están en `tests/Torvex.Core.Tests/` y se ejecutan desde la solución en Visual Studio o con `dotnet test`.

Las pruebas no sustituyen la revisión manual de la interfaz y los flujos descritos en `docs/prueba-manual.md`.
