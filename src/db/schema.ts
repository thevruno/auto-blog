import { sql } from "drizzle-orm";
import {
  boolean,
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
