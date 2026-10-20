-- =====================================================================
-- TORNEOS ESCOLARES: SQL COMPLETO PARA SUPABASE
-- Cuentas con correo, colegios, aprobación del organizador, cargos y datos de la app.
--
-- CÓMO USARLO
--  1. Supabase > SQL Editor > New query > pega TODO este archivo > Run.
--  2. Authentication > Providers > Email: DESACTIVA "Confirm email".
--     (La aprobación del organizador reemplaza la confirmación por correo.)
--  3. NO ejecutes docs/supabase-esquema.sql: este archivo lo reemplaza.
--
-- Se puede volver a ejecutar sin romper nada (no borra datos).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. TABLAS
-- =====================================================================

-- Colegios. La contraseña se guarda cifrada (bcrypt) y NUNCA se puede leer desde la app.
-- "codigo" es el código que el organizador reparte a estudiantes y participantes.
create table if not exists public.colegios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  clave_hash text not null,
  codigo text not null unique,
  creado timestamptz not null default now()
);
create unique index if not exists colegios_nombre_unico on public.colegios (lower(btrim(nombre)));

-- Un perfil por cuenta (el correo y la contraseña los guarda Supabase Auth).
--  estado: sin_colegio (cuenta creada, falta elegir colegio)
--          pendiente   (espera la aprobación de un organizador)
--          aprobado    (ya puede entrar a la app)
create table if not exists public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  colegio_id uuid references public.colegios on delete set null,
  estado text not null default 'sin_colegio' check (estado in ('sin_colegio', 'pendiente', 'aprobado')),
  rol text not null default 'espectador'
    check (rol in ('organizador', 'anotador', 'arbitro', 'entrenador', 'capitan', 'jugador', 'espectador')),
  equipo text not null default '',
  creado timestamptz not null default now()
);
create index if not exists perfiles_colegio on public.perfiles (colegio_id);

-- Datos de la app (torneos, asistencia, comentarios, noticias, escudos, historial, configuración...).
-- Cada colegio ve solo lo suyo.
create table if not exists public.docs (
  colegio_id uuid not null references public.colegios on delete cascade,
  col text not null check (char_length(col) between 1 and 40),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null default '{}' check (octet_length(data::text) <= 1000000),
  actualizado timestamptz not null default now(),
  primary key (colegio_id, col, id)
);
create index if not exists docs_por_coleccion on public.docs (colegio_id, col);

create or replace function public.docs_marca_tiempo() returns trigger
language plpgsql set search_path = public as $$
begin
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists docs_marca_tiempo on public.docs;
create trigger docs_marca_tiempo before insert or update on public.docs
  for each row execute function public.docs_marca_tiempo();

-- =====================================================================
-- 2. FUNCIONES AUXILIARES (las usan las reglas de seguridad)
-- =====================================================================

-- Colegio de la persona que consulta (solo si ya fue aprobada; si no, nulo).
create or replace function public.mi_colegio() returns uuid
language sql stable security definer set search_path = public as
$$ select colegio_id from public.perfiles where id = auth.uid() and estado = 'aprobado' $$;

-- Cargo de la persona que consulta (solo si ya fue aprobada; si no, nulo).
create or replace function public.mi_cargo() returns text
language sql stable security definer set search_path = public as
$$ select rol from public.perfiles where id = auth.uid() and estado = 'aprobado' $$;

create or replace function public.es_organizador() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select rol = 'organizador' from public.perfiles where id = auth.uid() and estado = 'aprobado'), false) $$;

-- Quién puede escribir cada tipo de dato (se comprueba en el servidor, no solo en la pantalla).
create or replace function public.puede_escribir_doc(p_col text, p_id text, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.mi_cargo() is null then false
    when public.mi_cargo() = 'organizador' then true
    when p_col in ('torneos', 'asistencia', 'escudos')
      then public.mi_cargo() in ('anotador', 'arbitro', 'entrenador', 'capitan')
    when p_col = 'historial' then true
    when p_col = 'comentarios' then coalesce(p_data ->> 'uid', '') = auth.uid()::text
    when p_col in ('predicciones', 'perfiles', 'inscripciones', 'solicitudes') then p_id = auth.uid()::text
    else false
  end
$$;

-- Código de colegio: 4 letras del nombre + 8 caracteres al azar (ej. SANJ-3F9A27C1).
create or replace function public.codigo_nuevo(p_nombre text) returns text
language plpgsql volatile set search_path = public as $$
declare v_pref text; v_cod text;
begin
  v_pref := left(regexp_replace(upper(coalesce(p_nombre, '')), '[^A-Z0-9]', '', 'g'), 4);
  if v_pref = '' then v_pref := 'COL'; end if;
  loop
    v_cod := v_pref || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.colegios where codigo = v_cod);
  end loop;
  return v_cod;
end $$;

-- =====================================================================
-- 3. CREACIÓN AUTOMÁTICA DEL PERFIL AL REGISTRARSE
-- =====================================================================
create or replace function public.al_crear_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'given_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuario'
  ), 40))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.al_crear_usuario();

-- =====================================================================
-- 4. ACCIONES (las únicas formas de unirse, aprobar o rechazar)
-- =====================================================================

-- Código de colegio válido? Devuelve el nombre del colegio o nulo (se usa antes de crear la cuenta).
create or replace function public.validar_codigo(p_codigo text) returns text
language sql stable security definer set search_path = public as
$$ select nombre from public.colegios where codigo = upper(btrim(coalesce(p_codigo, ''))) limit 1 $$;

-- Organizador nuevo: crea el colegio con su contraseña y queda aprobado como organizador.
create or replace function public.crear_colegio_y_unirme(p_nombre text, p_clave text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 60 then
    raise exception 'El nombre del colegio debe tener entre 2 y 60 caracteres';
  end if;
  if char_length(coalesce(p_clave, '')) < 6 then
    raise exception 'La contraseña del colegio debe tener al menos 6 caracteres';
  end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and colegio_id is null) then
    raise exception 'Tu cuenta ya pertenece a un colegio';
  end if;
  if exists (select 1 from public.colegios where lower(btrim(nombre)) = lower(v_nombre)) then
    raise exception 'Ese colegio ya está registrado';
  end if;
  insert into public.colegios (nombre, clave_hash, codigo)
  values (v_nombre, crypt(p_clave, gen_salt('bf')), public.codigo_nuevo(v_nombre))
  returning id into v_id;
  update public.perfiles set colegio_id = v_id, estado = 'aprobado', rol = 'organizador', equipo = ''
  where id = auth.uid();
  return v_id;
end $$;

-- Organizador de un colegio que ya existe: entra con la contraseña del colegio.
create or replace function public.unirme_como_organizador(p_colegio uuid, p_clave text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and colegio_id is null) then
    raise exception 'Tu cuenta ya pertenece a un colegio';
  end if;
  select clave_hash into v_hash from public.colegios where id = p_colegio;
  if v_hash is null or crypt(coalesce(p_clave, ''), v_hash) <> v_hash then
    raise exception 'Contraseña del colegio incorrecta';
  end if;
  update public.perfiles set colegio_id = p_colegio, estado = 'aprobado', rol = 'organizador', equipo = ''
  where id = auth.uid();
end $$;

-- Estudiante o participante: entra con el código del colegio y espera la aprobación.
create or replace function public.unirme_con_codigo(p_codigo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_col uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and colegio_id is null) then
    raise exception 'Tu cuenta ya pertenece a un colegio';
  end if;
  select id into v_col from public.colegios where codigo = upper(btrim(coalesce(p_codigo, '')));
  if v_col is null then raise exception 'Código de colegio no válido'; end if;
  update public.perfiles set colegio_id = v_col, estado = 'pendiente', rol = 'espectador', equipo = ''
  where id = auth.uid();
end $$;

-- Código del colegio (para mostrarlo en Ajustes). Solo organizadores.
create or replace function public.codigo_mi_colegio() returns text
language plpgsql stable security definer set search_path = public as $$
declare v_cod text;
begin
  if not public.es_organizador() then raise exception 'Solo el organizador puede ver el código'; end if;
  select codigo into v_cod from public.colegios where id = public.mi_colegio();
  return v_cod;
end $$;

-- Genera un código nuevo (el anterior deja de servir). Solo organizadores.
create or replace function public.regenerar_codigo_colegio() returns text
language plpgsql security definer set search_path = public as $$
declare v_cod text; v_nom text;
begin
  if not public.es_organizador() then raise exception 'Solo el organizador puede cambiar el código'; end if;
  select nombre into v_nom from public.colegios where id = public.mi_colegio();
  v_cod := public.codigo_nuevo(v_nom);
  update public.colegios set codigo = v_cod where id = public.mi_colegio();
  return v_cod;
end $$;

-- Pantalla de miembros: aprobados y pendientes, con correo. Solo organizadores.
create or replace function public.listar_miembros()
returns table (id uuid, nombre text, email text, estado text, rol text, equipo text, creado timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_organizador() then raise exception 'Solo el organizador puede ver los miembros'; end if;
  return query
    select p.id, p.nombre, u.email::text, p.estado, p.rol, p.equipo, p.creado
    from public.perfiles p join auth.users u on u.id = p.id
    where p.colegio_id = public.mi_colegio()
    order by (p.estado = 'pendiente') desc, p.creado;
end $$;

-- Aprobar a una persona (o cambiarle el cargo después) y asignarle su cargo.
create or replace function public.aprobar_miembro(p_uid uuid, p_cargo text, p_equipo text default '') returns void
language plpgsql security definer set search_path = public as $$
declare v_col uuid := public.mi_colegio(); v_eq text := left(btrim(coalesce(p_equipo, '')), 60);
begin
  if not public.es_organizador() then raise exception 'Solo el organizador puede aprobar'; end if;
  if p_cargo not in ('organizador', 'anotador', 'arbitro', 'entrenador', 'capitan', 'jugador', 'espectador') then
    raise exception 'Cargo no válido';
  end if;
  if not exists (select 1 from public.perfiles where id = p_uid and colegio_id = v_col) then
    raise exception 'Esa persona no pertenece a tu colegio';
  end if;
  if p_uid = auth.uid() and p_cargo <> 'organizador'
     and (select count(*) from public.perfiles where colegio_id = v_col and rol = 'organizador' and estado = 'aprobado') <= 1 then
    raise exception 'Debe quedar al menos un organizador';
  end if;
  if p_cargo not in ('entrenador', 'capitan', 'jugador') then v_eq := ''; end if;
  update public.perfiles set estado = 'aprobado', rol = p_cargo, equipo = v_eq where id = p_uid;
end $$;

-- Rechazar a una persona pendiente: se ELIMINA su cuenta de la base de datos.
create or replace function public.rechazar_miembro(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_organizador() then raise exception 'Solo el organizador puede rechazar'; end if;
  if p_uid = auth.uid() then raise exception 'No puedes rechazarte a ti mismo'; end if;
  if not exists (select 1 from public.perfiles where id = p_uid and colegio_id = public.mi_colegio() and estado = 'pendiente') then
    raise exception 'Solo se puede rechazar a alguien pendiente de tu colegio';
  end if;
  delete from auth.users where id = p_uid;  -- el perfil se borra en cascada
end $$;

-- =====================================================================
-- 5. SEGURIDAD A NIVEL DE FILA (RLS)
-- =====================================================================
alter table public.colegios enable row level security;
alter table public.perfiles enable row level security;
alter table public.docs enable row level security;

-- Colegios: cualquiera puede ver id y nombre (para el selector al crear la cuenta).
-- La contraseña cifrada y el código NO se pueden leer desde la app.
revoke all on public.colegios from anon, authenticated;
grant select (id, nombre) on public.colegios to anon, authenticated;
drop policy if exists colegios_ver on public.colegios;
create policy colegios_ver on public.colegios for select to anon, authenticated using (true);

-- Perfiles: cada quien ve el suyo; los miembros aprobados ven a los de su colegio
-- (los pendientes solo los ve un organizador). Nadie escribe directo: todo pasa por las acciones.
revoke all on public.perfiles from anon, authenticated;
grant select (id, nombre, colegio_id, estado, rol, equipo, creado) on public.perfiles to authenticated;
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated using (
  id = auth.uid()
  or (colegio_id is not null and colegio_id = public.mi_colegio()
      and (estado = 'aprobado' or public.es_organizador()))
);

-- Datos: solo miembros aprobados del mismo colegio.
revoke all on public.docs from anon;
grant select, insert, update, delete on public.docs to authenticated;
drop policy if exists docs_ver on public.docs;
create policy docs_ver on public.docs for select to authenticated using (
  colegio_id = public.mi_colegio()
  and case
    when col = 'historial' then public.es_organizador()
    when col = 'anuncios' then (data ->> 'st') is distinct from 'borrador' or public.es_organizador()
    when col in ('solicitudes', 'inscripciones') then public.es_organizador() or id = auth.uid()::text
    else true
  end
);
drop policy if exists docs_crear on public.docs;
create policy docs_crear on public.docs for insert to authenticated
  with check (colegio_id = public.mi_colegio() and public.puede_escribir_doc(col, id, data));
-- El historial es inalterable: se puede agregar, pero nadie lo edita ni lo borra.
drop policy if exists docs_editar on public.docs;
create policy docs_editar on public.docs for update to authenticated
  using (colegio_id = public.mi_colegio() and col <> 'historial' and public.puede_escribir_doc(col, id, data))
  with check (colegio_id = public.mi_colegio() and col <> 'historial' and public.puede_escribir_doc(col, id, data));
drop policy if exists docs_borrar on public.docs;
create policy docs_borrar on public.docs for delete to authenticated
  using (colegio_id = public.mi_colegio() and col <> 'historial' and public.puede_escribir_doc(col, id, data));

-- =====================================================================
-- 6. QUIÉN PUEDE LLAMAR A CADA FUNCIÓN
-- =====================================================================
revoke all on function public.mi_colegio(), public.mi_cargo(), public.es_organizador(),
  public.puede_escribir_doc(text, text, jsonb), public.codigo_nuevo(text),
  public.validar_codigo(text), public.crear_colegio_y_unirme(text, text),
  public.unirme_como_organizador(uuid, text), public.unirme_con_codigo(text),
  public.codigo_mi_colegio(), public.regenerar_codigo_colegio(), public.listar_miembros(),
  public.aprobar_miembro(uuid, text, text), public.rechazar_miembro(uuid)
  from public, anon, authenticated;

grant execute on function public.validar_codigo(text) to anon, authenticated;
grant execute on function
  public.mi_colegio(), public.mi_cargo(), public.es_organizador(),
  public.puede_escribir_doc(text, text, jsonb),
  public.crear_colegio_y_unirme(text, text), public.unirme_como_organizador(uuid, text),
  public.unirme_con_codigo(text), public.codigo_mi_colegio(), public.regenerar_codigo_colegio(),
  public.listar_miembros(), public.aprobar_miembro(uuid, text, text), public.rechazar_miembro(uuid)
  to authenticated;

-- =====================================================================
-- 7. TIEMPO REAL (los cambios aparecen sin recargar)
-- =====================================================================
alter table public.docs replica identity full;
alter table public.perfiles replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.perfiles;
exception when duplicate_object then null; when undefined_object then null; end $$;
