const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { findStreamSession, getAvailableProviders } = require('../services/scraper');
const store = require('../services/sessionStore');

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
    const sid = encodeURIComponent(sessionId);
    if (abs.includes('.m3u8')) return `/api/proxy/playlist?url=${url}&domain=${domain}&sessionId=${sid}`;
    if (/\.(ts|m4s|aac|mp4|vtt|webm)(\?|$)/i.test(abs)) return `/api/proxy/segment?url=${url}&domain=${domain}&sessionId=${sid}`;
    return line;
  }).join('\n');
}

router.get('/', async (req, res) => {
  const { tmdb_id, type = 'movie', season, episode, provider } = req.query;
  if (!tmdb_id) return res.status(400).json({ error: 'tmdb_id is required' });

  try {
    const result = await findStreamSession(tmdb_id, type, season || null, episode || null, provider || null);
    const sessionId = crypto.randomBytes(8).toString('hex');
    const rewritten = rewritePlaylist(result.playlistBody, result.m3u8Url, sessionId);

    store.set(sessionId, {
      playlist: rewritten,
      domain: result.domain,
      m3u8Url: result.m3u8Url,
      provider: result.provider,
      page: result.page,
      ctx: result.ctx,
    });

    res.json({
      playlistUrl: `/api/proxy/playlist/${sessionId}`,
      provider: result.provider,
      source: 'playwright',
      sessionId,
    });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/providers', (req, res) => {
  res.json({ providers: getAvailableProviders() });
});

module.exports = router;
