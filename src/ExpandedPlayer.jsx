import { usePlayer } from './PlayerContext';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExpandedPlayer() {
  const {
    currentTrack, isPlaying,
    currentTime, duration,
    volume, muted,
    shuffle, setShuffle,
    repeat, setRepeat,
    togglePlay, playNext, playPrev,
    seekTo, changeVolume, toggleMute,
    toggleLike, isLiked,
    setExpandedPlayer,
  } = usePlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = currentTrack ? isLiked(currentTrack.videoId) : false;

  function cycleRepeat() {
    setRepeat(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
  }

  if (!currentTrack) return null;

  return (
    <div className="now-playing-full" style={{
      background: 'linear-gradient(180deg, var(--nebula-1) 0%, var(--void) 100%)'
    }}>
      {/* Background blur art */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${currentTrack.thumbnail})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(60px) brightness(0.15) saturate(2)',
        transform: 'scale(1.2)',
        pointerEvents: 'none'
      }} />

      {/* Close button */}
      <button
        id="close-expanded-btn"
        className="btn-icon"
        onClick={() => setExpandedPlayer(false)}
        style={{ position: 'absolute', top: 24, right: 24, fontSize: '1.2rem', zIndex: 10 }}
      >
        ▽
      </button>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, maxWidth: 440, width: '100%' }}>

        {/* Album art — large */}
        <div style={{ position: 'relative', width: 280, height: 280 }}>
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="album-art-full"
            style={{ width: 280, height: 280, margin: 0 }}
          />

          {/* Orbit ring */}
          <svg style={{ position: 'absolute', inset: -20, width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', pointerEvents: 'none' }} viewBox="0 0 320 320" fill="none">
            <ellipse
              cx="160" cy="160" rx="155" ry="60"
              stroke="url(#orbitGrad)" strokeWidth="2"
              strokeDasharray="6 10"
              fill="none"
              style={{
                transformOrigin: '160px 160px',
                animation: isPlaying ? 'orbitSpin 4s linear infinite' : 'none',
                opacity: isPlaying ? 1 : 0.3
              }}
            />
            <defs>
              <linearGradient id="orbitGrad" x1="0" y1="0" x2="320" y2="320" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7b2fff" />
                <stop offset="0.5" stopColor="#00e5ff" />
                <stop offset="1" stopColor="#ff6bff" />
              </linearGradient>
            </defs>
          </svg>

          {/* Pulse ring */}
          {isPlaying && (
            <div style={{
              position: 'absolute', inset: -6, borderRadius: 22,
              border: '2px solid var(--ion)',
              animation: 'pulseRing 2s ease-out infinite',
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {/* Track info */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 6, color: 'var(--text-bright)', lineHeight: 1.3 }}>
            {currentTrack.title}
          </div>
          <div style={{ fontsize: '0.9rem', color: 'var(--text-dim)' }}>{currentTrack.artist}</div>
        </div>

        {/* Progress */}
        <div className="w-full">
          <div
            className="progress-track"
            style={{ cursor: 'pointer' }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * duration);
            }}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button className={`btn-icon ${shuffle ? 'active' : ''}`} onClick={() => setShuffle(v => !v)} style={{ fontSize: '1.1rem', color: shuffle ? 'var(--plasma)' : undefined }}>🔀</button>
          <button className="btn-icon" onClick={playPrev} style={{ fontSize: '1.3rem' }}>⏮</button>

          <button className="play-btn" onClick={togglePlay} style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button className="btn-icon" onClick={playNext} style={{ fontSize: '1.3rem' }}>⏭</button>
          <button className={`btn-icon ${repeat !== 'none' ? 'active' : ''}`} onClick={cycleRepeat} style={{ fontSize: '1.1rem', color: repeat !== 'none' ? 'var(--plasma)' : undefined }}>
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>

        {/* Volume + Like */}
        <div className="flex items-center gap-3 w-full" style={{ justifyContent: 'center' }}>
          <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={() => toggleLike(currentTrack)} style={{ fontSize: '1.3rem' }}>
            {liked ? '💜' : '🤍'}
          </button>
          <button className="btn-icon" onClick={toggleMute} style={{ fontSize: '1rem' }}>
            {muted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range" min="0" max="100" value={muted ? 0 : volume}
            onChange={e => changeVolume(Number(e.target.value))}
            className="volume-slider"
            style={{ width: 120 }}
          />
        </div>
      </div>
    </div>
  );
}
