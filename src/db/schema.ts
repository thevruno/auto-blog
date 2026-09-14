import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Usuarios del panel (un único admin, creado por seed)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Perfil del sitio (una sola fila) — hero, posicionamiento, contacto, redes
// ---------------------------------------------------------------------------
export const siteProfile = pgTable("site_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleTitle: text("role_title").notNull(),
  positioning: text("positioning").notNull(),
  heroPhoto: text("hero_photo"),
  heroPhotoAlt: text("hero_photo_alt"),
  bio: text("bio"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  linkedin: text("linkedin"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  youtube: text("youtube"),
  facebook: text("facebook"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Credenciales / línea de tiempo profesional
// ---------------------------------------------------------------------------
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  order: integer("order").notNull().default(0),
  icon: text("icon").notNull().default("🎓"),
  title: text("title").notNull(),
  institution: text("institution").notNull(),
  description: text("description").notNull(),
  highlight: boolean("highlight").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Posts del blog (contenido rico en HTML, etiquetas como array de texto)
// ---------------------------------------------------------------------------
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  coverImageAlt: text("cover_image_alt"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'`),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  readingTime: integer("reading_time"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Comentarios — modelo preparado para una futura implementación (no se usa aún)
// ---------------------------------------------------------------------------
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | spam
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Ítems de medios (entrevistas / notas / podcasts)
// ---------------------------------------------------------------------------
export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // video | article | podcast
  source: text("source").notNull(),
  publishedAt: timestamp("published_at"),
  url: text("url"),
  embedUrl: text("embed_url"),
  thumbnail: text("thumbnail"),
  thumbnailAlt: text("thumbnail_alt"),
  description: text("description"),
  // published = visible en el sitio · draft = borrador (por ejemplo, importado
  // desde el rastreo web y pendiente de revisión)
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Rastreo web — temas vigilados (búsquedas que se repiten en el tiempo)
// ---------------------------------------------------------------------------
export const discoveryTopics = pgTable("discovery_topics", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(), // "Elena Kuchimpos"
  query: text("query").notNull(), // "Elena Kuchimpos IFOPAC"
  providers: text("providers")
    .array()
    .notNull()
    .default(sql`'{}'`), // vacío = todos los proveedores
  strictMatch: boolean("strict_match").notNull().default(false),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  lastRunNew: integer("last_run_new").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Rastreo web — hallazgos (notas, videos, podcasts y posteos encontrados)
// ---------------------------------------------------------------------------
export const discoveryLeads = pgTable(
  "discovery_leads",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id").references(() => discoveryTopics.id, {
      onDelete: "set null",
    }),
    query: text("query").notNull(),
    provider: text("provider").notNull(), // google_news | youtube | bluesky | …
    type: text("type").notNull(), // article | video | podcast | social
    title: text("title").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull().unique(),
    sourceName: text("source_name"),
    sourceDomain: text("source_domain"),
    author: text("author"),
    snippet: text("snippet"),
    thumbnail: text("thumbnail"),
    publishedAt: timestamp("published_at"),
    // new = sin revisar · saved = marcado para repostear · imported = ya
    // publicado en el sitio · discarded = descartado
    status: text("status").notNull().default("new"),
    timesSeen: integer("times_seen").notNull().default(1),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    mediaItemId: integer("media_item_id").references(() => mediaItems.id, {
      onDelete: "set null",
    }),
    postId: integer("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    discoveredAt: timestamp("discovered_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("discovery_leads_status_idx").on(table.status),
    index("discovery_leads_provider_idx").on(table.provider),
    index("discovery_leads_published_at_idx").on(table.publishedAt),
  ],
);

// ---------------------------------------------------------------------------
// Mensajes de contacto desde la landing
// ---------------------------------------------------------------------------
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type Credential = typeof credentials.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SiteProfile = typeof siteProfile.$inferSelect;
export type DiscoveryTopic = typeof discoveryTopics.$inferSelect;
export type DiscoveryLead = typeof discoveryLeads.$inferSelect;
