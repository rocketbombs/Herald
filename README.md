# 📰 The Hamilton Herald

A fast, live news aggregator for Hamilton, Ontario. Server-side RSS fetching with edge caching delivers all articles in a single response.

**Zero API keys. Zero cost. Blazing fast.**

## Architecture

```
Browser → GET /api/feeds → Vercel Serverless Function
                               ├─ Fetches 14 RSS feeds in parallel (server-side, no CORS)
                               ├─ Parses, deduplicates, sorts by date
                               ├─ Returns single JSON payload
                               └─ Cached 5 min (in-memory + Vercel edge CDN)

Browser → Open-Meteo API → Hamilton weather (direct, has CORS)
```

**Before:** 14 separate browser requests through CORS proxies (~8-15 seconds)
**After:** 1 request to your own serverless function (~0.5-2 seconds, instant if cached)

## Live Sources

- CBC Hamilton, Global News Hamilton, Bay Observer, The Spec
- McMaster Daily News, r/Hamilton (via RSS)
- CFL News (Tiger-Cats), CityNews Toronto
- CBC Canada, Ontario, Politics, Business, Health, Tech & Science
- Open-Meteo weather (no API key)

## Deploy to Vercel (Free, 5 minutes)

### 1. Push to GitHub

```bash
cd hamilton-herald
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hamilton-herald.git
git push -u origin main
```

### 2. Deploy

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **"Add New Project"** → select `hamilton-herald`
3. Click **Deploy** (Vercel auto-detects Vite + serverless functions)
4. Done → share the URL

## Local Development

```bash
npm install
npx vercel dev
```

This runs both the Vite frontend and the serverless function locally. Opens at `http://localhost:3000`.

(Plain `npm run dev` works for the frontend but won't have the `/api/feeds` endpoint — it'll fall back to the slower client-side approach if you add that fallback.)

## Project Structure

```
hamilton-herald/
├── api/
│   └── feeds.js          ← Vercel serverless function (RSS fetcher + cache)
├── src/
│   ├── App.jsx            ← React frontend
│   └── main.jsx           ← Entry point
├── index.html
├── package.json
├── vite.config.js
└── vercel.json            ← Function config + CDN cache headers
```

## Customizing Feeds

Edit the `FEEDS` array in `api/feeds.js` to add/remove sources. Each feed needs:

```js
{ id: "unique-id", name: "Display Name", icon: "📺", color: "#C8102E",
  url: "https://example.com/rss/feed", category: "Category Name" }
```

Then add matching metadata to `FEED_META` in `src/App.jsx` for rendering.

## Caching Strategy

- **In-memory cache:** 5-minute TTL on the serverless function (survives warm starts)
- **Vercel CDN:** `s-maxage=300, stale-while-revalidate=600` — CDN serves cached response for 5 min, then refreshes in background for 10 min
- **Client-side:** Auto-refreshes every 5 minutes, shows stale data immediately while fetching

Net effect: First visitor after cache expires waits ~1-2s, everyone else gets instant response.

---

Built with ❤️ for the Ambitious City.
