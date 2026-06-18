import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useStore from '../store/store';
import { tmdb, getImageUrl } from '../services/tmdb';
import { BsSearch, BsStarFill, BsGrid, BsList } from 'react-icons/bs';

export default function Catalog() {
  const { popular, topRated, searchResults, setSearchResults, setLoading, isLoading } = useStore();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState('grid');
  const [activeGenre, setActiveGenre] = useState(null);
  const [genres, setGenres] = useState([]);
  const [browseResults, setBrowseResults] = useState(popular);

  useEffect(() => {
    tmdb.getGenres('movie').then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    setBrowseResults(popular);
  }, [popular]);

  // Auto-search on mount if query from URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); search(q); }
  }, []);

  const search = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const results = await tmdb.search(q);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await search(query);
  };

  const handleGenreFilter = async (genreId) => {
    setActiveGenre(genreId === activeGenre ? null : genreId);
    setLoading(true);
    try {
      if (genreId === activeGenre) {
        setBrowseResults(popular);
      } else {
        const results = await tmdb.getByGenre(genreId);
        setBrowseResults(results);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const items = query.trim() ? searchResults : browseResults;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 desktop:pt-24 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl desktop:text-3xl font-bold">Catalog</h1>
          <p className="text-white/40 text-sm mt-1">Browse movies and TV series</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-accent-yellow/10 text-accent-yellow' : 'text-white/30 hover:text-white'
            }`}
          >
            <BsGrid className="text-lg" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-accent-yellow/10 text-accent-yellow' : 'text-white/30 hover:text-white'
            }`}
          >
            <BsList className="text-lg" />
          </button>
        </div>
      </div>

      {/* Search Bar - image_2.png inspired */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <BsSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, series..."
          className="w-full pl-12 pr-4 py-3.5 bg-dark-800 rounded-2xl text-sm text-white placeholder-white/20 border border-white/5 focus:border-accent-yellow/50 transition-colors"
        />
      </form>

      {/* Genre Chips (mobile: horizontal scroll, desktop: wrap) */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
        {genres.slice(0, 10).map((genre) => (
          <button
            key={genre.id}
            onClick={() => handleGenreFilter(genre.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeGenre === genre.id
                ? 'bg-accent-yellow text-black'
                : 'bg-dark-700 text-white/50 hover:text-white hover:bg-dark-600'
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Results Grid - image_2.png two-column layout on mobile */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <p>No results found</p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 mobile:grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-3'
              : 'space-y-3'
          }
        >
          {items.map((item) => {
            const type = item.media_type || 'movie';
            const id = item.id;
            const title = item.title || item.name || 'Untitled';
            const year = (item.release_date || item.first_air_date || '').slice(0, 4);
            const poster = getImageUrl(item.poster_path, 'w342');
            const rating = item.vote_average?.toFixed(1) || 'N/A';

            if (viewMode === 'list') {
              return (
                <Link
                  key={`${type}-${id}`}
                  to={`/detail/${type}/${id}`}
                  className="flex gap-4 p-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors"
                >
                  <img
                    src={poster}
                    alt={title}
                    className="w-16 h-24 object-cover rounded-lg"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-sm truncate">{title}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                      <span>{year}</span>
                      <span className="flex items-center gap-1">
                        <BsStarFill className="text-accent-yellow text-[10px]" />
                        {rating}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 mt-1 line-clamp-2">{item.overview}</p>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={`${type}-${id}`}
                to={`/detail/${type}/${id}`}
                className="card group cursor-pointer"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  <img
                    src={poster}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 bg-dark-900/80 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                    <BsStarFill className="text-accent-yellow text-[8px]" />
                    {rating}
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-semibold truncate">{title}</h3>
                  <span className="text-[10px] text-white/40">{year}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
