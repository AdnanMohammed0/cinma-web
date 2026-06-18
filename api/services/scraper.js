const { chromium } = require('playwright');

let browser;
let activePages = 0;
const MAX_PAGES = 3;
const queue = [];

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    if (browser) await browser.close().catch(() => {});
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
  }
  return browser;
}

const SOURCES = [
  {
    name: 'vidlink',
    url: (id, type, s, e) =>
      type === 'movie' ? `https://vidlink.pro/movie/${id}` : `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
];

async function acquirePage() {
  if (activePages >= MAX_PAGES) {
    let resolved = false;
    await Promise.race([
      new Promise((r) => queue.push(r)),
      new Promise((_, reject) => setTimeout(() => { if (!resolved) reject(new Error('Page queue timeout')); }, 30000)),
    ]);
    resolved = true;
  }
  activePages++;
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  return { page, ctx };
}

function releasePage({ page, ctx }) {
  return page.close().catch(() => {}).then(() => ctx.close().catch(() => {})).then(() => {
    activePages--;
    if (queue.length) queue.shift()();
  });
}

async function findStreamSession(tmdbId, type = 'movie', season = null, episode = null, provider = null) {
  const pd = await acquirePage();
  const { page } = pd;

  const sourcesToTry = provider
    ? SOURCES.filter(s => s.name === provider)
    : SOURCES;

  if (provider && sourcesToTry.length === 0) {
    await releasePage(pd);
    throw new Error(`Provider "${provider}" not found`);
  }

  try {
    for (const source of sourcesToTry) {
      const embedUrl = source.url(tmdbId, type, season, episode);
      const m3u8Urls = [];

      page.on('response', (resp) => {
        const u = resp.url();
        if (u.includes('.m3u8')) m3u8Urls.push(u);
      });

      try {
        await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(8000);
      } catch {}

      page.removeAllListeners('response');

      // Find the master playlist (contains #EXT-X-STREAM-INF for all quality levels)
      let m3u8Url = null;
      let playlistBody = null;
      for (const url of m3u8Urls) {
        try {
          const body = await page.evaluate(async (u) => {
            const r = await fetch(u);
            return await r.text();
          }, url);
          if (body.includes('#EXT-X-STREAM-INF')) {
            m3u8Url = url;
            playlistBody = body;
            break;
          }
        } catch {}
      }

      // Fallback: no master found, use first m3u8
      if (!m3u8Url && m3u8Urls.length > 0) {
        m3u8Url = m3u8Urls[0];
        playlistBody = await page.evaluate(async (u) => {
          const r = await fetch(u);
          return await r.text();
        }, m3u8Url);
      }

      if (m3u8Url) {
        const domain = new URL(m3u8Url).origin;

        return {
          m3u8Url,
          playlistBody,
          domain,
          embedUrl,
          provider: source.name,
          page: pd.page,
          ctx: pd.ctx,
        };
      }
    }

    await releasePage(pd);
    throw new Error('No stream sources available');
  } catch (err) {
    await releasePage(pd);
    throw err;
  }
}

async function shutdown() {
  if (browser) { await browser.close().catch(() => {}); browser = null; }
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function getAvailableProviders() {
  return SOURCES.map(s => s.name);
}

module.exports = { findStreamSession, releasePage, shutdown, getAvailableProviders };
