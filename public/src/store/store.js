import { create } from 'zustand';

function loadWatched() {
  try { return JSON.parse(localStorage.getItem('continueWatching') || '[]'); } catch { return []; }
}

function saveWatched(items) {
  try { localStorage.setItem('continueWatching', JSON.stringify(items)); } catch {}
}

const useStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  room: null,
  isHost: false,
  participants: [],
  playerState: {
    isPlaying: undefined,
    currentTime: 0,
    playbackRate: 1,
    volume: 1,
  },
  currentView: 'HOME_PAGE',
  chatMessages: [],
  featured: [],
  popular: [],
  topRated: [],
  trending: [],
  popularTv: [],
  selectedMedia: null,
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  continueWatching: loadWatched(),
  streamCache: {},
  partySession: null, // { roomId, userName, isHost }

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setRoom: (room) => set({ room }),
  setIsHost: (isHost) => set({ isHost }),
  setParticipants: (participants) => set({ participants }),

  setPlayerState: (playerState) =>
    set((state) => ({ playerState: { ...state.playerState, ...playerState } })),
  updatePlayerState: (partial) =>
    set((state) => ({ playerState: { ...state.playerState, ...partial } })),

  setCurrentView: (currentView) => set({ currentView }),

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),

  setFeatured: (featured) => set({ featured }),
  setPopular: (popular) => set({ popular }),
  setTopRated: (topRated) => set({ topRated }),
  setTrending: (trending) => set({ trending }),

  setSelectedMedia: (selectedMedia) => set({ selectedMedia }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),

  setPartySession: (partySession) => set({ partySession }),

  setLoading: (isLoading) => set({ isLoading }),

  saveProgress: (mediaId, mediaType, title, poster, progress, duration, season, episode) => {
    const cw = get().continueWatching.filter(i => i.mediaId !== mediaId);
    cw.unshift({ mediaId, mediaType, title, poster, progress, duration, season, episode, updatedAt: Date.now() });
    saveWatched(cw.slice(0, 20));
    set({ continueWatching: cw.slice(0, 20) });
  },

  cacheStream: (key, data) => {
    set((state) => ({ streamCache: { ...state.streamCache, [key]: data } }));
  },

  preloadStream: async (tmdbId, type = 'movie', season = null, episode = null) => {
    const key = `${type}_${tmdbId}_${season || ''}_${episode || ''}`;
    const state = get();
    if (state.streamCache[key]) return state.streamCache[key];
    try {
      const params = new URLSearchParams({ tmdb_id: tmdbId, type });
      if (season) params.set('season', season);
      if (episode) params.set('episode', episode);
      const res = await fetch(`/api/stream?${params}`, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) return null;
      const data = await res.json();
      set((s) => ({ streamCache: { ...s.streamCache, [key]: data } }));
      return data;
    } catch { return null; }
  },

  getCachedStream: (key) => {
    return get().streamCache[key] || null;
  },

  clearStreamCache: (key) => {
    if (key) {
      set((state) => { const { [key]: _, ...rest } = state.streamCache; return { streamCache: rest }; });
    } else {
      set({ streamCache: {} });
    }
  },

  resetRoom: () =>
    set({
      room: null,
      isHost: false,
      participants: [],
      playerState: { isPlaying: undefined, currentTime: 0, playbackRate: 1, volume: 1 },
      currentView: 'HOME_PAGE',
      chatMessages: [],
      partySession: null,
    }),
}));

export default useStore;
