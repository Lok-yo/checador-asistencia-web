-- Autorizar una cuenta EXISTENTE como supervisor de la web.
--
-- No es una migración: ejecútalo a mano en el SQL Editor de Supabase después
-- de aplicar 20260929212353_attendance_supervisors.sql. El SQL Editor corre
-- como postgres, que es quien puede escribir en attendance_supervisors.
--
-- La cuenta debe existir en Supabase Auth (creada desde la app móvil o desde
-- Authentication > Users). La confirmación de correo depende de los ajustes
-- de Auth del proyecto; no es un requisito adicional del rol supervisor.

-- PASO 1 (solo lectura): localiza el UUID de la cuenta.
select u.id, u.email, p.full_name, u.email_confirmed_at, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;

-- PASO 2: copia el UUID del paso 1 en v_user y ejecuta este bloque.
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000000';  -- <- REEMPLAZA
  v_note text := 'Primer supervisor';
  v_rows integer;
begin
  if v_user = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Reemplaza el UUID de ejemplo por el de la cuenta a autorizar.';
  end if;

  if not exists (select 1 from auth.users where id = v_user) then
    raise exception 'No existe una cuenta de Supabase Auth con el UUID %.', v_user;
  end if;

  insert into public.attendance_supervisors (user_id, note)
  values (v_user, v_note)
  on conflict (user_id) do nothing;
  get diagnostics v_rows = row_count;

  if v_rows = 1 then
    raise notice 'Cuenta % autorizada como supervisor.', v_user;
  else
    raise notice 'La cuenta % ya era supervisor; no se cambió nada.', v_user;
  end if;
end $$;

-- PASO 3 (solo lectura): comprueba la lista de supervisores.
select s.user_id, u.email, p.full_name, s.note, s.created_at
from public.attendance_supervisors s
join auth.users u on u.id = s.user_id
left join public.profiles p on p.id = s.user_id
order by s.created_at;

-- Para retirar el permiso más adelante (no borra la cuenta, sus checadas ni
-- sus fotos; solo quita el acceso al tablero), descomenta y ajusta:
-- delete from public.attendance_supervisors
-- where user_id = '00000000-0000-0000-0000-000000000000';
