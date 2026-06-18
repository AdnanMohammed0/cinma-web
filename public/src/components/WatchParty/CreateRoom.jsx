import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { BsPeople, BsLink45Deg, BsPlus } from 'react-icons/bs';

export default function CreateRoom({ mediaId, mediaType, title }) {
  const [showModal, setShowModal] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: userName || 'Host',
          mediaId,
          mediaType,
          title: title || 'Watch Party',
        }),
      });
      const data = await res.json();
      setCreatedRoomId(data.roomId);
      navigate(`/room/${data.roomId}?host=true&name=${encodeURIComponent(userName || 'Host')}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}?name=${encodeURIComponent(userName || 'Guest')}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary text-sm"
      >
        <BsPeople className="text-lg" />
        <span className="hidden mobile:inline">Party</span>
        <span className="mobile:hidden">Watch Party</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-sm mx-4 border border-white/10">
            <h3 className="text-lg font-bold mb-4">Watch Party</h3>

            {createdRoomId ? (
              <div className="space-y-4">
                <div className="p-4 bg-dark-700 rounded-xl">
                  <p className="text-xs text-white/50 mb-1">Room Created! Share this code:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-bold text-accent-yellow">{createdRoomId}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(createdRoomId)}
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <BsLink45Deg className="text-lg" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/room/${createdRoomId}?host=true&name=${encodeURIComponent(userName || 'Host')}`)}
                  className="btn-primary w-full"
                >
                  Enter Room
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 rounded-xl text-sm text-white placeholder-white/30 border border-white/5 focus:border-accent-yellow/50 transition-colors"
                />
                <button onClick={handleCreateRoom} className="btn-primary w-full">
                  <BsPlus className="text-lg" />
                  Create New Room
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter room code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-dark-700 rounded-xl text-sm text-white placeholder-white/30 border border-white/5 focus:border-accent-yellow/50 transition-colors"
                  />
                  <button onClick={handleJoinRoom} className="btn-secondary px-4">
                    Join
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowModal(false);
                setCreatedRoomId('');
              }}
              className="w-full mt-4 text-sm text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
