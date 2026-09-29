-- Web de supervisión (2 de 2): cambios en tiempo real de public.attendance.
--
-- Agrega la tabla a la publicación supabase_realtime solo si todavía no está.
-- Realtime respeta RLS: cada suscriptor recibe únicamente las filas que puede
-- leer (el supervisor, todas; un usuario normal, las suyas).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'No existe la publicación supabase_realtime. Revisa Database > Publications en el panel de Supabase.';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;
