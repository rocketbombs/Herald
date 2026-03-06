// /api/feeds.js — Vercel Serverless Function
// Fetches all RSS feeds server-side (no CORS issues), caches for 5 minutes,
// returns a single JSON payload to the frontend.

const FEEDS = [
  { id: "cbc-ham", name: "CBC Hamilton", icon: "📺", color: "#C8102E", url: "https://www.cbc.ca/cmlink/rss-canada-hamilton", category: "Hamilton" },
  { id: "global-ham", name: "Global News Hamilton", icon: "📡", color: "#1565C0", url: "https://globalnews.ca/hamilton/feed/", category: "Hamilton" },
  { id: "bayobserver", name: "Bay Observer", icon: "🌊", color: "#0077B6", url: "https://bayobserver.ca/feed/", category: "Hamilton" },
  { id: "mcmaster", name: "McMaster Daily News", icon: "🎓", color: "#7A003C", url: "https://dailynews.mcmaster.ca/feed/", category: "McMaster" },
  { id: "cfl", name: "CFL News", icon: "🏈", color: "#FFB81C", url: "https://www.cfl.ca/feed/", category: "Sports" },
  { id: "cbc-ca", name: "CBC Canada", icon: "🇨🇦", color: "#B71C1C", url: "https://www.cbc.ca/cmlink/rss-topstories", category: "Canada" },
  { id: "cbc-on", name: "CBC Toronto", icon: "📺", color: "#D32F2F", url: "https://www.cbc.ca/cmlink/rss-canada-toronto", category: "Ontario" },
  { id: "reddit", name: "r/Hamilton", icon: "💬", color: "#FF4500", url: "https://www.reddit.com/r/Hamilton/.rss", category: "Community" },
  { id: "spec", name: "The Spec", icon: "📰", color: "#2D3748", url: "https://www.thespec.com/rss/", category: "Hamilton" },
  { id: "citynews", name: "CityNews Toronto", icon: "📺", color: "#0D47A1", url: "https://toronto.citynews.ca/feed/", category: "Ontario" },
  { id: "cbc-politics", name: "CBC Politics", icon: "🏛️", color: "#4A148C", url: "https://www.cbc.ca/cmlink/rss-politics", category: "Politics" },
  { id: "cbc-business", name: "CBC Business", icon: "💼", color: "#1B5E20", url: "https://www.cbc.ca/cmlink/rss-business", category: "Business" },
  { id: "cbc-health", name: "CBC Health", icon: "🏥", color: "#00838F", url: "https://www.cbc.ca/cmlink/rss-health", category: "Health" },
  { id: "cbc-tech", name: "CBC Tech & Science", icon: "🔬", color: "#4527A0", url: "https://www.cbc.ca/cmlink/rss-technology", category: "Tech" },
];

// ── In-memory cache (persists across warm invocations) ──────────────────────
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Minimal XML parser for RSS/Atom ─────────────────────────────────────────
function parseItems(xml) {
  const items = [];

  // Try RSS <item> blocks
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, "title"),
      description: extractTag(block, "description") || extractTag(block, "content:encoded"),
      link: extractTag(block, "link"),
      pubDate: extractTag(block, "pubDate") || extractTag(block, "dc:date"),
    });
  }

  // If no RSS items, try Atom <entry> blocks
  if (items.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/);
      items.push({
        title: extractTag(block, "title"),
        description: extractTag(block, "summary") || extractTag(block, "content"),
        link: linkMatch ? linkMatch[1] : extractTag(block, "link"),
        pubDate: extractTag(block, "published") || extractTag(block, "updated"),
      });
    }
  }

  return items.slice(0, 12);
}

function extractTag(xml, tag) {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Normal tag
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(regex);
  return m ? m[1].trim() : "";
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Fetch a single feed ─────────────────────────────────────────────────────
async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HamiltonHerald/1.0 (RSS Aggregator)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.length < 100) return null;

    const items = parseItems(text);
    if (items.length === 0) return null;

    const articles = items
      .map((item) => ({
        title: stripHtml(item.title),
        summary: stripHtml(item.description).slice(0, 300),
        link: item.link,
        pubDate: item.pubDate || "",
        feedId: feed.id,
        category: feed.category,
      }))
      .filter((a) => a.title && a.title.length > 5);

    if (articles.length === 0) return null;

    return {
      feed: { id: feed.id, name: feed.name, icon: feed.icon, color: feed.color, category: feed.category, count: articles.length },
      articles,
    };
  } catch {
    return null;
  }
}

// ── Deduplicate ─────────────────────────────────────────────────────────────
function dedup(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const k = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  // Return cached data if fresh
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(cache.data);
  }

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));

  const allArticles = [];
  const liveFeeds = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      liveFeeds.push(result.value.feed);
      allArticles.push(...result.value.articles);
    }
  }

  // Deduplicate and sort by date
  const sorted = dedup(allArticles).sort((a, b) => {
    const da = new Date(a.pubDate || 0).getTime();
    const db = new Date(b.pubDate || 0).getTime();
    return db - da;
  });

  const payload = {
    articles: sorted,
    feeds: liveFeeds,
    fetchedAt: new Date().toISOString(),
    totalFeeds: FEEDS.length,
  };

  // Cache it
  cache = { data: payload, timestamp: now };

  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json(payload);
}
