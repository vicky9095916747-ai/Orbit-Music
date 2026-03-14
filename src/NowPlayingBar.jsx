import { useRef, useState } from 'react';
import { usePlayer } from './PlayerContext';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Waveform({ playing }) {
  return (
    <div className={`waveform ${playing ? 'playing' : ''}`}>
      {[1,2,3,4,5].map(i => (
        <div key={i} className="waveform-bar" />
      ))}
    </div>
  );
}

function AlbumArt({ track, isPlaying }) {
  return (
    <div className="album-art-container">
      {track?.thumbnail ? (
        <img
          src={track.thumbnail}
          alt={track.title}
          className="album-art"
        />
      ) : (
        <div className="album-art" style={{
          background: 'linear-gradient(135deg, var(--nebula-1), var(--nebula-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
        }}>
          🎵
        </div>
      )}

      {/* Orbit ring SVG */}
      <svg className="orbit-ring-svg" viewBox="0 0 72 72" fill="none">
        <ellipse
          cx="36" cy="36" rx="33" ry="13"
          className={`orbit-ring-path ${isPlaying ? 'playing' : ''}`}
          style={{ transformOrigin: '36px 36px' }}
        />
      </svg>

      {/* Pulse ring */}
      <div className={`pulse-ring ${isPlaying ? 'playing' : ''}`} />
    </div>
  );
}

export default function NowPlayingBar() {
  const {
    currentTrack, isPlaying,
    currentTime, duration,
    volume, muted,
    queue, queueIndex,
    shuffle, setShuffle,
    repeat, setRepeat,
    togglePlay, playNext, playPrev,
    seekTo, changeVolume, toggleMute,
    toggleLike, isLiked,
    setExpandedPlayer,
    setActiveView,
    rightPanelOpen, setRightPanelOpen,
    addToQueue,
    playlists, addTrackToPlaylist, createPlaylist,
  } = usePlayer();

  const progressRef = useRef(null);
  const [tooltipX, setTooltipX] = useState(null);
  const [tooltipTime, setTooltipTime] = useState(null);
  const [showAddTo, setShowAddTo] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function handleProgressClick(e) {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  }

  function handleProgressMouseMove(e) {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTooltipX(e.clientX - rect.left);
    setTooltipTime(ratio * duration);
  }

  function cycleRepeat() {
    setRepeat(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
  }

  const liked = currentTrack ? isLiked(currentTrack.videoId) : false;

  return (
    <div className="now-playing-bar">
      {/* Hidden YouTube player — must NOT be 0×0 or browsers will mute audio */}
      <div
        id="yt-player"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: 320,
          height: 180,
          pointerEvents: 'none',
          visibility: 'hidden',
        }}
      />

      {/* Track info */}
      <div className="np-left flex items-center gap-3">
        <AlbumArt track={currentTrack} isPlaying={isPlaying} />

        {currentTrack ? (
          <div className="overflow-hidden flex-1">
            <div className="marquee-wrap">
              <span
                className={`marquee-text font-display ${currentTrack.title.length > 25 ? '' : 'short'}`}
                style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-bright)' }}
              >
                {currentTrack.title}
              </span>
            </div>
            <div className="truncate" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
              {currentTrack.artist}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nothing playing</div>
        )}

        {/* Like */}
        <button
          id="now-playing-like-btn"
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={() => currentTrack && toggleLike(currentTrack)}
        >
          {liked ? '💜' : '🤍'}
        </button>
      </div>

      {/* Center: controls + progress */}
      <div className="np-center flex flex-col items-center gap-2 flex-1">
        {/* Control buttons */}
        <div className="flex items-center gap-3">
          {/* Shuffle */}
          <button
            id="shuffle-btn"
            className={`btn-icon tooltip ${shuffle ? 'active' : ''}`}
            data-tip="Shuffle (S)"
            onClick={() => setShuffle(v => !v)}
            style={{ fontSize: '1rem', color: shuffle ? 'var(--plasma)' : undefined }}
          >
            🔀
          </button>

          {/* Prev */}
          <button
            id="prev-btn"
            className="btn-icon tooltip"
            data-tip="Previous (P)"
            onClick={playPrev}
            style={{ fontSize: '1.1rem' }}
          >
            ⏮
          </button>

          {/* Play/Pause */}
          <button
            id="play-pause-btn"
            className="play-btn"
            onClick={togglePlay}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Next */}
          <button
            id="next-btn"
            className="btn-icon tooltip"
            data-tip="Next (N)"
            onClick={playNext}
            style={{ fontSize: '1.1rem' }}
          >
            ⏭
          </button>

          {/* Repeat */}
          <button
            id="repeat-btn"
            className={`btn-icon tooltip ${repeat !== 'none' ? 'active' : ''}`}
            data-tip={`Repeat: ${repeat}`}
            onClick={cycleRepeat}
            style={{ fontSize: '1rem', color: repeat !== 'none' ? 'var(--plasma)' : undefined }}
          >
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 w-full">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: 32, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>

          <div className="progress-container flex-1">
            <div
              ref={progressRef}
              className="progress-track"
              onClick={handleProgressClick}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={() => { setTooltipX(null); setTooltipTime(null); }}
              id="progress-bar"
            >
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {tooltipX !== null && (
              <div className="time-tooltip" style={{ left: tooltipX }}>
                {formatTime(tooltipTime)}
              </div>
            )}
          </div>

          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: 32 }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: volume + extras */}
      <div className="np-right flex items-center gap-2">
        {/* Waveform */}
        <Waveform playing={isPlaying} />

        {/* Add to playlist */}
        <div style={{ position: 'relative' }}>
          <button
            id="add-to-playlist-btn"
            className="btn-icon tooltip"
            data-tip="Add to playlist"
            onClick={() => setShowAddTo(v => !v)}
            style={{ fontSize: '1rem' }}
          >
            ➕
          </button>

          {showAddTo && currentTrack && (
            <div style={{
              position: 'absolute', bottom: '110%', right: 0,
              background: 'var(--nebula-1)',
              border: '1px solid var(--glass-border)',
              borderRadius: 12, padding: 8,
              minWidth: 160, zIndex: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 8px 8px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                ADD TO PLAYLIST
              </div>
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => { addTrackToPlaylist(pl.id, currentTrack); setShowAddTo(false); }}
                  className="nav-item"
                  style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                >
                  🎵 {pl.name}
                </div>
              ))}
              <div
                onClick={() => {
                  const name = prompt('Playlist name:');
                  if (name) {
                    const pl = createPlaylist(name);
                    addTrackToPlaylist(pl.id, currentTrack);
                    setShowAddTo(false);
                  }
                }}
                className="nav-item"
                style={{ padding: '6px 8px', fontSize: '0.82rem', color: 'var(--ion)' }}
              >
                ➕ New playlist
              </div>
            </div>
          )}
        </div>

        {/* Queue toggle */}
        <button
          id="queue-toggle-btn"
          className={`btn-icon tooltip ${rightPanelOpen ? 'active' : ''}`}
          data-tip="Queue"
          onClick={() => setRightPanelOpen(v => !v)}
          style={{ fontSize: '1rem' }}
        >
          ≡
        </button>

        {/* Volume */}
        <button
          id="mute-btn"
          className="btn-icon tooltip"
          data-tip="Mute (M)"
          onClick={toggleMute}
          style={{ fontSize: '0.9rem' }}
        >
          {muted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
        </button>

        <input
          id="volume-slider"
          type="range"
          min="0"
          max="100"
          value={muted ? 0 : volume}
          onChange={e => changeVolume(Number(e.target.value))}
          className="volume-slider"
          onWheel={e => {
            e.preventDefault();
            changeVolume(Math.max(0, Math.min(100, volume + (e.deltaY < 0 ? 5 : -5))));
          }}
        />

        {/* Full screen */}
        <button
          id="expand-player-btn"
          className="btn-icon tooltip"
          data-tip="Expanded view"
          onClick={() => setExpandedPlayer(v => !v)}
          style={{ fontSize: '0.9rem' }}
        >
          ⤢
        </button>
      </div>
    </div>
  );
}
