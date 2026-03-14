import { useState } from 'react';
import { usePlayer } from './PlayerContext';

const NAV_ITEMS = [
  { id: 'home',    icon: '🏠', label: 'Home' },
  { id: 'search',  icon: '🔍', label: 'Search' },
  { id: 'library', icon: '📚', label: 'Library' },
];

export default function LeftNav() {
  const {
    activeView, setActiveView,
    sidebarCollapsed, setSidebarCollapsed,
    playlists, likedSongs,
    createPlaylist,
    deletePlaylist,
    setActivePlaylist,
    history,
    searchYouTube,
  } = usePlayer();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  function handleCreatePlaylist(e) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreate(false);
  }

  function openPlaylist(pl) {
    setActivePlaylist(pl.id);
    handleNav('library');
  }

  function handleNav(id) {
    setActiveView(id);
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {!sidebarCollapsed && (
        <div className="mobile-backdrop" onClick={() => setSidebarCollapsed(true)}></div>
      )}
      <nav className={`left-nav stagger-in ${!sidebarCollapsed ? 'open' : ''}`} style={{ animationDelay: '0.1s' }}>
      {/* Main nav */}
      <div className="nav-section">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
            title={sidebarCollapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </div>
        ))}

        {/* Liked Songs */}
        <div
          id="nav-liked"
          className={`nav-item ${activeView === 'liked' ? 'active' : ''}`}
          onClick={() => handleNav('liked')}
          title={sidebarCollapsed ? 'Liked Songs' : ''}
        >
          <span className="nav-icon">💜</span>
          {!sidebarCollapsed && (
            <span>Liked Songs
              {likedSongs.length > 0 && (
                <span className="badge badge-plasma" style={{ marginLeft: 6 }}>
                  {likedSongs.length}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {!sidebarCollapsed && (
        <>
          <div className="divider" style={{ margin: '8px 12px' }} />

          {/* Playlists */}
          <div className="nav-section">
            <div className="flex items-center justify-between" style={{ padding: '0 8px 8px' }}>
              {!sidebarCollapsed && (
                <span className="nav-section-title" style={{ padding: 0 }}>YOUR PLAYLISTS</span>
              )}
              <button
                id="create-playlist-btn"
                className="btn-icon tooltip"
                data-tip="New playlist"
                onClick={() => setShowCreate(v => !v)}
                style={{ fontSize: '0.9rem', width: 24, height: 24 }}
              >
                ➕
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreatePlaylist} style={{ padding: '4px 8px 8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Playlist name…"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  autoFocus
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                />
              </form>
            )}

            {playlists.map(pl => (
              <div
                key={pl.id}
                id={`playlist-nav-${pl.id}`}
                className="nav-item"
                style={{ justifyContent: 'space-between', paddingRight: 4 }}
              >
                <div
                  className="flex items-center gap-2 flex-1 overflow-hidden"
                  onClick={() => openPlaylist(pl)}
                >
                  <span className="nav-icon">🎵</span>
                  <span className="truncate" style={{ fontSize: '0.85rem' }}>{pl.name}</span>
                </div>
                <button
                  className="btn-icon"
                  onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  style={{ fontSize: '0.7rem', width: 20, height: 20, flexShrink: 0 }}
                  title="Delete playlist"
                >
                  ✕
                </button>
              </div>
            ))}

            {playlists.length === 0 && (
              <div style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Create your first playlist ✨
              </div>
            )}
          </div>

          <div className="divider" style={{ margin: '8px 12px' }} />

          {/* Recently Played */}
          <div className="nav-section">
            <div className="nav-section-title">RECENTLY PLAYED</div>
            {history.slice(0, 8).map(track => (
              <div
                key={track.videoId}
                className="nav-item"
                onClick={() => searchYouTube(track.artist + ' ' + track.title, '')}
                title={track.title}
              >
                <img
                  src={track.thumbnail}
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                />
                <span className="truncate" style={{ fontSize: '0.78rem' }}>{track.title}</span>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Nothing played yet 🎧
              </div>
            )}
          </div>
        </>
      )}
      </nav>
    </>
  );
}
