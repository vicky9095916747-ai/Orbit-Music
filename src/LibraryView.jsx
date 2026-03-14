import { useState, useEffect } from 'react';
import { usePlayer } from './PlayerContext';
import { TrackCard } from './HomeView';

function TrackRow({ track, playlist, onRemove }) {
  const { playTrack, toggleLike, isLiked, addToQueue } = usePlayer();
  const liked = isLiked(track.videoId);

  return (
    <div className="track-row">
      <img
        src={track.thumbnail}
        alt=""
        style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
      />
      <div className="overflow-hidden flex-1" onClick={() => playTrack(track, playlist)}>
        <div className="truncate" style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 500 }}>{track.title}</div>
        <div className="truncate" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{track.artist}</div>
      </div>
      <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={() => toggleLike(track)}>
        {liked ? '💜' : '🤍'}
      </button>
      <button className="btn-icon" onClick={() => addToQueue(track)} title="Add to queue" style={{ fontSize: '0.8rem' }}>+Q</button>
      {onRemove && (
        <button className="btn-icon" onClick={() => onRemove(track.videoId)} style={{ fontSize: '0.65rem', opacity: 0.5 }}>✕</button>
      )}
    </div>
  );
}

export default function LibraryView() {
  const {
    playlists, likedSongs, ytPlaylists, fetchingYtPlaylists,
    fetchYouTubePlaylists, fetchYouTubePlaylistTracks,
    activePlaylist, setActivePlaylist,
    removeTrackFromPlaylist,
    deletePlaylist,
    createPlaylist,
    saveAsLocalPlaylist,
    playTrack,
    history,
  } = usePlayer();

  const [tab, setTab] = useState('playlists'); // 'playlists' | 'liked' | 'history' | 'youtube'

  // Find active playlist
  const openPl = activePlaylist 
    ? playlists.find(p => p.id === activePlaylist) || ytPlaylists.find(p => p.id === activePlaylist)
    : null;

  // Fetch tracks for YouTube playlist if needed
  useEffect(() => {
    if (openPl && openPl.id.startsWith('yt-') && openPl.tracks === null) {
      fetchYouTubePlaylistTracks(openPl.ytId);
    }
  }, [openPl, fetchYouTubePlaylistTracks]);

  // If a playlist is open, show it
  if (openPl) {
    return (
      <div className="panel-section gradient-mesh stagger-in" style={{ minHeight: '100%' }}>
        <div className="flex items-center gap-3 mb-6">
          <button className="btn btn-ghost" onClick={() => setActivePlaylist(null)} style={{ fontSize: '0.8rem' }}>
            ← Back
          </button>
          <div className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.06em' }}>
            {openPl.id.startsWith('yt-') ? '▶️' : '🎵'} {openPl.name}
          </div>
          <span className="badge badge-ion">{openPl.tracks ? openPl.tracks.length : '...'} tracks</span>
          {openPl.id.startsWith('yt-') && openPl.tracks && (
            <button className="btn btn-ghost ml-auto" style={{ fontSize: '0.75rem', color: 'var(--ion)' }}
              onClick={() => {
                const pl = saveAsLocalPlaylist(openPl.name, openPl.tracks);
                alert(`Saved as "${pl.name}" in Local Playlists`);
              }}>
              💾 Save to Local
            </button>
          )}
          {!openPl.id.startsWith('yt-') && (
            <button className="btn btn-ghost ml-auto" style={{ fontSize: '0.75rem', color: 'var(--stellar)' }}
              onClick={() => { deletePlaylist(openPl.id); setActivePlaylist(null); }}>
              🗑 Delete
            </button>
          )}
        </div>

        {!openPl.tracks ? (
          <div className="empty-state">
            <div className="empty-state-icon">▶️</div>
            <div className="empty-state-title">Loading tracks...</div>
          </div>
        ) : openPl.tracks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎵</div>
            <div className="empty-state-title">Playlist is empty</div>
            <div className="empty-state-desc">Search for tracks and add them with the + button</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                onClick={() => playTrack(openPl.tracks[0], openPl.tracks)}>
                ▶ Play All
              </button>
              {openPl.tracks.length > 0 && (
                <button className="btn btn-secondary" style={{ fontSize: '0.82rem', marginLeft: 8 }}
                  onClick={() => {
                    const shuffled = [...openPl.tracks];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    playTrack(shuffled[0], shuffled);
                  }}>
                  🔀 Shuffle Play
                </button>
              )}
            </div>
            {openPl.tracks.map(track => (
              <TrackRow
                key={track.videoId}
                track={track}
                playlist={openPl.tracks}
                onRemove={openPl.id.startsWith('yt-') ? null : (vid) => removeTrackFromPlaylist(openPl.id, vid)}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="panel-section gradient-mesh stagger-in" style={{ minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>
          📚 Your Library
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {[['playlists', '🎵 Playlists'], ['liked', '💜 Liked'], ['history', '🕐 History'], ['youtube', '▶️ YouTube']].map(([key, label]) => (
          <button
            key={key}
            id={`lib-tab-${key}`}
            className={`pill ${tab === key ? 'active-pill' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Playlists tab */}
      {tab === 'playlists' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button
              id="lib-create-playlist-btn"
              className="btn btn-ghost"
              onClick={() => {
                const name = prompt('Playlist name:');
                if (name) createPlaylist(name.trim());
              }}
              style={{ fontSize: '0.82rem' }}
            >
              ➕ New Playlist
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌌</div>
              <div className="empty-state-title">No playlists yet</div>
              <div className="empty-state-desc">Create your first playlist to curate your cosmic journey</div>
            </div>
          ) : (
            <div className="grid-auto">
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  id={`playlist-card-${pl.id}`}
                  className="glass-card"
                  style={{ padding: 16, cursor: 'pointer' }}
                  onClick={() => setActivePlaylist(pl.id)}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, marginBottom: 12,
                    background: `linear-gradient(135deg, var(--plasma-dim), var(--ion-dim))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem'
                  }}>
                    {pl.tracks[0]?.thumbnail
                      ? <img src={pl.tracks[0].thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                      : '🎵'}
                  </div>
                  <div className="font-display truncate" style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>{pl.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{pl.tracks.length} tracks</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Liked Songs tab */}
      {tab === 'liked' && (
        <>
          {likedSongs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💜</div>
              <div className="empty-state-title">No liked songs</div>
              <div className="empty-state-desc">Heart tracks to save them here</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                  onClick={() => playTrack(likedSongs[0], likedSongs)}>
                  ▶ Play All
                </button>
                {likedSongs.length > 0 && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.82rem', marginLeft: 8 }}
                    onClick={() => {
                      const shuffled = [...likedSongs];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      playTrack(shuffled[0], shuffled);
                    }}>
                    🔀 Shuffle Play
                  </button>
                )}
              </div>
              {likedSongs.map(track => (
                <TrackRow key={track.videoId} track={track} playlist={likedSongs} />
              ))}
            </>
          )}
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🕐</div>
              <div className="empty-state-title">No history</div>
              <div className="empty-state-desc">Your played tracks will appear here</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                  onClick={() => playTrack(history[0], history)}>
                  ▶ Play All
                </button>
                {history.length > 0 && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.82rem', marginLeft: 8 }}
                    onClick={() => {
                      const shuffled = [...history];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      playTrack(shuffled[0], shuffled);
                    }}>
                    🔀 Shuffle Play
                  </button>
                )}
              </div>
              {history.map(track => (
                <TrackRow key={track.videoId} track={track} playlist={history} />
              ))}
            </>
          )}
        </>
      )}

      {/* YouTube Playlists tab */}
      {tab === 'youtube' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={fetchYouTubePlaylists} style={{ fontSize: '0.82rem' }}>
              🔄 Refresh Playlists
            </button>
          </div>
          {fetchingYtPlaylists ? (
            <div className="empty-state"><div className="empty-state-title">Fetching playlists...</div></div>
          ) : ytPlaylists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">▶️</div>
              <div className="empty-state-title">No YouTube Playlists</div>
              <div className="empty-state-desc">Click Refresh to fetch playlists from your YouTube account</div>
            </div>
          ) : (
            <div className="grid-auto">
              {ytPlaylists.map(pl => (
                <div
                  key={pl.id}
                  className="glass-card"
                  style={{ padding: 16, cursor: 'pointer' }}
                  onClick={() => setActivePlaylist(pl.id)}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, marginBottom: 12,
                    background: `linear-gradient(135deg, var(--plasma-dim), var(--ion-dim))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem'
                  }}>
                    {pl.thumbnail
                      ? <img src={pl.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                      : '▶️'}
                  </div>
                  <div className="font-display truncate" style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>{pl.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{pl.trackCount} tracks</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
