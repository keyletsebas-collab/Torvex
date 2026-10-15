# Arquitectura

## Idea general

Una sola página (`index.html`) que dibuja todo con JavaScript. No usa librerías externas, salvo fuentes de Google. Los datos viven en una base compartida que ofrece la plataforma donde se publica. Cuando esa base no existe, la app usa `localStorage` ("modo local").

## Modelo de datos

Una **temporada** es un documento con estos campos principales (colección `torneos`):

| Campo | Qué es |
|---|---|
| `id`, `name`, `sport` | Identificador, nombre y deporte (`beis`, `bas3`, `vol`) |
| `type` | Formato: `liga`, `elim`, `grupos` o `dele` |
| `teams` | Nombres de los equipos |
| `ro` | Plantillas: `ro[equipo] = { coach, pl: [{ n, num, pos, st, cap }] }` |
| `matches` / `rounds` / `gr` / `de` / `tp` | Partidos según el formato (liga, rondas de llaves, grupos, doble eliminación, tercer lugar) |
| `bo`, `boF`, `dbl`, `ng`, `third` | Serie por ronda, serie de la final, ida y vuelta, número de grupos, tercer lugar |
| `pw`, `pd`, `tb` | Puntos por victoria, por empate y orden de desempates |
| `open`, `cupo`, `maxp` | Inscripción abierta, cupo de equipos, máximo de jugadores |
| `rules`, `arch` | Reglamento propio y si está archivada |

Un **partido** tiene `a`, `b` (equipos), `sa`, `sb` (marcador), `w` (ganador en llaves), `est` (aplazado o cancelado), `date`, `time`, `court`, `live` (marcador en vivo con `ev` = eventos) y, en series, `bo` y `g` (juegos).

## Colecciones de la base compartida y quién puede escribir

| Colección | Para qué | Lectura | Escritura |
|---|---|---|---|
| `torneos` | Temporadas | ver | colaborar |
| `roles` | Rol de cada persona | ver | editor |
| `solicitudes` | Peticiones de rol | editor | editor (cada persona la suya, colaborar) |
| `inscripciones` | Peticiones de equipo | colaborar | colaborar |
| `anuncios` | Noticias (campo `st`: borrador o publicado) | ver | colaborar |
| `escudos` | Escudos de equipos, un documento por temporada (`logos[equipo]`) | ver | colaborar |
| `historial` | Registro de cambios importantes | colaborar | colaborar |
| `comentarios`, `asistencia` | Interacción en partidos | ver | colaborar |
| `perfiles`, `predicciones` | Perfil y votos | ver | editor (cada persona el suyo, colaborar) |

"Ver", "colaborar" y "editor" son los permisos de compartir de la plataforma.

## Permisos: pantalla frente a servidor

- **En el servidor** solo existen tres niveles: ver, colaborar y editor.
- **En la pantalla** se aplican los roles (`organizador`, `arbitro`, `entrenador`, `jugador`, `espectador`) con las funciones `isOrg`, `canScore`, `canRoster` y `pub`.

Por eso un colaborador con conocimientos técnicos podría saltarse un rol. Para seguridad real se necesita un backend con reglas por fila. Si se migra a Supabase, el plan sería:

1. Tablas: `usuarios`, `deportes`, `temporadas`, `equipos`, `jugadores`, `partidos`, `eventos`, `noticias` e `historial`.
2. Autenticación por correo con contraseña manejada por el proveedor.
3. Reglas de acceso por fila según el rol.
4. Historial escrito solo por el servidor.

El esquema propuesto está en `docs/supabase-esquema.sql` (no probado) y los pasos en `docs/migracion-supabase.md`.

Costo: reescribir la capa de guardado (hoy hay un `save()` y suscripciones en `boot()`). La lógica de torneos, tablas y marcador se puede conservar.

## Mapa del código (`src/js/`)

- **01-estado:** datos base, `load`, `save`, permisos (`myRole`, `isOrg`, `canScore`, `canRoster`, `pub`), temporadas (`seasons`, `pickSeason`).
- **02-formatos:** `generate`, `genGroups`, `genKO`, `genDE`, `setWin`, `deWin`, `serie`.
- **03-clasificacion:** `table`, `rank`, `awardPts`, `champ`, `estOf`, `discipline`, `statsOf`.
- **04-vivo:** `newLive`, `liveAct`, `finishLive`, `vVivo`, línea de tiempo.
- **05-vistas:** pantallas (`render`, `vInicio`, `vDep`, `vTorneo`, tarjetas, tablas, filtros, escudos).
- **06-social-admin:** roles (`viewR`), historial de cambios (`logAct`, `logHtml`), calendario automático, comentarios, predicciones, perfiles, inscripciones.
- **07-admin:** panel de administración (`vAdmin`), respaldo y restauración, noticias.
- **07-exportar:** compartir, diplomas, imágenes y PDF.
- **08-app:** `boot` (usuario, base de datos y suscripciones), eventos y arranque.

## Decisiones y deuda técnica

- El código ya está separado en `src/` y `build.js` lo une en un solo `index.html`, porque la página se publica como archivo único. Falta pasar a módulos reales.
- Algunas funciones envuelven a otras (`vVivo` envuelve a `vVivo0`, `card` a `card0`). Es un residuo del crecimiento por capas y se puede unificar.
- Los deportes comparten una estructura común, pero cada uno tiene ramas propias en `liveAct`. Falta un registro de deportes realmente modular.
