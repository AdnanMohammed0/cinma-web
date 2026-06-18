import { useState } from 'react';
import useStore from '../../store/store';
import { BsPeople, BsChatDots, BsSend, BsCopy, BsShieldCheck } from 'react-icons/bs';

export default function RoomSidebar({ sendChatMessage }) {
  const { room, isHost, participants, chatMessages } = useStore();
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    sendChatMessage('You', message.trim());
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const copyRoomId = () => {
    if (room?.id) navigator.clipboard.writeText(room.id);
  };

  return (
    <div className="w-80 bg-dark-800 border-l border-white/5 flex flex-col h-full">
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-accent-yellow border-b-2 border-accent-yellow'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <BsChatDots className="inline mr-1.5" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'people'
              ? 'text-accent-yellow border-b-2 border-accent-yellow'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <BsPeople className="inline mr-1.5" />
          People ({participants.length})
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-white/20 text-xs mt-8">
                No messages yet. Start the conversation!
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="text-accent-yellow font-medium">{msg.userName}: </span>
                <span className="text-white/70">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-dark-700 rounded-lg text-sm text-white placeholder-white/20 border border-white/5 focus:border-accent-yellow/50 transition-colors"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-accent-yellow text-black rounded-lg hover:bg-accent-gold transition-colors"
            >
              <BsSend />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-white/40">Room Code</span>
            <button
              onClick={copyRoomId}
              className="flex items-center gap-1 text-xs text-accent-yellow hover:text-accent-gold"
            >
              <BsCopy /> Copy
            </button>
          </div>
          <div className="px-3 py-2 bg-dark-700 rounded-lg mb-3">
            <code className="text-accent-yellow font-bold text-sm">{room?.id || '---'}</code>
          </div>
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-700/50"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                p.isHost ? 'bg-accent-yellow text-black' : 'bg-dark-500 text-white'
              }`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  {p.isHost && <BsShieldCheck className="text-accent-yellow text-xs" />}
                </div>
                <span className="text-[10px] text-white/30">
                  {p.isHost ? 'Host' : 'Participant'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
