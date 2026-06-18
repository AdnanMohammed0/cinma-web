const express = require('express');
const router = express.Router();
const { searchSubtitles, downloadSubtitle } = require('../services/subtitleScraper');

router.get('/search', async (req, res) => {
  const { tmdb_id, lang = 'ar', type = 'movie', season, episode } = req.query;
  if (!tmdb_id) return res.status(400).json({ error: 'tmdb_id required' });

  try {
    const subs = await searchSubtitles(tmdb_id, lang, type, season, episode);
    res.json({ subtitles: subs, total: subs.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/download', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const vtt = await downloadSubtitle(id);
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(vtt);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
