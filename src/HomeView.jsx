import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

const CATEGORIES = [
  { emoji: '🎵', label: 'Tamil Hits',   query: 'Tamil hits 2024',       cat: '10' },
  { emoji: '🌊', label: 'Lo-Fi',        query: 'lo-fi study music',     cat: '' },
  { emoji: '🎸', label: 'Rock',         query: 'rock classics',         cat: '10' },
  { emoji: '🕉', label: 'Devotional',   query: 'devotional songs Tamil',cat: '10' },
  { emoji: '🎧', label: 'Podcasts',     query: 'popular podcasts 2024', cat: '' },
  { emoji: '🌿', label: 'Ambient',      query: 'ambient relaxing music',cat: '' },
  { emoji: '🎷', label: 'Jazz',         query: 'smooth jazz music',     cat: '10' },
  { emoji: '⚡', label: 'EDM',          query: 'EDM electronic music',  cat: '10' },
  { emoji: '🎻', label: 'Classical',    query: 'classical music best',  cat: '10' },
];

const FEATURED_QUERIES = [
  'AR Rahman latest songs',
  'Anirudh Tamil hits 2024',
  'lo-fi study music',
  'top Tamil melody 2024',
  'best ambient music',
  'trending India music 2024',
];

function TrackCard({ track, queue = [] }) {
  const { playTrack, addToQueue, toggleLike, isLiked } = usePlayer();
  const liked = isLiked(track.videoId);

  function handlePlay(e) {
    e.stopPropagation();
    playTrack(track, queue.length > 0 ? queue : [track]);
  }

  return (
    <div
      id={`track-card-${track.videoId}`}
      className="track-card"
      onClick={handlePlay}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={track.thumbnail}
          alt={track.title}
          className="track-thumbnail"
          loading="lazy"
          onError={e => { e.target.src = ''; e.target.style.background = 'var(--nebula-2)'; }}
        />
        <div className="play-overlay">
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--plasma), var(--ion))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', color: 'white',
            boxShadow: '0 0 24px var(--plasma-glow)'
          }}>▶</div>
        </div>

        {/* Like button overlay */}
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(3,1,10,0.7)', borderRadius: '50%', padding: 4 }}
          onClick={e => { e.stopPropagation(); toggleLike(track); }}
        >
          {liked ? '💜' : '🤍'}
        </button>
      </div>

      <div className="track-info">
        <div className="track-title">{track.title}</div>
        <div className="track-artist">{track.artist}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.65rem', padding: '3px 8px' }}
            onClick={e => { e.stopPropagation(); addToQueue(track); }}
          >
            + Queue
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid-auto">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton" style={{ aspectRatio: '16/9' }} />
          <div style={{ padding: 10 }}>
            <div className="skeleton mb-2" style={{ height: 12, width: '80%' }} />
            <div className="skeleton" style={{ height: 10, width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export { TrackCard, SkeletonGrid };

export default function HomeView() {
  const {
    searchYouTube,
    searchResults, searching,
    history,
    likedSongs,
    setActiveView,
    playTrack,
  } = usePlayer();

  const featuredQuery = useRef(FEATURED_QUERIES[Math.floor(Math.random() * FEATURED_QUERIES.length)]);

  useEffect(() => {
    // Auto-load featured content on mount
    searchYouTube(featuredQuery.current, '10');
  }, []); // eslint-disable-line

  return (
    <div className="panel-section gradient-mesh stagger-in" style={{ minHeight: '100%' }}>

      {/* Hero */}
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div className="font-display glow-plasma" style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 4, lineHeight: 1.2 }}>
          Welcome back ✦
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Discover music across the cosmos
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-header">
          <span className="section-title">Browse Categories</span>
        </div>
        <div className="category-pills">
          {CATEGORIES.map(cat => (
            <div
              key={cat.label}
              id={`cat-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="pill"
              onClick={() => searchYouTube(cat.query, cat.cat)}
            >
              {cat.emoji} {cat.label}
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played */}
      {history.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-header">
            <span className="section-title">Recently Played</span>
            <span className="section-link" onClick={() => setActiveView('library')}>See all →</span>
          </div>
          <div className="grid-auto">
            {history.slice(0, 8).map(track => (
              <TrackCard key={track.videoId} track={track} queue={history} />
            ))}
          </div>
        </div>
      )}

      {/* Liked quick access */}
      {likedSongs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-header">
            <span className="section-title">💜 Liked Songs</span>
            <span className="section-link" onClick={() => setActiveView('liked')}>See all →</span>
          </div>
          <div className="grid-auto">
            {likedSongs.slice(0, 6).map(track => (
              <TrackCard key={track.videoId} track={track} queue={likedSongs} />
            ))}
          </div>
        </div>
      )}

      {/* Featured / Search Results */}
      <div>
        <div className="section-header">
          <span className="section-title">Featured for You</span>
        </div>

        {searching ? (
          <SkeletonGrid count={12} />
        ) : searchResults.length > 0 ? (
          <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <button
                id="play-all-featured-btn"
                className="btn btn-primary"
                onClick={() => playTrack(searchResults[0], searchResults)}
                style={{ fontSize: '0.82rem' }}
              >
                ▶ Play All
              </button>
            </div>
            <div className="grid-auto">
              {searchResults.map(track => (
                <TrackCard key={track.videoId} track={track} queue={searchResults} />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🌌</div>
            <div className="empty-state-title">The cosmos awaits</div>
            <div className="empty-state-desc">Search for music above or pick a category to begin your journey</div>
          </div>
        )}
      </div>
    </div>
  );
}
