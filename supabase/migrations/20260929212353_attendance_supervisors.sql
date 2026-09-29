-- Web de supervisión (1 de 2): autorización de lectura global.
--
-- Solo AGREGA recursos. No modifica ni elimina tablas, filas, políticas,
-- funciones ni objetos de Storage existentes. Las políticas "_own" de la app
-- móvil se conservan: en PostgreSQL las políticas permisivas se combinan con OR,
-- así que un usuario normal sigue viendo únicamente sus propios datos.
--
-- Se puede ejecutar más de una vez sin duplicar nada.

-- 1) Lista de supervisores. La pertenencia solo se administra desde Supabase
--    (SQL Editor como postgres, o service_role en un backend). Ningún cliente
--    con la clave pública puede insertar, cambiar ni borrar filas aquí.
create table if not exists public.attendance_supervisors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 200)
);

alter table public.attendance_supervisors enable row level security;

-- Supabase concede privilegios por defecto a anon/authenticated en tablas
-- nuevas de public; se retiran todos y solo se devuelve SELECT.
revoke all on public.attendance_supervisors from anon, authenticated;
grant select on public.attendance_supervisors to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance_supervisors'
      and policyname = 'attendance_supervisors_select_own'
  ) then
    -- Cada cuenta solo puede comprobar su propia fila (la web la usa para
    -- decidir si muestra el tablero). No revela quién más es supervisor.
    create policy attendance_supervisors_select_own on public.attendance_supervisors
      for select to authenticated
      using (user_id = (select auth.uid()));
  end if;
end $$;

-- 2) Función auxiliar para las políticas. Vive en attendance_private, que no
--    está expuesto por la API. SECURITY DEFINER evita depender de la RLS de la
--    tabla dentro de otras políticas; solo responde por el usuario del JWT y
--    no depende de metadatos editables por el usuario.
create or replace function attendance_private.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attendance_supervisors s
    where s.user_id = (select auth.uid())
  );
$$;

revoke execute on function attendance_private.is_supervisor() from public, anon;
grant execute on function attendance_private.is_supervisor() to authenticated;

-- 3) Políticas de solo lectura para supervisores. No hay políticas nuevas de
--    INSERT, UPDATE ni DELETE: la web es de consulta.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_select_supervisor'
  ) then
    create policy profiles_select_supervisor on public.profiles
      for select to authenticated
      using ((select attendance_private.is_supervisor()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance'
      and policyname = 'attendance_select_supervisor'
  ) then
    create policy attendance_select_supervisor on public.attendance
      for select to authenticated
      using ((select attendance_private.is_supervisor()));
  end if;

  -- Necesaria para crear URLs firmadas del bucket privado. El bucket sigue
  -- privado y solo el supervisor obtiene lectura global.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'attendance_photo_select_supervisor'
  ) then
    create policy attendance_photo_select_supervisor on storage.objects
      for select to authenticated
      using (
        bucket_id = 'attendance-photos'
        and (select attendance_private.is_supervisor())
      );
  end if;
end $$;

-- 4) Índice para consultar un día completo de todos los usuarios.
create index if not exists attendance_created_at_idx
  on public.attendance (created_at desc, id desc);
