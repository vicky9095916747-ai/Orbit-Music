import { useState, useRef } from 'react';
import { usePlayer } from './PlayerContext';

export default function TopBar() {
  const {
    searchQuery, setSearchQuery,
    searchYouTube,
    setActiveView,
    setShowSettings,
    sidebarCollapsed, setSidebarCollapsed,
  } = usePlayer();

  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchYouTube(searchQuery);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch(e);
  }

  return (
    <header className="topbar stagger-in">
      {/* Sidebar toggle */}
      <button
        id="sidebar-toggle-btn"
        className="btn-icon"
        onClick={() => setSidebarCollapsed(v => !v)}
        title="Toggle sidebar"
        style={{ fontSize: '1.1rem', flexShrink: 0 }}
      >
        ☰
      </button>

      {/* Logo */}
      <div className="orbit-logo" onClick={() => setActiveView('home')} id="orbit-logo">
        <svg className="orbit-logo-icon" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="5" fill="url(#lg)" />
          <ellipse cx="16" cy="16" rx="14" ry="6"
            stroke="url(#lg2)" strokeWidth="1.5"
            fill="none" strokeDasharray="4 3"
            className="orbit-ring"
          />
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00e676" />
              <stop offset="1" stopColor="#69ff47" />
            </linearGradient>
            <linearGradient id="lg2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00e676" />
              <stop offset="0.5" stopColor="#69ff47" />
              <stop offset="1" stopColor="#b9ff66" />
            </linearGradient>
          </defs>
        </svg>
        <span className="logo-text-group">
          <span className="logo-name">Orbit Music</span>
          <span className="logo-credit">by vicky</span>
        </span>
      </div>

      {/* Search Bar - Hidden on small screens */}
      <form className="search-bar topbar-search" onSubmit={handleSearch} id="search-form">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          className="search-input"
          placeholder="Search music, podcasts, ambient sounds…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          autoComplete="off"
        />
      </form>

      {/* Mobile Search Button - Only visible on small screens */}
      <button 
        className="btn-icon mobile-search-btn" 
        onClick={() => setActiveView('search')}
        title="Search"
      >
        🔍
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
        <button
          id="settings-btn"
          className="btn btn-ghost settings-btn-top"
          onClick={() => setShowSettings(true)}
          style={{ padding: '7px 14px' }}
        >
          <span className="settings-icon">⚙️</span>
          <span className="settings-text" style={{ marginLeft: '6px' }}>Settings</span>
        </button>
        <div className="avatar tooltip" data-tip="You" id="user-avatar">V</div>
      </div>
    </header>
  );
}
