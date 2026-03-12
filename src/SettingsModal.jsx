import { useState } from 'react';
import { usePlayer } from './PlayerContext';
import { useAuth } from './AuthContext';

const THEMES = ['Space', 'Solar', 'Nebula'];

export default function SettingsModal() {
  const { setShowSettings } = usePlayer();
  const { signOut, user } = useAuth();
  
  const [theme, setTheme] = useState(localStorage.getItem('orbit_theme') || 'Space');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('orbit_theme', theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearData() {
    if (!confirm('Clear all ORBIT data? This will remove playlists, liked songs, and history.')) return;
    ['orbit_playlists', 'orbit_liked', 'orbit_queue', 'orbit_recents'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
      <div className="modal" id="settings-modal">
        {/* Header */}
        <div className="modal-title">
          <span>⚙️</span>
          <span className="font-display">Settings</span>
          <button
            className="btn-icon ml-auto"
            onClick={() => setShowSettings(false)}
            style={{ fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>


        {/* Theme */}
        <div className="form-group">
          <label className="form-label">Theme</label>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map(t => (
              <button
                key={t}
                id={`theme-${t.toLowerCase()}`}
                className={`pill ${theme === t ? 'active-pill' : ''}`}
                onClick={() => setTheme(t)}
              >
                {t === 'Space' ? '🌌' : t === 'Solar' ? '☀️' : '🌈'} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard shortcuts reference */}
        <div className="form-group">
          <label className="form-label">Keyboard Shortcuts</label>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px' }}>
            {[
              ['Space', 'Play / Pause'],
              ['→ / ←', 'Seek ±5 seconds'],
              ['↑ / ↓', 'Volume ±5%'],
              ['N', 'Next track'],
              ['P', 'Previous track'],
              ['S', 'Toggle shuffle'],
              ['L', 'Like current track'],
              ['M', 'Mute / Unmute'],
            ].map(([key, desc]) => (
              <div key={key} className="flex justify-between" style={{ padding: '3px 0', fontSize: '0.78rem' }}>
                <span className="font-mono" style={{ color: 'var(--ion)', background: 'var(--ion-dim)', padding: '1px 6px', borderRadius: 4 }}>
                  {key}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3" style={{ marginTop: 8 }}>
          <button
            id="save-settings-btn"
            className={`btn ${saved ? 'btn-ion' : 'btn-primary'} flex-1`}
            onClick={handleSave}
          >
            {saved ? '✓ Saved!' : '💾 Save'}
          </button>
          <button
            id="clear-data-btn"
            className="btn btn-ghost"
            onClick={handleClearData}
            style={{ color: 'var(--stellar)', fontSize: '0.78rem' }}
          >
            🗑 Clear Data
          </button>
        </div>

        {/* Account */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16, paddingTop: 16 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Signed in as <span style={{ color: 'var(--ion)' }}>{user?.email}</span>
          </div>
          <button
            id="sign-out-btn"
            className="btn btn-ghost"
            onClick={signOut}
            style={{ width: '100%', color: 'var(--stellar)', fontSize: '0.82rem', border: '1px solid rgba(255,107,255,0.25)' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
