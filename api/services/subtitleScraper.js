const { chromium } = require('playwright');
const AdmZip = require('adm-zip');

let browser;

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

async function getImdbId(tmdbId, type = 'movie') {
  const key = process.env.TMDB_API_KEY || '';
  if (!key) return null;
  try {
    const resp = await fetch(
      `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${key}&append_to_response=external_ids`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return { imdbId: data.imdb_id || data.external_ids?.imdb_id || null, title: data.title || data.name || null };
  } catch {
    return null;
  }
}

// ─── PROVIDER: opensubtitles.org (Playwright) ───────────────────────────────

async function waitForAnubis(page, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (!url.includes('.within.website') && !url.includes('anubis')) return true;
    await page.waitForTimeout(1000);
  }
  return !page.url().includes('.within.website');
}

const LANG_MAP = {
  ar: 'ara', en: 'eng', fr: 'fre', de: 'ger', es: 'spa', pt: 'por', ru: 'rus',
  ja: 'jpn', ko: 'kor', zh: 'chi', it: 'ita', nl: 'dut', pl: 'pol', sv: 'swe',
  da: 'dan', fi: 'fin', no: 'nor', tr: 'tur', he: 'heb', hi: 'hin',
};

function toOsLang(lang) {
  if (!lang || lang.length === 3) return lang || 'ara';
  return LANG_MAP[lang.toLowerCase()] || 'ara';
}

async function searchOpenSubtitles(imdbId, lang, season, episode) {
  const osLang = toOsLang(lang);
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();

  try {
    let url = `https://www.opensubtitles.org/en/search/sublanguageid-${osLang}/imdbid-${imdbId.replace(/^tt/, '')}`;
    if (season) url += `/season-${season}`;
    if (episode) url += `/episode-${episode}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const resolved = await waitForAnubis(page, 60000);
    if (!resolved) throw new Error('Anubis challenge timed out');

    await page.waitForTimeout(3000);

    const subs = await page.evaluate(() => {
      const rows = document.querySelectorAll('#search_results tr[id^="name"]');
      return Array.from(rows).map(row => {
        const tds = row.querySelectorAll('td');
        const id = (row.id || '').replace('name', '');
        const fullText = tds[0]?.textContent?.trim() || '';
        let name = fullText;
        const releaseEl = row.querySelector('a[href*="/subtitles/"]');
        if (releaseEl) name = releaseEl.textContent.trim();
        const uploadEl = tds[8];
        const uploader = uploadEl ? uploadEl.textContent.trim() : '';
        const downTd = tds[4];
        const downloadText = downTd ? downTd.textContent.trim() : '';
        const formatMatch = downloadText.match(/\b(vtt|srt|sub|ass|ssa|idx|mpl)\b/i);
        const format = formatMatch ? formatMatch[1].toLowerCase() : 'srt';
        const dateTd = tds[3];
        const uploaded = dateTd ? dateTd.textContent.trim() : '';
        const rateTd = tds[5];
        const rating = rateTd ? rateTd.textContent.trim() : '0';
        const countTd = tds[6];
        const downloads = countTd ? countTd.textContent.trim() : '0';
        return { id, name, uploader, format, uploaded, rating, downloads };
      }).filter(s => s.id && s.id.length > 0);
    });

    return subs.map(s => ({ ...s, id: `opensubtitles:${s.id}`, provider: 'opensubtitles' }));
  } finally {
    await page.close();
    await ctx.close();
  }
}

async function downloadOpenSubtitles(subId) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  try {
    const result = await page.evaluate(async (sid) => {
      const resp = await fetch(`https://dl.opensubtitles.org/en/download/sub/${sid}`);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, subId);

    const buf = Buffer.from(result);
    const zip = new AdmZip(buf);
    const entries = zip.getEntries();

    const subEntry = entries.find(e =>
      /\.(vtt|srt|sub|ass|ssa|txt)$/i.test(e.entryName) && !e.entryName.endsWith('.nfo')
    );
    if (!subEntry) throw new Error('No subtitle entry found in ZIP');

    let content = subEntry.getData().toString('utf8');

    const t = content.trim();
    if (!t.startsWith('WEBVTT')) {
      if (t.includes('[Script Info]') || t.includes('Dialogue:')) {
        content = assToVtt(t);
      } else {
        content = srtToVtt(t);
      }
    }

    return content;
  } finally {
    await page.close();
    await ctx.close();
  }
}

// ─── PROVIDER: subtitles.website (fetch-based, no key needed) ───────────────

async function searchSubtitlesWebsite(imdbId, lang) {
  const langCode = lang && lang.length === 2 ? lang : 'ar';
  const url = `https://subtitles.website/strapi/api/search/subtitles?imdb=${imdbId}&language=${langCode}`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [];

  const json = await resp.json();
  const data = json.data || [];
  if (!Array.isArray(data)) return [];

  return data.map((s, i) => ({
    id: `subtitleswebsite:${s.id}`,
    provider: 'subtitleswebsite',
    name: s.release || s.film_title || `Subtitle ${i + 1}`,
    format: s.format || 'srt',
    downloads: s.downloads || '0',
    rating: '0',
    _downloadUrl: s.download_url,
  }));
}

async function downloadSubtitlesWebsite(subId) {
  const resp = await fetch(
    `https://subtitles.website/strapi/api/search/download/${subId}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!resp.ok) throw new Error(`Subtitle download failed: ${resp.status}`);

  const data = await resp.json();
  const fullUrl = 'https://subtitles.website/strapi' + data.download_url;

  const dlResp = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) });
  if (!dlResp.ok) throw new Error(`Subtitle file fetch failed: ${dlResp.status}`);

  let content = await dlResp.text();
  const t = content.trim();
  if (!t.startsWith('WEBVTT')) {
    content = srtToVtt(t);
  }
  return content;
}

// ─── PROVIDER: Subdl (Playwright-based scrape) ──────────────────────────────

async function searchSubdl(imdbId, lang) {
  const langCode = lang && lang.length === 2 ? lang : 'ar';
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();

  try {
    await page.goto(`https://subdl.com/s/imdb/${imdbId}`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const subs = await page.evaluate((targetLang) => {
      const rows = document.querySelectorAll('.subtitle-item, tr.subtitle-row, [class*="subtitle"]');
      return Array.from(rows).map(row => {
        const text = row.textContent || '';
        const langEl = row.querySelector('.lang, [class*="lang"], [class*="language"]');
        const lang = langEl ? langEl.textContent.trim().toLowerCase() : '';
        const link = row.querySelector('a[href*="/subtitle/"], a[href*="/s/"]');
        const href = link ? link.getAttribute('href') : '';
        const name = link ? link.textContent.trim() : text.slice(0, 80);
        const idMatch = href.match(/\/subtitle\/(\d+)/) || href.match(/\/s\/info\/(\w+)/);
        const id = idMatch ? idMatch[1] : '';
        return { id, name, lang, provider: 'subdl' };
      }).filter(s => s.id && s.lang && s.lang.includes(targetLang));
    }, langCode);

    return subs.map(s => ({ ...s, id: `subdl:${s.id}` }));
  } finally {
    await page.close();
    await ctx.close();
  }
}

async function downloadSubdl(subId) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto(`https://subdl.com/subtitle/${subId}`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const btn = document.querySelector('a[href*="dl.subdl.com"], .download-btn, [class*="download"]');
      if (btn) {
        const url = btn.getAttribute('href');
        if (url) {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            return Array.from(new Uint8Array(buf));
          }
        }
      }
      throw new Error('No download link found');
    });

    const buf = Buffer.from(result);
    let content;

    try {
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      const subEntry = entries.find(e =>
        /\.(vtt|srt|sub|ass|ssa|txt)$/i.test(e.entryName) && !e.entryName.endsWith('.nfo')
      );
      if (subEntry) content = subEntry.getData().toString('utf8');
    } catch {}

    if (!content) content = buf.toString('utf8');

    const t = content.trim();
    if (!t.startsWith('WEBVTT')) {
      if (t.includes('[Script Info]') || t.includes('Dialogue:')) content = assToVtt(t);
      else content = srtToVtt(t);
    }
    return content;
  } finally {
    await page.close();
    await ctx.close();
  }
}

// ─── PROVIDER: TVSubtitles.net (Playwright-based scrape) ────────────────────

async function searchTvSubtitles(imdbId, lang) {
  const langMap = {
    ar: 'arabic', en: 'english', fr: 'french', de: 'german', es: 'spanish',
    pt: 'portuguese', ru: 'russian', it: 'italian', nl: 'dutch', pl: 'polish',
    sv: 'swedish', da: 'danish', no: 'norwegian', fi: 'finnish', tr: 'turkish',
    ja: 'japanese', ko: 'korean', zh: 'chinese', he: 'hebrew', hi: 'hindi',
  };
  const langStr = langMap[lang] || 'arabic';

  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();

  try {
    // TVSubtitles uses IMDB ID without 'tt' prefix
    const cleanId = imdbId.replace(/^tt/, '');
    await page.goto(`https://www.tvsubtitles.net/search.php?q=${cleanId}&l=${langStr}`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const subs = await page.evaluate(() => {
      const rows = document.querySelectorAll('.subtitles-list tr, table.subtitle tr');
      return Array.from(rows).map(row => {
        const link = row.querySelector('a[href*="tvsubtitles"]');
        if (!link) return null;
        const href = link.getAttribute('href') || '';
        const idMatch = href.match(/\/subtitle-(\d+)\.html/) || href.match(/subtitle[_-]?(\d+)/);
        const id = idMatch ? idMatch[1] : '';
        return { id, name: link.textContent.trim() };
      }).filter(Boolean);
    });

    return subs.map(s => ({ ...s, id: `tvsubtitles:${s.id}`, provider: 'tvsubtitles', format: 'srt' }));
  } finally {
    await page.close();
    await ctx.close();
  }
}

async function downloadTvSubtitles(subId) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto(`https://www.tvsubtitles.net/subtitle-${subId}.html`, {
      waitUntil: 'domcontentloaded', timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const link = document.querySelector('a[href$=".zip"], a[href*="download"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href) return href;
      }
      return null;
    });

    if (!result) throw new Error('No download link on TVSubtitles');
    const dlUrl = result.startsWith('http') ? result : `https://www.tvsubtitles.net${result}`;

    const dlResp = await fetch(dlUrl, { signal: AbortSignal.timeout(15000) });
    if (!dlResp.ok) throw new Error(`TVSubtitles download failed: ${dlResp.status}`);

    const buf = Buffer.from(await dlResp.arrayBuffer());
    let content;

    try {
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      const subEntry = entries.find(e =>
        /\.(vtt|srt|sub|ass|ssa|txt)$/i.test(e.entryName) && !e.entryName.endsWith('.nfo')
      );
      if (subEntry) content = subEntry.getData().toString('utf8');
    } catch {}

    if (!content) content = buf.toString('utf8');

    const t = content.trim();
    if (!t.startsWith('WEBVTT')) {
      if (t.includes('[Script Info]') || t.includes('Dialogue:')) content = assToVtt(t);
      else content = srtToVtt(t);
    }
    return content;
  } finally {
    await page.close();
    await ctx.close();
  }
}

// ─── PROVIDER REGISTRY ──────────────────────────────────────────────────────
// Order matters: fast fetch-based providers first, slower Playwright ones last
const PROVIDERS = [
  { name: 'subtitleswebsite', search: searchSubtitlesWebsite, download: downloadSubtitlesWebsite },
  { name: 'subdl', search: searchSubdl, download: downloadSubdl },
  { name: 'tvsubtitles', search: searchTvSubtitles, download: downloadTvSubtitles },
  { name: 'opensubtitles', search: searchOpenSubtitles, download: downloadOpenSubtitles },
];

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

async function searchSubtitles(tmdbId, lang = 'ara', type = 'movie', season, episode) {
  const resolved = await getImdbId(tmdbId, type);
  if (!resolved) throw new Error('Could not resolve IMDB ID or fetch movie info from TMDB');

  const { imdbId, title } = resolved;

  const errors = [];
  for (const provider of PROVIDERS) {
    try {
      const timeout = provider.name === 'opensubtitles' ? 70000 : 25000;
      const subs = await withTimeout(provider.search(imdbId, lang, season, episode), timeout);
      if (subs && subs.length > 0) return subs;
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  // Last resort: try subtitles.website by title if we have it
  if (title) {
    try {
      const url = `https://subtitles.website/strapi/api/search/subtitles?title=${encodeURIComponent(title)}&language=${lang.length === 2 ? lang : 'ar'}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const json = await resp.json();
        const data = json.data || [];
        if (Array.isArray(data) && data.length > 0) {
          return data.map((s, i) => ({
            id: `subtitleswebsite:${s.id}`, provider: 'subtitleswebsite',
            name: s.release || s.film_title || `Subtitle ${i + 1}`,
            format: s.format || 'srt', downloads: s.downloads || '0', rating: '0',
          }));
        }
      }
    } catch {}
  }

  throw new Error('All subtitle providers failed: ' + errors.join('; '));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

async function downloadSubtitle(prefixedId) {
  const parts = prefixedId.match(/^(\w+):(.+)/);
  if (!parts) throw new Error(`Invalid subtitle id format: ${prefixedId}`);

  const [, providerName, realId] = parts;
  const provider = PROVIDERS.find(p => p.name === providerName);
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  return await provider.download(realId);
}

function srtToVtt(srt) {
  return 'WEBVTT\n\n' + srt.replace(/\r\n/g, '\n').replace(/,/g, '.').trim() + '\n';
}

function assToVtt(ass) {
  let vtt = 'WEBVTT\n\n';
  const lines = ass.split('\n');
  let inEvents = false;
  for (const line of lines) {
    if (line.startsWith('[Events]')) { inEvents = true; continue; }
    if (inEvents && line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      if (parts.length < 10) continue;
      const start = parts[1].trim().replace(',', '.');
      const end = parts[2].trim().replace(',', '.');
      const text = parts.slice(9).join(',').replace(/\{[^}]+\}/g, '').replace(/\\N/g, '\n');
      vtt += `${start.padStart(12, '0')} --> ${end.padStart(12, '0')}\n${text}\n\n`;
    }
  }
  return vtt;
}

async function shutdown() {
  if (browser) { await browser.close().catch(() => {}); browser = null; }
}

module.exports = { searchSubtitles, downloadSubtitle, shutdown };
