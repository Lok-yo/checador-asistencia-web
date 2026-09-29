-- Verificación de SOLO LECTURA para la web de supervisión.
-- Ejecútala en el SQL Editor después de aplicar las tres migraciones web.

-- 1) La tabla existe, tiene RLS y cuántos supervisores hay (debe ser >= 1).
select c.relrowsecurity as rls_activa,
       (select count(*) from public.attendance_supervisors) as supervisores
from pg_class c
where c.oid = 'public.attendance_supervisors'::regclass;

-- 2) Permisos de la tabla: authenticated solo debe tener SELECT; anon, nada.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'attendance_supervisors'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 3) Lectura de profiles/attendance: una política "_authorized" por tabla.
--    Storage conserva "attendance_photo_select_own" y "_supervisor".
select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('profiles', 'attendance', 'attendance_supervisors'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'attendance_photo_%')
order by schemaname, tablename, policyname;

-- 4) El bucket sigue privado (public = false).
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'attendance-photos';

-- 5) attendance está en la publicación de Realtime (1 fila).
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance';
