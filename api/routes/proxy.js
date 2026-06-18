const express = require('express');
const { chromium } = require('playwright');
const router = express.Router();
const store = require('../services/sessionStore');

let browser;
const pagePool = new Map();
const POOL_MAX_AGE = 10 * 60 * 1000;

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

async function fetchViaBrowser(page, url) {
  return await page.evaluate(async (fetchUrl) => {
    const resp = await fetch(fetchUrl);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    const isText = ct.includes('text') || ct.includes('mpegurl') || !ct;
    if (isText) return { type: 'text', data: await resp.text(), contentType: ct };
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ type: 'binary', data: reader.result.split(',')[1], contentType: ct });
      reader.readAsDataURL(blob);
    });
  }, url);
}

function rewritePlaylist(text, baseUrl, sessionId) {
  const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
  return text.split('\n').map((line) => {
    const t = line.trim();
    if (t.startsWith('#') || t === '') return line;
    let abs;
    if (t.startsWith('http://') || t.startsWith('https://')) abs = t;
    else if (t.startsWith('//')) abs = 'https:' + t;
    else abs = new URL(t, baseDir).href;
    const domain = encodeURIComponent(new URL(baseUrl).origin);
    const url = encodeURIComponent(abs);
    const sid = encodeURIComponent(sessionId || '');
    if (abs.includes('.m3u8')) return `/api/proxy/playlist?url=${url}&domain=${domain}&sessionId=${sid}`;
    if (/\.(ts|m4s|aac|mp4|vtt|webm)(\?|$)/i.test(abs)) return `/api/proxy/segment?url=${url}&domain=${domain}&sessionId=${sid}`;
    return line;
  }).join('\n');
}

async function getPageForRequest(sessionId, domain) {
  if (sessionId) {
    const entry = store.get(sessionId);
    if (entry && entry.page) {
      if (domain && !pagePool.has(domain)) {
        pagePool.set(domain, { page: entry.page, ctx: entry.ctx, ts: Date.now() });
      }
      return entry.page;
    }
    // Log when session doesn't exist for diagnostic
    if (!entry) console.log(`[proxy] session ${sessionId} not found in store`);
  }
  if (domain && pagePool.has(domain)) {
    const poolEntry = pagePool.get(domain);
    poolEntry.ts = Date.now();
    return poolEntry.page;
  }
  return null;
}

// Ensure a page exists for a given domain, creating one if needed
async function ensurePageForDomain(domain) {
  const existing = pagePool.get(domain);
  if (existing && existing.page) {
    existing.ts = Date.now();
    return existing.page;
  }
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  pagePool.set(domain, { page, ctx, ts: Date.now() });
  return page;
}

setInterval(() => {
  const now = Date.now();
  for (const [domain, entry] of pagePool) {
    if (now - entry.ts > POOL_MAX_AGE) {
      entry.page.close().catch(() => {});
      entry.ctx.close().catch(() => {});
      pagePool.delete(domain);
    }
  }
}, 60000);

router.get('/playlist/:sessionId', (req, res) => {
  const entry = store.get(req.params.sessionId);
  if (!entry) return res.status(404).json({ error: 'Playlist not found or expired' });
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(entry.playlist);
});

router.get('/playlist', async (req, res) => {
  const { url, domain, sessionId } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    let page = await getPageForRequest(sessionId, domain);
    if (!page && domain) page = await ensurePageForDomain(domain);
    if (!page) return res.status(400).json({ error: 'No session page available' });

    const result = await fetchViaBrowser(page, url);
    const rewritten = rewritePlaylist(result.data, url, sessionId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(rewritten);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch playlist' });
  }
});

router.get('/segment', async (req, res) => {
  const { url, domain, sessionId } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    let page = await getPageForRequest(sessionId, domain);
    if (!page && domain) page = await ensurePageForDomain(domain);
    if (!page) return res.status(400).json({ error: 'No session page available' });

    const result = await fetchViaBrowser(page, url);
    if (result.type === 'binary') {
      const buf = Buffer.from(result.data, 'base64');
      if (result.contentType) res.setHeader('Content-Type', result.contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buf);
    } else {
      if (result.contentType) res.setHeader('Content-Type', result.contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(result.data);
    }
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch segment' });
  }
});

router.post('/cleanup/:sessionId', (req, res) => {
  store.del(req.params.sessionId);
  res.json({ ok: true });
});

router.all('*', (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }
});

async function shutdown() {
  for (const [, entry] of pagePool) {
    await entry.page.close().catch(() => {});
    await entry.ctx.close().catch(() => {});
  }
  pagePool.clear();
  if (browser) await browser.close().catch(() => {});
}

module.exports = router;
module.exports.shutdown = shutdown;
