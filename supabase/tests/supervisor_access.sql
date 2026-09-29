-- Prueba transaccional de la web de supervisión. Termina con ROLLBACK:
-- no deja cuentas, filas, supervisores ni metadatos de Storage.
-- Requiere haber aplicado 20260929212353_attendance_supervisors.sql.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1111111-1111-4111-8111-111111111111', 'normal1@asistencia.invalid', '{"full_name":"Normal Uno"}'),
  ('a2222222-2222-4222-8222-222222222222', 'normal2@asistencia.invalid', '{"full_name":"Normal Dos"}'),
  ('a3333333-3333-4333-8333-333333333333', 'super@asistencia.invalid', '{"full_name":"Supervisor Prueba"}');

insert into storage.objects (bucket_id, name, owner_id) values
  ('attendance-photos', 'a1111111-1111-4111-8111-111111111111/b1111111-1111-4111-8111-111111111111.jpg', 'a1111111-1111-4111-8111-111111111111'),
  ('attendance-photos', 'a2222222-2222-4222-8222-222222222222/b2222222-2222-4222-8222-222222222222.jpg', 'a2222222-2222-4222-8222-222222222222');

-- Filas insertadas como propietario de la tabla, solo para la prueba.
insert into public.attendance (user_id, type, photo_path, request_id) values
  ('a1111111-1111-4111-8111-111111111111', 'entry', 'a1111111-1111-4111-8111-111111111111/b1111111-1111-4111-8111-111111111111.jpg', 'b1111111-1111-4111-8111-111111111111'),
  ('a2222222-2222-4222-8222-222222222222', 'entry', 'a2222222-2222-4222-8222-222222222222/b2222222-2222-4222-8222-222222222222.jpg', 'b2222222-2222-4222-8222-222222222222');

insert into public.attendance_supervisors (user_id, note)
values ('a3333333-3333-4333-8333-333333333333', 'prueba');

set local role authenticated;

-- Usuario normal: solo sus datos, sin forma de volverse supervisor.
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
do $$
begin
  if attendance_private.is_supervisor() then
    raise exception 'Usuario normal detectado como supervisor';
  end if;
  if (select count(*) from public.attendance) <> 1
     or exists (select 1 from public.attendance where user_id <> 'a1111111-1111-4111-8111-111111111111') then
    raise exception 'Usuario normal ve checadas ajenas';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Usuario normal ve perfiles ajenos';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'attendance-photos') <> 1 then
    raise exception 'Usuario normal ve fotos ajenas';
  end if;
  if (select count(*) from public.attendance_supervisors) <> 0 then
    raise exception 'Usuario normal ve la lista de supervisores';
  end if;

  begin
    insert into public.attendance_supervisors (user_id)
    values ('a1111111-1111-4111-8111-111111111111');
    raise exception 'Un usuario pudo asignarse como supervisor';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.attendance_supervisors set note = 'x';
    raise exception 'UPDATE en supervisores quedó permitido';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Supervisor: lectura global, sin escritura.
select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
do $$
begin
  if not attendance_private.is_supervisor() then
    raise exception 'El supervisor no fue reconocido';
  end if;
  if (select count(*) from public.attendance
      where user_id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')) <> 2 then
    raise exception 'El supervisor no ve todas las checadas';
  end if;
  if (select count(*) from public.profiles
      where id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-333333333333')) <> 3 then
    raise exception 'El supervisor no ve todos los perfiles';
  end if;
  if (select count(*) from storage.objects
      where bucket_id = 'attendance-photos'
        and name like any (array['a1111111-%', 'a2222222-%'])) <> 2 then
    raise exception 'El supervisor no ve todas las fotos';
  end if;
  if (select count(*) from public.attendance_supervisors) <> 1 then
    raise exception 'El supervisor no ve su propia fila';
  end if;

  begin
    delete from public.attendance where user_id = 'a1111111-1111-4111-8111-111111111111';
    raise exception 'DELETE de checadas quedó permitido al supervisor';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.attendance_supervisors (user_id)
    values ('a2222222-2222-4222-8222-222222222222');
    raise exception 'Un supervisor pudo autorizar a otra cuenta';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Sin sesión (anon): nada.
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.attendance_supervisors;
    raise exception 'anon puede leer supervisores';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'supervisor_access: OK' as resultado;
rollback;
