# Checador de asistencia · Web de supervisión

Aplicación en español para **consultar entradas, salidas y fotografías del checador** con una cuenta autorizada como supervisor. Está desarrollada con React, Vite, TypeScript y Supabase; incluye filtros, actualización por Realtime, modo pantalla e instalación como PWA en navegadores compatibles.

El sistema tiene dos repositorios que comparten el mismo backend:

| Repositorio | Responsabilidad |
|---|---|
| [checador-asistencia](https://github.com/Lok-yo/checador-asistencia) | Registro de cuentas y checadas con biometría y selfie desde Expo Go en Android. |
| **[checador-asistencia-web](https://github.com/Lok-yo/checador-asistencia-web)** · este proyecto | Consulta de registros y evidencia visual para supervisores. |

La web utiliza las cuentas y los datos de la app móvil. El permiso de supervisor se asigna en Supabase; la interfaz no permite crear checadas ni conceder permisos.

## Inicio rápido

### Requisitos

- Git, npm y Node.js. Para trabajar con ambos repositorios, usa **22.13 o posterior dentro de la rama 22**, o **24.3 o posterior dentro de la rama 24**. Vite requiere al menos Node 20.19 o 22.12, pero Expo SDK 57 exige una versión superior dentro de la rama 22.
- Un navegador moderno, conexión a internet y una cuenta de Supabase Auth existente **autorizada como supervisor**.
- URL y clave publicable del mismo proyecto Supabase que utiliza la app móvil. El backend de esta entrega ya está configurado; para otro proyecto, sigue [Configuración de Supabase](#configuración-de-supabase).

### Instalar y configurar

```bash
git clone https://github.com/Lok-yo/checador-asistencia-web.git
cd checador-asistencia-web
npm ci
cp .env.example .env
```

El repositorio es privado: GitHub te pedirá una cuenta con acceso. En Windows, sustituye el último comando por `copy .env.example .env`.

Edita `.env` antes de iniciar Vite. Los valores de esta tabla son **ejemplos**, no credenciales utilizables:

| Variable | Ejemplo | Para qué sirve |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | URL del backend compartido con la app. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_your_key` | Clave pública del mismo proyecto. |
| `VITE_TIME_ZONE` | `America/Hermosillo` | Zona IANA para mostrar horas y consultar el día correcto. |

Obtén la URL y la clave publicable desde **Connect** en el panel de Supabase; las claves también se administran en **Settings → API Keys**. Las variables `VITE_*` llegan al navegador: **nunca coloques una clave `service_role`, `sb_secret_...` ni un secreto administrativo**. La web rechaza claves secretas y JWT cuyo rol sea `service_role`.

`.env` está excluido de Git; [.env.example](.env.example) contiene solo ejemplos. Usa la misma zona que `EXPO_PUBLIC_TIME_ZONE` en la app móvil. Reinicia Vite o recompila después de cambiar la configuración.

### Abrir la web

```bash
npm run dev
```

Abre **http://localhost:5173** e inicia sesión con la cuenta autorizada. Si el puerto está ocupado, Vite puede elegir otro: utiliza la dirección que muestra la terminal.

Para abrirla desde otro dispositivo en la misma red, inicia con `npm run dev -- --host 0.0.0.0` y usa la IP local de la computadora con el puerto indicado. Un servidor de desarrollo no sustituye al despliegue HTTPS necesario para la PWA fuera de localhost.

## Uso del tablero

1. Inicia sesión. La web comprueba el permiso de supervisor en el servidor; una cuenta normal recibe un mensaje de acceso denegado.
2. Selecciona una fecha y, si lo necesitas, busca por nombre o apellido.
3. Consulta los movimientos, sus horarios y la fotografía de cada checada.
4. Usa **Modo pantalla** para mostrar el reloj, los conteos y las checadas más recientes en una pantalla amplia.

| Función | Comportamiento |
|---|---|
| Fecha y búsqueda | Muestra 20 movimientos por página, del más reciente al más antiguo. La búsqueda limita coincidencias a 200 perfiles y avisa si necesitas precisar el nombre. |
| Conteos | Entradas, salidas y movimientos de todo el día seleccionado; no cambian al filtrar por nombre ni indican cuántas personas están dentro. |
| Hora | Los registros usan la fecha del servidor en UTC y se muestran según `VITE_TIME_ZONE`. El reloj de la pantalla usa la hora del equipo. |
| Fotografías | Se solicitan al abrirlas mediante una URL firmada de 60 segundos; el bucket permanece privado. |
| Realtime | Al recibir una checada se actualiza la lista y se vuelven a consultar los conteos. También se consulta al reconectar, recuperar la red o volver a la pestaña. |
| Cerrar sesión | Cierra la sesión de la web sin cerrar la del celular y retira los datos de la interfaz. |

### Modo pantalla y control remoto

El modo pantalla conserva la fecha y la búsqueda activas, vuelve a la primera página y muestra **hasta las 20 checadas más recientes de esa vista**. Selecciona inicialmente la primera tarjeta; el borde amarillo indica el foco. La lista usa dos columnas en pantallas amplias y una en pantallas estrechas, en orden de izquierda a derecha y de arriba abajo. Se desplaza al navegar cuando las tarjetas no caben.

| Tecla del control o teclado | Acción |
|---|---|
| Flechas ↑ ↓ ← → | Seleccionar la checada en esa dirección. |
| OK / Enter / Espacio | Abrir la foto seleccionada o activar el botón enfocado. |
| Atrás / Backspace / Esc | Cerrar la foto; desde la lista, salir del modo pantalla. |
| ↑ desde la primera fila | Enfocar «Salir de modo pantalla». |
| ↓ desde el botón de salir | Volver a la checada seleccionada. |

En el diálogo de fotografía, las flechas permiten elegir entre cerrar y reintentar cuando hay un error. Al cerrar se recupera la selección. Si llegan registros nuevos, se conserva la tarjeta por su identificador; si deja de estar en la página, se selecciona la primera disponible.

El navegador debe entregar las pulsaciones como eventos de teclado. Se contemplan las flechas habituales, `Enter`/`Select` y los códigos de Atrás de webOS (`461`) y Tizen (`10009`) cuando estén disponibles. **Hace falta probar el control y el navegador del televisor concreto.** Si el navegador consume Esc para salir de pantalla completa mientras hay una foto abierta, se cierra la foto y se conserva la vista ampliada. La pantalla completa y el bloqueo de suspensión dependen del navegador.

### PWA y límite de Roku

La instalación como PWA depende del navegador y requiere **HTTPS**, salvo en localhost. Cuando esté disponible, utiliza la opción del navegador para instalar la aplicación. La interfaz avisa cuando hay una versión nueva y permite actualizarla.

El service worker conserva los archivos públicos de la interfaz. Las consultas a Supabase y las fotografías pasan por la red y no se guardan en su caché. Si se pierde la conexión pueden permanecer visibles los últimos datos cargados, con un aviso; no hay un historial disponible para consultar sin conexión.

**Esta PWA no se instala ni se ejecuta directamente en Roku.** Roku no ofrece navegador web, según su [documentación de soporte](https://support.roku.com/es-mx/article/can-i-browse-the-internet). Una aplicación propia para Roku requiere [SceneGraph y BrightScript](https://developer.roku.com/dev/docs/getting-started) y sería otro proyecto. Esta web puede abrirse en un navegador compatible o en una computadora conectada al televisor.

## Configuración de Supabase

### Usar el backend existente

El proyecto de esta entrega es **`kqabddlasmvipuskvnvr`**, compartido con la app móvil. Las seis migraciones del sistema ya se aplicaron mediante el MCP de Supabase y se autorizó la cuenta indicada por el propietario. Para conectarte, configura `.env` con ese proyecto; **no vuelvas a ejecutar las migraciones iniciales**.

La confirmación de correo fue desactivada por el propietario para la demostración. No es una condición del rol supervisor: si vuelves a activarla, la cuenta deberá confirmar su correo para iniciar sesión. Ese ajuste y SMTP se administran en el panel de Supabase, no desde la web. La recepción real de correo no se verificó.

### Reproducir el backend en un proyecto nuevo

Las migraciones web **amplían las del móvil**. Revisa el proyecto de destino y aplica los archivos de esta tabla en orden mediante `apply_migration` del MCP o ejecutando su contenido en SQL Editor con permisos administrativos. Si el backend móvil ya existe, revisa su historial y comienza en el paso 4.

| Orden | Origen y migración | Resultado |
|---|---|---|
| 1 | Móvil · [20260924054226_attendance_initial.sql](https://github.com/Lok-yo/checador-asistencia/blob/main/supabase/migrations/20260924054226_attendance_initial.sql) | Tablas, perfiles automáticos, RLS, bucket privado y RPC inicial. |
| 2 | Móvil · [20260924055128_private_rpc.sql](https://github.com/Lok-yo/checador-asistencia/blob/main/supabase/migrations/20260924055128_private_rpc.sql) | Lógica privilegiada en el esquema `attendance_private`. |
| 3 | Móvil · [20260924060046_monotonic_server_time.sql](https://github.com/Lok-yo/checador-asistencia/blob/main/supabase/migrations/20260924060046_monotonic_server_time.sql) | Tiempo del servidor y orden de movimientos simultáneos. |
| 4 | Web · [20260929212353_attendance_supervisors.sql](supabase/migrations/20260929212353_attendance_supervisors.sql) | Lista de supervisores, autorización, lectura global e índice por fecha. |
| 5 | Web · [20260929212400_attendance_realtime.sql](supabase/migrations/20260929212400_attendance_realtime.sql) | Publicación de `attendance` en `supabase_realtime`. |
| 6 | Web · [20260929212642_attendance_read_policies.sql](supabase/migrations/20260929212642_attendance_read_policies.sql) | Políticas de lectura de dueño o supervisor en `profiles` y `attendance`; Storage conserva sus políticas separadas. |

No dupliques las migraciones móviles dentro de este repositorio. Ambos repos contienen partes de una misma historia de base de datos: el MCP `apply_migration` registra esa historia; ejecutar SQL manualmente en SQL Editor no lo hace. Esta entrega no incluye configuración local de Supabase CLI ni un flujo de `db push` independiente por repositorio.

### Autorizar un supervisor

La cuenta debe existir en Supabase Auth; puedes crearla mediante el registro de la app móvil. Después:

1. Abre [autorizar_supervisor.sql](supabase/scripts/autorizar_supervisor.sql) en SQL Editor.
2. Ejecuta **solo el paso 1** para localizar la cuenta y copiar su UUID.
3. Sustituye el UUID de ejemplo en `v_user` y ejecuta el bloque del **paso 2**. El script se detiene si dejas el ejemplo o la cuenta no existe.
4. Ejecuta el **paso 3** para comprobar la autorización. Inicia sesión en la web; si estaba abierta con acceso denegado, vuelve a comprobar el acceso o inicia sesión de nuevo.

El script incluye una instrucción comentada para retirar el permiso más adelante. Solo un administrador del backend puede modificar `attendance_supervisors`; la clave pública y la interfaz no conceden ese permiso.

### Verificar la configuración

Ejecuta [verificar_web.sql](supabase/scripts/verificar_web.sql) desde SQL Editor. Es una consulta de **solo lectura**. Comprueba:

- RLS activo y al menos una cuenta en `attendance_supervisors`.
- `authenticated` con permiso `SELECT` en esa tabla y `anon` sin permisos.
- Políticas de lectura propias y de supervisor; bucket privado, JPEG y límite de **2 MiB**.
- `attendance` incluida en la publicación `supabase_realtime`.

Las pruebas de [supervisor_access.sql](supabase/tests/supervisor_access.sql) crean datos temporales y validan acceso propio, lectura del supervisor y denegación de escritura. Terminan con `ROLLBACK`; son pruebas del backend y requieren privilegios administrativos.

### Seguridad y alcance de los permisos

Los usuarios normales conservan acceso únicamente a sus datos. Un supervisor puede consultar **todos los perfiles, registros y fotografías del checador**; ese permiso no habilita escritura directa en las tablas ni administración de cuentas. Las contraseñas se gestionan exclusivamente mediante Supabase Auth.

Los movimientos siguen finalizándose desde la app mediante `finalize_attendance`, con las reglas de entrada/salida, propiedad de foto, tiempo del servidor y protección contra duplicados. Separar los repositorios no cambia esas reglas.

**Límite de confianza:** la fotografía es evidencia visual. Android comprueba la biometría localmente y Supabase no recibe una prueba criptográfica del sensor; la web no compara rostros ni detecta vida.

## Compilar y publicar

```bash
npm run build
npm run preview
```

`build` comprueba TypeScript y genera **`dist/`** con la web y la PWA. `preview` sirve esa compilación en **http://localhost:4173** para revisión local; no es un servidor de producción. Usa la dirección real indicada por Vite si el puerto está ocupado.

Para un hosting estático que publique en la raíz del dominio:

| Ajuste | Valor |
|---|---|
| Directorio del proyecto | Raíz de este repositorio. |
| Instalación | `npm ci` |
| Compilación | `npm run build` |
| Directorio publicado | `dist` |
| Variables previas a la compilación | Las tres variables `VITE_*` de [.env.example](.env.example). |
| Conexión | HTTPS para la PWA y las capacidades del navegador que lo requieran. |

La configuración actual usa `/` como raíz. Para publicar bajo una subruta debes ajustar `base` de Vite y las rutas del manifiesto antes de compilar. Después de cambiar las variables del hosting, vuelve a generar y publicar `dist/`.

## Estructura y archivos versionados

| Ruta | Responsabilidad |
|---|---|
| [src/components/Dashboard.tsx](src/components/Dashboard.tsx) | Tablero, filtros y modo pantalla. |
| [src/components/RecordList.tsx](src/components/RecordList.tsx), [PhotoDialog.tsx](src/components/PhotoDialog.tsx) | Lista, selección y consulta de fotos privadas. |
| [src/hooks/](src/hooks/) | Consultas, Realtime, navegación con control y pantalla completa. |
| [src/state/session.tsx](src/state/session.tsx) | Autenticación y comprobación del permiso de supervisor. |
| [src/lib/](src/lib/) | Configuración, consultas, fechas, errores y teclas del control. |
| [vite.config.ts](vite.config.ts), [public/](public/) | Compilación, service worker, manifiesto e iconos de la PWA. |
| [supabase/](supabase/) | Migraciones, autorización de supervisores, diagnóstico y pruebas SQL. |
| [.impeccable/config.json](.impeccable/config.json) | Criterios y excepciones del detector de diseño usado en desarrollo. |

### ¿Deben estar `supabase/` y `.impeccable/` en GitHub?

**`supabase/`: sí.** Es código fuente del backend de esta web: conserva políticas, funciones y scripts necesarios para reproducir y revisar su acceso a los datos. No contiene una copia de las cuentas, fotografías ni credenciales; los scripts usan valores de ejemplo.

**`.impeccable/`: es opcional y puede conservarse.** Comparte la configuración del detector de diseño entre quienes trabajan en el repositorio. La configuración actual documenta una excepción acotada en `src/styles.css` y no contiene secretos. La aplicación, Vite y Supabase no la necesitan para funcionar.

Al desplegar, publica únicamente **`dist/`**. Estas carpetas son fuentes y herramientas del repositorio; no se incluyen en el directorio de la aplicación generado por Vite. Tampoco se versionan `.env`, `node_modules/` ni las compilaciones locales.

| Comando | Uso |
|---|---|
| `npm ci` | Instalar las versiones de [package-lock.json](package-lock.json). |
| `npm run dev` | Iniciar Vite para desarrollo. |
| `npm run typecheck` | Comprobar TypeScript. |
| `npm run build` | Comprobar TypeScript y generar `dist/`. |
| `npm run preview` | Revisar localmente la compilación generada. |

## Diagnóstico rápido

| Problema | Qué revisar |
|---|---|
| Pantalla de configuración incompleta | Completa las variables de `.env` con el mismo proyecto que la app; reinicia Vite o recompila. |
| Correo o contraseña rechazados | Verifica las credenciales, la confirmación de correo y los ajustes de Supabase Auth. |
| Acceso denegado tras iniciar sesión | Comprueba la cuenta en `attendance_supervisors`; estar registrado no concede supervisión. |
| No aparecen registros | Revisa la fecha, la zona horaria, el filtro de nombre y `verificar_web.sql`. |
| No se abre una foto | Comprueba la existencia del objeto y las políticas de lectura de Storage; usa **Reintentar** para obtener otro enlace. |
| No llegan movimientos nuevos | Revisa la conexión y la publicación de Realtime; usa **Actualizar** para volver a consultar. |
| No se ofrece instalar la PWA o falla el control | Comprueba HTTPS y las capacidades del navegador y dispositivo; Roku requiere una aplicación distinta. |

## Verificación y demostración

**Resultados registrados hasta el 29 de septiembre de 2026.** Se distingue la configuración comprobada de las pruebas con datos reales que faltan:

| Comprobación | Resultado registrado |
|---|---|
| Herramientas locales | Instalación, TypeScript, compilación PWA y arranque HTTP de Vite completados. |
| MCP y PostgreSQL | Tres migraciones web aplicadas, cuenta indicada por el propietario autorizada, RLS, permisos, bucket y publicación de Realtime revisados. Las pruebas de acceso propias y de supervisor superadas con datos temporales y `ROLLBACK`. |
| API real | Rechazo de consulta anónima a `attendance_supervisors` comprobado. |
| Chromium con datos de prueba | Flechas, apertura/cierre de foto, reintento, conservación de selección y desplazamiento comprobados con los componentes reales. Diseño revisado en 1920×1080, 1280×720, 1024×768 y 390×844. |
| Uso observado por el propietario | El usuario mostró el tablero funcionando en modo pantalla mediante una captura. |

Las pruebas de Chromium utilizaron registros e imagen de prueba, no la autenticación ni fotografías reales del proyecto. Queda pendiente comprobar en navegador el inicio de sesión, la foto real y la actualización de Realtime de extremo a extremo; también el control físico y la instalación en el dispositivo elegido. Las comprobaciones del asesor de Supabase son una revisión puntual, no una garantía permanente de seguridad.

### Lista para la demostración con datos reales

- [ ] Iniciar sesión como supervisor y comprobar fecha, nombres, conteos y una fotografía real.
- [ ] Entrar con una cuenta sin permiso y comprobar el acceso denegado.
- [ ] Registrar entrada o salida desde la app con la web abierta; comprobar el nuevo movimiento y los conteos.
- [ ] Perder y recuperar la red; comprobar que se vuelve a consultar el backend.
- [ ] Usar flechas, OK y Atrás en modo pantalla; abrir una foto, volver a la selección y salir del modo. Repetir con el control físico si el navegador de la televisión puede abrir la web.
- [ ] Cerrar sesión y comprobar que desaparecen los datos y la foto abierta.

## Origen y referencias

La web se extrajo del directorio `web/` de `TheRoDoX09/ChecadorWeb`, conservando la autoría de **Rodolfo Herrera Sosa** en el historial Git. Este repositorio mantiene sus dependencias y código independientes de la aplicación Expo.

- [Requisitos de Vite](https://vite.dev/guide/), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
- [Claves API de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime con PostgreSQL](https://supabase.com/docs/guides/realtime/postgres-changes).
- [Migraciones de Supabase](https://supabase.com/docs/guides/deployment/database-migrations), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
