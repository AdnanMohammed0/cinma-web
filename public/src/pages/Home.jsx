import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useStore from '../store/store';
import { tmdb, getBackdropUrl, getImageUrl } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import HorizontalScroll from '../components/HorizontalScroll';
import { BsPlayFill, BsInfoCircle, BsStarFill, BsPeopleFill, BsClockFill, BsSearch } from 'react-icons/bs';

export default function Home() {
  const { featured, popular, topRated, trending, popularTv, continueWatching, preloadStream } = useStore();
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const hero = featured[heroIndex];
  const navigate = useNavigate();

  useEffect(() => {
    if (featured.length === 0) return;
    const interval = setInterval(() => setHeroIndex(p => (p + 1) % featured.length), 6000);
    return () => clearInterval(interval);
  }, [featured.length]);

  // Preload first featured media
  useEffect(() => {
    if (hero) preloadStream?.(hero.id, 'movie');
  }, [hero?.id]);

  return (
    <div className="pb-20 mobile:pb-24">
      {/* Hero section (mobile+desktop) */}
      <section className="relative">
        {hero && (
          <div className="relative w-full mobile:h-[55vh] desktop:h-[80vh] overflow-hidden">
            <img src={getBackdropUrl(hero.backdrop_path)} alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-dark-900/80 via-transparent to-transparent" />

            <div className="relative h-full max-w-7xl mx-auto px-4 desktop:px-6 flex items-end desktop:items-center pb-20 desktop:pb-0">
              <div className="max-w-xl">
                <h1 className="text-2xl desktop:text-5xl font-bold mb-2 leading-tight text-shadow">{hero.title}</h1>
                <div className="flex items-center gap-3 mb-3 text-xs desktop:text-sm">
                  <span className="flex items-center gap-1 text-red-500">
                    <BsStarFill className="text-[10px]" /> {hero.vote_average?.toFixed(1)}
                  </span>
                  <span className="text-white/50">|</span>
                  <span className="text-white/60">{hero.release_date?.slice(0, 4)}</span>
                  <span className="text-white/50">|</span>
                  <span className="text-white/60">{hero.original_language?.toUpperCase()}</span>
                </div>
                <p className="text-white/50 text-xs desktop:text-sm leading-relaxed line-clamp-2 mb-4">{hero.overview}</p>
                <div className="flex items-center gap-3">
                  <Link to={`/watch/movie/${hero.id}`}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 desktop:px-8 desktop:py-3.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 text-sm desktop:text-base">
                    <BsPlayFill className="text-lg" />
                    <span>Watch Now</span>
                  </Link>
                  <Link to={`/detail/movie/${hero.id}`}
                    className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 desktop:px-8 desktop:py-3.5 rounded-lg transition-all flex items-center gap-2 text-sm desktop:text-base">
                    <BsInfoCircle className="text-base" />
                    <span className="desktop:inline hidden">More Info</span>
                  </Link>
                </div>
                <div className="flex gap-2 mt-5">
                  {featured.slice(0, 5).map((_, i) => (
                    <button key={i} onClick={() => setHeroIndex(i)}
                      className={`h-1 rounded-full transition-all ${i === heroIndex ? 'bg-red-500 w-6' : 'bg-white/30 w-2'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Search bar */}
      <section className="max-w-7xl mx-auto mt-4 px-4">
        <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`); }}
          className="relative">
          <BsSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies and TV series..."
            className="w-full pl-4 pr-10 py-3 bg-dark-800 rounded-xl text-sm text-white placeholder-white/20 border border-white/5 focus:border-red-500/50 outline-none transition-colors" />
        </form>
      </section>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="max-w-7xl mx-auto mt-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-white/80">
              <BsClockFill className="text-red-500" /> Continue Watching
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar pb-2">
            {continueWatching.map((item) => {
              const watchPath = item.season && item.episode
                ? `/watch/${item.mediaType}/${item.mediaId}/${item.season}/${item.episode}`
                : `/watch/${item.mediaType}/${item.mediaId}`;
              return (
              <Link key={item.mediaId} to={watchPath}
                className="flex-shrink-0 w-36 mobile:w-32">
                {item.poster ? (
                  <img src={item.poster} alt="" className="w-full aspect-[2/3] rounded-lg object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-surface-card flex items-center justify-center text-white/30 text-xs">
                    {item.title?.[0] || '?'}
                  </div>
                )}
                <div className="mt-1">
                  <p className="text-xs text-white/70 truncate">{item.title}</p>
                  <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${item.duration ? Math.min(100, (item.progress / item.duration) * 100) : 0}%` }} />
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        </section>
      )}

      {/* Watch Party CTA */}
      <section className="max-w-7xl mx-auto mt-4 px-4">
        <Link to="/party"
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/20 transition-colors">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <BsPeopleFill className="text-red-500 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Watch Party</p>
            <p className="text-xs text-white/50">Create or join a party to watch together</p>
          </div>
          <svg className="w-4 h-4 text-white/50 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </Link>
      </section>

      {/* Content sections */}
      <div className="max-w-7xl mx-auto pt-6">
        {trending.length > 0 && (
          <HorizontalScroll title="Trending Now">
            {trending.slice(0, 15).map((item) => (
              <MovieCard key={`trend-${item.id}`} item={item} />
            ))}
          </HorizontalScroll>
        )}
        {popular.length > 0 && (
          <HorizontalScroll title="Popular" viewAllLink="/catalog?sort=popular">
            {popular.slice(0, 15).map((item) => (
              <MovieCard key={`pop-${item.id}`} item={item} />
            ))}
          </HorizontalScroll>
        )}
        {popularTv.length > 0 && (
          <HorizontalScroll title="Popular TV Shows" viewAllLink="/catalog?type=tv">
            {popularTv.slice(0, 15).map((item) => (
              <MovieCard key={`tv-${item.id}`} item={item} mediaType="tv" />
            ))}
          </HorizontalScroll>
        )}
        {topRated.length > 0 && (
          <HorizontalScroll title="Top Rated" viewAllLink="/catalog?sort=top_rated">
            {topRated.slice(0, 15).map((item) => (
              <MovieCard key={`top-${item.id}`} item={item} />
            ))}
          </HorizontalScroll>
        )}
      </div>
    </div>
  );
}
