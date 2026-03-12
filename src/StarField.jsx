import { useEffect, useRef } from 'react';

/**
 * Animated star-field canvas with 3 parallax depth layers
 * + floating particle orbs (antigravity simulation)
 */
export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let W, H;

    // ── Stars: 3 depth layers ──────────────
    const LAYER_COUNT = [120, 60, 30]; // near, mid, far
    const layers = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      initStars();
    }

    function initStars() {
      layers.length = 0;
      LAYER_COUNT.forEach((count, depth) => {
        const stars = [];
        for (let i = 0; i < count; i++) {
          stars.push({
            x:     Math.random() * W,
            y:     Math.random() * H,
            r:     0.3 + Math.random() * (depth === 0 ? 1.2 : depth === 1 ? 0.8 : 0.5),
            alpha: 0.3 + Math.random() * 0.7,
            twinkleSpeed: 0.005 + Math.random() * 0.01,
            twinklePhase: Math.random() * Math.PI * 2,
          });
        }
        layers.push({ stars, speed: (3 - depth) * 0.008 });
      });
    }

    // ── Orbs: floating antigravity particles ──
    const MAX_ORBS = 12;
    const orbs = [];

    function spawnOrb() {
      const hues = [270, 200, 300, 180]; // plasma, ion, stellar, cyan
      const hue = hues[Math.floor(Math.random() * hues.length)];
      orbs.push({
        x:    Math.random() * W,
        y:    H + 20,
        r:    4 + Math.random() * 12,
        vx:   (Math.random() - 0.5) * 0.4,
        vy:   -(0.3 + Math.random() * 0.6),
        alpha: 0.3 + Math.random() * 0.4,
        hue,
        life: 0,
        maxLife: 600 + Math.random() * 400,
        wobbleAmp:  0.5 + Math.random(),
        wobbleFreq: 0.01 + Math.random() * 0.02,
      });
    }

    // ── Draw ──────────────────────────────────
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw stars per layer with parallax (mouse-free, just drift)
      layers.forEach((layer, depth) => {
        layer.stars.forEach(s => {
          // Slight vertical drift
          s.y -= layer.speed;
          if (s.y < -2) s.y = H + 2;

          s.twinklePhase += s.twinkleSpeed;
          const tAlpha = s.alpha * (0.6 + 0.4 * Math.sin(s.twinklePhase));

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240, 234, 255, ${tAlpha})`;
          ctx.fill();
        });
      });

      // Spawn orbs occasionally
      if (frame % 90 === 0 && orbs.length < MAX_ORBS) spawnOrb();

      // Draw orbs
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.life++;
        if (o.life > o.maxLife) { orbs.splice(i, 1); continue; }

        o.x += o.vx + Math.sin(frame * o.wobbleFreq + i) * o.wobbleAmp * 0.02;
        o.y += o.vy;

        const fadeOut = 1 - o.life / o.maxLife;
        const fadeIn  = Math.min(o.life / 60, 1);
        const a = o.alpha * fadeIn * fadeOut;

        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2.5);
        grad.addColorStop(0,   `hsla(${o.hue}, 100%, 70%, ${a})`);
        grad.addColorStop(0.4, `hsla(${o.hue}, 80%,  60%, ${a * 0.5})`);
        grad.addColorStop(1,   `hsla(${o.hue}, 70%,  50%, 0)`);

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="starfield-canvas"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
