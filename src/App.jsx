import React from 'react';
import { PlayerProvider, usePlayer } from './PlayerContext';
import { useAuth } from './AuthContext';
import StarField from './StarField';
import TopBar from './TopBar';
import LeftNav from './LeftNav';
import RightPanel from './RightPanel';
import NowPlayingBar from './NowPlayingBar';
import HomeView from './HomeView';
import SearchView from './SearchView';
import LibraryView from './LibraryView';
import SettingsModal from './SettingsModal';
import ExpandedPlayer from './ExpandedPlayer';
import LoginPage from './LoginPage';
import { TrackCard } from './HomeView';

// ── Loading spinner ─────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--void)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'var(--font-display)',
    }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="10" fill="url(#splashGrad)" />
        <ellipse cx="28" cy="28" rx="25" ry="10"
          stroke="url(#splashOrbit)" strokeWidth="2" fill="none" strokeDasharray="5 8"
          style={{ transformOrigin: '28px 28px', animation: 'orbitSpin 1.8s linear infinite' }} />
        <defs>
          <radialGradient id="splashGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff6bff" />
            <stop offset="100%" stopColor="#7b2fff" />
          </radialGradient>
          <linearGradient id="splashOrbit" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7b2fff" /><stop offset="0.5" stopColor="#00e5ff" /><stop offset="1" stopColor="#ff6bff" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontSize: '0.82rem', letterSpacing: '0.18em', color: 'var(--text-dim)' }}>LAUNCHING ORBIT…</span>
    </div>
  );
}

// ── Liked Songs view ────────────────────────────────────────────
function LikedSongsView() {
  const { likedSongs, playTrack } = usePlayer();
  return (
    <div className="panel-section gradient-mesh stagger-in" style={{ minHeight: '100%' }}>
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>
          💜 Liked Songs
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{likedSongs.length} tracks</div>
      </div>
      {likedSongs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💜</div>
          <div className="empty-state-title">No liked songs yet</div>
          <div className="empty-state-desc">Tap the heart icon on any track to save it here</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
              onClick={() => playTrack(likedSongs[0], likedSongs)}>
              ▶ Play All
            </button>
          </div>
          <div className="grid-auto">
            {likedSongs.map(t => (
              <TrackCard key={t.videoId} track={t} queue={likedSongs} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main App Shell ──────────────────────────────────────────────
function AppShell() {
  const {
    activeView,
    sidebarCollapsed,
    rightPanelOpen,
    showSettings,
    expandedPlayer,
  } = usePlayer();

  const shellClass = [
    'app-shell',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
    !rightPanelOpen   ? 'right-hidden' : '',
  ].filter(Boolean).join(' ');

  function renderView() {
    switch (activeView) {
      case 'home':    return <HomeView />;
      case 'search':  return <SearchView />;
      case 'library': return <LibraryView />;
      case 'liked':   return <LikedSongsView />;
      default:        return <HomeView />;
    }
  }

  return (
    <>
      <StarField />
      <div className={shellClass} style={{ position: 'relative', zIndex: 1 }}>
        <TopBar />
        <LeftNav />
        <main className="main-content">{renderView()}</main>
        <RightPanel />
        <NowPlayingBar />
      </div>
      {showSettings && <SettingsModal />}
      {expandedPlayer && <ExpandedPlayer />}
    </>
  );
}

// ── Root — auth-guarded ─────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <LoginPage />;

  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}
