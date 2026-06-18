import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import { BsStarFill, BsPlayCircle, BsFilm } from 'react-icons/bs';

const FALLBACK_COLORS = ['bg-red-900/30', 'bg-blue-900/30', 'bg-green-900/30', 'bg-purple-900/30', 'bg-yellow-900/30', 'bg-pink-900/30'];

export default function MovieCard({ item, mediaType, layout = 'poster' }) {
  const [imgError, setImgError] = useState(false);
  const type = mediaType || item?.media_type || 'movie';
  const id = item?.id;
  const title = item?.title || item?.name || 'Untitled';
  const rating = item?.vote_average?.toFixed(1) || 'N/A';
  const year = (item?.release_date || item?.first_air_date || '').slice(0, 4);
  const poster = getImageUrl(item?.poster_path, 'w342');
  const backdrop = getImageUrl(item?.backdrop_path, 'w500');
  const colorClass = FALLBACK_COLORS[(id || 0) % FALLBACK_COLORS.length];

  const placeholder = (
    <div className={`w-full h-full ${colorClass} flex items-center justify-center`}>
      <BsFilm className="text-3xl text-white/20" />
    </div>
  );

  if (layout === 'backdrop') {
    return (
      <Link
        to={`/detail/${type}/${id}`}
        className="flex-shrink-0 w-64 card group cursor-pointer"
      >
        <div className="relative aspect-video overflow-hidden rounded-t-xl">
          {imgError ? placeholder : (
            <img
              src={backdrop || poster}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{year}</span>
              <span className="flex items-center gap-1">
                <BsStarFill className="text-accent-yellow text-[10px]" />
                {rating}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/detail/${type}/${id}`}
      className="flex-shrink-0 w-36 mobile:w-32 card group cursor-pointer"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-xl">
        {imgError ? placeholder : (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <BsPlayCircle className="text-4xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="text-xs font-semibold truncate">{title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
          <span>{year}</span>
          <span className="flex items-center gap-0.5">
            <BsStarFill className="text-accent-yellow text-[9px]" />
            {rating}
          </span>
        </div>
      </div>
    </Link>
  );
}
