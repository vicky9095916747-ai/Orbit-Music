import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
// ── Mini Starfield — green/black ───────────────────────────────
function LoginStars() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const STARS = Array.from({ length: 260 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(), speed: Math.random() * 0.0003 + 0.00008,
      green: Math.random() > 0.6,
    }));

    const ORBS = [
      { x: 0.15, y: 0.3,  rx: 280, ry: 180, hue: 145, alpha: 0.04 },
      { x: 0.85, y: 0.7,  rx: 320, ry: 200, hue: 130, alpha: 0.03 },
      { x: 0.5,  y: 0.9,  rx: 400, ry: 140, hue: 160, alpha: 0.025 },
    ];

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Grid lines (Apple-style subtle grid)
      ctx.strokeStyle = 'rgba(0,230,118,0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      // Stars
      STARS.forEach(s => {
        s.a += s.speed;
        const alpha = 0.2 + 0.55 * Math.abs(Math.sin(s.a));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.green
          ? `rgba(0,230,118,${alpha * 0.8})`
          : `rgba(255,255,255,${alpha * 0.4})`;
        ctx.fill();
      });
      // Green orbs
      ORBS.forEach(o => {
        const g = ctx.createRadialGradient(o.x*canvas.width, o.y*canvas.height, 0,
                                           o.x*canvas.width, o.y*canvas.height, o.rx);
        g.addColorStop(0, `hsla(${o.hue},100%,50%,${o.alpha})`);
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.ellipse(o.x*canvas.width, o.y*canvas.height, o.rx, o.ry, 0, 0, Math.PI*2);
        ctx.fillStyle = g;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Auth Input ─────────────────────────────────────────────────
function AuthInput({ id, type, placeholder, value, onChange, icon }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: '1rem', opacity: 0.45, pointerEvents: 'none', zIndex: 1,
      }}>{icon}</span>
      <input
        id={id}
        type={isPassword && show ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={isPassword ? 'current-password' : 'email'}
        style={{
          width: '100%',
          background: 'rgba(0, 255, 100, 0.04)',
          border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: 14,
          padding: '13px 44px',
          color: '#f5fff7',
          fontSize: '0.92rem',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)',
        }}
        onFocus={e => {
          e.target.style.borderColor = '#00e676';
          e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.15)';
          e.target.style.background = 'rgba(0,255,100,0.07)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'rgba(0,230,118,0.2)';
          e.target.style.boxShadow = 'none';
          e.target.style.background = 'rgba(0,255,100,0.04)';
        }}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1rem', opacity: 0.4, color: '#f5fff7',
        }}>
          {show ? '🙈' : '👁️'}
        </button>
      )}
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,230,118,0.12)' }} />
      <span style={{ color: 'rgba(0,230,118,0.35)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,230,118,0.12)' }} />
    </div>
  );
}

// ── Main Login Page ────────────────────────────────────────────
export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab]           = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);

  async function handleGoogle() {
    setGLoading(true); setError('');
    try {
      // Determine correct redirect URL based on platform
      const isNative = Capacitor.isNativePlatform();
      const redirectUrl = isNative 
        ? 'com.vicky.orbitmusic://login-callback/' 
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/youtube.readonly'
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setGLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (tab === 'signup' && password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
      } else {
        const { user } = await signUp(email, password);
        if (!user) {
          setSuccess('Check your email for a confirmation link, then sign in!');
          setLoading(false); return;
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, system-ui, sans-serif', position: 'relative',
    }}>
      <LoginStars />

      {/* Apple-style Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420, margin: '0 16px',
        /* Apple Liquid Glass */
        background: 'rgba(8, 18, 10, 0.72)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(0, 230, 118, 0.18)',
        borderRadius: 28,
        padding: '44px 36px 36px',
        boxShadow: `
          0 0 0 1px rgba(0,230,118,0.06) inset,
          0 1px 0 rgba(0,230,118,0.12) inset,
          0 32px 80px rgba(0,0,0,0.8),
          0 0 60px rgba(0,230,118,0.06)
        `,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="7" fill="url(#lg2)" />
              <ellipse cx="20" cy="20" rx="18" ry="7" stroke="url(#lo2)" strokeWidth="1.5"
                fill="none" strokeDasharray="4 7"
                style={{ transformOrigin: '20px 20px', animation: 'orbitSpin 3s linear infinite' }} />
              <defs>
                <radialGradient id="lg2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#69ff47" />
                  <stop offset="100%" stopColor="#00e676" />
                </radialGradient>
                <linearGradient id="lo2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e676" />
                  <stop offset="0.5" stopColor="#69ff47" />
                  <stop offset="1" stopColor="#b9ff66" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '1.9rem', fontWeight: 900,
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, #00e676 0%, #69ff47 50%, #b9ff66 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(0,230,118,0.4))',
            }}>Orbit Music</span>
          </div>
          <p style={{ color: 'rgba(0,230,118,0.5)', fontSize: '0.78rem', margin: 0, letterSpacing: '0.04em' }}>
            Music streaming across the cosmos &nbsp;·&nbsp;
            <span style={{ color: '#69ff47', fontStyle: 'italic' }}>by vicky</span>
          </p>
        </div>

        {/* Google Button */}
        <button
          id="google-signin-btn"
          type="button"
          onClick={handleGoogle}
          disabled={gLoading}
          style={{
            width: '100%', padding: '13px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: gLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            color: '#f5fff7', fontSize: '0.9rem',
            fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 500,
            cursor: gLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(8px)',
            /* Apple inset highlight */
            boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset',
          }}
          onMouseEnter={e => { if(!gLoading){ e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }}
        >
          {/* Google G logo */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          {gLoading ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <Divider />

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(0,230,118,0.05)',
          borderRadius: 14, padding: 4, marginBottom: 22,
          border: '1px solid rgba(0,230,118,0.1)'
        }}>
          {['signin', 'signup'].map(t => (
            <button key={t} id={`tab-${t}`} type="button"
              onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.08em', transition: 'all 0.2s',
                background: tab === t
                  ? 'linear-gradient(135deg, #00e676, #009944)'
                  : 'transparent',
                color: tab === t ? '#000' : 'rgba(0,230,118,0.5)',
                boxShadow: tab === t ? '0 0 20px rgba(0,230,118,0.3)' : 'none',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <AuthInput id="auth-email" type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} icon="✉️" />
          <AuthInput id="auth-password" type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} icon="🔒" />
          {tab === 'signup' && (
            <AuthInput id="auth-confirm" type="password" placeholder="Confirm password" value={confirm}
              onChange={e => setConfirm(e.target.value)} icon="🔒" />
          )}

          {error && (
            <div style={{
              background: 'rgba(255,50,80,0.08)', border: '1px solid rgba(255,50,80,0.25)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 12,
              fontSize: '0.81rem', color: '#ff6b8a', lineHeight: 1.5,
            }}>⚠️ {error}</div>
          )}
          {success && (
            <div style={{
              background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.25)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 12,
              fontSize: '0.81rem', color: '#00e676', lineHeight: 1.5,
            }}>✅ {success}</div>
          )}

          <button
            id="auth-submit-btn" type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px 0', marginTop: 4,
              background: loading
                ? 'rgba(0,230,118,0.2)'
                : 'linear-gradient(135deg, #00e676 0%, #69ff47 100%)',
              border: 'none', borderRadius: 14,
              color: loading ? 'rgba(0,230,118,0.6)' : '#000',
              fontSize: '0.9rem', fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700, letterSpacing: '0.1em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s',
              boxShadow: loading ? 'none' : '0 0 28px rgba(0,230,118,0.4), 0 1px 0 rgba(255,255,255,0.2) inset',
            }}
            onMouseEnter={e => { if(!loading){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 40px rgba(0,230,118,0.6), 0 1px 0 rgba(255,255,255,0.2) inset'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 0 28px rgba(0,230,118,0.4), 0 1px 0 rgba(255,255,255,0.2) inset'; }}
          >
            {loading
              ? (tab === 'signin' ? 'Signing in…' : 'Creating account…')
              : (tab === 'signin' ? '🚀 Launch into Orbit' : '✨ Create Account')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.74rem', color: 'rgba(0,230,118,0.35)', marginTop: 20, marginBottom: 0 }}>
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color: '#00e676', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}>
            {tab === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}
