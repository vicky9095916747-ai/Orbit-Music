import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { searchSaavnSongs, getSaavnPlaylist } from './saavnClient';
import { Capacitor } from '@capacitor/core';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { session } = useAuth();
  const providerToken =
    session?.provider_token ||
    (typeof window !== 'undefined' ? localStorage.getItem('orbit_provider_token') : null);

  // ─── YouTube Player state ───────────────────────────────
  const playerRef    = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1); // YT.PlayerState

  // ─── Audio (JioSaavn) player state ─────────────────────
  const audioRef = useRef(null);
  const [audioReady, setAudioReady] = useState(false);

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
  const repeatRef = useRef(repeat);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);

  // ─── Refs for YT callbacks ─────────────────────────────
  const playNextRef = useRef(null);

  // ─── Playlists ─────────────────────────────────────────
  const [playlists, setPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_playlists') || '[]'); }
    catch { return []; }
  });
  const [likedSongs, setLikedSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_liked') || '[]'); }
    catch { return []; }
  });

  // ─── YouTube Playlists ─────────────────────────────────
  const [ytPlaylists, setYtPlaylists] = useState([]);
  const [fetchingYtPlaylists, setFetchingYtPlaylists] = useState(false);

  // ─── UI state ──────────────────────────────────────────
  const [activeView, setActiveView] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [expandedPlayer, setExpandedPlayer] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null); // playlist id being viewed

  // ─── Search state ──────────────────────────────────────
  const [searchProvider, setSearchProvider] = useState('saavn'); // 'saavn' | 'youtube'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPlaylist, setSearchPlaylist] = useState(null); // JioSaavn playlist import preview

  // ─── Bootstrap Audio element ───────────────────────────
  useEffect(() => {
    if (audioRef.current) return;
    const a = new Audio();
    a.preload = 'metadata';
    a.crossOrigin = 'anonymous';

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(a.currentTime || 0);
    const onLoadedMeta = () => setDuration(a.duration || 0);
    const onEnded = () => handleEnd();
    const onError = () => {
      setTimeout(() => {
        if (playNextRef.current) playNextRef.current();
      }, 800);
    };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoadedMeta);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onError);

    audioRef.current = a;
    setAudioReady(true);

    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('loadedmetadata', onLoadedMeta);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onError);
      try { a.pause(); } catch (_) {}
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          setTimeout(() => {
            if (playNextRef.current) playNextRef.current();
          }, 1000);
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
      if (currentTrack?.source === 'saavn') {
        const a = audioRef.current;
        if (a) {
          setCurrentTime(a.currentTime || 0);
          setDuration(a.duration || 0);
        }
        return;
      }
      if (playerRef.current?.getCurrentTime) setCurrentTime(playerRef.current.getCurrentTime());
    }, 500);
  }

  function stopProgressPoll() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function handleEnd() {
    if (repeatRef.current === 'one') {
      if (currentTrack?.source === 'saavn') {
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
      } else {
        playerRef.current?.seekTo(0);
        playerRef.current?.playVideo();
      }
    } else {
      if (playNextRef.current) playNextRef.current();
    }
  }

  // ─── Playback Controls ────────────────────────────────

  const loadTrack = useCallback((track, autoplay = true) => {
    if (!track) return;
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);

    if (track.source === 'saavn') {
      try { playerRef.current?.stopVideo?.(); } catch (_) {}

      const a = audioRef.current;
      if (a) {
        a.src = track.streamUrl || '';
        a.volume = muted ? 0 : Math.max(0, Math.min(1, volume / 100));
        if (autoplay) a.play().catch(() => {});
      }
      startProgressPoll();
    } else if (playerReady && playerRef.current) {
      try { audioRef.current?.pause?.(); } catch (_) {}
      try { audioRef.current && (audioRef.current.src = ''); } catch (_) {}

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
  }, [playerReady, muted, volume]);

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
    if (!currentTrack) return;

    if (currentTrack.source === 'saavn') {
      const a = audioRef.current;
      if (!a) return;
      if (isPlaying) a.pause();
      else a.play().catch(() => {});
      return;
    }

    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
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

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrev = useCallback(() => {
    if (currentTime > 3) {
      // Restart current if more than 3s in
      if (currentTrack?.source === 'saavn') {
        const a = audioRef.current;
        if (a) a.currentTime = 0;
      } else {
        playerRef.current?.seekTo(0);
      }
      return;
    }
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      loadTrack(queue[prevIdx], true);
    }
  }, [currentTime, queueIndex, queue, loadTrack, currentTrack]);

  const seekTo = useCallback((time) => {
    setCurrentTime(time);
    if (currentTrack?.source === 'saavn') {
      const a = audioRef.current;
      if (a) a.currentTime = time;
      return;
    }
    playerRef.current?.seekTo(time, true);
  }, []);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    setMuted(v === 0);
    playerRef.current?.setVolume(v);
    const a = audioRef.current;
    if (a) a.volume = Math.max(0, Math.min(1, v / 100));
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      playerRef.current?.unMute();
      playerRef.current?.setVolume(volume || 50);
      if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, (volume || 50) / 100));
    } else {
      setMuted(true);
      playerRef.current?.mute();
      if (audioRef.current) audioRef.current.volume = 0;
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

  const saveAsLocalPlaylist = useCallback((name, tracks) => {
    const pl = {
      id: Date.now().toString(),
      name,
      tracks: tracks.map(t => ({ ...t, addedAt: Date.now() })),
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

  // ─── YouTube Playlists ────────────────────────────────

  const fetchYouTubePlaylists = useCallback(async () => {
    const token = providerToken;
    if (!token) return;
    setFetchingYtPlaylists(true);
    try {
      const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch playlists');
      const data = await res.json();
      const pls = (data.items || []).map(item => ({
        id: `yt-${item.id}`,
        ytId: item.id,
        name: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.standard?.url,
        trackCount: item.contentDetails?.itemCount || 0,
        tracks: null // null means not fetched
      }));
      setYtPlaylists(pls);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingYtPlaylists(false);
    }
  }, [providerToken]);

  const fetchYouTubePlaylistTracks = useCallback(async (playlistId) => {
    const token = providerToken;
    if (!token) return [];
    try {
      let pageToken = '';
      let allTracks = [];
      do {
        const params = new URLSearchParams({
          part: 'snippet',
          playlistId: playlistId,
          maxResults: '50',
          ...(pageToken ? { pageToken } : {})
        });
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        if (!res.ok) break;
        const data = await res.json();
        const tracks = (data.items || [])
          .filter(item => item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
          .map(item => ({
            id: item.snippet.resourceId.videoId,
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || 'YouTube',
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.standard?.url,
            addedAt: Date.now()
          }));
        allTracks = [...allTracks, ...tracks];
        pageToken = data.nextPageToken;
      } while (pageToken && allTracks.length < 200);
      
      setYtPlaylists(prev => prev.map(p => 
        p.ytId === playlistId ? { ...p, tracks: allTracks } : p
      ));
      return allTracks;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [providerToken]);

  // ─── YouTube Search ───────────────────────────────────

  const searchYouTube = useCallback(async (query, categoryId = '10') => {
    if (!query.trim()) return;
    
    const token = providerToken;
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
  }, [providerToken]);

  // ─── JioSaavn Search (via your deployed API) ───────────
  const searchSaavn = useCallback(async (query) => {
    if (!query.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchPlaylist(null);
    setActiveView('search');

    try {
      const q = query.trim();
      const looksLikePlaylist =
        /^https?:\/\//i.test(q) ? /\/playlist\//i.test(q) : /^pl[a-z0-9]/i.test(q);

      // If user pasted a JioSaavn/Saavn playlist link/ID, import it and show its tracks
      if (looksLikePlaylist) {
        const pl = await getSaavnPlaylist(q, { lyrics: false });
        if (!pl) throw new Error('Could not import playlist. Try pasting only the playlist ID.');
        const rawSongs = pl?.songs || pl?.list || pl?.tracks || pl?.items || pl?.data?.songs || [];
        const rows = Array.isArray(rawSongs) ? rawSongs : [];

        const tracks = rows
          .filter(r => r?.id && (r?.media_url || r?.mediaUrl))
          .map(r => ({
            id: String(r.id),
            videoId: `saavn-${r.id}`,
            title: r.song || r.title || 'Unknown',
            artist: r.primary_artists || r.singers || r.music || 'JioSaavn',
            thumbnail: r.image || r.thumbnail || '',
            duration: r.duration ? Number(r.duration) : '',
            addedAt: Date.now(),
            source: 'saavn',
            streamUrl: r.media_url || r.mediaUrl || '',
            saavn: r,
          }));

        const name = pl?.name || pl?.title || pl?.listname || pl?.data?.name || 'JioSaavn Playlist';
        const pid = String(pl?.id || pl?.listid || pl?.data?.id || Date.now());

        const playlistObj = {
          id: `saavn-pl-${pid}`,
          name,
          tracks,
          createdAt: Date.now(),
          source: 'saavn',
          url: q,
        };

        setSearchPlaylist(playlistObj);
        setSearchResults(tracks);

        // Save/import into local playlists (upsert by id)
        setPlaylists(prev => {
          const idx = prev.findIndex(p => p.id === playlistObj.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], name: playlistObj.name, tracks: playlistObj.tracks };
            return copy;
          }
          return [playlistObj, ...prev];
        });

        return;
      }

      const rows = await searchSaavnSongs(query, { lyrics: false, songdata: true });
      const tracks = (rows || [])
        .filter(r => r?.id && r?.media_url)
        .map(r => ({
          id: String(r.id),
          videoId: `saavn-${r.id}`,
          title: r.song || r.title || 'Unknown',
          artist: r.primary_artists || r.singers || r.music || 'JioSaavn',
          thumbnail: r.image || '',
          duration: r.duration ? Number(r.duration) : '',
          addedAt: Date.now(),
          source: 'saavn',
          streamUrl: r.media_url,
          saavn: r,
        }));

      setSearchResults(tracks);
    } catch (err) {
      setSearchError(err?.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }, []);

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

  // ─── MediaSession (Android notification / lockscreen card) ─────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;

    try {
      const artworkSrc = currentTrack.thumbnail || '';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Unknown',
        artist: currentTrack.artist || '',
        album: currentTrack.source === 'saavn' ? 'JioSaavn' : 'YouTube',
        artwork: artworkSrc ? [
          { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' },
        ] : undefined,
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details?.seekTime === 'number') seekTo(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        seekTo(Math.min(duration || 0, (currentTime || 0) + 10));
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        seekTo(Math.max(0, (currentTime || 0) - 10));
      });
    } catch (_) {
      // Ignore MediaSession errors (some WebViews are partial)
    }
  }, [currentTrack, togglePlay, playPrev, playNext, seekTo, currentTime, duration]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState?.({
        duration,
        position: Math.min(duration, Math.max(0, currentTime || 0)),
        playbackRate: isPlaying ? 1 : 0,
      });
    } catch (_) {}
  }, [currentTrack, currentTime, duration, isPlaying]);

  // ─── Native (Android) media notification via Capacitor plugin ──
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    async function run() {
      let CapacitorMusicControls;
      try {
        ({ CapacitorMusicControls } = await import('capacitor-music-controls-plugin'));
      } catch (_) {
        return;
      }
      if (cancelled) return;

      if (!currentTrack) {
        try { await CapacitorMusicControls.destroy?.(); } catch (_) {}
        return;
      }

      const cover = currentTrack.thumbnail || '';
      const hasPrev = queue.length > 1;
      const hasNext = queue.length > 1;

      try {
        await CapacitorMusicControls.create({
          track: currentTrack.title || '',
          artist: currentTrack.artist || '',
          album: currentTrack.source === 'saavn' ? 'JioSaavn' : 'YouTube',
          cover,
          hasPrev,
          hasNext,
          hasClose: true,
          isPlaying: Boolean(isPlaying),
          dismissable: true,
          ticker: `Now playing "${currentTrack.title || ''}"`,
          notificationIcon: 'notification',
        });
      } catch (_) {}
    }

    run();
    return () => { cancelled = true; };
  }, [currentTrack, isPlaying, queue.length]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    async function run() {
      let CapacitorMusicControls;
      try {
        ({ CapacitorMusicControls } = await import('capacitor-music-controls-plugin'));
      } catch (_) {
        return;
      }
      if (cancelled) return;
      try { await CapacitorMusicControls.updateIsPlaying({ isPlaying: Boolean(isPlaying) }); } catch (_) {}
    }
    run();
    return () => { cancelled = true; };
  }, [isPlaying]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = (event) => {
      const message = event?.message || event?.detail?.message;
      if (!message) return;

      switch (message) {
        case 'music-controls-next':
          if (queue.length > 1) playNext();
          else seekTo(Math.min(duration || 0, (currentTime || 0) + 10));
          break;
        case 'music-controls-previous':
          if (queue.length > 1) playPrev();
          else seekTo(Math.max(0, (currentTime || 0) - 10));
          break;
        case 'music-controls-pause':
        case 'music-controls-play':
        case 'music-controls-toggle-play-pause':
          togglePlay();
          break;
        case 'music-controls-destroy':
          // user dismissed notification; keep playback as-is
          break;
      }
    };

    // Android: plugin dispatches a DOM event named "controlsNotification"
    document.addEventListener('controlsNotification', handler);

    return () => {
      document.removeEventListener('controlsNotification', handler);
    };
  }, [togglePlay, playNext, playPrev, queue.length, currentTime, duration, seekTo]);

  return (
    <PlayerContext.Provider
      value={{
        // State
        playerRef, playerReady, playerState, audioRef, audioReady, currentTrack, isPlaying,
        currentTime, duration, volume, muted,
        queue, queueIndex, history,
        shuffle, repeat,
        playlists, likedSongs, ytPlaylists, fetchingYtPlaylists,
        activeView, showSettings, sidebarCollapsed, rightPanelOpen,
        expandedPlayer, activePlaylist,
        searchProvider, searchQuery, searchResults, searching, searchError, searchPlaylist,

        // Setters
        setQueue, setQueueIndex, setShuffle, setRepeat, setPlaylists, setLikedSongs,
        setActiveView, setShowSettings, setSidebarCollapsed, setRightPanelOpen,
        setExpandedPlayer, setActivePlaylist,
        setSearchProvider, setSearchQuery, setSearchResults, setSearchError, setSearchPlaylist,

        // Actions
        loadTrack, playTrack, togglePlay, playNext, playPrev,
        seekTo, changeVolume, toggleMute,
        addToQueue, addToQueueNext, removeFromQueue, playFromQueue, shuffleQueue,
        toggleLike, isLiked,
        createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, saveAsLocalPlaylist,
        fetchYouTubePlaylists, fetchYouTubePlaylistTracks,
        searchYouTube,
        searchSaavn
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
