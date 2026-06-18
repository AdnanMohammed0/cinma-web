import { Link, useLocation } from 'react-router-dom';
import { HiHome, HiCollection, HiUser } from 'react-icons/hi';
import { BsPeople, BsCameraReels } from 'react-icons/bs';
import useStore from '../store/store';

const tabs = [
  { to: '/', icon: HiHome, label: 'Home' },
  { to: '/party', icon: BsPeople, label: 'Party' },
  { to: '/catalog', icon: HiCollection, label: 'Catalog' },
  { to: '/profile', icon: HiUser, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const partySession = useStore((s) => s.partySession);

  return (
    <div className="bg-dark-800/95 backdrop-blur-xl border-t border-white/5 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive ? 'text-accent-yellow' : 'text-white/40'
              }`}
            >
              <Icon className="text-xl" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {partySession && (
          <Link
            to={`/room/${partySession.roomId}${partySession.isHost ? '?host=true' : ''}?name=${encodeURIComponent(partySession.userName)}`}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-red-400"
          >
            <BsCameraReels className="text-xl" />
            <span className="text-[10px] font-medium">{partySession.roomId}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
