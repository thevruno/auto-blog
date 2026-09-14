# auto-blog

Sitio personal + panel de gestión de **Elena Kuchimpos** (neuropsicoeducadora,
directora del IFOPAC). Incluye landing, blog, sección «En los medios», contacto
y un panel privado para administrar todo el contenido sin tocar código.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** con tipografías y paleta de marca propias
- **PostgreSQL** + **Drizzle ORM** (`node-postgres`)
- **Tiptap** para el editor de texto enriquecido del blog
- **jose** (JWT en cookie `httpOnly`) para la sesión del panel
- **Nodemailer** para las notificaciones del formulario de contacto

## Puesta en marcha

```bash
npm install
cp .env.example .env.local      # completar DATABASE_URL y SESSION_SECRET
npm run db:setup                # crea/actualiza las tablas y carga el contenido inicial
npm run db:verify               # confirma que la base quedó lista
npm run dev
```

La base puede ser local o un Postgres administrado: los pasos con Supabase
(incluido Supabase Storage para las imágenes) están en la sección siguiente.

Acceso al panel: `/admin` → `admin@elenakuchimpos.com` / `elena2026`
(cambiar la clave desde **Perfil** después del primer ingreso).

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y ejecución en producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza el esquema de Drizzle con la base |
| `npm run db:seed` | Carga contenido inicial si la base está vacía |
| `npm run db:setup` | `db:push` + `db:seed` (puesta en marcha en un paso) |
| `npm run db:verify` | Diagnóstico: conexión, tablas, contenido y usuario admin |
| `npm run db:export` | Vuelca todo el contenido a `scripts/data/content.json` |
| `npm run db:import` | Carga ese archivo en la base destino (DIRECT_URL / DATABASE_URL) |
| `npm run db:migrate` | Copia base → base (útil para pasar de local a Supabase) |
| `npm run check:storage` | Prueba las subidas (Supabase Storage simulado + modo local) |
| `npm run check:discovery` | Prueba del rastreador web con respuestas simuladas |

> El esquema también se auto-repara en tiempo de ejecución
> (`src/db/bootstrap.ts`): si una instalación no corrió `db:push`, las tablas del
> rastreo se crean solas la primera vez que se usa el panel.
>
> Orden de carga de variables fuera de Next (`drizzle-kit`, seed y scripts):
> `.env.local` → `.env.development.local` → `.env` (el primero que define una
> variable gana).

## Base de datos en Supabase

### 1. Crear el proyecto y obtener la cadena

En <https://supabase.com> creá el proyecto y copiá la cadena de conexión:
**Project Settings → Database → Connection string → Session pooler**.

```
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres
```

Se usa el **session pooler** porque tiene IPv4 (la conexión directa
`db.<REF>.supabase.co` es solo IPv6 salvo que compres el add-on) y admite DDL,
así que sirve tanto para la app como para `drizzle-kit push`. La app le agrega
`sslmode=require` sola cuando el host es de Supabase.

Pegala en `.env.local`:

```env
DATABASE_URL=postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:5432/postgres
SESSION_SECRET=una-cadena-larga-y-aleatoria
```

Si la app va a correr en serverless (Vercel, etc.), conviene separar las
conexiones: `DATABASE_URL` con el *transaction pooler* (puerto `6543`,
`?pgbouncer=true`) para la app y `DIRECT_URL` con el *session pooler*
(puerto `5432`) para las migraciones:

```env
DATABASE_URL=postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:5432/postgres
```

> No hace falta `supabase-js`, la anon key ni la CLI de Supabase: la app habla
> Postgres con Drizzle. Tampoco se usan `supabase/migrations`.

### 2. Crear las tablas y cargar el contenido

```bash
npm run db:setup     # esquema (db:push) + contenido inicial (db:seed)
npm run db:verify    # conexión, tablas, contenido y usuario admin
```

Para llevar **el contenido que ya existe** (por ejemplo, el que está cargado en
el entorno de desarrollo o el que dejó Arena) hay dos caminos:

```bash
# A) la base de origen es accesible desde esta máquina
SOURCE_DATABASE_URL=postgresql://…origen…  npm run db:migrate

# B) el contenido viene en un archivo exportado (scripts/data/content.json)
npm run db:import
```

`db:import` carga `scripts/data/content.json`, que ya incluye el contenido
actual del proyecto (notas, medios, credenciales, perfil y el usuario admin).
Los dos caminos reemplazan el contenido de las tablas destino y ajustan las
secuencias de `id`, así que se pueden repetir sin duplicar nada. Antes de
escribir podés simular con `DRY_RUN=1` y después comparar las dos bases:

```bash
COMPARE_WITH=postgresql://…referencia…  npm run db:verify
```

### 3. Imágenes en Supabase Storage (opcional)

Sin configurar nada, las imágenes del panel se guardan en `storage/uploads` del
servidor. Para que vayan a Supabase Storage agregá en `.env.local`:

```env
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # Project Settings → API
SUPABASE_STORAGE_BUCKET=media                  # opcional, por defecto "media"
```

El bucket se crea automáticamente (público, límite 5 MB, solo imágenes). La
`service_role` key **solo se usa del lado del servidor**: no la pongas en el
cliente ni la subas al repositorio. Podés comprobar el estado con
`GET /api/health`, que informa la base y el modo de almacenamiento.

### 4. Verificaciones y problemas frecuentes

| Síntoma | Causa habitual |
| --- | --- |
| `password authentication failed` | La contraseña de la cadena no es la de la base (Project Settings → Database → Reset password) |
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | Estás usando la conexión directa IPv6: cambiá al session pooler |
| `self-signed certificate` / `certificate verify failed` | El entorno no valida el certificado del pooler: agregá `uselibpqcompat=true&sslmode=require` a la URL |
| `prepared statement "s0" already exists` | Estás usando el transaction pooler para migraciones: dejá `DIRECT_URL` con el puerto 5432 |
| La app no conecta tras unos días | El plan gratuito pausa el proyecto por inactividad: reactivalo desde el panel de Supabase |

La migración de esquema es idempotente: `ensureSchema()` (`src/db/bootstrap.ts`)
crea las tablas del rastreo web y la columna `media_items.status` la primera vez
que se abre el panel, por si el deploy no corre `db:push`.

## Secciones del sitio

- `/` — presentación, credenciales, últimas notas, medios, contacto
- `/blog` y `/blog/[slug]` — notas publicadas (borradores ocultos)
- `/medios` — entrevistas, notas de prensa, videos y podcasts publicados
- `/admin` — panel: notas, medios, rastreo web, mensajes, perfil, credenciales
- `/api/health` — estado de la base y del almacenamiento (útil tras el deploy)

## Rastreo web (panel → «Rastreo web»)

Busca y sigue **notas, videos, podcasts y posteos publicados en internet** sobre
una persona o un tema —por ejemplo *Elena Kuchimpos*— para volver a publicarlos
en el sitio.

### Cómo funciona

1. Escribís la búsqueda (`Elena Kuchimpos`) y elegís las fuentes.
2. El servidor consulta en paralelo:
   | Proveedor | Qué aporta | Requiere key |
   | --- | --- | --- |
   | Google News | notas y prensa (diarios, portales) | no |
   | DuckDuckGo | web abierta: blogs y sitios institucionales | no |
   | YouTube | videos y entrevistas | opcional (`YOUTUBE_API_KEY`) |
   | Apple Podcasts | episodios donde la mencionan | no |
   | Bluesky | posteos públicos | no |
   | Reddit | hilos y discusiones | no |
3. Cada resultado se filtra por relevancia (las palabras buscadas deben aparecer
   en el título, resumen, autor o medio), se deduplica por URL normalizada y se
   guarda como **hallazgo** con estado `sin revisar`.
4. Revisás los hallazgos: **Guardar**, **Descartar** o **Repostear en la web**.
5. «Repostear» crea el ítem en **En los medios** (como borrador, hasta que lo
   publiques) y, si querés, un **borrador de nota del blog** con el contexto y el
   link a la publicación original. La miniatura y la descripción se completan
   automáticamente con los metadatos públicos del enlace (Open Graph).

Un hallazgo marcado como «En el sitio» nunca se vuelve a importar, así que
repetir el rastreo no genera duplicados.

### Temas vigilados y rastreo automático

- Cada tema guardado (por ejemplo «Elena Kuchimpos») se puede rastrear de nuevo
  con un clic; las corridas registran cuántos hallazgos nuevos aparecieron.
- Para automatizarlo, definí `DISCOVERY_CRON_KEY` y llamá al endpoint desde un
  cron externo (Vercel Cron, GitHub Actions, cron del hosting):

  ```bash
  curl -X POST "https://tu-sitio.com/api/cron/discovery?key=$DISCOVERY_CRON_KEY"
  ```

  Sin esa variable, el endpoint responde `503` y queda cerrado.

### Variables de entorno del rastreo

| Variable | Uso |
| --- | --- |
| `YOUTUBE_API_KEY` | Búsqueda de videos vía API oficial (más estable) |
| `PIPED_BASE_URL`, `INVIDIOUS_BASE_URL` | Alternativas si YouTube bloquea el scraping |
| `DISCOVERY_CRON_KEY` | Habilita `/api/cron/discovery` |
| `GOOGLE_NEWS_BASE_URL`, `DUCKDUCKGO_BASE_URL`, `YOUTUBE_BASE_URL`, `APPLE_PODCASTS_BASE_URL`, `BLUESKY_BASE_URL`, `REDDIT_BASE_URL` | Cambian el endpoint de cada fuente (útil para pruebas) |

### Requisitos y límites

- El **servidor** necesita salida a internet. Si el hosting la bloquea, el panel
  muestra el proveedor en amarillo con el motivo y el resto sigue funcionando.
- X (Twitter), Instagram, Facebook y TikTok no ofrecen búsqueda pública: no se
  pueden rastrear sin una API paga. Su contenido suele aparecer igual a través de
  Google News o DuckDuckGo.
- Respetá los derechos de autor: al repostear, enlazá siempre la publicación
  original (el import lo hace por defecto).

### Verificación

`npm run check:discovery` levanta un servidor local que imita las respuestas de
las seis fuentes (sin salir a internet) y comprueba el flujo completo: parseo,
filtros de ruido, deduplicado, guardado y reposteo. Es la forma más rápida de
validar cambios sin depender de servicios externos.

## Estructura

```
src/
  app/
    (site)/           sitio público (landing, blog, medios)
    admin/            panel de gestión
    api/
      admin/          API protegida del panel (incluye discovery)
      cron/discovery  rastreo automático por cron
  components/         componentes de sitio y de panel
  db/                 esquema Drizzle, bootstrap y seed
  lib/
    discovery/        rastreo web: proveedores, filtros, import, listado
    storage.ts        subidas: Supabase Storage o carpeta local
    db-transfer.ts    export/import/migración de contenido
    ...               auth, consultas, utilidades
scripts/
  check-discovery.ts  pruebas del rastreo con respuestas simuladas
  check-storage.ts    pruebas de subida (Supabase Storage simulado + local)
  db-verify.ts        diagnóstico de la base y comparación entre bases
  db-export.ts        exporta el contenido a scripts/data/content.json
  db-import.ts        carga ese archivo en la base destino
  db-migrate.ts       copia contenido de una base a otra
  data/content.json   contenido exportado (listo para cargar en Supabase)
```
