import { useState } from 'react';
import { usePlayer } from './PlayerContext';
import { TrackCard, SkeletonGrid } from './HomeView';

const SEARCH_PRESETS = [
  { emoji: '🔥', label: 'Trending', query: 'trending music 2024', cat: '10' },
  { emoji: '🎵', label: 'Tamil', query: 'Tamil hits 2024', cat: '10' },
  { emoji: '🌊', label: 'Lo-Fi', query: 'lo-fi chill beats', cat: '' },
  { emoji: '🎸', label: 'Rock', query: 'rock music hits', cat: '10' },
  { emoji: '⚡', label: 'EDM', query: 'EDM dance music', cat: '10' },
  { emoji: '🌿', label: 'Ambient', query: 'ambient meditation music', cat: '' },
  { emoji: '🎷', label: 'Jazz', query: 'jazz music relaxing', cat: '10' },
  { emoji: '🕉', label: 'Devotional', query: 'devotional bhakti songs', cat: '10' },
  { emoji: '🎧', label: 'Podcasts', query: 'best podcasts 2024', cat: '' },
  { emoji: '🎻', label: 'Classical', query: 'classical orchestra music', cat: '10' },
];

export default function SearchView() {
  const {
    searchQuery, setSearchQuery,
    searchResults, searching, searchError,
    searchYouTube,
    playTrack,
    addToQueue,
    setShowSettings,
  } = usePlayer();

  const [activeCat, setActiveCat] = useState(null);

  function handleCategoryClick(preset) {
    setActiveCat(preset.label);
    searchYouTube(preset.query, preset.cat);
  }

  function handlePlayAll() {
    if (searchResults.length === 0) return;
    playTrack(searchResults[0], searchResults);
  }

  return (
    <div className="panel-section gradient-mesh stagger-in" style={{ minHeight: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-bright)', marginBottom: 4 }}>
          🔭 Search the Cosmos
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Find music, podcasts, and audio from across the universe
        </div>
      </div>

      {/* Quick category grid */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Browse</span>
        </div>
        <div className="category-pills">
          {SEARCH_PRESETS.map(preset => (
            <div
              key={preset.label}
              id={`search-cat-${preset.label.toLowerCase()}`}
              className={`pill ${activeCat === preset.label ? 'active-pill' : ''}`}
              onClick={() => handleCategoryClick(preset)}
            >
              {preset.emoji} {preset.label}
            </div>
          ))}
        </div>
      </div>



      {/* Error */}
      {searchError && (
        <div className="error-state" style={{ background: 'rgba(255, 50, 50, 0.06)', borderRadius: 12, border: '1px solid rgba(255,50,50,0.2)', padding: 20, marginBottom: 24 }}>
          <div className="error-icon">📡</div>
          <div className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-bright)' }}>
            Signal Lost
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 300, lineHeight: 1.5 }}>
            {searchError}
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setShowSettings(true)}
            style={{ fontSize: '0.8rem' }}
          >
            Check API Key
          </button>
        </div>
      )}

      {/* Results */}
      {searchQuery && (
        <div>
          <div className="section-header">
            <span className="section-title">
              {searching ? 'Searching…' : `Results for "${searchQuery}"`}
            </span>
            {searchResults.length > 0 && !searching && (
              <span className="badge badge-ion">{searchResults.length} tracks</span>
            )}
          </div>

          {searchResults.length > 0 && !searching && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                id="play-all-results-btn"
                className="btn btn-primary"
                onClick={handlePlayAll}
                style={{ fontSize: '0.82rem' }}
              >
                ▶ Play All
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => searchResults.forEach(t => addToQueue(t))}
                style={{ fontSize: '0.82rem' }}
              >
                + Add All to Queue
              </button>
            </div>
          )}

          {searching ? (
            <SkeletonGrid count={12} />
          ) : searchResults.length > 0 ? (
            <div className="grid-auto">
              {searchResults.map(track => (
                <TrackCard
                  key={track.videoId}
                  track={track}
                  queue={searchResults}
                />
              ))}
            </div>
          ) : !searchError && (
            <div className="empty-state">
              <div className="empty-state-icon">🌑</div>
              <div className="empty-state-title">No signals detected</div>
              <div className="empty-state-desc">Try a different search query</div>
            </div>
          )}
        </div>
      )}

      {!searchQuery && !searching && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-state-icon">🔭</div>
          <div className="empty-state-title">Explore the universe</div>
          <div className="empty-state-desc">Pick a category above or type in the search bar to find amazing music</div>
        </div>
      )}
    </div>
  );
}
