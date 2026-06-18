import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useStore from '../store/store';
import { tmdb, getBackdropUrl, getImageUrl } from '../services/tmdb';
import CreateRoom from '../components/WatchParty/CreateRoom';
import MovieCard from '../components/MovieCard';
import { BsPlayFill, BsStarFill, BsClock, BsCalendar, BsPeople, BsFilm } from 'react-icons/bs';

export default function Detail() {
  const { mediaType, id } = useParams();
  const preloadStream = useStore((s) => s.preloadStream);
  const continueWatching = useStore((s) => s.continueWatching);
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);

  useEffect(() => {
    setLoading(true);
    const fetchFn = mediaType === 'tv' ? tmdb.getTvDetails : tmdb.getMovieDetails;
    fetchFn(id)
      .then((data) => {
        setMedia(data);
        // Preload stream in background
        const season = data.seasons?.find((s) => s.season_number > 0)?.season_number || null;
        preloadStream(id, mediaType, season, null);
        if (mediaType === 'tv' && data.seasons?.length > 0) {
          const firstSeason = data.seasons.find((s) => s.season_number > 0) || data.seasons[0];
          setActiveSeason(firstSeason.season_number);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  useEffect(() => {
    if (mediaType !== 'tv' || !activeSeason) return;
    tmdb.getTvSeasons(id, activeSeason)
      .then((data) => setSeasonEpisodes(data.episodes || []))
      .catch(() => {});
  }, [id, mediaType, activeSeason]);

  // Preload first episode when season loads
  useEffect(() => {
    if (mediaType !== 'tv' || seasonEpisodes.length === 0) return;
    const ep = seasonEpisodes[0];
    preloadStream(id, mediaType, activeSeason, ep.episode_number);
  }, [seasonEpisodes, id, mediaType, activeSeason, preloadStream]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white/40 gap-4">
        <BsFilm className="text-4xl" />
        <p>Media not found</p>
        <Link to="/" className="btn-primary text-sm">Go Home</Link>
      </div>
    );
  }

  const title = media.title || media.name;
  const year = (media.release_date || media.first_air_date || '').slice(0, 4);
  const runtime = media.runtime || media.episode_run_time?.[0];
  const genres = media.genres || [];
  const cast = media.credits?.cast?.slice(0, 8) || [];
  const director = media.credits?.crew?.find((c) => c.job === 'Director');
  const recommendations = media.recommendations?.results?.slice(0, 10) || media.similar?.results?.slice(0, 10) || [];
  const seasons = media.seasons?.filter((s) => s.season_number > 0) || [];
  const trailer = media.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <div className="pb-8">
      {/* Hero Header - image_3.png inspired (mobile) */}
      <div className="relative">
        <div className="relative h-[40vh] desktop:h-[60vh] overflow-hidden">
          <img
            src={getBackdropUrl(media.backdrop_path)}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 gradient-overlay" />
          <div className="absolute bottom-0 left-0 right-0 p-5 desktop:p-10">
            <div className="max-w-7xl mx-auto">
              <span className="text-xs uppercase tracking-wider text-accent-yellow font-medium">
                {mediaType === 'tv' ? 'TV Series' : 'Movie'}
              </span>
              <h1 className="text-2xl desktop:text-5xl font-bold mt-1 text-shadow">{title}</h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs desktop:text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <BsStarFill className="text-accent-yellow" />
                  {media.vote_average?.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <BsCalendar />
                  {year}
                </span>
                {runtime && (
                  <span className="flex items-center gap-1">
                    <BsClock />
                    {runtime} min
                  </span>
                )}
                {mediaType === 'movie' && media.budget > 0 && (
                  <span>Budget: ${(media.budget / 1e6).toFixed(0)}M</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 desktop:px-6 -mt-8 relative z-10">
        <div className="flex flex-col desktop:flex-row gap-6">
          {/* Poster (desktop only) */}
          <div className="hidden desktop:block flex-shrink-0 w-64">
            <img
              src={getImageUrl(media.poster_path, 'w342')}
              alt={title}
              className="w-full rounded-xl shadow-2xl"
            />
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                to={`/watch/${mediaType}/${id}`}
                className="btn-primary"
              >
                <BsPlayFill className="text-xl" />
                Watch Now
              </Link>
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Watch Trailer
                </a>
              )}
              <CreateRoom mediaId={id} mediaType={mediaType} title={title} />
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 bg-dark-700 rounded-full text-xs text-white/60"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Overview */}
            <p className="text-sm desktop:text-base text-white/70 leading-relaxed mb-6">
              {media.overview}
            </p>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Cast</h3>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                  {cast.map((c) => (
                    <div key={c.id} className="flex-shrink-0 w-16 text-center">
                      <div className="w-14 h-14 mx-auto rounded-full overflow-hidden bg-dark-700 mb-1">
                        {c.profile_path ? (
                          <img
                            src={getImageUrl(c.profile_path, 'w185')}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/30">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-white/60 truncate">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Director */}
            {director && (
              <div className="text-sm text-white/50 mb-6">
                <span className="text-white/30">Director: </span>
                {director.name}
              </div>
            )}

            {/* TV Series Seasons - image_3.png inspired */}
            {mediaType === 'tv' && seasons.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Seasons</h3>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      onClick={() => setActiveSeason(s.season_number)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        activeSeason === s.season_number
                          ? 'bg-accent-yellow text-black'
                          : 'bg-dark-700 text-white/50 hover:text-white'
                      }`}
                    >
                      Season {s.season_number}
                    </button>
                  ))}
                </div>

                {/* Episodes */}
                {seasonEpisodes.length > 0 && (
                  <div className="space-y-2">
                    {seasonEpisodes.map((ep) => (
                      <Link
                        key={ep.id}
                        to={`/watch/${mediaType}/${id}/${activeSeason}/${ep.episode_number}`}
                        className="flex gap-3 p-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors group"
                      >
                        <div className="w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-dark-600">
                          {ep.still_path ? (
                            <img
                              src={getImageUrl(ep.still_path, 'w300')}
                              alt={ep.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BsPlayFill className="text-xl text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium truncate group-hover:text-accent-yellow transition-colors">
                              {ep.episode_number}. {ep.name}
                            </h4>
                            {ep.vote_average > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-white/40 flex-shrink-0 ml-2">
                                <BsStarFill className="text-accent-yellow text-[8px]" />
                                {ep.vote_average?.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 line-clamp-1 mt-0.5">
                            {ep.overview || 'No description available'}
                          </p>
                          <span className="text-[10px] text-white/30">
                            {ep.runtime || ''} min
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4">You May Also Like</h2>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {recommendations.map((item) => (
                <MovieCard key={`rec-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
