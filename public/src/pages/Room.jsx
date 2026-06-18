import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import useStore from '../store/store';
import { useSocketRoom } from '../hooks/useSocket';
import { tmdb, getImageUrl } from '../services/tmdb';
import RoomSidebar from '../components/WatchParty/RoomSidebar';
import SyncIndicator from '../components/WatchParty/SyncIndicator';
import VideoPlayer from '../components/VideoPlayer';
import { BsPeople, BsArrowLeft, BsChatDots, BsCollectionPlay, BsSearch, BsStarFill, BsPlayFill, BsFilm } from 'react-icons/bs';

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isHost = searchParams.get('host') === 'true';
  const userName = searchParams.get('name') || 'Anonymous';
  const { room, participants, playerState, updatePlayerState, partySession, setPartySession, resetRoom } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const {
    createRoom, joinRoom, emitNavigation, emitPlay, emitPause, emitSeek, emitMediaChange, emitSearchUpdate, sendChatMessage, requestStateSync,
  } = useSocketRoom(roomId);

  useEffect(() => {
    if (isHost) {
      setPartySession({ roomId, userName, isHost: true });
      createRoom(userName);
    } else {
      setPartySession({ roomId, userName, isHost: false });
      joinRoom(userName);
      setTimeout(() => requestStateSync(), 1000);
    }
  }, [roomId, isHost]);

  const handleLeave = () => {
    resetRoom();
    navigate('/');
  };

  useEffect(() => {
    if (room) emitNavigation('ROOM_PAGE');
  }, [room]);

  const handlePlay = useCallback((time) => emitPlay(time), [emitPlay]);
  const handlePause = useCallback((time) => emitPause(time), [emitPause]);
  const handleSeek = useCallback((time) => emitSeek(time), [emitSeek]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); emitSearchUpdate('', []); return; }
    setSearching(true);
    try {
      const results = await tmdb.search(q);
      const sliced = results.slice(0, 8);
      setSearchResults(sliced);
      emitSearchUpdate(q, sliced);
    } catch { setSearchResults([]); emitSearchUpdate(q, []); }
    setSearching(false);
  };

  const handleSelectMedia = (item) => {
    const mediaType = item.media_type || 'movie';
    const title = item.title || item.name;
    emitMediaChange(item.id, mediaType, title);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Room Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-900/90 backdrop-blur-xl border-b border-white/5 relative">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1" title="Browse site (stay in party)">
            <BsArrowLeft className="text-lg" />
          </button>
          {/* Search area visible to everyone — host types, members see live results */}
          <div className="relative flex-1 max-w-md">
            {isHost ? (
              <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-1.5 border border-white/5">
                <BsSearch className="text-white/30 text-xs flex-shrink-0" />
                <input
                  type="text" value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search movies..."
                  className="bg-transparent text-xs text-white placeholder-white/30 w-full outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); emitSearchUpdate('', []); }}
                    className="text-white/20 hover:text-white/50 text-xs flex-shrink-0">
                    ✕
                  </button>
                )}
              </div>
            ) : searchQuery ? (
              <div className="flex items-center gap-2 bg-dark-800/50 rounded-lg px-3 py-1.5 border border-white/5">
                <BsSearch className="text-red-400 text-xs flex-shrink-0" />
                <span className="text-xs text-white/60 truncate">Host browsing: <span className="text-white/80 font-medium">{searchQuery}</span></span>
              </div>
            ) : (
              <div>
                <h1 className="text-sm font-semibold">Watch Party</h1>
                <p className="text-[10px] text-white/30">Joined as {userName}</p>
              </div>
            )}
            {(searchResults.length > 0 || searching) && (
              <div className="absolute top-full left-0 mt-1 w-full min-w-[20rem] bg-dark-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                {searching ? (
                  <div className="px-3 py-4 text-center text-xs text-white/30">Searching...</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button key={item.id} onClick={() => isHost ? handleSelectMedia(item) : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left border-b border-white/5 last:border-0 ${isHost ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}>
                        <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-dark-700">
                          {item.poster_path ? (
                            <img src={getImageUrl(item.poster_path, 'w92')} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full flex items-center justify-center"><BsFilm className="text-white/20 text-xs" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || item.name}</p>
                          <p className="text-xs text-white/40">
                            {(item.release_date || item.first_air_date || '').slice(0, 4)}
                            <span className="ml-1.5 capitalize bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{(item.media_type || 'movie') === 'tv' ? 'TV' : 'Movie'}</span>
                          </p>
                          {item.overview && (
                            <p className="text-[11px] text-white/30 line-clamp-1 mt-0.5">{item.overview}</p>
                          )}
                        </div>
                        {isHost && <BsPlayFill className="text-red-500 text-xl flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SyncIndicator />
          <button onClick={handleLeave}
            className="text-[11px] text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-white/5">
            Leave
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-lg transition-colors ${showSidebar ? 'bg-red-500/10 text-red-500' : 'text-white/50 hover:text-white'}`}>
            <BsChatDots className="text-lg" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Area */}
          <div className="flex-1 flex items-center justify-center bg-black p-2">
            <div className="w-full max-w-5xl">
              {room.mediaId ? (
                <VideoPlayer
                  mediaId={room.mediaId}
                  mediaType={room.mediaType || 'movie'}
                  isHost={isHost}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeek}
                  playerState={playerState}
                />
              ) : (
                <div className="aspect-video bg-dark-900 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <BsCollectionPlay className="text-4xl text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">
                      {isHost ? 'Search and select a movie to start' : 'Waiting for host to pick media...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Room Controls Bar */}
          <div className="bg-dark-900 border-t border-white/5 px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <BsPeople />
                <span>{participants.length} watching</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <BsCollectionPlay />
                <span>{room.title || 'No media selected'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`${showSidebar ? 'block' : 'hidden'} desktop:block`}>
          <RoomSidebar sendChatMessage={sendChatMessage} />
        </div>

        {/* Mobile sidebar overlay */}
        {showSidebar && (
          <div className="desktop:hidden fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50" onClick={() => setShowSidebar(false)} />
            <div className="w-80 max-w-[85vw]">
              <RoomSidebar sendChatMessage={sendChatMessage} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}