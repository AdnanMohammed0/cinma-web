import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import useStore from './store/store';
import { tmdb } from './services/tmdb';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PartyManager from './components/PartyManager';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Watch from './pages/Watch';
import Library from './pages/Library';
import Profile from './pages/Profile';
import Room from './pages/Room';
import PartyHub from './pages/PartyHub';

const keyMissing = !import.meta.env.VITE_TMDB_API_KEY || import.meta.env.VITE_TMDB_API_KEY === 'your_tmdb_api_key_here';

function App() {
  const { setFeatured, setPopular, setTopRated, setTrending } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [featuredData, popularData, topRatedData, trendingData, popularTvData] = await Promise.all([
          tmdb.getFeatured(),
          tmdb.getPopular(),
          tmdb.getTopRated(),
          tmdb.getTrending(),
          tmdb.getPopularTv(),
        ]);
        setFeatured(featuredData);
        setPopular(popularData);
        setTopRated(topRatedData);
        setTrending(trendingData);
        // Store popular TV in a separate key or merge into trending
        if (popularTvData.length > 0) {
          set((s) => ({ popularTv: popularTvData }));
        }
      } catch (err) {
        console.error('Failed to load TMDB data:', err);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      {keyMissing && (
        <div className="bg-yellow-900/40 border-b border-yellow-700/30 px-4 py-1.5 text-center">
          <p className="text-[11px] text-yellow-400/80">
            Using sample data. Set <code className="text-yellow-300 bg-black/20 px-1 rounded">VITE_TMDB_API_KEY</code> in frontend/.env for live TMDB content.
          </p>
        </div>
      )}

      <div className="hidden desktop:block">
        <Navbar />
      </div>

      <PartyManager />

      <main className="pb-20 desktop:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/detail/:mediaType/:id" element={<Detail />} />
          <Route path="/watch/:mediaType/:id" element={<Watch />} />
          <Route path="/watch/:mediaType/:id/:season/:episode" element={<Watch />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/party" element={<PartyHub />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      <div className="desktop:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}

export default App;
