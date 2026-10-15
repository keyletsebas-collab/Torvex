# Torneos escolares

Plataforma web para organizar y seguir torneos escolares de **Baseball5**, **Basket 3x3** y **Voleibol**.
Cada deporte tiene su propia página y funciona por **ediciones**: para jugar otro torneo se crea una edición nueva.

## Qué puede hacer

**Sitio público** (tema claro, menú lateral):
- **Inicio:** tarjetas de resumen, torneos activos, actividad reciente, próximos partidos en tarjetas, resultados recientes, clasificaciones destacadas y deportes.
- **Torneos:** todas las ediciones con filtros por deporte y rama.
- **Deportes:** Baseball5, Basket 3x3 y Voleibol, cada uno con su lógica, sus reglas y sus dos ramas (femenino y masculino).
- **Calendario**, **Resultados** y **Clasificaciones** con filtros por fecha, deporte, rama, torneo, equipo y estado.
- **Equipos** con escudo y ficha: resultados y estadísticas (la plantilla solo la ven participantes con cuenta).
- **Noticias y anuncios** con borrador y publicación, e **Información de la liga**.
- **Acceso** con la cuenta de Claude.

**Panel de administración** (tema oscuro, menú lateral agrupado con contadores): resumen con tarjetas, próximos eventos, clasificación, acciones rápidas y avisos; torneos y ediciones, deportes y reglamentos, equipos y jugadores, calendarios y partidos, resultados y marcadores, clasificaciones y estadísticas, noticias, usuarios y permisos, historial y configuración (incluye respaldos).

**Funciones:**
- Formatos: liga (con ida y vuelta), eliminación directa (con series y tercer lugar), grupos + llaves y doble eliminación.
- Marcador en vivo con reglas por deporte, línea de tiempo, estadísticas por jugador, tarjetas y suspensiones.
- Estados de partido: programado, en curso, finalizado, aplazado y cancelado.
- Tablas automáticas con puntos y desempates configurables, y calendario automático por canchas.
- **Modo manager y capitán** (pantalla **Mi equipo**): pendientes, próximos partidos con confirmación de asistencia, plantilla y alineación. El manager edita todo su equipo; el capitán arma la alineación y confirma asistencia; el jugador solo mira.
- **Roles:** superadministrador, coordinador deportivo, anotador, árbitro, manager de equipo, capitán, jugador y visitante.
- Historial de cambios, confirmación al corregir resultados oficiales, escudos, comentarios, predicciones, perfiles, inscripciones, diplomas (PNG y PDF), compartir por WhatsApp y pantalla grande.

## Estructura

```
src/index.template.html   Esqueleto de la página
src/styles.css            Estilos
src/js/                   Código por tema (01-estado, 02-formatos, 03-clasificacion, 04-vivo,
                          05-vistas, 06-social-admin, 07-admin, 07-exportar, 07-publico, 08-app)
build.js                  Une todo en un solo index.html
index.html                Página lista para publicar (se genera; no se edita a mano)
tests/                    Pruebas automáticas
docs/                     Arquitectura, reglas, esquema de base de datos y guía de migración
```

**Para cambiar algo, edita los archivos de `src/` y corre `npm run build`.** Si editas `index.html` directamente, tu cambio se pierde en el siguiente build.

## Cómo correr las pruebas

Necesitas [Node.js](https://nodejs.org) versión 20 o mayor. No hay que instalar paquetes.

```
npm test
```

`npm test` primero genera `index.html` desde `src/` y luego corre las pruebas.

Las pruebas cargan `index.html` y, además de la lógica, recorren los flujos completos de organizador, árbitro y espectador y revisan que ningún botón quede sin función, que no haya etiquetas sin cerrar ni ids repetidos y que las acciones comprueben el permiso.
Las pruebas cargan `index.html` en un entorno simulado y comprueban formatos, tablas, desempates, permisos, estados, historial, marcador en vivo y generación de PDF. **No prueban el diseño visual ni el funcionamiento real en un navegador con varias personas.** Eso se revisa a mano con `docs/prueba-manual.md`.

## Cómo funciona la publicación

La app está pensada para publicarse como página de claude.ai. Esa plataforma le da tres cosas:

- **Inicio de sesión** con la cuenta de Claude de cada persona.
- **Base de datos compartida** (las colecciones están descritas en `docs/arquitectura.md`).
- **Descargas** de archivos.

Si abres `index.html` directamente en un navegador o lo subes a GitHub Pages, funciona en **modo local**: los datos se guardan solo en ese dispositivo, sin cuentas ni roles reales.

## Límites conocidos (léelos antes de usarlo con alumnos)

- Los permisos se aplican en la pantalla. En el servidor solo se distingue entre ver, colaborar y editar según cómo compartas la página. Una persona con permiso de colaborador y conocimientos técnicos podría alterar comentarios, votos, asistencias o el historial de cambios.
- El historial de cambios **no es a prueba de manipulaciones**.
- No se puede saber con certeza si alguien sin cuenta de Claude puede abrir la página. Compruébalo con una ventana privada.
- Los **borradores de noticias** se ocultan en la pantalla a quien no es organizador, pero no están protegidos en el servidor.
- Los escudos son imágenes pequeñas (96 px) guardadas en la base compartida; cada edición tiene un espacio limitado para ellos.
- Los datos de jugadores (nombres y fotos) solo se ven con cuenta y rol de participante. No publiques datos personales innecesarios.

## Cómo agregar un deporte

El código aún no es totalmente modular. Para un deporte nuevo hay que tocar estos puntos de `index.html`:

1. `SP` en `src/js/01-estado.js` (iconos, unidad del marcador, si admite empates, posiciones y máximo de titulares), `SPN`, `SPI` y `REG` (reglas de la pestaña Reglas).
2. `newLive`, `sync` y `liveAct` (estado inicial del marcador en vivo, cómo se calcula el marcador y qué hace cada botón).
3. `vVivo0` (botones y detalles de la pantalla En vivo).
4. `awardPts` si el deporte puntúa distinto en la tabla.
5. La barra de navegación y la lista de deportes de `vInicio`.
6. Una prueba nueva en `tests/`.

## Pendiente

Si se necesita seguridad real (permisos en el servidor, historial inalterable, borradores realmente privados), un backend propio, por ejemplo Supabase. Ver `docs/arquitectura.md`. También queda por unificar el código que creció por capas y por separar CSS, lógica y vistas.
