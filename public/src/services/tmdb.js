import axios from 'axios';
import { sampleData } from './sampleData';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY || '';

const api = axios.create({
  baseURL: TMDB_BASE,
  params: { api_key: TMDB_KEY, language: 'en-US' },
});

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const getImageUrl = (path, size = 'w500') => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path) => getImageUrl(path, 'original');
export const getPosterUrl = (path) => getImageUrl(path, 'w500');
export const getLogoUrl = (path) => getImageUrl(path, 'w300');

const withFallback = (fn, fallback) => async (...args) => {
  if (!TMDB_KEY || TMDB_KEY === 'your_tmdb_api_key_here') {
    return fallback(...args);
  }
  try {
    return await fn(...args);
  } catch {
    return fallback(...args);
  }
};

export const tmdb = {
  getFeatured: withFallback(
    async () => {
      // Movies already released, trending this week
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/trending/movie/week');
      return (data.results || []).filter(m => !m.release_date || m.release_date <= today).slice(0, 5);
    },
    () => Promise.resolve(sampleData.getFeatured())
  ),

  getPopular: withFallback(
    async (page = 1) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/movie/popular', {
        params: { page, 'release_date.lte': today },
      });
      return (data.results || []).filter(m => !m.release_date || m.release_date <= today);
    },
    () => Promise.resolve(sampleData.getPopular())
  ),

  getTopRated: withFallback(
    async (page = 1) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/movie/top_rated', {
        params: { page, 'release_date.lte': today },
      });
      return (data.results || []).filter(m => !m.release_date || m.release_date <= today);
    },
    () => Promise.resolve(sampleData.getTopRated())
  ),

  getTrending: withFallback(
    async (mediaType = 'all', timeWindow = 'week') => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get(`/trending/${mediaType}/${timeWindow}`);
      return (data.results || []).filter(m => {
        const date = m.release_date || m.first_air_date;
        return !date || date <= today;
      });
    },
    () => Promise.resolve(sampleData.getTrending())
  ),

  getPopularTv: withFallback(
    async (page = 1) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/tv/popular', {
        params: { page, 'first_air_date.lte': today },
      });
      return (data.results || []).filter(s => !s.first_air_date || s.first_air_date <= today);
    },
    () => Promise.resolve(sampleData.tv.slice(0, 10))
  ),

  getMovieDetails: withFallback(
    async (movieId) => {
      const { data } = await api.get(`/movie/${movieId}`, {
        params: { append_to_response: 'credits,videos,recommendations,similar' },
      });
      return data;
    },
    (id) => {
      const movie = sampleData.getMovieById(id);
      if (movie) return Promise.resolve(movie);
      return Promise.resolve(sampleData.getMovieById(27205));
    }
  ),

  getTvDetails: withFallback(
    async (tvId) => {
      const { data } = await api.get(`/tv/${tvId}`, {
        params: { append_to_response: 'credits,videos,recommendations,similar' },
      });
      return data;
    },
    (id) => {
      const show = sampleData.getTvById(id);
      if (show) return Promise.resolve(show);
      return Promise.resolve(sampleData.getTvById(1399));
    }
  ),

  getTvSeasons: withFallback(
    async (tvId, seasonNumber) => {
      const { data } = await api.get(`/tv/${tvId}/season/${seasonNumber}`);
      return data;
    },
    (tvId, seasonNumber) => {
      const episodes = sampleData.getTvSeasons(tvId, seasonNumber);
      return Promise.resolve({ episodes });
    }
  ),

  search: withFallback(
    async (query, page = 1) => {
      const { data } = await api.get('/search/multi', {
        params: { query, page },
      });
      return data.results;
    },
    (query) => Promise.resolve(sampleData.search(query))
  ),

  getGenres: withFallback(
    async (type = 'movie') => {
      const { data } = await api.get(`/genre/${type}/list`);
      return data.genres;
    },
    () => Promise.resolve([
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 18, name: 'Drama' },
      { id: 14, name: 'Fantasy' },
      { id: 9648, name: 'Mystery' },
      { id: 878, name: 'Science Fiction' },
      { id: 53, name: 'Thriller' },
    ])
  ),

  getByGenre: withFallback(
    async (genreId, type = 'movie', page = 1) => {
      const { data } = await api.get(`/discover/${type}`, {
        params: { with_genres: genreId, page },
      });
      return data.results;
    },
    (genreId) => {
      const filtered = sampleData.movies.filter((m) =>
        m.genres?.some((g) => g.id === Number(genreId))
      );
      return Promise.resolve(filtered.length > 0 ? filtered : sampleData.movies);
    }
  ),
};
