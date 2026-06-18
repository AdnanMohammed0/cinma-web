import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../services/tmdb';
import useStore from '../store/store';
import { BsBookmark, BsClock, BsHeart, BsStarFill } from 'react-icons/bs';

const tabs = [
  { id: 'favorites', label: 'Favorites', icon: BsHeart },
  { id: 'watchlist', label: 'Watchlist', icon: BsBookmark },
  { id: 'history', label: 'History', icon: BsClock },
];

const sampleItems = [
  { id: 1, title: 'Inception', year: '2010', rating: '8.8', poster: '/placeholder.jpg', type: 'movie' },
  { id: 2, title: 'Interstellar', year: '2014', rating: '8.7', poster: '/placeholder.jpg', type: 'movie' },
  { id: 3, title: 'The Dark Knight', year: '2008', rating: '9.0', poster: '/placeholder.jpg', type: 'movie' },
  { id: 4, title: 'Stranger Things', year: '2016', rating: '8.7', poster: '/placeholder.jpg', type: 'tv' },
];

export default function Library() {
  const [activeTab, setActiveTab] = useState('favorites');

  const tabsList = [
    { id: 'favorites', label: 'Favorites', icon: BsHeart },
    { id: 'watchlist', label: 'Watchlist', icon: BsBookmark },
    { id: 'history', label: 'History', icon: BsClock },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 desktop:pt-24 pb-8">
      <h1 className="text-2xl desktop:text-3xl font-bold mb-2">My Library</h1>
      <p className="text-white/40 text-sm mb-6">Your saved movies and series</p>

      {/* Tab bar */}
      <div className="flex gap-1 bg-dark-800 rounded-xl p-1 mb-6">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-accent-yellow text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              <Icon className="text-base" />
              <span className="mobile:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Library content grid */}
      <div className="grid grid-cols-2 mobile:grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-3">
        {sampleItems.map((item) => (
          <Link
            key={`${activeTab}-${item.id}`}
            to={`/detail/${item.type}/${item.id}`}
            className="card group cursor-pointer"
          >
            <div className="aspect-[2/3] bg-dark-700 rounded-t-xl flex items-center justify-center">
              <span className="text-4xl text-white/10">{item.title.charAt(0)}</span>
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-semibold truncate">{item.title}</h3>
              <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
                <span>{item.year}</span>
                <span className="flex items-center gap-0.5">
                  <BsStarFill className="text-accent-yellow text-[9px]" />
                  {item.rating}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {sampleItems.length === 0 && (
        <div className="text-center py-20 text-white/20">
          <BsBookmark className="text-4xl mx-auto mb-3" />
          <p className="text-sm">Your library is empty</p>
        </div>
      )}
    </div>
  );
}
