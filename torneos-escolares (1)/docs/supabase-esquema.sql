-- ESQUEMA PROPUESTO PARA MIGRAR A SUPABASE (PostgreSQL)
-- ATENCIÓN: NO ESTÁ PROBADO. Revísalo y pruébalo en un proyecto de prueba antes de usarlo.
-- Cubre los datos que hoy guarda la app y reglas de acceso por fila (RLS) que sí se aplican en el servidor.

create type deporte as enum ('beis', 'bas3', 'vol');
create type formato as enum ('liga', 'elim', 'grupos', 'dele');
create type rama as enum ('f', 'm');   -- femenino y masculino
create type rol_usuario as enum ('superadmin', 'coordinador', 'anotador', 'arbitro', 'representante', 'jugador', 'visitante');
create type estado_partido as enum ('programado', 'aplazado', 'cancelado');

-- Perfil público mínimo de cada cuenta (Supabase Auth guarda el correo y la contraseña cifrada)
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  curso text check (char_length(curso) <= 30),
  rol rol_usuario not null default 'visitante',
  equipo_id uuid,                       -- equipo del representante o jugador
  creado timestamptz not null default now()
);

create table ediciones (
  id uuid primary key default gen_random_uuid(),
  deporte deporte not null,
  rama rama not null,
  nombre text not null,
  formato formato not null default 'liga',
  config jsonb not null default '{}',   -- series, desempates, puntos, cupo, reglamento...
  archivada boolean not null default false,
  creado timestamptz not null default now()
);

create table equipos (
  id uuid primary key default gen_random_uuid(),
  edicion_id uuid not null references ediciones on delete cascade,
  nombre text not null,
  entrenador text,
  escudo_url text,
  unique (edicion_id, nombre)
);

create table jugadores (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos on delete cascade,
  nombre_deportivo text not null,
  numero text, posicion text,
  titular boolean not null default false,
  capitan boolean not null default false
);

create table partidos (
  id uuid primary key default gen_random_uuid(),
  edicion_id uuid not null references ediciones on delete cascade,
  fase text not null default 'regular',          -- grupo, ronda, ganadores, perdedores, final...
  orden int not null default 0,
  local_id uuid references equipos, visita_id uuid references equipos,
  marcador_local int, marcador_visita int,
  ganador_id uuid references equipos,
  estado estado_partido not null default 'programado',
  fecha date, hora time, cancha text,
  en_vivo jsonb,                                 -- estado del marcador en vivo
  finalizado boolean not null default false,
  check (local_id is distinct from visita_id)
);

create table eventos_partido (
  id bigint generated always as identity primary key,
  partido_id uuid not null references partidos on delete cascade,
  equipo text not null check (equipo in ('a', 'b')),
  tipo text not null,                            -- punto, carrera, ace, bloqueo, falta, tarjeta amarilla/roja
  jugador_id uuid references jugadores,
  etiqueta text, valor int default 1,
  creado timestamptz not null default now()
);

create table noticias (
  id uuid primary key default gen_random_uuid(),
  texto text not null check (char_length(texto) <= 200),
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  autor uuid not null references perfiles,
  creado timestamptz not null default now()
);

-- Historial: solo se inserta; nadie puede editarlo ni borrarlo desde la app
create table historial (
  id bigint generated always as identity primary key,
  usuario uuid references perfiles,
  edicion_id uuid references ediciones on delete set null,
  accion text not null, detalle text,
  creado timestamptz not null default now()
);

-- Datos de la liga (nombre, descripción, contacto, reglamentos): una sola fila
create table configuracion (
  id int primary key default 1 check (id = 1),
  datos jsonb not null default '{}'
);
alter table configuracion enable row level security;
create policy "ver configuracion" on configuracion for select using (true);
create policy "superadmin edita configuracion" on configuracion for all using (es_superadmin()) with check (es_superadmin());

-- Funciones auxiliares para las reglas
create function mi_rol() returns rol_usuario language sql stable security definer as
  $$ select rol from perfiles where id = auth.uid() $$;
create function es_organizador() returns boolean language sql stable security definer as
  $$ select coalesce(mi_rol() in ('superadmin', 'coordinador'), false) $$;
create function es_superadmin() returns boolean language sql stable security definer as
  $$ select coalesce(mi_rol() = 'superadmin', false) $$;
create function puede_anotar() returns boolean language sql stable security definer as
  $$ select coalesce(mi_rol() in ('superadmin', 'coordinador', 'anotador', 'arbitro'), false) $$;

alter table perfiles enable row level security;
alter table ediciones enable row level security;
alter table equipos enable row level security;
alter table jugadores enable row level security;
alter table partidos enable row level security;
alter table eventos_partido enable row level security;
alter table noticias enable row level security;
alter table historial enable row level security;

-- Lectura pública (visitantes) de lo que es público
create policy "ver ediciones" on ediciones for select using (true);
create policy "ver equipos" on equipos for select using (true);
create policy "ver partidos" on partidos for select using (true);
create policy "ver noticias publicadas" on noticias for select using (estado = 'publicado' or es_organizador());
-- Los jugadores (menores) solo los ven personas con cuenta y rol de participante
create policy "ver jugadores" on jugadores for select
  using (auth.uid() is not null and mi_rol() in ('superadmin', 'coordinador', 'anotador', 'arbitro', 'representante', 'jugador'));
create policy "ver eventos" on eventos_partido for select
  using (auth.uid() is not null and mi_rol() in ('superadmin', 'coordinador', 'anotador', 'arbitro', 'representante', 'jugador'));
create policy "ver mi perfil" on perfiles for select using (id = auth.uid() or es_organizador());
create policy "ver historial" on historial for select using (es_organizador());

-- Escritura: se comprueba en el servidor, no solo en la pantalla
create policy "organizador gestiona ediciones" on ediciones for all using (es_organizador()) with check (es_organizador());
create policy "organizador gestiona equipos" on equipos for all using (es_organizador()) with check (es_organizador());
create policy "organizador o entrenador editan plantilla" on jugadores for all
  using (es_organizador() or (mi_rol() = 'representante' and equipo_id = (select equipo_id from perfiles where id = auth.uid())))
  with check (es_organizador() or (mi_rol() = 'representante' and equipo_id = (select equipo_id from perfiles where id = auth.uid())));
create policy "organizador y arbitro anotan" on partidos for update using (puede_anotar()) with check (puede_anotar());
create policy "organizador crea partidos" on partidos for insert with check (es_organizador());
create policy "organizador borra partidos" on partidos for delete using (es_organizador());
create policy "anotadores registran eventos" on eventos_partido for all using (puede_anotar()) with check (puede_anotar());
create policy "organizador gestiona noticias" on noticias for all using (es_organizador()) with check (es_organizador() and autor = auth.uid());
create policy "cada quien edita su perfil sin cambiar su rol" on perfiles for update
  using (id = auth.uid()) with check (id = auth.uid() and rol = (select rol from perfiles where id = auth.uid()));
create policy "solo el superadmin cambia roles" on perfiles for update using (es_superadmin()) with check (es_superadmin());
create policy "registrar cambios" on historial for insert with check (usuario = auth.uid());
-- (no hay políticas de update ni delete sobre historial: queda inalterable desde la app)
