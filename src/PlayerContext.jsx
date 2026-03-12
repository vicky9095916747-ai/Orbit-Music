import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { session } = useAuth();

  // ─── YouTube Player state ───────────────────────────────
  const playerRef    = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1); // YT.PlayerState

  // ─── Current track ─────────────────────────────────────
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ─── Progress ─────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressTimerRef = useRef(null);

  // ─── Volume ────────────────────────────────────────────
  const [volume, setVolume] = useState(() => {
    const v = localStorage.getItem('orbit_volume');
    return v !== null ? Number(v) : 80;
  });
  const [muted, setMuted] = useState(false);

  // ─── Queue & History ───────────────────────────────────
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_queue') || '[]'); }
    catch { return []; }
  });
  const [queueIndex, setQueueIndex] = useState(0);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_recents') || '[]'); }
    catch { return []; }
  });

  // ─── Playback modes ────────────────────────────────────
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'one' | 'all'

  // ─── Playlists ─────────────────────────────────────────
  const [playlists, setPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_playlists') || '[]'); }
    catch { return []; }
  });
  const [likedSongs, setLikedSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_liked') || '[]'); }
    catch { return []; }
  });

  // ─── UI state ──────────────────────────────────────────
  const [activeView, setActiveView] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null); // playlist id being viewed

  // ─── Search state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // ─── Persist to localStorage ───────────────────────────
  useEffect(() => { localStorage.setItem('orbit_queue', JSON.stringify(queue)); }, [queue]);
  useEffect(() => { localStorage.setItem('orbit_recents', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('orbit_playlists', JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => { localStorage.setItem('orbit_liked', JSON.stringify(likedSongs)); }, [likedSongs]);
  useEffect(() => { localStorage.setItem('orbit_volume', String(volume)); }, [volume]);

  // ─── Bootstrap YouTube IFrame API ──────────────────────
  useEffect(() => {
    if (window.YT) {
      initPlayer();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = initPlayer;
  }, []);  // eslint-disable-line

  function initPlayer() {
    if (playerRef.current) return; // already initialised
    const p = new window.YT.Player('yt-player', {
      height: '180',
      width: '320',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        origin: window.location.origin,
        enablejsapi: 1,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          p.setVolume(volume);
        },
        onStateChange: handleYTStateChange,
        onError: (e) => {
          console.warn('YT Player error', e.data);
          setTimeout(() => playNext(), 1000);
        }
      }
    });
    playerRef.current = p;
  }

  function handleYTStateChange(e) {
    const state = e.data;
    setPlayerState(state);
    if (state === 1) {   // PLAYING
      setIsPlaying(true);
      setDuration(playerRef.current?.getDuration() || 0);
      startProgressPoll();
      // 🎯 Enforce highest available audio/video quality
      try {
        const p = playerRef.current;
        const levels = p.getAvailableQualityLevels?.() || [];
        const preferred = ['hd1080', 'hd720', 'large', 'medium'];
        const best = preferred.find(q => levels.includes(q)) || 'hd720';
        p.setPlaybackQuality(best);
      } catch (_) {}
    } else if (state === 2) {  // PAUSED
      setIsPlaying(false);
      stopProgressPoll();
    } else if (state === 0) {  // ENDED
      setIsPlaying(false);
      stopProgressPoll();
      handleEnd();
    } else if (state === 3) {  // BUFFERING
      setIsPlaying(false);
    }
  }

  function startProgressPoll() {
    stopProgressPoll();
    progressTimerRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);
  }

  function stopProgressPoll() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function handleEnd() {
    if (repeat === 'one') {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
    } else {
      playNext();
    }
  }

  // ─── Playback Controls ────────────────────────────────

  const loadTrack = useCallback((track, autoplay = true) => {
    if (!track) return;
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);

    if (playerReady && playerRef.current) {
      if (autoplay) {
        playerRef.current.loadVideoById({ videoId: track.videoId, suggestedQuality: 'hd1080' });
      } else {
        playerRef.current.cueVideoById({ videoId: track.videoId, suggestedQuality: 'hd1080' });
      }
    }

    // Add to recents
    setHistory(prev => {
      const filtered = prev.filter(t => t.videoId !== track.videoId);
      return [track, ...filtered].slice(0, 20);
    });
  }, [playerReady]);

  const playTrack = useCallback((track, newQueue = null) => {
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.videoId === track.videoId);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      // If not in queue, add it
      setQueue(prev => {
        const exists = prev.findIndex(t => t.videoId === track.videoId);
        if (exists >= 0) { setQueueIndex(exists); return prev; }
        const newQ = [...prev, track];
        setQueueIndex(newQ.length - 1);
        return newQ;
      });
    }
    loadTrack(track, true);
  }, [loadTrack]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      if (!currentTrack) return;
      playerRef.current.playVideo();
    }
  }, [isPlaying, playerReady, currentTrack]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (queueIndex < queue.length - 1) {
      nextIdx = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIdx = 0;
    } else {
      return; // end of queue
    }

    setQueueIndex(nextIdx);
    loadTrack(queue[nextIdx], true);
  }, [queue, queueIndex, shuffle, repeat, loadTrack]);

  const playPrev = useCallback(() => {
    if (currentTime > 3) {
      // Restart current if more than 3s in
      playerRef.current?.seekTo(0);
      return;
    }
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      loadTrack(queue[prevIdx], true);
    }
  }, [currentTime, queueIndex, queue, loadTrack]);

  const seekTo = useCallback((time) => {
    setCurrentTime(time);
    playerRef.current?.seekTo(time, true);
  }, []);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    setMuted(v === 0);
    playerRef.current?.setVolume(v);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      playerRef.current?.unMute();
      playerRef.current?.setVolume(volume || 50);
    } else {
      setMuted(true);
      playerRef.current?.mute();
    }
  }, [muted, volume]);

  // ─── Queue management ─────────────────────────────────

  const addToQueue = useCallback((track) => {
    setQueue(prev => {
      if (prev.find(t => t.videoId === track.videoId)) return prev;
      return [...prev, track];
    });
  }, []);

  const addToQueueNext = useCallback((track) => {
    setQueue(prev => {
      const filtered = prev.filter(t => t.videoId !== track.videoId);
      filtered.splice(queueIndex + 1, 0, track);
      return filtered;
    });
  }, [queueIndex]);

  const removeFromQueue = useCallback((videoId) => {
    setQueue(prev => {
      const newQ = prev.filter(t => t.videoId !== videoId);
      return newQ;
    });
  }, []);

  const playFromQueue = useCallback((idx) => {
    setQueueIndex(idx);
    loadTrack(queue[idx], true);
  }, [queue, loadTrack]);

  const shuffleQueue = useCallback(() => {
    setQueue(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setQueueIndex(0);
  }, []);

  // ─── Liked Songs ──────────────────────────────────────

  const toggleLike = useCallback((track) => {
    setLikedSongs(prev => {
      const exists = prev.find(t => t.videoId === track.videoId);
      if (exists) return prev.filter(t => t.videoId !== track.videoId);
      return [{ ...track, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const isLiked = useCallback((videoId) => {
    return likedSongs.some(t => t.videoId === videoId);
  }, [likedSongs]);

  // ─── Playlists ────────────────────────────────────────

  const createPlaylist = useCallback((name) => {
    const pl = {
      id: Date.now().toString(),
      name,
      tracks: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, pl]);
    return pl;
  }, []);

  const deletePlaylist = useCallback((id) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      if (p.tracks.find(t => t.videoId === track.videoId)) return p;
      return { ...p, tracks: [...p.tracks, { ...track, addedAt: Date.now() }] };
    }));
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, videoId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, tracks: p.tracks.filter(t => t.videoId !== videoId) };
    }));
  }, []);

  // ─── YouTube Search ───────────────────────────────────

  const searchYouTube = useCallback(async (query, categoryId = '10') => {
    if (!query.trim()) return;
    
    const token = session?.provider_token;
    if (!token) {
      setSearchError('Sign in with Google to enable search. (Token missing)');
      setActiveView('search');
      return;
    }

    setSearching(true);
    setSearchError('');
    setActiveView('search');

    try {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: '24',
        q: query,
        ...(categoryId ? { videoCategoryId: categoryId } : {})
      });

      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
           throw new Error('Search session expired. Please sign out and sign back in with Google.');
        }
        const err = await res.json();
        throw new Error(err.error?.message || 'API error');
      }
      const data = await res.json();

      const tracks = (data.items || []).map(item => ({
        id:        item.id.videoId,
        videoId:   item.id.videoId,
        title:     item.snippet.title,
        artist:    item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        duration:  '',
        addedAt:   Date.now()
      }));

      setSearchResults(tracks);
    } catch (err) {
      setSearchError(err.message || 'Search failed. Check your API key.');
    } finally {
      setSearching(false);
    }
  }, [session]);

  // ─── Keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seekTo(Math.min((currentTime || 0) + 5, duration));
          break;
        case 'ArrowLeft':
          seekTo(Math.max((currentTime || 0) - 5, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(volume + 5, 100));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(volume - 5, 0));
          break;
        case 'n': case 'N':
          playNext();
          break;
        case 'p': case 'P':
          playPrev();
          break;
        case 's': case 'S':
          setShuffle(v => !v);
          break;
        case 'l': case 'L':
          if (currentTrack) toggleLike(currentTrack);
          break;
        case 'm': case 'M':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, seekTo, currentTime, duration, changeVolume, volume, playNext, playPrev, toggleLike, toggleMute, currentTrack]);

  return (
    <PlayerContext.Provider
      value={{
        // State
        playerRef, playerReady, playerState, currentTrack, isPlaying,
        currentTime, duration, volume, muted,
        queue, queueIndex, history,
        shuffle, repeat,
        playlists, likedSongs,
        activeView, showSettings, sidebarCollapsed, rightPanelOpen,
        expandedPlayer, activePlaylist,
        searchQuery, searchResults, searching, searchError,

        // Setters
        setQueue, setQueueIndex, setShuffle, setRepeat, setPlaylists, setLikedSongs,
        setActiveView, setShowSettings, setSidebarCollapsed, setRightPanelOpen,
        setExpandedPlayer, setActivePlaylist,
        setSearchQuery, setSearchResults, setSearchError,

        // Actions
        loadTrack, playTrack, togglePlay, playNext, playPrev,
        seekTo, changeVolume, toggleMute,
        addToQueue, addToQueueNext, removeFromQueue, playFromQueue, shuffleQueue,
        toggleLike, isLiked,
        createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist,
        searchYouTube
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
