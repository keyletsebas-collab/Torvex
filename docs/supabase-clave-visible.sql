-- Torvex: lectura segura y actualización de la contraseña del colegio.
-- Ejecuta en Supabase > SQL Editor. Requiere el esquema de cuentas de Torvex
-- con public.mi_colegio(), public.es_organizador() y public.colegios.

create extension if not exists pgcrypto with schema extensions;

alter table public.colegios
  add column if not exists clave_visible text;

-- Devuelve la clave solo a miembros aprobados de su propio colegio.
-- No concede permiso de lectura directa sobre la tabla.
create or replace function public.clave_visible_mi_colegio()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_colegio uuid := public.mi_colegio();
  v_clave text;
begin
  if v_colegio is null then
    raise exception 'Solo los miembros aprobados pueden ver la contraseña';
  end if;

  select c.clave_visible
    into v_clave
    from public.colegios as c
   where c.id = v_colegio;

  return v_clave;
end;
$$;

-- El organizador puede cambiarla; se actualizan el hash de acceso y la copia
-- visible para que sigan coincidiendo.
create or replace function public.establecer_clave_colegio(p_clave text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_clave text := coalesce(p_clave, '');
  v_colegio uuid := public.mi_colegio();
begin
  if v_colegio is null or not public.es_organizador() then
    raise exception 'Solo un organizador aprobado puede cambiar la contraseña';
  end if;

  if char_length(v_clave) < 6 or char_length(v_clave) > 128 then
    raise exception 'La contraseña del colegio debe tener entre 6 y 128 caracteres';
  end if;

  update public.colegios
     set clave_hash = extensions.crypt(v_clave, extensions.gen_salt('bf')),
         clave_visible = v_clave
   where id = v_colegio;
end;
$$;

revoke all on function public.clave_visible_mi_colegio() from public, anon, authenticated;
revoke all on function public.establecer_clave_colegio(text) from public, anon, authenticated;
grant execute on function public.clave_visible_mi_colegio() to authenticated;
grant execute on function public.establecer_clave_colegio(text) to authenticated;
