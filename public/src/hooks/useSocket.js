import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/store';
import { connectSocket, getSocket } from '../services/socket';

const DRIFT_THRESHOLD = 2;

export function useSocketRoom(roomId) {
  const navigate = useNavigate();
  const {
    setParticipants,
    setRoom,
    setIsHost,
    resetRoom,
    setPlayerState,
    updatePlayerState,
    addChatMessage,
    setCurrentView,
    playerState,
  } = useStore();

  const createRoom = useCallback(
    (userName) => {
      const socket = connectSocket();
      socket.emit('CREATE_ROOM', { roomId, userName });
    },
    [roomId]
  );

  const joinRoom = useCallback(
    (userName) => {
      const socket = connectSocket();
      socket.emit('JOIN_ROOM', { roomId, userName });
    },
    [roomId]
  );

  const emitNavigation = useCallback(
    (route, params) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('NAVIGATION', { route, params });
      }
    },
    []
  );

  const emitPlay = useCallback(
    (currentTime) => {
      const socket = getSocket();
      if (socket?.connected) socket.emit('PLAYER_PLAY', { currentTime });
    },
    []
  );

  const emitPause = useCallback(
    (currentTime) => {
      const socket = getSocket();
      if (socket?.connected) socket.emit('PLAYER_PAUSE', { currentTime });
    },
    []
  );

  const emitSeek = useCallback(
    (currentTime) => {
      const socket = getSocket();
      if (socket?.connected) socket.emit('PLAYER_SEEK', { currentTime });
    },
    []
  );

  const emitMediaChange = useCallback(
    (mediaId, mediaType, title) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('MEDIA_CHANGE', { mediaId, mediaType, title });
      }
    },
    []
  );

  const emitSearchUpdate = useCallback(
    (query, results) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('SEARCH_UPDATE', { query, results });
      }
    },
    []
  );

  const sendChatMessage = useCallback(
    (userName, message) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('CHAT_MESSAGE', { userName, message });
      }
    },
    []
  );

  const requestStateSync = useCallback(() => {
    const socket = getSocket();
    if (socket?.connected) socket.emit('REQUEST_CURRENT_STATE');
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();

    socket.on('ROOM_CREATED', (data) => {
      setParticipants(data.participants);
      setIsHost(true);
      setRoom({ id: roomId });
    });

    socket.on('ROOM_JOINED', (data) => {
      setParticipants(data.participants);
      setIsHost(false);
      setRoom({ id: roomId, currentView: data.currentView, playerState: data.playerState });
    });

    socket.on('PLAYER_DRIFT_CORRECT', ({ currentTime }) => {
      const drift = Math.abs(playerState.currentTime - currentTime);
      if (drift > DRIFT_THRESHOLD) {
        updatePlayerState({ currentTime });
      }
    });

    return () => {
      socket.off('ROOM_CREATED');
      socket.off('ROOM_JOINED');
      socket.off('PLAYER_DRIFT_CORRECT');
    };
  }, [roomId, playerState.currentTime]);

  return {
    createRoom,
    joinRoom,
    emitNavigation,
    emitPlay,
    emitPause,
    emitSeek,
    emitMediaChange,
    emitSearchUpdate,
    sendChatMessage,
    requestStateSync,
  };
}
