const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const streamRoutes = require('./routes/stream');
const proxyRoutes = require('./routes/proxy');
const { cleanupAll } = require('./services/sessionStore');
const { shutdown: scraperShutdown } = require('./services/scraper');

app.use('/api/stream', streamRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/subtitles', require('./routes/subtitles'));

async function shutdown() {
  cleanupAll();
  if (proxyRoutes.shutdown) await proxyRoutes.shutdown().catch(() => {});
  await scraperShutdown().catch(() => {});
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const rooms = new Map();

const DRIFT_THRESHOLD = 2;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

app.post('/api/rooms', (req, res) => {
  const { hostName, mediaId, mediaType, title } = req.body;
  const roomId = uuidv4().slice(0, 8);
  const room = {
    id: roomId,
    hostId: null,
    hostName: hostName || 'Host',
    title: title || 'Watch Party',
    mediaId: mediaId || null,
    mediaType: mediaType || 'movie',
    currentView: 'HOME_PAGE',
    playerState: {
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      volume: 1,
    },
    participants: [],
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  res.json({ roomId, room });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ room });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoomId = null;

  socket.on('CREATE_ROOM', ({ roomId, userName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('ERROR', 'Room not found');

    // If host reconnected, remove stale host entry
    if (room.hostId) {
      room.participants = room.participants.filter(p => p.id !== room.hostId);
    }
    // Also remove any old entry for this socket (in case of reconnect race)
    room.participants = room.participants.filter(p => p.id !== socket.id);

    room.hostId = socket.id;
    room.participants.push({
      id: socket.id,
      name: userName || 'Host',
      isHost: true,
    });

    socket.join(roomId);
    currentRoomId = roomId;

    socket.emit('ROOM_CREATED', { roomId, participants: room.participants });
    io.to(roomId).emit('PARTICIPANTS_UPDATE', room.participants);
  });

  socket.on('JOIN_ROOM', ({ roomId, userName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('ERROR', 'Room not found');

    // Remove stale entry for this socket if reconnecting
    room.participants = room.participants.filter(p => p.id !== socket.id);

    // Deduplicate: remove any existing non-host participant with same name
    // (handles page refresh race where old socket hasn't disconnected yet)
    const name = userName || 'Anonymous';
    room.participants = room.participants.filter(p => !(p.name === name && !p.isHost));

    const participant = {
      id: socket.id,
      name,
      isHost: false,
    };

    room.participants.push(participant);
    socket.join(roomId);
    currentRoomId = roomId;

    socket.emit('ROOM_JOINED', {
      roomId,
      participants: room.participants,
      currentView: room.currentView,
      playerState: room.playerState,
    });

    io.to(roomId).emit('PARTICIPANTS_UPDATE', room.participants);
  });

  socket.on('NAVIGATION', ({ route, params }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    // Only host can broadcast navigation
    if (room.hostId !== socket.id) return;

    const viewKey = params ? `${route}:${JSON.stringify(params)}` : route;
    room.currentView = viewKey;

    socket.to(currentRoomId).emit('NAVIGATION_SYNC', { route, params });
  });

  socket.on('PLAYER_PLAY', ({ currentTime }) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    room.playerState.isPlaying = true;
    room.playerState.currentTime = currentTime;

    socket.to(currentRoomId).emit('PLAYER_PLAY_SYNC', { currentTime });
  });

  socket.on('PLAYER_PAUSE', ({ currentTime }) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    room.playerState.isPlaying = false;
    room.playerState.currentTime = currentTime;

    socket.to(currentRoomId).emit('PLAYER_PAUSE_SYNC', { currentTime });
  });

  socket.on('PLAYER_SEEK', ({ currentTime }) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    room.playerState.currentTime = currentTime;

    socket.to(currentRoomId).emit('PLAYER_SEEK_SYNC', { currentTime });
  });

  socket.on('PLAYER_DRIFT', ({ currentTime, drift }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.playerState.currentTime = currentTime;
    if (room.hostId === socket.id) {
      socket.to(currentRoomId).emit('PLAYER_DRIFT_CORRECT', { currentTime, drift });
    }
  });

  socket.on('MEDIA_CHANGE', ({ mediaId, mediaType, title }) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    room.mediaId = mediaId;
    room.mediaType = mediaType;
    room.title = title;
    room.playerState = {
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      volume: 1,
    };

    io.to(currentRoomId).emit('MEDIA_CHANGE_SYNC', { mediaId, mediaType, title });
  });

  socket.on('SEARCH_UPDATE', ({ query, results }) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;
    socket.to(currentRoomId).emit('SEARCH_SYNC', { query, results });
  });

  socket.on('CHAT_MESSAGE', ({ userName, message }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    io.to(currentRoomId).emit('CHAT_MESSAGE', {
      id: uuidv4().slice(0, 6),
      userName,
      message,
      timestamp: Date.now(),
    });
  });

  socket.on('REQUEST_CURRENT_STATE', () => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    socket.emit('STATE_SYNC', {
      currentView: room.currentView,
      playerState: room.playerState,
      participants: room.participants,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const room = rooms.get(currentRoomId);
    if (room) {
      room.participants = room.participants.filter((p) => p.id !== socket.id);

      if (room.hostId === socket.id) {
        io.to(currentRoomId).emit('HOST_DISCONNECTED');
        rooms.delete(currentRoomId);
      } else {
        io.to(currentRoomId).emit('PARTICIPANTS_UPDATE', room.participants);

        if (room.participants.length === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (network accessible)`);
});
