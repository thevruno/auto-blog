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
npm run db:push                 # crea/actualiza las tablas
npm run db:seed                 # contenido de ejemplo + usuario admin
npm run dev
```

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
| `npm run check:discovery` | Prueba del rastreador web con respuestas simuladas |

> El esquema también se auto-repara en tiempo de ejecución
> (`src/db/bootstrap.ts`): si una instalación no corrió `db:push`, las tablas del
> rastreo se crean solas la primera vez que se usa el panel.

## Secciones del sitio

- `/` — presentación, credenciales, últimas notas, medios, contacto
- `/blog` y `/blog/[slug]` — notas publicadas (borradores ocultos)
- `/medios` — entrevistas, notas de prensa, videos y podcasts publicados
- `/admin` — panel: notas, medios, rastreo web, mensajes, perfil, credenciales

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
    ...               auth, consultas, utilidades
scripts/
  check-discovery.ts  pruebas del rastreo con respuestas simuladas
```
