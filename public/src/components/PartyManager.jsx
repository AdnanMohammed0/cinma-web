import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/store';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';

export default function PartyManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const partySession = useStore((s) => s.partySession);
  const setParticipants = useStore((s) => s.setParticipants);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const setPlayerState = useStore((s) => s.setPlayerState);
  const updatePlayerState = useStore((s) => s.updatePlayerState);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const setSearchResults = useStore((s) => s.setSearchResults);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const resetRoom = useStore((s) => s.resetRoom);
  const setRoom = useStore((s) => s.setRoom);
  const room = useStore((s) => s.room);
  const lastPathRef = useRef('');
  const roomIdRef = useRef(null);

  // Manage connection + listeners in one effect to avoid race conditions
  useEffect(() => {
    const previousRoomId = roomIdRef.current;
    roomIdRef.current = partySession?.roomId || null;

    if (!partySession) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    const isHost = partySession.isHost;

    const onNavSync = ({ route }) => { if (!isHost && route) navigate(route); };
    const onSearchSync = ({ query, results }) => { setSearchQuery(query); setSearchResults(results); };
    const onParticipants = (participants) => setParticipants(participants);
    const onChat = (msg) => addChatMessage(msg);
    const onStateSync = (state) => {
      if (state.currentView) setCurrentView(state.currentView);
      if (state.playerState) setPlayerState(state.playerState);
      if (state.participants) setParticipants(state.participants);
    };
    const onHostDisc = () => { resetRoom(); navigate('/'); };
    const onError = (error) => console.error('Socket error:', error);
    const onMediaChange = ({ mediaId, mediaType, title }) => {
      setRoom({ ...(room || {}), id: partySession.roomId, mediaId, mediaType, title, playerState: { isPlaying: false, currentTime: 0, playbackRate: 1, volume: 1 } });
      navigate(`/room/${partySession.roomId}`);
    };
    const onPlaySync = ({ currentTime }) => setPlayerState({ isPlaying: true, currentTime });
    const onPauseSync = ({ currentTime }) => setPlayerState({ isPlaying: false, currentTime });
    const onSeekSync = ({ currentTime }) => updatePlayerState({ currentTime });

    socket.on('NAVIGATION_SYNC', onNavSync);
    socket.on('SEARCH_SYNC', onSearchSync);
    socket.on('PARTICIPANTS_UPDATE', onParticipants);
    socket.on('CHAT_MESSAGE', onChat);
    socket.on('STATE_SYNC', onStateSync);
    socket.on('HOST_DISCONNECTED', onHostDisc);
    socket.on('ERROR', onError);
    socket.on('MEDIA_CHANGE_SYNC', onMediaChange);
    socket.on('PLAYER_PLAY_SYNC', onPlaySync);
    socket.on('PLAYER_PAUSE_SYNC', onPauseSync);
    socket.on('PLAYER_SEEK_SYNC', onSeekSync);

    return () => {
      socket.off('NAVIGATION_SYNC', onNavSync);
      socket.off('SEARCH_SYNC', onSearchSync);
      socket.off('PARTICIPANTS_UPDATE', onParticipants);
      socket.off('CHAT_MESSAGE', onChat);
      socket.off('STATE_SYNC', onStateSync);
      socket.off('HOST_DISCONNECTED', onHostDisc);
      socket.off('ERROR', onError);
      socket.off('MEDIA_CHANGE_SYNC', onMediaChange);
      socket.off('PLAYER_PLAY_SYNC', onPlaySync);
      socket.off('PLAYER_PAUSE_SYNC', onPauseSync);
      socket.off('PLAYER_SEEK_SYNC', onSeekSync);
    };
  }, [partySession?.roomId, partySession?.isHost]);

  // Broadcast host navigation on route change
  useEffect(() => {
    if (!partySession?.isHost) return;
    const path = location.pathname + location.search;
    if (path !== lastPathRef.current) {
      lastPathRef.current = path;
      connectSocket().emit('NAVIGATION', { route: path });
    }
  }, [location.pathname, location.search, partySession?.isHost]);

  return null;
}
