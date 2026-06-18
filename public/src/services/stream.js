const API_BASE = '/api';

async function fetchStream(tmdbId, type = 'movie', season = null, episode = null, provider = null) {
  const params = new URLSearchParams({ tmdb_id: tmdbId, type });
  if (season) params.set('season', season);
  if (episode) params.set('episode', episode);
  if (provider) params.set('provider', provider);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(`${API_BASE}/stream?${params}`, { signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Stream fetch failed' }));
      throw new Error(err.error || 'Stream fetch failed');
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Stream request timed out');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { fetchStream };
