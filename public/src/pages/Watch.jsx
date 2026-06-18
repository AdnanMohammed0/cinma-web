import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import useStore from '../store/store';
import { tmdb, getImageUrl } from '../services/tmdb';
import { fetchStream } from '../services/stream';
import { getSocket } from '../services/socket';
import VideoPlayer from '../components/VideoPlayer';
import CreateRoom from '../components/WatchParty/CreateRoom';
import SyncIndicator from '../components/WatchParty/SyncIndicator';
import { BsArrowLeft, BsInfoCircle } from 'react-icons/bs';

export default function Watch() {
  const { mediaType, id, season, episode } = useParams();
  const [searchParams] = useSearchParams();
  const { playerState, updatePlayerState, isHost, getCachedStream, cacheStream } = useStore();
  const [media, setMedia] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(null);

  const loadIdRef = useRef(0);
  const sessionIdRef = useRef(null);
  const isRoomHost = searchParams.get('host') === 'true';

  useEffect(() => {
    const fetchFn = mediaType === 'tv' ? tmdb.getTvDetails : tmdb.getMovieDetails;
    fetchFn(id)
      .then(setMedia)
      .catch(console.error);
  }, [id, mediaType]);

  const loadStream = useCallback((provider) => {
    const loadId = ++loadIdRef.current;
    const cacheKey = `${mediaType}_${id}_${season || ''}_${episode || ''}`;

    if (sessionIdRef.current) {
      fetch(`/api/proxy/cleanup/${sessionIdRef.current}`, { method: 'POST' }).catch(() => {});
      sessionIdRef.current = null;
    }

    // Check cache first (preloaded by Detail page)
    const cached = getCachedStream(cacheKey);
    if (cached && cached.playlistUrl) {
      sessionIdRef.current = cached.sessionId;
      setStreamUrl(cached.playlistUrl);
      setStreamLoading(false);
      saveStreamSession(cacheKey, cached.sessionId, cached.playlistUrl);
      return;
    }

    // Check localStorage for stale session (page reload recovery)
    const saved = loadStreamSession(cacheKey);
    if (saved) {
      fetch(`/api/proxy/playlist/${saved.sessionId}`)
        .then(r => {
          if (r.ok) {
            sessionIdRef.current = saved.sessionId;
            setStreamUrl(saved.playlistUrl);
            setStreamLoading(false);
            cacheStream(cacheKey, { sessionId: saved.sessionId, playlistUrl: saved.playlistUrl });
            return;
          }
          throw new Error('expired');
        })
        .catch(() => {
          // Session expired, fetch fresh
          doFetch(cacheKey, loadId);
        });
      return;
    }

    doFetch(cacheKey, loadId);
  }, [id, mediaType, season, episode, getCachedStream, cacheStream]);

  const doFetch = useCallback((cacheKey, loadId) => {
    setStreamLoading(true);
    setStreamError(null);
    setStreamUrl(null);

    fetchStream(id, mediaType, season || null, episode || null)
      .then((data) => {
        if (loadIdRef.current === loadId) {
          sessionIdRef.current = data.sessionId;
          setStreamUrl(data.playlistUrl);
          setStreamLoading(false);
          cacheStream(cacheKey, data);
          saveStreamSession(cacheKey, data.sessionId, data.playlistUrl);
        }
      })
      .catch((err) => {
        if (loadIdRef.current === loadId) {
          setStreamError(err.message);
          setStreamLoading(false);
        }
      });
  }, [id, mediaType, season, episode, cacheStream]);

  function saveStreamSession(key, sessionId, playlistUrl) {
    try {
      const sessions = JSON.parse(sessionStorage.getItem('streamSessions') || '{}');
      sessions[key] = { sessionId, playlistUrl, ts: Date.now() };
      // Keep only last 5 sessions
      const entries = Object.entries(sessions).sort((a, b) => b[1].ts - a[1].ts).slice(0, 5);
      sessionStorage.setItem('streamSessions', JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }

  function loadStreamSession(key) {
    try {
      const sessions = JSON.parse(sessionStorage.getItem('streamSessions') || '{}');
      const entry = sessions[key];
      if (!entry) return null;
      // Discard sessions older than 10 minutes (session TTL is 15min)
      if (Date.now() - entry.ts > 10 * 60 * 1000) return null;
      return entry;
    } catch { return null; }
  }

  useEffect(() => {
    loadStream(null);
    return () => {
      if (sessionIdRef.current) {
        fetch(`/api/proxy/cleanup/${sessionIdRef.current}`, { method: 'POST' }).catch(() => {});
        sessionIdRef.current = null;
      }
    };
  }, [loadStream]);

  const emitToRoom = useCallback((event, data) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const handlePlay = useCallback((time) => {
    updatePlayerState({ currentTime: time, isPlaying: true });
    emitToRoom('PLAYER_PLAY', { currentTime: time });
  }, [emitToRoom, updatePlayerState]);
  const handlePause = useCallback((time) => {
    updatePlayerState({ currentTime: time, isPlaying: false });
    emitToRoom('PLAYER_PAUSE', { currentTime: time });
  }, [emitToRoom, updatePlayerState]);
  const handleSeek = useCallback((time) => emitToRoom('PLAYER_SEEK', { currentTime: time }), [emitToRoom]);

  const handleTimeUpdate = useCallback(
    (time) => {
      updatePlayerState({ currentTime: time });
    },
    [updatePlayerState]
  );

  const title = media?.title || media?.name || 'Loading...';

  return (
    <div className="min-h-screen bg-black">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to={`/detail/${mediaType}/${id}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <BsArrowLeft className="text-lg" />
            <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
          </Link>
          <div className="flex items-center gap-3">
            <SyncIndicator />
            <CreateRoom mediaId={id} mediaType={mediaType} title={title} />
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="w-full min-h-screen flex items-center justify-center bg-black pt-14">
        <div className="w-full max-w-6xl mx-auto px-0 desktop:px-4">
          {streamLoading ? (
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <div className="text-white/50 text-sm animate-pulse">Loading stream...</div>
            </div>
          ) : streamUrl ? (
            <VideoPlayer
              mediaId={id}
              mediaType={mediaType}
              season={season || null}
              episode={episode || null}
              isHost={isHost || isRoomHost}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onTimeUpdate={handleTimeUpdate}
              playerState={playerState}
              source={streamUrl}
              posterUrl={media?.poster_path ? getImageUrl(media.poster_path, 'w185') : null}
            />
          ) : (
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <div className="text-center px-4">
                <p className="text-white/50 text-sm mb-2">Stream unavailable</p>
                {streamError && <p className="text-white/30 text-xs">{streamError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Info (below player on desktop) */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {media && (
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="text-sm text-white/50 mt-1 line-clamp-2">{media.overview}</p>
            </div>
            <Link
              to={`/detail/${mediaType}/${id}`}
              className="flex-shrink-0 btn-ghost p-2"
            >
              <BsInfoCircle className="text-xl" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
