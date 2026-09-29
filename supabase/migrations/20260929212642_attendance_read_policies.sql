-- Consolida las políticas de lectura de las tablas de la aplicación.
-- Una sola política por tabla conserva el acceso propio y el de supervisores.
-- Las políticas de Storage se mantienen separadas en la migración anterior.

alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()) or (select attendance_private.is_supervisor()));
drop policy profiles_select_supervisor on public.profiles;
alter policy profiles_select_own on public.profiles rename to profiles_select_authorized;

alter policy attendance_select_own on public.attendance
  using (user_id = (select auth.uid()) or (select attendance_private.is_supervisor()));
drop policy attendance_select_supervisor on public.attendance;
alter policy attendance_select_own on public.attendance rename to attendance_select_authorized;
