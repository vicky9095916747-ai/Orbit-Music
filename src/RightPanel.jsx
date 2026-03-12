import { usePlayer } from './PlayerContext';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RightPanel() {
  const {
    queue, queueIndex,
    currentTrack, isPlaying,
    playFromQueue, removeFromQueue,
    history,
    addToQueueNext,
    rightPanelOpen,
  } = usePlayer();

  if (!rightPanelOpen) return null;

  return (
    <aside className="right-panel stagger-in" style={{ animationDelay: '0.2s' }}>
      {/* Queue section */}
      <div className="panel-section">
        <div className="section-header">
          <span className="section-title">Queue</span>
          <span className="badge badge-plasma">{queue.length}</span>
        </div>

        {queue.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 12px' }}>
            <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🎵</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              Add tracks to your queue
            </div>
          </div>
        ) : (
          <div>
            {queue.map((track, idx) => (
              <div
                key={`${track.videoId}-${idx}`}
                id={`queue-item-${idx}`}
                className={`queue-item ${idx === queueIndex ? 'current-queue-item' : ''}`}
                onClick={() => playFromQueue(idx)}
              >
                <div style={{ minWidth: 16, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {idx === queueIndex && isPlaying ? '▶' : idx + 1}
                </div>
                <img
                  src={track.thumbnail}
                  alt=""
                  className="queue-thumb"
                  onError={e => { e.target.style.display='none'; }}
                />
                <div className="overflow-hidden flex-1">
                  <div className="truncate" style={{ fontSize: '0.78rem', color: idx === queueIndex ? 'var(--ion)' : 'var(--text-bright)', fontWeight: idx === queueIndex ? 600 : 400 }}>
                    {track.title}
                  </div>
                  <div className="truncate" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {track.artist}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={e => { e.stopPropagation(); removeFromQueue(track.videoId); }}
                  style={{ fontSize: '0.65rem', width: 18, height: 18, opacity: 0.5 }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Now playing info */}
      {currentTrack && (
        <div className="panel-section">
          <div className="section-header">
            <span className="section-title">Now Playing</span>
          </div>

          <div className="glass-card" style={{ padding: 14, marginBottom: 12, borderRadius: 12 }}>
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              style={{ width: '100%', borderRadius: 8, aspectRatio: '16/9', objectFit: 'cover', display: 'block', marginBottom: 10 }}
            />
            <div className="font-display truncate" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
              {currentTrack.title}
            </div>
            <div className="truncate" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {currentTrack.artist}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <a
                href={`https://www.youtube.com/watch?v=${currentTrack.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '5px 10px', flex: 1, textDecoration: 'none' }}
              >
                YT ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="panel-section">
          <div className="section-header">
            <span className="section-title">History</span>
          </div>
          {history.slice(0, 8).map((track, idx) => (
            <div
              key={`history-${track.videoId}-${idx}`}
              className="queue-item"
              onClick={() => addToQueueNext(track)}
              title="Click to play next"
            >
              <img src={track.thumbnail} alt="" className="queue-thumb" />
              <div className="overflow-hidden flex-1">
                <div className="truncate" style={{ fontSize: '0.78rem', color: 'var(--text-bright)' }}>{track.title}</div>
                <div className="truncate" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{track.artist}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
