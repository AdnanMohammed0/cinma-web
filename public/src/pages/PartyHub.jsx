import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsPeople, BsPlus, BsBoxArrowInRight, BsLink45Deg, BsShieldCheck } from 'react-icons/bs';

export default function PartyHub() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: userName || 'Host', mediaId: '', mediaType: 'movie', title: 'ميوو' }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      setCreatedRoomId(data.roomId);
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleJoin = () => {
    if (!roomId.trim()) return;
    navigate(`/room/${roomId.trim()}?name=${encodeURIComponent(userName || 'Guest')}`);
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-6 desktop:pt-24 pb-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <BsPeople className="text-3xl text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">ميوو</h1>
          <p className="text-white/50 text-sm mt-1">Watch together, in sync</p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="text-xs text-white/50 block mb-1">Your display name</label>
          <input
            type="text" value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-dark-800 rounded-xl text-sm text-white placeholder-white/30 border border-white/5 focus:border-red-500/50 transition-colors"
          />
        </div>

        {!mode && !createdRoomId && (
          <div className="space-y-3">
            <button onClick={() => setMode('create')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg">
              <BsPlus className="text-2xl" /> Create a Room
            </button>
            <button onClick={() => setMode('join')}
              className="w-full bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-3 text-lg">
              <BsBoxArrowInRight className="text-xl" /> Join a Room
            </button>
          </div>
        )}

        {/* Create mode */}
        {mode === 'create' && !createdRoomId && (
          <div className="space-y-3">
            <button onClick={handleCreate} disabled={creating}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-6 py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              <BsPlus className="text-xl" /> {creating ? 'Creating...' : 'Create Room'}
            </button>
            <button onClick={() => setMode(null)}
              className="w-full text-sm text-white/40 hover:text-white transition-colors">Back</button>
          </div>
        )}

        {/* Created room */}
        {createdRoomId && (
          <div className="space-y-4">
            <div className="p-6 bg-dark-800 rounded-2xl border border-white/10 text-center">
              <p className="text-sm text-white/50 mb-2">Room Created!</p>
              <p className="text-xs text-white/30 mb-4">Share this code with friends:</p>
              <div className="text-4xl font-bold text-red-500 tracking-widest mb-4">{createdRoomId}</div>
              <button onClick={() => navigator.clipboard.writeText(createdRoomId)}
                className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2 mx-auto">
                <BsLink45Deg /> Copy code
              </button>
            </div>
            <button onClick={() => navigate(`/room/${createdRoomId}?host=true&name=${encodeURIComponent(userName || 'Host')}`)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              <BsShieldCheck className="text-xl" /> Enter as Host
            </button>
            <button onClick={() => { setCreatedRoomId(''); setMode(null); }}
              className="w-full text-sm text-white/40 hover:text-white transition-colors">Create another</button>
          </div>
        )}

        {/* Join mode */}
        {mode === 'join' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Room code</label>
              <input
                type="text" value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter room code"
                className="w-full px-4 py-3 bg-dark-800 rounded-xl text-sm text-white placeholder-white/30 border border-white/5 focus:border-red-500/50 transition-colors text-center tracking-widest uppercase"
              />
            </div>
            <button onClick={handleJoin} disabled={!roomId.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-6 py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              <BsBoxArrowInRight className="text-xl" /> Join Room
            </button>
            <button onClick={() => setMode(null)}
              className="w-full text-sm text-white/40 hover:text-white transition-colors">Back</button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}

        {/* Features */}
        <div className="mt-12 space-y-4">
          <h3 className="text-sm font-semibold text-white/60 text-center">Features</h3>
          {[
            { title: 'Sync Playback', desc: 'Everyone watches in perfect sync' },
            { title: 'Built-in Chat', desc: 'Talk while you watch' },
            { title: 'Queue System', desc: 'Host can queue up movies and episodes' },
            { title: 'No Account Needed', desc: 'Just pick a name and join' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-dark-800/50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">{f.title}</p>
                <p className="text-xs text-white/40">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
