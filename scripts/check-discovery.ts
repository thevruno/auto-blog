/**
 * Verificación del módulo de rastreo web.
 *
 * Levanta un servidor local que imita las respuestas de Google News, DuckDuckGo,
 * YouTube, Apple Podcasts, Bluesky y Reddit (mismas formas de datos, sin salir a
 * internet), corre cada proveedor y después el flujo completo:
 *
 *   búsqueda → filtros → guardado → reposteo en «En los medios».
 *
 * Uso:  npm run check:discovery
 */
import "../src/db/env";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { discoveryLeads, mediaItems, posts } from "../src/db/schema";
import { ensureSchema } from "../src/db/bootstrap";
import { PROVIDER_RUNNERS } from "../src/lib/discovery/providers";
import { runDiscoverySearch } from "../src/lib/discovery/search";
import { importLead } from "../src/lib/discovery/import";
import { normalizeUrl } from "../src/lib/discovery/text";
import { PROVIDER_IDS, type LeadCandidate } from "../src/lib/discovery/types";

const PORT = 4611;
const BASE = `http://127.0.0.1:${PORT}`;
const QUERY = "Elena Kuchimpos demo rastreo";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  const icon = condition ? "✔" : "✘";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

// ---------------------------------------------------------------------------
// Respuestas simuladas (recortadas de las reales)
// ---------------------------------------------------------------------------
const GOOGLE_NEWS_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>"Elena Kuchimpos demo rastreo" - Google News</title>
<item>
  <title>Elena Kuchimpos demo rastreo: altas capacidades en el aula - La Voz</title>
  <link>https://news.google.com/rss/articles/CBMiEjnota?oc=5</link>
  <pubDate>Wed, 03 Sep 2026 10:12:00 GMT</pubDate>
  <description>&lt;a href="https://news.google.com/rss/articles/CBMiEjnota"&gt;Elena Kuchimpos demo rastreo&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;La Voz&lt;/font&gt;</description>
  <source url="https://www.lavoz.com.ar">La Voz</source>
</item>
<item>
  <title>Entrevista a Elena Kuchimpos sobre inclusión - Canal 12</title>
  <link>https://news.google.com/rss/articles/CBMiEjotra?oc=5</link>
  <pubDate>Tue, 02 Sep 2026 08:00:00 GMT</pubDate>
  <description>Entrevista completa en el canal</description>
  <source url="https://www.canal12.com">Canal 12</source>
</item>
<item>
  <title>Fútbol de Primera: la fecha se define el domingo - Olé</title>
  <link>https://news.google.com/rss/articles/CBMiEjfutbol?oc=5</link>
  <pubDate>Mon, 01 Sep 2026 08:00:00 GMT</pubDate>
  <description>Resultados y posiciones (ruido que debe filtrarse)</description>
  <source url="https://www.ole.com.ar">Olé</source>
</item>
</channel></rss>`;

const DUCKDUCKGO_HTML = `<!DOCTYPE html><html><body>
<div class="result results_links results_links_deep web-result">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=http%3A%2F%2F127.0.0.1%3A${PORT}%2Fnota-ejemplo&amp;rut=abc">Elena Kuchimpos demo rastreo: cómo enseñar a pensar</a>
    </h2>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=http%3A%2F%2F127.0.0.1%3A${PORT}%2Fnota-ejemplo">La especialista explica por qué el rastreo de <b>menciones</b> importa.</a>
  </div>
</div>
<div class="result results_links results_links_deep web-result">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.instagram.com%2Fp%2Fxyz&amp;rut=def">Ver en Instagram</a>
    </h2>
    <a class="result__snippet" href="#">Ruido de red social que debe filtrarse</a>
  </div>
</div>
</body></html>`;

const YOUTUBE_DATA = {
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [
            {
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: "dQw4w9WgXcQ",
                      title: { runs: [{ text: "Charla TEDx: Elena Kuchimpos demo rastreo y educación" }] },
                      ownerText: { runs: [{ text: "TEDx Córdoba" }] },
                      publishedTimeText: { simpleText: "hace 3 días" },
                      viewCountText: { simpleText: "12.345 visualizaciones" },
                      descriptionSnippet: { runs: [{ text: "Cómo rastrear menciones y repostear contenido." }] },
                      thumbnail: {
                        thumbnails: [
                          { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg", width: 120, height: 90 },
                          { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", width: 480, height: 360 },
                        ],
                      },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: "aBc123XyZ98",
                      title: { runs: [{ text: "Panel sobre neuroeducación (sin las palabras buscadas)" }] },
                      ownerText: { runs: [{ text: "CongresoEducar" }] },
                      publishedTimeText: { simpleText: "hace 2 semanas" },
                      viewCountText: { simpleText: "4.100 vistas" },
                      thumbnail: {
                        thumbnails: [{ url: "https://i.ytimg.com/vi/aBc123XyZ98/hqdefault.jpg", width: 480, height: 360 }],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

const YOUTUBE_HTML = `<!DOCTYPE html><html><head><title>YouTube</title></head><body>
<script>var ytInitialData = ${JSON.stringify(YOUTUBE_DATA)};</script>
</body></html>`;

const ITUNES_JSON = {
  resultCount: 2,
  results: [
    {
      wrapperType: "podcastEpisode",
      kind: "podcast-episode",
      trackName: "T1 E14 · Elena Kuchimpos demo rastreo: educación inclusiva",
      collectionName: "Voces que educan",
      artistName: "Voces que educan",
      releaseDate: "2026-08-28T09:00:00Z",
      trackViewUrl: "https://podcasts.apple.com/ar/podcast/voces-que-educan/id1234?i=100067",
      artworkUrl600: `${BASE}/artwork-600.jpg`,
      description: "Charla sobre inclusión y altas capacidades.",
    },
    {
      wrapperType: "podcast",
      collectionName: "Otro podcast sin coincidencias",
      artistName: "Otra productora",
      releaseDate: "2026-08-01T09:00:00Z",
      collectionViewUrl: "https://podcasts.apple.com/ar/podcast/otro/id5678",
      artworkUrl160: `${BASE}/artwork-160.jpg`,
    },
  ],
};

const BLUESKY_JSON = {
  posts: [
    {
      uri: "at://did:plc:abc123/app.bsky.feed.post/3k2la9x",
      cid: "bafyreiabc",
      author: { did: "did:plc:abc123", handle: "ezekuchimpos.bsky.social", displayName: "Eze" },
      record: {
        text: "Elena Kuchimpos demo rastreo: imperdible la charla de ayer sobre altas capacidades. https://ejemplo.com/charla",
        createdAt: "2026-09-10T18:22:00.000Z",
      },
      embed: { images: [{ thumb: `${BASE}/bsky-thumb.jpg` }] },
      likeCount: 12,
      replyCount: 3,
    },
  ],
};

const REDDIT_JSON = {
  data: {
    children: [
      {
        data: {
          title: "¿Alguien escuchó la charla de Elena Kuchimpos demo rastreo?",
          permalink: "/r/educacion/comments/abc123/charla/",
          subreddit_name_prefixed: "r/educacion",
          author: "profe_ana",
          selftext: "Me pareció muy clara explicando el rastreo de menciones.",
          created_utc: 1757500000,
          thumbnail: `${BASE}/reddit-thumb.jpg`,
          score: 42,
          num_comments: 7,
        },
      },
      {
        data: {
          title: "Contenido marcado como adulto",
          permalink: "/r/otro/comments/def456/nsfw/",
          subreddit_name_prefixed: "r/otro",
          over_18: true,
        },
      },
    ],
  },
};

const ARTICLE_HTML = `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<title>Elena Kuchimpos demo rastreo: cómo enseñar a pensar | La Voz</title>
<meta property="og:title" content="Elena Kuchimpos demo rastreo: cómo enseñar a pensar" />
<meta property="og:description" content="La especialista explica por qué el rastreo de menciones importa en la escuela." />
<meta property="og:image" content="/img/portada-ejemplo.jpg" />
<meta property="og:site_name" content="La Voz" />
<meta property="article:published_time" content="2026-09-03T10:12:00Z" />
<link rel="canonical" href="${BASE}/nota-ejemplo" />
</head><body><p>Nota completa…</p></body></html>`;

const YOUTUBE_OEMBED = {
  title: "Charla TEDx: Elena Kuchimpos demo rastreo y educación",
  author_name: "TEDx Córdoba",
  thumbnail_url: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
};

// ---------------------------------------------------------------------------
// Servidor de prueba
// ---------------------------------------------------------------------------
function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", BASE);
  const path = url.pathname;

  const send = (body: string, contentType: string) => {
    res.writeHead(200, { "content-type": contentType });
    res.end(body);
  };

  if (path.startsWith("/rss/search")) return send(GOOGLE_NEWS_RSS, "application/xml");
  if (path === "/html/") return send(DUCKDUCKGO_HTML, "text/html; charset=utf-8");
  if (path === "/results") return send(YOUTUBE_HTML, "text/html; charset=utf-8");
  if (path === "/search") return send(JSON.stringify(ITUNES_JSON), "application/json");
  if (path.startsWith("/xrpc/")) return send(JSON.stringify(BLUESKY_JSON), "application/json");
  if (path.endsWith("/search.json")) return send(JSON.stringify(REDDIT_JSON), "application/json");
  if (path === "/oembed") return send(JSON.stringify(YOUTUBE_OEMBED), "application/json");
  if (path === "/nota-ejemplo") return send(ARTICLE_HTML, "text/html; charset=utf-8");

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
}

async function main() {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));

  process.env.GOOGLE_NEWS_BASE_URL = BASE;
  process.env.DUCKDUCKGO_BASE_URL = BASE;
  process.env.YOUTUBE_BASE_URL = BASE;
  process.env.YOUTUBE_OEMBED_BASE_URL = BASE;
  process.env.APPLE_PODCASTS_BASE_URL = BASE;
  process.env.BLUESKY_BASE_URL = BASE;
  process.env.REDDIT_BASE_URL = BASE;
  delete process.env.YOUTUBE_API_KEY;

  console.log(`\nServidor de prueba en ${BASE}\n`);

  try {
    await ensureSchema();

    console.log("1. Proveedores (parseo de respuestas reales simuladas)");
    const candidates = new Map<string, LeadCandidate[]>();

    for (const provider of PROVIDER_IDS) {
      try {
        const found = await PROVIDER_RUNNERS[provider](QUERY, 10);
        candidates.set(provider, found);
        check(
          `${provider}: ${found.length} resultado(s)`,
          found.length > 0 && found.every((item) => item.title && item.url),
          found[0]?.title?.slice(0, 60),
        );
      } catch (error) {
        candidates.set(provider, []);
        check(
          `${provider}: sin resultados`,
          false,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const article = candidates.get("google_news")?.find((item) => item.url.includes("Ej"));
    check(
      "Google News separa título y fuente",
      Boolean(article && article.sourceName === "La Voz"),
      article?.sourceName ?? "",
    );

    const youtube = candidates.get("youtube") ?? [];
    check(
      "YouTube extrae video, canal, fecha y miniatura",
      youtube.length === 2 &&
        youtube[0].url.includes("dQw4w9WgXcQ") &&
        youtube[0].sourceName === "YouTube · TEDx Córdoba" &&
        Boolean(youtube[0].thumbnail) &&
        Boolean(youtube[0].publishedAt),
      youtube[0]?.url,
    );

    const reddit = candidates.get("reddit") ?? [];
    check("Reddit descarta contenido +18", reddit.length === 1, `${reddit.length}`);

    const bluesky = candidates.get("bluesky") ?? [];
    check(
      "Bluesky arma el link público del posteo",
      bluesky[0]?.url === "https://bsky.app/profile/ezekuchimpos.bsky.social/post/3k2la9x",
      bluesky[0]?.url,
    );

    console.log("\n2. Orquestador (filtros de relevancia + deduplicado + guardado)");
    const result = await runDiscoverySearch({ query: QUERY, providers: PROVIDER_IDS });
    check(
      "Guarda hallazgos nuevos",
      result.inserted > 0,
      `${result.inserted} nuevos · ${result.known} conocidos · ${result.filtered} filtrados`,
    );
    check(
      "Filtra el ruido (fútbol, Instagram, NSFW)",
      result.filtered >= 3,
      `${result.filtered} descartados`,
    );
    check(
      "Cada proveedor reporta su estado",
      result.providers.length === PROVIDER_IDS.length &&
        result.providers.every((report) => report.ok),
      result.providers.map((report) => `${report.provider}:${report.kept}`).join(" "),
    );

    const second = await runDiscoverySearch({ query: QUERY, providers: PROVIDER_IDS });
    check(
      "No duplica en la segunda corrida",
      second.inserted === 0 && second.known >= result.inserted,
      `${second.inserted} nuevos · ${second.known} ya conocidos`,
    );

    const strict = await runDiscoverySearch({
      query: "Elena Kuchimpos demo",
      providers: ["google_news"],
      strict: true,
    });
    check(
      "Modo estricto exige todas las palabras",
      strict.inserted === 0,
      `${strict.inserted} nuevos · ${strict.filtered} filtrados`,
    );

    console.log("\n3. Reposteo en el sitio (import a «En los medios»)");
    const videoLead = (
      await db.select().from(discoveryLeads).where(eq(discoveryLeads.provider, "youtube")).limit(1)
    )[0];
    check("Hay un hallazgo de video para importar", Boolean(videoLead));

    const imported = await importLead(videoLead.id, { createPost: true, tags: ["Entrevistas"] });
    check(
      "Crea el ítem de medios como borrador",
      imported.mediaItem.status === "draft" &&
        imported.mediaItem.type === "video" &&
        imported.mediaItem.embedUrl === "https://www.youtube.com/embed/dQw4w9WgXcQ",
      `status=${imported.mediaItem.status} embed=${imported.mediaItem.embedUrl}`,
    );
    check(
      "Completa la miniatura y su texto alternativo",
      Boolean(imported.mediaItem.thumbnail && imported.mediaItem.thumbnailAlt),
      imported.mediaItem.thumbnailAlt ?? "",
    );
    check(
      "Crea el borrador de nota del blog",
      imported.post?.status === "draft" && Boolean(imported.post?.slug),
      imported.post?.slug,
    );
    check(
      "Marca el hallazgo como publicado en el sitio",
      imported.lead.status === "imported" && imported.lead.mediaItemId === imported.mediaItem.id,
      `lead=${imported.lead.status}`,
    );

    let reimportError = "";
    try {
      await importLead(videoLead.id, {});
    } catch (error) {
      reimportError = error instanceof Error ? error.message : "";
    }
    check("No permite repostear dos veces el mismo hallazgo", reimportError.length > 0, reimportError);

    console.log("\n4. Utilidades de URL");
    check(
      "normalizeUrl quita seguimiento y barra final",
      normalizeUrl("https://www.LaVoz.com.ar/nota/?utm_source=x#frag") ===
        "https://lavoz.com.ar/nota",
      normalizeUrl("https://www.LaVoz.com.ar/nota/?utm_source=x#frag"),
    );
    check(
      "normalizeUrl unifica variantes de YouTube",
      normalizeUrl("https://youtu.be/dQw4w9WgXcQ?t=30") ===
        normalizeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=TEDx"),
    );

    // -----------------------------------------------------------------------
    // Limpieza de los datos de prueba
    // -----------------------------------------------------------------------
    const testLeads = await db
      .select({ id: discoveryLeads.id })
      .from(discoveryLeads)
      .where(eq(discoveryLeads.query, QUERY));
    const ids = testLeads.map((lead) => lead.id);
    if (ids.length > 0) {
      await db.delete(discoveryLeads).where(inArray(discoveryLeads.id, ids));
    }
    if (imported.post) {
      await db.delete(posts).where(eq(posts.id, imported.post.id));
    }
    await db.delete(mediaItems).where(eq(mediaItems.id, imported.mediaItem.id));

    console.log(
      failures === 0
        ? "\nTodo OK ✅\n"
        : `\n${failures} verificación(es) fallaron ❌\n`,
    );
  } catch (error) {
    console.error("\nError inesperado en la verificación:", error);
    failures += 1;
  } finally {
    server.close();
    await db.$client?.end?.().catch(() => undefined);
    process.exitCode = failures === 0 ? 0 : 1;
  }
}

main().catch((error) => {
  console.error("Error en la verificación:", error);
  process.exit(1);
});
