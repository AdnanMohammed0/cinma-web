import useStore from '../../store/store';
import { BsWifi, BsPeople } from 'react-icons/bs';

export default function SyncIndicator() {
  const { isHost, participants, room } = useStore();

  if (!room) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-dark-700/50 rounded-full text-xs">
      <div className="flex items-center gap-1 text-green-400">
        <BsWifi className="text-xs" />
        <span>Synced</span>
      </div>
      <div className="flex items-center gap-1 text-white/50">
        <BsPeople className="text-xs" />
        <span>{participants.length}</span>
      </div>
      <span className="text-white/30">
        {isHost ? 'Host' : 'Participant'}
      </span>
    </div>
  );
}
