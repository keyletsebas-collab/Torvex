# Lista de prueba manual

Las pruebas automáticas no usan un navegador real ni varias cuentas. Esta lista cubre lo que **solo puedes comprobar tú**. Hazla con al menos **dos dispositivos** (por ejemplo tu celular y una computadora) y **tres cuentas** de prueba: una de organizador (la tuya), otra para árbitro y otra para espectador.

Marca cada punto como ✅ o ❌ y anota qué pasó si falla.

## 0. Preparación
1. Comparte la página y da permiso de **colaborador** a las cuentas de árbitro y espectador.
2. En el panel de administración, pestaña **Personas**, asigna el rol de árbitro a una cuenta.
3. Abre el enlace en una **ventana privada, sin iniciar sesión**. Anota qué se ve: esta es la prueba más importante para saber si los visitantes pueden entrar.

## 0.1 Diseño y menú
1. En el celular, el botón ☰ abre el menú lateral y se cierra al elegir una sección.
2. En la computadora el menú está siempre visible.
3. Las páginas públicas son claras; el panel de administración es oscuro y tiene su propio menú.
4. Recorre las 9 secciones del menú y revisa que cada filtro funcione.

## 1. Coordinador deportivo o superadministrador
1. Inicio → ⚾ Baseball5 → **Nueva edición** → ponle nombre.
2. En **Ajustes** elige formato y agrega 4 equipos. Genera los partidos.
3. En **Equipos** agrega un jugador a un equipo y sube un **escudo** (foto del celular).
4. En **Fechas** usa **Programar partidos** y revisa que no haya dos partidos del mismo equipo a la misma hora.
5. Abre un partido → **Anotar en vivo** → elige un jugador → suma carreras → **Finalizar partido**.
6. Corrige el marcador de un partido ya terminado: **debe pedir confirmación**.
7. Marca un partido como **Aplazado** y comprueba que desaparece su fecha.
8. Revisa la **Tabla**, el **Historial de cambios** (pestaña Cambios) y las **Stats**.
9. Panel de administración → **Respaldo** → descarga el JSON.
10. Descarga un **diploma en PDF** y ábrelo.

11. Crea una edición en **Femenino** y otra en **Masculino** del mismo deporte. Comprueba que cada una muestra solo sus equipos y su tabla, y que Inicio muestra las dos.
12. Si tenías ediciones de antes, comprueba que aparecen en el aviso **Ediciones sin rama** y asígnales una.

## 1.5 Manager y capitán
1. En el panel, Personas, asigna a una cuenta el rol **Manager de equipo** con un equipo, y a otra el rol **Capitán** del mismo equipo.
2. El manager entra a **Mi equipo**: agrega jugadores, cambia titulares y banca, sube el escudo y confirma asistencia.
3. El capitán entra a **Mi equipo**: solo cambia titulares y banca y confirma asistencia. No debe poder agregar ni quitar jugadores.
4. Un jugador entra a **Mi equipo** y solo ve la información, sin botones de edición.
5. Comprueba que el número del menú baja al confirmar la asistencia.

## 2. Árbitro
1. Entra con la cuenta de árbitro. En Cuenta debe decir que su rol es Árbitro.
2. Puede abrir un partido y anotar en vivo.
3. **No** debe ver botones para generar partidos, archivar, eliminar ni cambiar ajustes.
4. En el panel solo ve **Resumen** y **Partidos**.

## 3. Espectador y visitante
1. En un partido, vota en **¿Quién gana?** antes de que empiece. Comprueba que se cierra al iniciar el partido.
2. Escribe un comentario y reacciona con 🔥.
3. En **Equipos** no deben verse nombres de jugadores. No debe haber pestaña **Stats**.
4. No debe aparecer el panel de administración.
5. Cierra sesión de Claude y repite en la ventana privada: ¿qué se ve y qué no?

## 4. Dos dispositivos a la vez
1. Con el organizador en el celular, anota un punto en vivo. En el otro dispositivo, **¿se actualiza solo y en cuánto tiempo?**
2. En basket 3x3, inicia el reloj en uno y mira el otro. **¿Se desfasa?** Anota cuántos segundos.
3. Activa en Cuenta "Avisarme de todos los partidos" y revisa que llegue el aviso dentro de la página.

## 5. Teléfono
1. La barra de abajo no tapa contenido ni botones.
2. Las tablas anchas se deslizan hacia los lados.
3. Los botones se pueden tocar sin errores.
4. La pantalla grande se ve bien en una pantalla externa.

## Cuando algo falle
Anota: qué cuenta usabas, en qué pantalla estabas, qué tocaste y qué esperabas. Con eso se puede corregir rápido.
