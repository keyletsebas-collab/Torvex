# Torneos escolares

Plataforma web para organizar y seguir torneos escolares de **Baseball5**, **Basket 3x3** y **Voleibol**.
Cada deporte tiene su propia página y funciona por **temporadas**: para jugar otro torneo se crea una temporada nueva.

## Qué puede hacer

- **Páginas por deporte:** Partidos, Tabla, Equipos, Fechas, Stats, Historial, Reglas y Ajustes.
- **Formatos de competición:** liga (con ida y vuelta), eliminación directa (con series "mejor de 3/5/7" y tercer lugar), fase de grupos + llaves y doble eliminación.
- **Marcador en vivo** con reglas propias de cada deporte, línea de tiempo, estadísticas por jugador, tarjetas y suspensiones.
- **Estados de partido:** programado, en curso, finalizado, aplazado y cancelado, con filtros por estado y equipo.
- **Tablas automáticas** con puntos y desempates configurables.
- **Calendario automático** por canchas y horarios.
- **Panel de administración** (organizadores y árbitros): resumen con avisos, partidos en vivo, de hoy, sin fecha y aplazados, temporadas, personas y solicitudes, noticias, historial de cambios y respaldos.
- **Roles:** organizador, árbitro, entrenador, jugador y espectador.
- **Historial de cambios** y confirmación antes de corregir resultados oficiales.
- **Escudos de equipos** (los suben el organizador o el entrenador) que aparecen en tarjetas, tablas, marcador y listas.
- **Noticias y anuncios** con borrador y publicación, autor y fecha.
- **Historial de temporadas** con palmarés (títulos por equipo), campeón, subcampeón, tercer lugar y totales.
- Asistencia, comentarios, predicciones, perfiles con foto, inscripciones, diplomas (PNG y PDF), compartir por WhatsApp y pantalla grande.

## Estructura

```
src/index.template.html   Esqueleto de la página
src/styles.css            Estilos
src/js/                   Código por tema (01-estado, 02-formatos, 03-clasificacion, 04-vivo,
                          05-vistas, 06-social-admin, 07-admin, 07-exportar, 08-app)
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

Las pruebas cargan `index.html` en un entorno simulado y comprueban formatos, tablas, desempates, permisos, estados, historial, marcador en vivo y generación de PDF. **No prueban el diseño visual ni el funcionamiento real en un navegador con varias personas.** Eso hay que revisarlo a mano.

## Cómo funciona la publicación

La app **no tiene inicio de sesión**: siempre funciona en **modo local**. Los datos se guardan solo en el dispositivo (navegador) donde se usa, y quien la abre tiene permisos de organizador. Se puede publicar como página estática (por ejemplo GitHub Pages) o abrir `index.html` directamente.

Si la página se publica en claude.ai, solo se usa su servicio de **descargas** de archivos. Ya no se usan la cuenta de Claude ni la base de datos compartida.

## Límites conocidos (léelos antes de usarlo con alumnos)

- Los permisos se aplican en la pantalla. En el servidor solo se distingue entre ver, colaborar y editar según cómo compartas la página. Una persona con permiso de colaborador y conocimientos técnicos podría alterar comentarios, votos, asistencias o el historial de cambios.
- El historial de cambios **no es a prueba de manipulaciones**.
- No se puede saber con certeza si alguien sin cuenta de Claude puede abrir la página. Compruébalo con una ventana privada.
- Los **borradores de noticias** se ocultan en la pantalla a quien no es organizador, pero no están protegidos en el servidor.
- Los escudos son imágenes pequeñas (96 px) guardadas en la base compartida; cada temporada tiene un espacio limitado para ellos.
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
