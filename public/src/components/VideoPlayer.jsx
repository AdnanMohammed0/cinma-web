import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import useStore from '../store/store';

export default function VideoPlayer({
  mediaId, mediaType = 'movie', season, episode,
  isHost, onPlay, onPause, onSeek, playerState, onTimeUpdate, source, posterUrl, onNextEpisode,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const isSeeking = useRef(false);
  const saveProgress = useStore(s => s.saveProgress);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [subEnabled, setSubEnabled] = useState(false);

  const [subCues, setSubCues] = useState([]);
  const [activeCue, setActiveCue] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [hlsSubTracks, setHlsSubTracks] = useState([]);
  const [activeHlsSub, setActiveHlsSub] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [activeSubTrack, setActiveSubTrack] = useState(-1);
  const [availableSubs, setAvailableSubs] = useState([]);
  const [subSearchLoading, setSubSearchLoading] = useState(false);
  const [subScale, setSubScale] = useState(100);
  const [subBg, setSubBg] = useState(true);
  const [subOffset, setSubOffset] = useState(0);
  const [subSettings, setSubSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tapSide, setTapSide] = useState(null);
  const [showNextEp, setShowNextEp] = useState(false);

  const isHostRef = useRef(isHost);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekRef = useRef(onSeek);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onNextEpRef = useRef(onNextEpisode);
  const subEnabledRef = useRef(false);
  const subCuesRef = useRef([]);
  const subOffsetRef = useRef(0);

  useEffect(() => { isHostRef.current = isHost; onPlayRef.current = onPlay; onPauseRef.current = onPause; onSeekRef.current = onSeek; onTimeUpdateRef.current = onTimeUpdate; onNextEpRef.current = onNextEpisode; });
  useEffect(() => { subEnabledRef.current = subEnabled; subCuesRef.current = subCues; subOffsetRef.current = subOffset; });
  useEffect(() => { setIsMobile(window.innerWidth < 768); const o = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', o); return () => window.removeEventListener('resize', o); }, []);

  const formatTime = (t) => {
    if (!t || !isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing]);

  const skip = (sec) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    showControlsTemporarily();
  };

  // Save progress every 5 seconds
  useEffect(() => {
    if (!playing || !mediaId || !duration) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      saveProgress(mediaId, mediaType, null, posterUrl, v.currentTime, duration, season, episode);
    }, 5000);
    return () => clearInterval(interval);
  }, [playing, mediaId, mediaType, duration, season, episode, saveProgress]);

  // Auto-load Arabic subs
  useEffect(() => {
    if (!mediaId) return;
    const subType = mediaType === 'tv' ? 'tv' : 'movie';
    fetch(`/api/subtitles/search?tmdb_id=${mediaId}&lang=ar&type=${subType}${season ? `&season=${season}` : ''}${episode ? `&episode=${episode}` : ''}`).then(r => r.json()).then(data => {
      if (data.subtitles && data.subtitles.length > 0) {
        const best = data.subtitles[0];
        fetch(`/api/subtitles/download?id=${best.id}`).then(r => r.text()).then(vtt => {
          if (vtt) applySubtitle(vtt, 'العربية (تلقائي)');
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [mediaId]);

  useEffect(() => {
    if (!videoRef.current || !source) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, maxBufferLength: 60, maxBufferSize: 60 * 1000000, maxMaxBufferLength: 120 });
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((l, i) => ({
          id: i, height: l.height, bitrate: l.bitrate,
          name: l.height >= 2160 ? '4K' : l.height >= 1440 ? '2K' : l.height >= 1080 ? '1080p' : l.height >= 720 ? '720p' : l.height >= 480 ? '480p' : l.height >= 360 ? '360p' : `${l.height}p`,
        }));
        setQualities(levels);
        setHlsSubTracks((hls.subtitleTracks || []).map((s, i) => ({ id: i, lang: s.lang, name: s.name })));
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => setCurrentQuality(data.level));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => setHlsSubTracks((hls.subtitleTracks || []).map((s, i) => ({ id: i, lang: s.lang, name: s.name }))));
      hls.on(Hls.Events.ERROR, (e, data) => { if (data.fatal) hls.destroy(); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
    } else {
      video.src = source;
    }

    const onP = () => setPlaying(true);
    const onPauseEv = () => setPlaying(false);
    const onEndedEv = () => { if (mediaType === 'tv' && season && episode) setShowNextEp(true); };
    const onTime = () => {
      const ct = video.currentTime;
      if (!isSeeking.current) setCurrentTime(ct);
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(ct);
      if (subEnabledRef.current && subCuesRef.current.length > 0) {
        const t = ct + subOffsetRef.current;
        const cue = subCuesRef.current.find(c => t >= c.start && t < c.end);
        setActiveCue(cue ? cue.text : '');
      }
      // Show next episode button when near the end (TV series)
      const dur = video.duration || 0;
      if (mediaType === 'tv' && season && episode && dur > 0 && dur - ct <= 30) {
        setShowNextEp(true);
      } else {
        setShowNextEp(false);
      }
    };
    const onDur = () => setDuration(video.duration || 0);
    const onBuf = () => { const b = video.buffered; if (b.length > 0) setBuffered(b.end(b.length - 1)); };

    video.addEventListener('play', onP);
    video.addEventListener('pause', onPauseEv);
    video.addEventListener('ended', onEndedEv);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDur);
    video.addEventListener('progress', onBuf);

    return () => {
      video.removeEventListener('play', onP);
      video.removeEventListener('pause', onPauseEv);
      video.removeEventListener('ended', onEndedEv);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDur);
      video.removeEventListener('progress', onBuf);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [source]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); if (isHostRef.current && onPlayRef.current) onPlayRef.current(v.currentTime); }
    else { v.pause(); if (isHostRef.current && onPauseRef.current) onPauseRef.current(v.currentTime); }
  };

  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const handleVolume = (e) => { const val = parseFloat(e.target.value); videoRef.current.volume = val; setVolume(val); setMuted(val === 0); };

  const handleSeek = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const time = ((e.clientX - rect.left) / rect.width) * duration;
    isSeeking.current = true;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    if (isHostRef.current && onSeekRef.current) onSeekRef.current(time);
    isSeeking.current = false;
    showControlsTemporarily();
  };

  const handleProgressHover = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pct * duration);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!document.fullscreenElement) { el.requestFullscreen?.(); setFullscreen(true); }
    else { document.exitFullscreen?.(); setFullscreen(false); }
  };

  const changeQuality = (id) => { if (!hlsRef.current) return; hlsRef.current.currentLevel = id; setCurrentQuality(id); setShowQuality(false); };
  const switchHlsSub = (id) => { if (!hlsRef.current) return; hlsRef.current.subtitleTrack = id; setActiveHlsSub(id); setActiveSubTrack(-1); setSubEnabled(false); setShowSubtitles(false); };

  const switchSubTrack = (index) => {
    if (index === -1) {
      setSubEnabled(false); setActiveCue(''); setActiveSubTrack(-1); setSubCues([]);
      setActiveHlsSub(-1); if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
      setShowSubtitles(false); return;
    }
    const track = subtitleTracks[index];
    if (!track) return;
    setSubCues(track.cues); setActiveSubTrack(index); setSubEnabled(true);
    setActiveHlsSub(-1); if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
    setShowSubtitles(false);
  };

  const disableSubs = () => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
    setActiveHlsSub(-1); setActiveSubTrack(-1); setSubEnabled(false);
    setActiveCue(''); setShowSubtitles(false); setSubCues([]);
  };

  const loadAvailableSubs = async () => {
    setSubSearchLoading(true);
    try {
      const subType = mediaType === 'tv' ? 'tv' : 'movie';
      const resp = await fetch(`/api/subtitles/search?tmdb_id=${mediaId}&lang=ar&type=${subType}${season ? `&season=${season}` : ''}${episode ? `&episode=${episode}` : ''}`);
      const data = await resp.json();
      if (data.subtitles) setAvailableSubs(data.subtitles);
    } catch {} finally {
      setSubSearchLoading(false);
    }
  };

  const loadSubFromUrl = async (url) => {
    setSubLoading(true); setSubError('');
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      const vtt = text.trim().startsWith('WEBVTT') ? text : srtToVtt(text);
      applySubtitle(vtt, url.split('/').pop() || 'URL');
    } catch (err) { setSubError('فشل تحميل الترجمة: ' + err.message); }
    finally { setSubLoading(false); }
  };

  const loadArabicSubs = async () => {
    setSubLoading(true); setSubError('');
    try {
      const subType = mediaType === 'tv' ? 'tv' : 'movie';
      const resp = await fetch(`/api/subtitles/search?tmdb_id=${mediaId}&lang=ar&type=${subType}${season ? `&season=${season}` : ''}${episode ? `&episode=${episode}` : ''}`);
      const data = await resp.json();
      if (!data.subtitles || data.subtitles.length === 0) { setSubError('لم يتم العثور على ترجمة عربية'); return; }
      setAvailableSubs(data.subtitles);
      for (const sub of data.subtitles) {
        try {
          const dl = await fetch(`/api/subtitles/download?id=${sub.id}`);
          if (!dl.ok) continue;
          const vtt = await dl.text();
          const providerLabel = sub.provider || 'مصدر';
          applySubtitle(vtt, `العربية (${providerLabel})`);
          setSubError('');
          return;
        } catch {}
      }
      setSubError('فشل تحميل جميع الترجمات المتاحة');
    } catch (err) { setSubError('خطأ: ' + err.message); }
    finally { setSubLoading(false); }
  };

  const parseVtt = (vtt) => {
    if (!vtt) return [];
    const cues = [];
    const lines = vtt.split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i].includes('-->')) {
        const parts = lines[i].split('-->');
        const start = parts[0].trim().split(':');
        const end = parts[1].trim().split(':');
        const toSec = (t) => {
          if (t.length === 3) return parseFloat(t[0])*3600 + parseFloat(t[1])*60 + parseFloat(t[2]);
          return parseFloat(t[0])*60 + parseFloat(t[1]);
        };
        const startSec = toSec(start);
        const endSec = toSec(end);
        let text = '';
        i++;
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
          if (text) text += '\n';
          text += lines[i].replace(/\{[^}]+\}/g, '');
          i++;
        }
        cues.push({ start: startSec, end: endSec, text });
      } else { i++; }
    }
    return cues;
  };

  const applySubtitle = (vtt, label = 'External') => {
    const video = videoRef.current;
    if (!video || !vtt) return;
    const parsed = parseVtt(vtt);
    const trackId = Date.now();
    setSubtitleTracks(prev => {
      const next = [...prev, { id: trackId, label, cues: parsed }];
      // Set active to the newly added track
      setActiveSubTrack(next.length - 1);
      return next;
    });
    setSubCues(parsed);
    setSubEnabled(true);
    setSubError('');
    setShowSubtitles(false);
    setActiveHlsSub(-1);
    if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
  };

  // Track active cue for custom rendering — now done in onTime handler above

  const srtToVtt = (srt) => { if (!srt) return 'WEBVTT\n\n'; return 'WEBVTT\n\n' + srt.replace(/\r\n/g, '\n').replace(/,/g, '.').trim() + '\n'; };
  const assToVtt = (ass) => {
    let vtt = 'WEBVTT\n\n'; const lines = ass.split('\n'); let inEvents = false;
    for (const line of lines) {
      if (line.startsWith('[Events]')) { inEvents = true; continue; }
      if (inEvents && line.startsWith('Dialogue:')) {
        const parts = line.split(',');
        if (parts.length < 10) continue;
        vtt += `${parts[1].trim().replace(',','.')} --> ${parts[2].trim().replace(',','.')}\n${parts.slice(9).join(',').replace(/\{[^}]+\}/g,'').replace(/\\N/g,'\n')}\n\n`;
      }
    }
    return vtt;
  };

  const loadSubFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target.result; if (!text) return; applySubtitle(text.trim().startsWith('WEBVTT') ? text : srtToVtt(text)); };
    reader.readAsText(file);
  };

  // Mobile double-tap forward/backward
  const lastTap = useRef({ x: 0, time: 0 });
  const handleContainerClick = useCallback((e) => {
    if (e.target.closest('button')) return;
    if (isMobile) {
      const now = Date.now();
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      if (lastTap.current.time && now - lastTap.current.time < 400) {
        if (x > width * 0.6) skip(10);
        else if (x < width * 0.4) skip(-10);
        else togglePlay();
        lastTap.current = { x: 0, time: 0 };
        return;
      }
      lastTap.current = { x, time: now };
      setTimeout(() => { if (lastTap.current.time === now) togglePlay(); }, 400);
    } else {
      if (e.target === containerRef.current || e.target.closest('.click-play')) togglePlay();
    }
  }, [isMobile]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'ArrowLeft': skip(-10); break;
        case 'ArrowRight': skip(10); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (playing) showControlsTemporarily();
    else { clearTimeout(hideTimer.current); setShowControls(true); }
  }, [playing, showControlsTemporarily]);

  useEffect(() => {
    if (!playerState || isHost || !videoRef.current) return;
    const v = videoRef.current;
    const drift = Math.abs(v.currentTime - playerState.currentTime);
    if (playerState.isPlaying === true && v.paused) v.play().catch(() => {});
    else if (playerState.isPlaying === false && !v.paused) v.pause();
    if (drift > 2) v.currentTime = playerState.currentTime;
  }, [playerState, isHost]);

  return (
    <div ref={containerRef}
      className={`relative bg-black overflow-hidden cursor-pointer select-none ${isMobile ? 'w-full h-dvh rounded-none' : 'w-full aspect-video rounded-xl'}`}
      onMouseMove={!isMobile ? showControlsTemporarily : undefined}
      onMouseLeave={!isMobile ? () => playing && setShowControls(false) : undefined}
      onClick={handleContainerClick}
    >
      <video ref={videoRef} className="w-full h-full" playsInline onClick={isMobile ? undefined : togglePlay}>
        {/* Mobile: video covers full screen */}
      </video>

      {/* Subtitle overlay - custom rendered with settings */}
      {subEnabled && activeCue && (
        <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center pointer-events-none px-4">
          <div
            className="px-3 py-1.5 rounded text-center max-w-[90%] leading-relaxed"
            style={{
              fontSize: `${subScale}%`,
              background: subBg ? 'rgba(0,0,0,0.8)' : 'transparent',
              color: '#fff',
              textShadow: subBg ? 'none' : '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)',
            }}
          >
            {activeCue.split('\n').map((line, i) => (
              <span key={i}>{line}{i < activeCue.split('\n').length - 1 ? <br /> : null}</span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile tap indicators */}
      {tapSide && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 ${tapSide === 'left' ? 'left-4' : 'right-4'}`}>
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              {tapSide === 'left'
                ? <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                : <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              }
            </svg>
          </div>
        </div>
      )}

      {/* Next Episode overlay */}
      {showNextEp && mediaType === 'tv' && season && episode && onNextEpisode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <p className="text-white/50 text-sm mb-3">انتهت الحلقة</p>
            <button onClick={() => { setShowNextEp(false); onNextEpRef.current?.(); }}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-lg transition-all active:scale-95 flex items-center gap-2 mx-auto">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              <span>الحلقة التالية</span>
            </button>
          </div>
        </div>
      )}

      {/* Big play button (desktop only when not playing) */}
      {!playing && !isMobile && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 border border-white/20 click-play">
            <svg className="w-10 h-10 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
        <div className="relative z-20 px-2 pb-2 pt-8">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg" style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }} />
            {hoverTime !== null && (
              <>
                <div className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap" style={{ left: `${hoverPos}px`, transform: 'translateX(-50%)' }}>
                  {formatTime(hoverTime)}
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${hoverPos}px` }} />
              </>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors flex-shrink-0 p-1">
              {playing ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            {/* Backward 10s (desktop) */}
            {!isMobile && (
              <button onClick={() => skip(-10)} className="text-white/70 hover:text-red-500 transition-colors p-1" title="-10s">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
              </button>
            )}

            {/* Forward 10s (desktop) */}
            {!isMobile && (
              <button onClick={() => skip(10)} className="text-white/70 hover:text-red-500 transition-colors p-1" title="+10s">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" transform="scale(-1,1) translate(-24,0)"/></svg>
              </button>
            )}

            {/* Volume (desktop) */}
            {!isMobile && (
              <div className="relative flex items-center" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
                <button onClick={toggleMute} className="text-white/70 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                  {muted || volume === 0 ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  )}
                </button>
                {showVolume && (
                  <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolume}
                    className="w-16 h-1 accent-red-500 cursor-pointer" dir="ltr" />
                )}
              </div>
            )}

            <span className="text-white/70 text-xs font-mono flex-shrink-0" dir="ltr">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Subtitles */}
            <div className="relative">
              <button onClick={() => { setShowSubtitles(!showSubtitles); if (!showSubtitles) loadAvailableSubs(); }} className="text-white/70 hover:text-white transition-colors p-1" title="الترجمة">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={subEnabled ? '#e50914' : 'currentColor'}>
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/>
                </svg>
              </button>
              {showSubtitles && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowSubtitles(false)} />
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden z-40 min-w-[200px] shadow-2xl">
                    <div className="px-4 py-2 text-white/50 text-xs border-b border-white/10">الترجمة</div>

                    {hlsSubTracks.length > 0 && (
                      <div className="border-b border-white/5 pb-1">
                        <div className="px-4 pt-2 pb-1 text-white/40 text-[10px]">مضمنة</div>
                        {hlsSubTracks.map((t) => (
                          <button key={t.id} onClick={() => { switchHlsSub(t.id); setShowSubtitles(false); }}
                            className={`w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors ${activeHlsSub === t.id ? 'text-red-500 bg-red-500/10' : 'text-white/70'}`}>
                            {t.name || t.lang || `Subtitle ${t.id + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {subtitleTracks.length > 0 && (
                      <div className="border-b border-white/5 pb-1">
                        <div className="px-4 pt-2 pb-1 text-white/40 text-[10px]">خارجية</div>
                        {subtitleTracks.map((t, i) => (
                          <button key={t.id} onClick={() => { switchSubTrack(i); setShowSubtitles(false); }}
                            className={`w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors ${activeSubTrack === i ? 'text-red-500 bg-red-500/10' : 'text-white/70'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="px-4 pt-2 pb-1 text-white/40 text-[10px]">ترجمة خارجية</div>
                    <button onClick={() => { disableSubs(); setShowSubtitles(false); }}
                      className={`w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors ${!subEnabled && activeHlsSub === -1 ? 'text-red-500 bg-red-500/10' : 'text-white/70'}`}>
                      بدون ترجمة
                    </button>
                    <button onClick={() => { loadArabicSubs(); }}
                      className="w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors text-white/70" disabled={subLoading}>
                      {subLoading ? 'جاري البحث...' : '🔍 ترجمة عربية'}
                    </button>

                    {availableSubs.length > 0 && (
                      <div className="border-t border-white/5 pt-1 max-h-40 overflow-y-auto">
                        <div className="px-4 pt-2 pb-1 text-white/40 text-[10px]">جميع الترجمات المتاحة</div>
                        {availableSubs.map((sub, i) => (
                          <button key={i} onClick={async () => {
                            try {
                              const r = await fetch(`/api/subtitles/download?id=${sub.id}`);
                              const vtt = await r.text();
                              const label = sub.provider ? `العربية (${sub.provider})` : 'العربية';
                              if (vtt) { applySubtitle(vtt, label); setShowSubtitles(false); }
                            } catch {}
                          }}
                            className="w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors text-white/70 flex items-center gap-2">
                            <span className="truncate flex-1">{sub.name || `ترجمة ${i + 1}`}</span>
                            <span className="text-[10px] text-white/30 flex-shrink-0">{sub.provider || ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {subSearchLoading && <div className="px-4 py-1 text-white/30 text-xs">جاري التحميل...</div>}

                    {/* Subtitle settings toggle */}
                    <button onClick={() => setSubSettings(!subSettings)}
                      className="w-full text-right px-4 py-1.5 text-sm hover:bg-white/10 transition-colors text-white/70">
                      ⚙️ إعدادات الترجمة
                    </button>

                    {subSettings && (
                      <div className="px-4 py-2 border-t border-white/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white/50 text-xs">الحجم</span>
                          <input type="range" min="50" max="200" value={subScale} onChange={e => setSubScale(Number(e.target.value))}
                            className="flex-1 h-1 accent-red-500" />
                          <span className="text-white/50 text-xs w-8 text-left">{subScale}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/50 text-xs">خلفية</span>
                          <button onClick={() => setSubBg(!subBg)}
                            className={`px-3 py-1 rounded text-xs ${subBg ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                            {subBg ? 'مفعلة' : 'معطلة'}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-white/50 text-xs w-8">توقيت</span>
                          <button onClick={() => setSubOffset(o => o - 0.1)} className="px-1.5 py-1 rounded bg-white/10 text-white/70 text-[10px]">-0.1</button>
                          <button onClick={() => setSubOffset(o => o - 0.5)} className="px-1.5 py-1 rounded bg-white/10 text-white/70 text-[10px]">-0.5</button>
                          <span className="text-white/70 text-xs w-14 text-center font-mono" dir="ltr">{subOffset > 0 ? '+' : ''}{subOffset.toFixed(1)}s</span>
                          <button onClick={() => setSubOffset(o => o + 0.5)} className="px-1.5 py-1 rounded bg-white/10 text-white/70 text-[10px]">+0.5</button>
                          <button onClick={() => setSubOffset(o => o + 0.1)} className="px-1.5 py-1 rounded bg-white/10 text-white/70 text-[10px]">+0.1</button>
                          <button onClick={() => setSubOffset(0)} className="px-1.5 py-1 rounded bg-white/10 text-white/50 text-[10px]">↺</button>
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-2 border-t border-white/10">
                      <div className="flex gap-2 items-center">
                        <input type="text" placeholder="رابط الترجمة (.vtt/.srt)" className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/30 outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter') loadSubFromUrl(e.target.value); }} />
                        <label className="text-white/50 hover:text-white transition-colors cursor-pointer text-xs">📁<input type="file" accept=".vtt,.srt,.ass" className="hidden" onChange={loadSubFile} /></label>
                      </div>
                      {subError && <div className="text-red-400 text-xs mt-1">{subError}</div>}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quality */}
            <div className="relative">
              <button onClick={() => setShowQuality(!showQuality)}
                className="text-white/70 hover:text-white transition-colors text-xs flex items-center gap-1 p-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                {currentQuality >= 0 && qualities[currentQuality] ? qualities[currentQuality].name : 'تلقائي'}
              </button>
              {showQuality && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowQuality(false)} />
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden z-40 min-w-[110px] shadow-2xl">
                    <button onClick={() => changeQuality(-1)}
                      className={`w-full text-right px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentQuality === -1 ? 'text-red-500 bg-red-500/10' : 'text-white/70'}`}>تلقائي</button>
                    {qualities.map((q) => (
                      <button key={q.id} onClick={() => changeQuality(q.id)}
                          className={`w-full text-right px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentQuality === q.id ? 'text-red-500 bg-red-500/10' : 'text-white/70'}`}>{q.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors flex-shrink-0 p-1">
              {fullscreen ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
