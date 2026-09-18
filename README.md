# Auto-Blog

Plataforma de blogs + panel de administración con rastreo web automático.
Ejemplo de uso: sitio de Elena Kuchimpos (neuropsicoeducadora).

## Demo

Credenciales del panel de administración:

- **Email:** admin@elenakuchimpos.com
- **Password:** Supersecreto2020

## Quick Start

```bash
git clone <repo-url>
cd auto-blog
npm install
cp .env.example .env.local
# Editar .env.local (ver Variables de entorno)
npm run db:setup
npm run dev
```

Abrí http://localhost:3000 y visitá /admin para entrar al panel.

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `SESSION_SECRET` | Sí | Secreto JWT (generar con `openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Sí | Contraseña del usuario admin |
| `NEXT_PUBLIC_SITE_URL` | Sí | URL pública del sitio |
| `SUPABASE_URL` | No | Para imágenes en Supabase Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Key de Supabase (solo servidor) |
| `SMTP_HOST` | No | Servidor de correo para contacto |
| `YOUTUBE_API_KEY` | No | Para rastreo web de YouTube |

## Base de datos

Funciona con cualquier PostgreSQL.

### Supabase (recomendado para producción)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **Project Settings → Database → Connection string**
3. Copiar la cadena del **Session pooler** (puerto 5432)
4. Pegar en `.env.local` como `DATABASE_URL`
5. Ejecutar `npm run db:setup`

La app detecta Supabase automáticamente y configura SSL.

### Base local

```bash
# PostgreSQL local
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/tu_db
```

## Deploy

### Vercel (recomendado)

1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno en el dashboard
3. Deploy automático en cada push a `main`

### Variables para Vercel

En serverless, usar transaction pooler para `DATABASE_URL`:

```env
DATABASE_URL=postgresql://...:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...:5432/postgres
```

> **Nota:** El CI/CD de GitHub Actions requiere configurar los secrets
> `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` en el repositorio.

## Estructura

```
src/
  app/(site)/       Páginas públicas (landing, blog, medios)
  app/admin/        Panel de administración
  app/api/          Endpoints API
  components/       Componentes React (públicos y admin)
  db/               Esquema Drizzle, seed, bootstrap
  lib/              Auth, queries, discovery, utilidades
public/             Imágenes y assets estáticos
scripts/            Scripts de diagnóstico y migración
```

## Rastreo web

El panel incluye un rastreador automático que busca menciones en:

- Google News (notas y prensa)
- DuckDuckGo (web abierta)
- YouTube (videos y entrevistas)
- Apple Podcasts (episodios)
- Bluesky y Reddit (redes sociales)

Los resultados se guardan como "hallazgos" que podés revisar, guardar o reposteear directamente al sitio.

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Ejecutar en producción |
| `npm run db:setup` | Crear tablas + cargar datos iniciales |
| `npm run db:verify` | Verificar conexión y contenido |
| `npm run db:push` | Sincronizar esquema con la base |
| `npm run lint` | Verificar código |
| `npm run typecheck` | Verificar tipos |

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** PostgreSQL, Drizzle ORM, jose (JWT)
- **Editor:** Tiptap para contenido enriquecido
- **Email:** Nodemailer (opcional)
- **Deploy:** Vercel
