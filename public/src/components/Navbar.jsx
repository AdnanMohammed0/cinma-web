import { Link, useLocation } from 'react-router-dom';
import { HiHome, HiCollection, HiUser } from 'react-icons/hi';
import { BsPeople, BsCameraReels } from 'react-icons/bs';
import useStore from '../store/store';

const links = [
  { to: '/', icon: HiHome, label: 'Home' },
  { to: '/party', icon: BsPeople, label: 'Party' },
  { to: '/catalog', icon: HiCollection, label: 'Catalog' },
  { to: '/profile', icon: HiUser, label: 'Profile' },
];

export default function Navbar() {
  const location = useLocation();
  const partySession = useStore((s) => s.partySession);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-yellow rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">WP</span>
          </div>
          <span className="text-lg font-bold">WatchParty</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-yellow/10 text-accent-yellow'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="text-lg" />
                {label}
              </Link>
            );
          })}
        </div>

        {partySession && (
          <Link to={`/room/${partySession.roomId}${partySession.isHost ? '?host=true' : ''}?name=${encodeURIComponent(partySession.userName)}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors ml-2">
            <BsCameraReels className="text-xs" />
            Party ({partySession.roomId})
          </Link>
        )}
      </div>
    </nav>
  );
}
