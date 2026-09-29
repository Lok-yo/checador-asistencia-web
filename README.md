# Checador de asistencia · Web

Web de supervisión con React, Vite, TypeScript y Supabase para consultar entradas, salidas y fotografías registradas por la [app Android](https://github.com/Lok-yo/checador-asistencia).

Incluye filtros por fecha y nombre, actualización en tiempo real, modo pantalla y PWA. No permite registrar checadas ni administrar cuentas.

## Requisitos

- Node.js 22, versión 22.13 o superior, npm y Git.
- Un navegador moderno con conexión a internet.
- El mismo proyecto Supabase de la app móvil y una cuenta autorizada como supervisor.

## Instalación

```bash
git clone https://github.com/Lok-yo/checador-asistencia-web.git
cd checador-asistencia-web
npm ci
cp .env.example .env
```

En Windows usa `copy .env.example .env`.

Completa `.env` con la URL y clave publicable del proyecto Supabase:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_TIME_ZONE=America/Hermosillo
```

No uses claves `service_role` ni `sb_secret_...`. Usa la misma zona horaria que la app; las fechas del servidor se guardan en UTC. Reinicia Vite o recompila después de cambiar estas variables.

## Ejecutar

```bash
npm run dev
```

Abre **http://localhost:5173** e inicia sesión como supervisor. Si el puerto está ocupado, usa la dirección indicada por Vite.

Para abrir desde otro dispositivo en la misma red, ejecuta `npm run dev -- --host 0.0.0.0` y utiliza la IP local de la computadora.

## Supabase

Para un proyecto nuevo, aplica primero las [migraciones de la app móvil](https://github.com/Lok-yo/checador-asistencia/tree/main/supabase/migrations) y después las de [supabase/migrations/](supabase/migrations/), en orden por nombre, desde SQL Editor. Ambas aplicaciones comparten una base de datos. No vuelvas a ejecutar migraciones ya aplicadas.

Las cuentas se crean mediante Supabase Auth, por ejemplo desde la app móvil. La confirmación de correo se configura en **Authentication → Providers → Email**; si la activas, configura SMTP y confirma la cuenta antes de iniciar sesión.

Para autorizar un supervisor, abre [autorizar_supervisor.sql](supabase/scripts/autorizar_supervisor.sql) y sigue sus pasos: localiza el UUID de la cuenta, sustituye el UUID de ejemplo y ejecuta la autorización y su comprobación. Registrarse no concede este permiso automáticamente.

Los supervisores pueden consultar los perfiles, registros y fotos del checador; los usuarios normales conservan acceso únicamente a sus datos. Las fotos permanecen privadas y se abren mediante enlaces temporales. El permiso de supervisor no permite escribir checadas ni administrar cuentas.

Puedes revisar la configuración con [verificar_web.sql](supabase/scripts/verificar_web.sql).

## Uso y modo pantalla

Selecciona una fecha, busca por nombre y abre un registro para ver su foto. Los conteos corresponden a todos los movimientos del día seleccionado; no indican cuántas personas están dentro.

El **modo pantalla** muestra el reloj y las checadas más recientes. La tarjeta seleccionada tiene un borde amarillo; la lista se desplaza al navegar cuando es necesario.

| Tecla | Acción |
|---|---|
| Flechas | Mover la selección. |
| OK / Enter / Espacio | Abrir la foto o activar el botón seleccionado. |
| Atrás / Backspace / Esc | Cerrar la foto o salir del modo pantalla. |

El control remoto funciona si el navegador entrega estas pulsaciones como eventos de teclado. La pantalla completa y el bloqueo de suspensión dependen del navegador.

## Publicar e instalar como PWA

```bash
npm run build
npm run preview
```

La compilación se genera en **`dist/`**. Publícala en un hosting estático con HTTPS, configurando las variables `VITE_*` antes de compilar. La configuración actual publica en la raíz del dominio.

`preview` permite revisar la compilación en **http://localhost:4173**; no es un servidor de producción.

La PWA se instala desde la opción del navegador cuando sea compatible. Requiere HTTPS, salvo en localhost, e internet para consultar registros y fotografías; no ofrece historial sin conexión.

**No se instala directamente en Roku.** Para mostrarla en una televisión necesitas un navegador compatible o una computadora conectada a la pantalla.

## Comandos

```bash
npm run typecheck
npm run build
```
