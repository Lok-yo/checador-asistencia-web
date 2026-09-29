# Checador de asistencia: web de supervisión

Web de consulta para supervisores: muestra las entradas, salidas y fotografías registradas desde la app móvil. Usa React, Vite, TypeScript y Supabase Auth, PostgreSQL, Storage y Realtime. Incluye un modo de pantalla y la instalación como PWA.

Este repositorio contiene exclusivamente la web. La app Android con Expo Go está en [Lok-yo/checador-asistencia](https://github.com/Lok-yo/checador-asistencia). Ambos clientes usan el mismo proyecto Supabase; separar el código no requiere separar los datos.

## Iniciar la web

Requiere Node.js 20.19+ o 22.12+ y una cuenta existente de Supabase Auth autorizada como supervisor.

```bash
git clone https://github.com/Lok-yo/checador-asistencia-web.git
cd checador-asistencia-web
npm ci
cp .env.example .env
# Completa las variables de .env antes de continuar.
npm run dev
```

Abre `http://localhost:5173`. En Windows, usa `copy .env.example .env`.

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del mismo proyecto usado por la app móvil |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública `sb_publishable_...` del mismo proyecto |
| `VITE_TIME_ZONE` | `America/Hermosillo` u otra zona IANA válida |

La configuración local preparada en esta entrega apunta a `https://kqabddlasmvipuskvnvr.supabase.co`, igual que la app móvil. El archivo `.env` está excluido de Git. `.env.example` solo contiene valores de ejemplo.

Las variables `VITE_*` llegan al navegador al compilar. Usa únicamente la clave pública; la web rechaza claves `sb_secret_...` y JWT con rol `service_role`. Reinicia Vite o recompila después de modificar `.env`.

## Configurar Supabase

Las migraciones de este repositorio **amplían el backend de la app móvil**. Requieren sus tablas `profiles`, `attendance`, el esquema `attendance_private` y el bucket privado `attendance-photos`. Las migraciones iniciales pertenecen al repositorio móvil. No vuelvas a ejecutarlas sobre el proyecto existente.

El proyecto de esta entrega es **`kqabddlasmvipuskvnvr`**. Ya está configurado y tiene una cuenta autorizada por el propietario. Comprueba el identificador en el panel antes de ejecutar SQL.

Para reproducir la configuración en otro proyecto que ya tenga el backend móvil, aplica estas migraciones en orden mediante el MCP de Supabase o en SQL Editor:

1. `supabase/migrations/20260929212353_attendance_supervisors.sql`: crea la lista de supervisores, su función de autorización, políticas de lectura e índice por fecha.
2. `supabase/migrations/20260929212400_attendance_realtime.sql`: habilita los eventos de `attendance` en `supabase_realtime`.
3. `supabase/migrations/20260929212642_attendance_read_policies.sql`: unifica las políticas de lectura de `profiles` y `attendance` conservando el mismo acceso de dueño o supervisor. Storage mantiene sus políticas de lectura separadas.

Después, abre `supabase/scripts/autorizar_supervisor.sql` y ejecuta sus pasos por separado: localiza la cuenta, sustituye el UUID de ejemplo y autorízala. El script se detiene si no sustituyes el UUID o si la cuenta no existe. El permiso se administra en el servidor; ningún cliente puede asignárselo.

Ejecuta `supabase/scripts/verificar_web.sql` para revisar RLS, permisos, políticas, privacidad del bucket y publicación de Realtime. No modifica datos.

Los usuarios normales conservan el acceso a sus propios registros. Las cuentas autorizadas como supervisor pueden consultar todos los perfiles, registros y fotos del checador. El rol supervisor no concede escritura directa en esas tablas ni en la lista de supervisores. La app móvil sigue finalizando movimientos mediante `finalize_attendance`.

### Correo y cuentas

El propietario desactivó la confirmación de correo en este proyecto para la demostración académica. Una cuenta registrada desde la app puede iniciar sesión y, una vez autorizada, entrar en la web. Si activas de nuevo la confirmación, las cuentas tendrán que cumplir los requisitos de Supabase Auth. Los ajustes de confirmación y SMTP se administran en el panel de Supabase; no se cambian desde esta web.

## Funcionamiento

- Inicio de sesión con correo y contraseña. Una cuenta sin permiso de supervisor recibe un mensaje de acceso denegado.
- Consulta por fecha y nombre, con 20 movimientos por página y conteos de todo el día seleccionado.
- Fechas guardadas en UTC y mostradas según `VITE_TIME_ZONE`.
- Fotografías privadas solicitadas al abrir el diálogo mediante una URL firmada de 60 segundos.
- Actualización por Realtime y nueva consulta al reconectar, recuperar la red o volver a la pestaña.
- Cierre de sesión local en la web, sin cerrar la sesión del celular.
- Modo de pantalla con reloj y movimientos recientes; las capacidades de pantalla completa y bloqueo de suspensión dependen del navegador.

El service worker conserva los archivos públicos de la interfaz. Las peticiones a Supabase y las fotos usan la red y no se guardan en su caché. Sin conexión se muestra la interfaz con un aviso; los registros requieren conexión.

La fotografía es evidencia visual. La comprobación biométrica ocurre en Android y Supabase no recibe una prueba criptográfica del sensor. La web no compara rostros ni realiza detección de vida.

## Compilar y publicar

```bash
npm run build
npm run preview
```

`npm run build` comprueba TypeScript y genera `dist/`. `npm run preview` sirve el resultado en `http://localhost:4173`. Para consultar desde otro dispositivo en la misma red, usa `npm run dev -- --host 0.0.0.0`; la instalación PWA fuera de localhost requiere HTTPS.

Para un hosting estático que sirva la aplicación en la raíz del dominio:

| Ajuste | Valor |
|---|---|
| Directorio del proyecto | Raíz de este repositorio |
| Instalación | `npm ci` |
| Compilación | `npm run build` |
| Directorio publicado | `dist` |
| Variables | Las tres variables `VITE_*` |

Configura las variables en el hosting antes de compilar. Este repositorio no incluye una integración con Roku. La configuración actual usa la raíz `/`; un hosting bajo una subruta necesita ajustar `base` de Vite y las rutas del manifiesto antes de desplegar.

## Estado de la entrega

- La web se extrajo del directorio `web/` de `TheRoDoX09/ChecadorWeb`, preservando la autoría de Rodolfo Herrera Sosa en el historial Git.
- Se copiaron únicamente las migraciones y los scripts necesarios para la web. La aplicación Expo tiene su propio repositorio y sus propias dependencias.
- Se corrigieron las rutas de configuración y la documentación para ejecutar la web desde su nueva raíz.
- `npm ci` y `npm run build` terminaron correctamente; TypeScript y la compilación PWA pasaron. La auditoría de las dependencias instaladas no reportó vulnerabilidades.
- Mediante MCP se aplicaron las tres migraciones web y se autorizó la cuenta indicada por el propietario. Sus versiones locales coinciden con el historial remoto.
- `supabase/tests/supervisor_access.sql` pasó en el Supabase real (`supervisor_access: OK`) antes y después de unificar las políticas. Comprueba acceso propio, lectura del supervisor y denegación de escritura. Termina con `ROLLBACK` sin conservar sus datos de prueba.
- Se verificaron RLS, permisos, publicación de Realtime y bucket privado de 2 MiB/JPEG. Los cuatro registros y las cuatro fotos existentes se conservaron; las definiciones y permisos de las funciones del móvil no cambiaron.
- La API real rechazó la consulta anónima a `attendance_supervisors` con `401/42501`. El servidor Vite arrancó desde este repositorio y respondió correctamente a la petición HTTP local.
- Queda por comprobar en un navegador el inicio de sesión, la visualización de fotos y la llegada de eventos reales de Realtime. Las pruebas simuladas del repositorio original no sustituyen esas comprobaciones.

El asesor de seguridad conserva un aviso previo sobre [protección contra contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El asesor de rendimiento solo informa que el [índice por fecha todavía no se ha utilizado](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); es nuevo y se conserva para las consultas del tablero.

## Comprobación con datos reales

1. Revisa los resultados de `verificar_web.sql`. La cuenta indicada por el propietario ya está autorizada.
2. Inicia sesión con esa cuenta: selecciona una fecha con checadas y comprueba nombres, movimientos, conteos y una fotografía real.
3. Inicia sesión con otra cuenta sin permiso: debe mostrar acceso denegado.
4. Registra un movimiento desde la app móvil con el tablero abierto: debe aparecer y actualizar los conteos.
5. Desconecta y recupera la red: el tablero debe volver a consultar los registros.
6. Cierra sesión: deben desaparecer los datos y la fotografía abierta.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime con PostgreSQL](https://supabase.com/docs/guides/realtime/postgres-changes).
