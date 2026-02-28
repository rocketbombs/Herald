# 📰 The Hamilton Herald

A live news aggregator for Hamilton, Ontario. Pulls real-time RSS feeds from local, regional, and national sources and presents them in a clean, professional interface.

**Zero API keys. Zero cost. Fully client-side.**

![Hamilton Herald](https://img.shields.io/badge/Hamilton-Herald-C8102E?style=for-the-badge)

## Live Sources

- **CBC Hamilton** — Local coverage
- **Global News Hamilton** — Regional news
- **Bay Observer** — Independent Hamilton journalism
- **McMaster Daily News** — University news
- **The Hamilton Spectator** — Daily newspaper
- **r/Hamilton** — Community discussion (via RSS)
- **CFL News** — Tiger-Cats & Canadian football
- **CBC Toronto/Ontario** — Provincial news
- **CityNews Toronto** — GTA coverage
- **CBC Canada, Politics, Business, Health, Tech & Science**
- **Open-Meteo** — Live Hamilton weather (no API key)

Only feeds that successfully return data are displayed. Failed feeds are hidden automatically.

---

## 🚀 Deploy in 5 Minutes (Vercel — Free)

### Step 1: Get the code on GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g., `hamilton-herald`)
2. Upload all the files from this project folder, or use Git:

```bash
cd hamilton-herald
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hamilton-herald.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New Project"**
3. Select your `hamilton-herald` repository
4. Vercel auto-detects Vite — just click **"Deploy"**
5. Wait ~60 seconds, done! You get a URL like `hamilton-herald.vercel.app`

### Share it

Send the Vercel URL to anyone — it works on phones, tablets, and desktops. No login required.

---

## Alternative: Netlify (also free)

1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag and drop the `dist` folder after building locally:

```bash
npm install
npm run build
```

3. Or connect your GitHub repo for automatic deploys

---

## Alternative: Cloudflare Pages (also free)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub repo
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

---

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

---

## How It Works

- All news is fetched client-side via public RSS feeds
- CORS proxies (allorigins.win, corsproxy.io, rss2json.com) handle cross-origin restrictions
- Weather data from Open-Meteo (free, no key)
- No backend, no database, no server — just static files
- The app tries multiple proxies per feed and silently drops any that fail

## Customizing

To add/remove feeds, edit the `FEEDS` array in `src/App.jsx`. Each feed needs:

```js
{
  id: "unique-id",
  name: "Display Name",
  icon: "📺",
  color: "#C8102E",
  url: "https://example.com/rss/feed",
  category: "Category Name",
  type: "rss"
}
```

---

Built with ❤️ for the Ambitious City.
