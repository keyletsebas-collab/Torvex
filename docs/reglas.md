# Reglas que usa la plataforma

Son las reglas que la página aplica para anotar y calcular. Si tu escuela juega distinto, cada edición tiene un campo "Reglamento de la edición" que se muestra en la pestaña Reglas. La página **no cambia sus cálculos** por ese texto: solo lo muestra.

## Ramas
Cada deporte se juega en dos ramas, **femenino** y **masculino**. Cada rama tiene sus propias ediciones, equipos, tablas, campeones y estadísticas, y no se mezclan. Las reglas de juego son las mismas en las dos ramas. Si tu reglamento cambia algo (por ejemplo la duración), escríbelo en el reglamento de la edición.

## Baseball5
- 5 jugadores por equipo, pelota sin bate ni guante.
- 5 entradas; cada mitad termina con 3 outs. En vivo se anotan carreras por entrada.
- No se aceptan empates: si hay igualdad, se juegan entradas extra.

## Basket 3x3
- 3 jugadores en cancha y 1 suplente.
- 10 minutos o hasta 21 puntos. Tiros de 1 punto, o de 2 detrás del arco.
- Reloj de 10:00 con inicio y pausa. Faltas por equipo.
- No se aceptan empates: se juega tiempo extra.

## Voleibol
- Sets a 25 puntos, con diferencia de 2. Set decisivo a 15.
- Se gana con 2 sets. El marcador del partido son los sets.
- En liga: ganar por 2 o más sets da 3 puntos; ganar por 1 set da 2 y perder por 1 set da 1.

## Tabla de posiciones
- Victoria 3 puntos y empate 1 (configurable por edición). Derrota 0.
- Orden: puntos y luego hasta 3 desempates elegidos por edición: mayor diferencia, más a favor, menos en contra, más victorias, resultado entre los empatados y orden alfabético.
- Valor por defecto: diferencia y luego a favor. Si sigue el empate, se mantiene el orden de inscripción.
- La tabla se recalcula sola al corregir un resultado.

## Estados de partido
- **Programado, en curso y finalizado** se calculan solos.
- **Aplazado:** borra fecha y hora; el calendario automático lo vuelve a programar.
- **Cancelado:** no cuenta en la liga ni impide que haya campeón. En llaves, el ganador se elige a mano.

## Disciplina
- Dos tarjetas amarillas o una roja suspenden al jugador en su siguiente partido anotado en vivo.
- La página marca al jugador como suspendido, pero **no le impide jugar**: el árbitro debe respetarlo.

## Formatos
- **Liga:** todos contra todos, con opción de ida y vuelta.
- **Eliminación directa:** pases libres si el número de equipos no es potencia de 2. Series "mejor de 1, 3, 5 o 7" por ronda y para la final, y partido por el tercer lugar opcional.
- **Grupos + llaves:** 2 o 4 grupos; pasan los 2 primeros, cruzados.
- **Doble eliminación:** cuadro de ganadores, cuadro de perdedores y una gran final de un solo partido (sin reinicio).
