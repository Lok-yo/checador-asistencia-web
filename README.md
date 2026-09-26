# Checador de asistencia: web de supervisión (PWA)

Tablero de **solo consulta** para que un supervisor vea las entradas y salidas registradas desde la app móvil. También puede mostrarlas en una pantalla grande. Usa la misma base de Supabase, las mismas cuentas y las mismas fotos que la app móvil. No crea, edita ni elimina checadas.

Tecnologías: React 19, Vite 8, TypeScript 6.0, `@supabase/supabase-js` 2 (Auth, PostgreSQL, Storage y Realtime) y `vite-plugin-pwa` 1.3. Sus dependencias están separadas de las de Expo (`web/package.json`).

## 1. Requisitos

- Node.js 20.19 o superior (se probó con Node 22).
- Acceso al **SQL Editor** del proyecto de Supabase.
- Una cuenta existente de Supabase Auth, con el correo confirmado, que será el primer supervisor.

## 2. Cambios en la base de datos (hazlo primero)

Los cambios son nuevos y compatibles. No recrean tablas, no reejecutan las migraciones iniciales y no borran registros, usuarios ni fotos. Los archivos están en `supabase/` en la raíz del repositorio.

Ejecútalos **en este orden** en *SQL Editor → New query*. Pega el contenido de cada archivo y pulsa *Run*:

1. `supabase/migrations/20260925180000_attendance_supervisors.sql`. Agrega:
   - la tabla `attendance_supervisors`, con RLS y solo lectura de la fila propia;
   - la función `attendance_private.is_supervisor()`;
   - políticas de **lectura** para supervisores en `profiles`, `attendance` y `storage.objects` (bucket `attendance-photos`);
   - un índice por fecha.

   Las políticas `_own` de la app móvil no se modifican, así que un usuario normal sigue viendo solo lo suyo.
2. `supabase/migrations/20260925180100_attendance_realtime.sql`: agrega `public.attendance` a la publicación `supabase_realtime` solo si todavía no está.
3. `supabase/scripts/autorizar_supervisor.sql`: autoriza al primer supervisor. **No es una migración**; se ejecuta en tres pasos:
   - **Paso 1:** ejecuta solo el primer `select` para listar las cuentas y copiar el `id` (UUID) correcto.
   - **Paso 2:** pega ese UUID en `v_user`, en lugar de `00000000-...`, y ejecuta el bloque `do $$ ... $$`. Si dejas el UUID de ejemplo o pones uno que no existe, el script se detiene con un error.
   - **Paso 3:** ejecuta el último `select` para ver la lista de supervisores.

Ambas migraciones se pueden volver a ejecutar sin duplicar nada.

### Cómo se administra el permiso

Solo el SQL Editor (rol `postgres`) o un backend con `service_role` pueden escribir en `attendance_supervisors`. Nadie puede asignarse ese permiso desde la web ni desde la app, porque `anon` y `authenticated` solo tienen `SELECT`. Tampoco sirven los metadatos de usuario: la autorización no los lee.

Para retirar el permiso, usa el `delete` comentado al final del script. Solo quita el acceso al tablero; no borra la cuenta ni sus datos.

### Verificación

- `supabase/scripts/verificar_web.sql` (solo lectura) muestra la RLS, los permisos, las políticas, que el bucket sigue privado y que `attendance` está en Realtime.
- `supabase/tests/supervisor_access.sql` es una prueba transaccional que termina en `ROLLBACK` y no deja datos. Comprueba que:
  - una cuenta normal solo ve lo suyo y no puede volverse supervisor;
  - el supervisor lee todo, pero no puede borrar checadas ni autorizar a otros;
  - `anon` no ve nada.

  Si todo está bien, termina con `supervisor_access: OK`.

Realtime también se puede revisar en *Database → Publications → supabase_realtime*.

## 3. Instalación y variables de entorno

```bash
cd web
npm install
cp .env.example .env     # en Windows: copy .env.example .env
```

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto, por ejemplo `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave **pública**: publicable (`sb_publishable_...`) o `anon` |
| `VITE_TIME_ZONE` | Zona IANA; por omisión `America/Hermosillo`, igual que la app móvil |

La web se niega a arrancar si detecta una clave `sb_secret_...` o un JWT con rol `service_role`. La clave pública no da acceso a los datos por sí sola: hace falta iniciar sesión con una cuenta de supervisor.

Las variables `VITE_*` se incrustan al compilar. Si cambias `.env`, reinicia `npm run dev` o vuelve a compilar.

## 4. Ejecución local

```bash
npm run dev        # http://localhost:5173 (service worker activo en desarrollo)
npm run build      # typecheck + compilación en web/dist
npm run preview    # sirve web/dist en http://localhost:4173
npm run typecheck  # solo TypeScript
```

`localhost` cuenta como contexto seguro, así que el service worker y la instalación funcionan sin HTTPS en tu computadora. Para probar la instalación, usa `npm run build && npm run preview` en Chrome o Edge y pulsa el icono de instalar en la barra de direcciones.

## 5. Publicación

`web/dist` es un sitio estático. Súbelo a cualquier hosting con **HTTPS**, como Netlify, Vercel, Cloudflare Pages o GitHub Pages.

- **Directorio base:** `web`.
- **Comando de compilación:** `npm run build`.
- **Carpeta publicada:** `dist`.
- **Variables:** configura las tres `VITE_*` en el panel del hosting, porque `.env` no se sube al repositorio.
- **Rutas:** la app usa una sola ruta (`/`), así que no hace falta configurar reescrituras.

Después de publicar no hay que cambiar nada en Supabase. La web solo usa la API pública con la sesión del supervisor.

**Roku:** esta entrega es una PWA para navegadores normales. No incluye una app nativa para Roku ni supone que Roku pueda instalar la PWA. El profesor indicará cómo mostrarla allí.

## 6. Cómo funciona

**Acceso**
- Correo y contraseña con Supabase Auth.
- Tras iniciar sesión, la web busca la fila propia en `attendance_supervisors`:
  - si no existe, muestra *Esta cuenta no tiene acceso al tablero*, con el UUID que hay que autorizar;
  - si la tabla no existe (migración sin aplicar), muestra *Falta un paso de configuración*, no un tablero vacío.
- La seguridad real está en la RLS: aunque alguien modifique la web, Supabase no le devuelve datos ajenos.

**Datos**
- `attendance` no tiene FK hacia `profiles`, así que los nombres se consultan aparte por `user_id` y se combinan en el navegador.
- Si una checada no tiene perfil, se muestra *Perfil no disponible*; la web no inventa nombres.

**Indicadores**
- Salen de dos consultas `count` sobre **todo el día** seleccionado, no solo de las 20 filas visibles.
- Los límites del día se calculan en `VITE_TIME_ZONE` y se convierten a UTC (`[00:00, 00:00 del día siguiente)`).
- Las etiquetas hablan de movimientos, no de personas dentro.

**Lista, búsqueda y fecha**
- La lista muestra 20 checadas por página, de la más reciente a la más antigua, con paginación completa del día.
- La búsqueda por nombre consulta los perfiles que coinciden (sin distinguir mayúsculas) y luego las checadas de esas personas en el día, también paginadas.
- Si la búsqueda abarca más de 200 personas, se avisa en pantalla.
- La búsqueda **sí** distingue acentos: "Jose" no encuentra "José".
- Si estás viendo "hoy", el tablero cambia solo de día a medianoche.

**Fotos**
- Se piden una por una al pulsar *Ver foto*, con una URL firmada de 60 segundos.
- La imagen se descarga con `cache: 'no-store'` y se muestra desde un `blob:` que se libera al cerrar.
- Si la foto no existe o el enlace falla, el diálogo lo indica y ofrece *Reintentar* sin bloquear la página.
- La foto es evidencia visual: no hay reconocimiento facial y la web no muestra datos del sensor biométrico, porque no existen en la base.

**Tiempo real**
- Un canal `postgres_changes` escucha los `INSERT` de `attendance`. Realtime respeta la RLS.
- Al llegar un evento:
  - se ignora si no pertenece al día o a la búsqueda activos;
  - si ya está en la lista, no se duplica;
  - si corresponde, aparece arriba y luego se vuelven a leer los conteos y la página desde la base.
- Al suscribirse, al reconectar, al volver la red o al regresar a la pestaña, la web vuelve a consultar la base, así que no depende solo de las notificaciones.
- El indicador muestra el estado real: *Conectando*, *En vivo*, *Reconectando* o *Sin conexión*, junto con la hora de la última actualización.

**Sesión**
- *Cerrar sesión* cierra solo esta ventana (`scope: 'local'`), sin cerrar la sesión del celular.
- Al cerrar sesión se eliminan los canales y se desmonta el tablero, junto con sus datos y fotos.
- Si el token vence, la web vuelve al inicio de sesión con *La sesión venció*.

**Modo pantalla**
- Oculta los filtros y amplía el reloj, los indicadores y las últimas checadas (en dos columnas en pantallas anchas).
- Sigue actualizándose en tiempo real.
- Pide pantalla completa y evita que la pantalla se apague cuando el navegador lo permite.
- Para salir, usa *Salir de modo pantalla* o la tecla Esc.
- Sigue siendo una vista con sesión iniciada; no hay enlaces públicos.

**PWA**
- Manifiesto con nombre, iconos (incluido uno *maskable*), colores y `display: standalone`.
- El service worker precachea **solo** la interfaz generada (HTML, JS, CSS, fuentes e iconos).
- Toda petición a otro origen usa `NetworkOnly`: Supabase Auth, REST, Storage y las URLs firmadas nunca se guardan en su caché.
- Sin red, la interfaz abre y muestra un aviso, pero las checadas no están disponibles sin conexión.
- Cuando hay una versión nueva aparece *Hay una versión nueva de la web* con *Actualizar ahora*.
- Si el navegador no permite instalarla, funciona como página normal.

## 7. Ajuste en el proyecto móvil

- El `tsconfig.json` raíz ahora excluye `web`. Como definir `exclude` reemplaza el de `expo/tsconfig.base`, se repitieron las exclusiones originales de Expo.
- `eslint.config.js` ignora `web/**`.

Sin estos ajustes, las comprobaciones del móvil también revisarían archivos de Vite con otra configuración.

## 8. Verificación realizada

Hecho en el entorno de desarrollo:

- **SQL:** las cinco migraciones se aplicaron en orden sobre PostgreSQL 16 con un esquema que imita Supabase (`auth.uid()`, `storage.objects`, roles `anon`/`authenticated` y la publicación). La prueba original `attendance_rules.sql` y `supervisor_access.sql` pasaron. Las dos migraciones nuevas se ejecutaron dos veces sin error, y el script de autorización se probó con UUID de ejemplo, UUID válido y repetición.
- **Web:** `npm run build` (incluye `tsc -b`) sin errores.
- **Interfaz:** Chromium contra un Supabase **simulado** (Auth, REST, Storage y el protocolo de Realtime interceptados), con 33/33 comprobaciones correctas:
  - credenciales incorrectas y rechazo de la cuenta normal;
  - conteos 15/12/27 con solo 20 filas visibles, paginación, nombres y perfil ausente;
  - foto con URL firmada y foto ausente;
  - evento en tiempo real con conteos actualizados, sin duplicados, ignorando eventos de otro día y respetando la búsqueda;
  - reconexión con recuperación de una checada que llegó sin evento;
  - filtro de ayer, modo pantalla en vivo y salida con Esc;
  - diseño a 390 px sin desbordamiento;
  - cierre de sesión limpio, sesión vencida y migración faltante.
- **PWA:** service worker activo, 14 entradas en caché y ninguna externa. Chrome no reporta errores de instalabilidad. Sin red, la interfaz abre con aviso. Al publicar una versión nueva aparece el aviso de actualización.
- **Móvil:** `npm run typecheck`, `npx expo lint` y `npx expo export --platform android` correctos con `web/` presente.

**No verificado** (el entorno no tenía acceso a `supabase.co` ni a un Android):

- que las migraciones estén aplicadas en tu proyecto;
- el inicio de sesión real;
- la lectura de datos y fotos reales;
- la llegada de eventos de Realtime del proyecto real;
- la prueba desde el celular.

Haz las pruebas de la sección siguiente.

## 9. Pruebas con el proyecto real

1. Aplica las dos migraciones y ejecuta `verificar_web.sql`. Opcionalmente, ejecuta `supervisor_access.sql` y confirma `supervisor_access: OK`.
2. Inicia sesión con una cuenta **no** autorizada. Debe aparecer *Esta cuenta no tiene acceso al tablero*.
3. Autoriza tu cuenta con `autorizar_supervisor.sql`, pulsa *Comprobar de nuevo* y confirma que ves las checadas de todas las cuentas con sus nombres.
4. Compara los indicadores con esta consulta en el SQL Editor, que usa el día de hoy en Hermosillo:

   ```sql
   select type, count(*) from public.attendance
   where created_at >= (date_trunc('day', now() at time zone 'America/Hermosillo') at time zone 'America/Hermosillo')
     and created_at <  (date_trunc('day', now() at time zone 'America/Hermosillo') at time zone 'America/Hermosillo') + interval '1 day'
   group by type;
   ```

5. Abre una foto con *Ver foto*. En DevTools → Application → Cache Storage no debe aparecer ninguna URL de Supabase.
6. Con el tablero abierto (también en modo pantalla), registra una entrada o salida desde la app móvil. Debe aparecer sin recargar y actualizar los indicadores.
7. Desactiva la red unos segundos (DevTools → Network → Offline), registra una checada desde el celular y vuelve a activar la red. El tablero debe mostrarla.
8. Cierra sesión y confirma que desaparecen los datos.
