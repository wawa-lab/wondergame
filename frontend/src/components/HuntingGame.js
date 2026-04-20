/**
 * HuntingGame.js — 古风狩猎场游戏
 * 骑马奔驰，左键/空格弯弓射箭，瞄准奔跑的猎物
 * 画面：秋日猎场，金叶飘落，远山如黛
 */
import React, { useEffect, useRef, useCallback } from 'react';

// 猎物类型
const PREY_TYPES = [
  { name: '兔',  emoji: '🐇', speed: 180, pts: 3,  size: 22, color: '#D97706' },
  { name: '鹿',  emoji: '🦌', speed: 130, pts: 6,  size: 32, color: '#92400E' },
  { name: '狐',  emoji: '🦊', speed: 220, pts: 4,  size: 26, color: '#C2410C' },
  { name: '鸟',  emoji: '🦅', speed: 260, pts: 8,  size: 20, color: '#1D4ED8', flying: true },
  { name: '熊',  emoji: '🐻', speed: 80,  pts: 12, size: 42, color: '#78350F', boss: true },
];

const ARROW_SPEED = 650; // px/s
const HORSE_SPEED = 180; // px/s
const AIM_CHARGE_MAX = 1200; // ms for full power

function makeLeaf() {
  return {
    x: Math.random(),
    y: Math.random() * 0.5,
    vx: -0.04 - Math.random() * 0.06,
    vy: 0.02 + Math.random() * 0.04,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.08,
    r: 4 + Math.random() * 6,
    hue: 25 + Math.random() * 35,
    alpha: 0.6 + Math.random() * 0.4,
  };
}

function makePrey(W, H, type, id) {
  const t = type || PREY_TYPES[Math.floor(Math.random() * (PREY_TYPES.length - 1))];
  const fromRight = Math.random() < 0.5;
  const groundY = H * (0.58 + Math.random() * 0.18);
  return {
    id,
    ...t,
    x: fromRight ? W + t.size : -t.size,
    y: t.flying ? H * (0.2 + Math.random() * 0.25) : groundY,
    dir: fromRight ? -1 : 1,
    alive: true,
    hitAnim: 0,
    wobble: 0,
  };
}

export default function HuntingGame({ addScore, ended, onFinish }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const lastTRef  = useRef(null);

  const shoot = useCallback(() => {
    const s = stateRef.current;
    if (!s || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.width, H = canvas.height;
    const power = Math.min(1, s.aimCharge / AIM_CHARGE_MAX);
    if (power < 0.1) return;
    // Arrow origin: horse bow position
    const ox = s.horse.x + 30;
    const oy = s.horse.y - 20;
    // Direction: toward crosshair
    const dx = s.aim.x - ox;
    const dy = s.aim.y - oy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    s.arrows.push({
      id: s.nextId++,
      x: ox, y: oy,
      vx: (dx / dist) * ARROW_SPEED * (0.6 + power * 0.4),
      vy: (dy / dist) * ARROW_SPEED * (0.6 + power * 0.4),
      alive: true,
    });
    s.aimCharge = 0;
    s.shooting = false;
  }, []);

  useEffect(() => {
    if (ended) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const s = {
      horse: { x: W * 0.15, y: H * 0.72, gallop: 0 },
      aim: { x: W * 0.6, y: H * 0.45 },
      arrows: [],
      prey: [],
      leaves: Array.from({ length: 30 }, makeLeaf),
      particles: [],
      keys: {},
      mouse: { x: W * 0.6, y: H * 0.45, down: false },
      aimCharge: 0,
      shooting: false,
      nextId: 1,
      spawnTimer: 0,
      spawnInterval: 2200,
      score: 0,
      hitTexts: [],
      phase: 0,
      waveCount: 0,
    };
    stateRef.current = s;

    // Initial prey
    for (let i = 0; i < 3; i++) {
      s.prey.push(makePrey(W, H, null, s.nextId++));
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      s.aim.x = (e.clientX - rect.left) * scaleX;
      s.aim.y = (e.clientY - rect.top) * scaleY;
    };
    const onMouseDown = (e) => {
      if (e.button === 0) { s.mouse.down = true; s.shooting = true; }
    };
    const onMouseUp = (e) => {
      if (e.button === 0) { s.mouse.down = false; shoot(); }
    };
    const onKeyDown = (e) => {
      s.keys[e.key] = true;
      if (e.key === ' ') { e.preventDefault(); s.shooting = true; }
    };
    const onKeyUp = (e) => {
      s.keys[e.key] = false;
      if (e.key === ' ') { e.preventDefault(); shoot(); }
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function drawBg(ctx, W, H, phase) {
      // Sky gradient — autumn dusk
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      sky.addColorStop(0, `hsl(${30 + Math.sin(phase) * 5}, 60%, 25%)`);
      sky.addColorStop(0.5, `hsl(${20}, 65%, 38%)`);
      sky.addColorStop(1, `hsl(${40}, 55%, 55%)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.55);

      // Far mountains
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#4A1942';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.5);
      ctx.bezierCurveTo(W * 0.1, H * 0.28, W * 0.25, H * 0.22, W * 0.4, H * 0.32);
      ctx.bezierCurveTo(W * 0.55, H * 0.42, W * 0.65, H * 0.2, W * 0.8, H * 0.3);
      ctx.bezierCurveTo(W * 0.9, H * 0.38, W * 0.95, H * 0.45, W, H * 0.42);
      ctx.lineTo(W, H * 0.5); ctx.closePath(); ctx.fill();

      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.52);
      ctx.bezierCurveTo(W * 0.2, H * 0.35, W * 0.45, H * 0.28, W * 0.6, H * 0.4);
      ctx.bezierCurveTo(W * 0.75, H * 0.5, W * 0.88, H * 0.33, W, H * 0.46);
      ctx.lineTo(W, H * 0.52); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Ground
      const gnd = ctx.createLinearGradient(0, H * 0.52, 0, H);
      gnd.addColorStop(0, '#5D4037');
      gnd.addColorStop(0.3, '#6D4C41');
      gnd.addColorStop(1, '#4E342E');
      ctx.fillStyle = gnd;
      ctx.fillRect(0, H * 0.52, W, H * 0.48);

      // Grass tufts
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let gx = 0; gx < W; gx += 18) {
        const gy = H * 0.52 + Math.sin(gx * 0.07 + phase) * 4;
        ctx.fillStyle = `hsl(${80 + Math.sin(gx * 0.05) * 20}, 45%, ${22 + Math.sin(gx * 0.08) * 5}%)`;
        ctx.fillRect(gx, gy, 3, 8 + Math.sin(gx * 0.11) * 4);
      }
      ctx.restore();

      // Trees (silhouettes)
      for (let tx = 40; tx < W; tx += W / 7) {
        const th = 60 + Math.sin(tx * 0.03) * 20;
        const tgy = H * 0.52;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(tx - 4, tgy - th, 8, th);
        // Crown
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = `hsl(${25 + Math.sin(tx) * 15}, 60%, 30%)`;
        ctx.beginPath();
        ctx.arc(tx, tgy - th, 22 + Math.sin(tx * 0.05) * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawLeaves(ctx, W, H, dt) {
      for (const l of s.leaves) {
        l.x += l.vx * dt * 0.001;
        l.y += l.vy * dt * 0.001;
        l.rot += l.vr;
        if (l.x < -0.1) { l.x = 1.1; l.y = Math.random() * 0.4; }
        ctx.save();
        ctx.globalAlpha = l.alpha * 0.8;
        ctx.translate(l.x * W, l.y * H);
        ctx.rotate(l.rot);
        ctx.fillStyle = `hsl(${l.hue}, 80%, 55%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawHorse(ctx, W, H, dt) {
      const h = s.horse;
      h.gallop += dt * 0.012;
      const bob = Math.sin(h.gallop) * 3;

      // Move horse with keys
      if (s.keys['ArrowLeft']  || s.keys['a'] || s.keys['A']) h.x = Math.max(40, h.x - HORSE_SPEED * dt / 1000);
      if (s.keys['ArrowRight'] || s.keys['d'] || s.keys['D']) h.x = Math.min(W * 0.55, h.x + HORSE_SPEED * dt / 1000);
      if (s.keys['ArrowUp']    || s.keys['w'] || s.keys['W']) h.y = Math.max(H * 0.55, h.y - HORSE_SPEED * dt / 1000);
      if (s.keys['ArrowDown']  || s.keys['s'] || s.keys['S']) h.y = Math.min(H * 0.82, h.y + HORSE_SPEED * dt / 1000);

      ctx.save();
      ctx.translate(h.x, h.y + bob);
      // Horse body
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.ellipse(34, -12, 14, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Mane
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.ellipse(28, -18, 8, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Legs (gallop animation)
      ctx.strokeStyle = '#4E342E';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      const legPhase = Math.sin(h.gallop);
      ctx.beginPath();
      ctx.moveTo(-20, 10);
      ctx.lineTo(-20 + legPhase * 12, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(-5 - legPhase * 12, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(15, 10);
      ctx.lineTo(15 + legPhase * 10, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, 8);
      ctx.lineTo(28 - legPhase * 10, 30);
      ctx.stroke();
      // Rider (simplified)
      ctx.fillStyle = '#B71C1C';
      ctx.beginPath();
      ctx.ellipse(8, -22, 10, 14, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFCCBC';
      ctx.beginPath();
      ctx.arc(14, -34, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawArrows(ctx, dt) {
      for (let i = s.arrows.length - 1; i >= 0; i--) {
        const a = s.arrows[i];
        if (!a.alive) { s.arrows.splice(i, 1); continue; }
        a.x += a.vx * dt / 1000;
        a.y += a.vy * dt / 1000;
        a.vy += 180 * dt / 1000; // gravity
        if (a.x < -50 || a.x > canvasRef.current.width + 50 || a.y > canvasRef.current.height + 50) {
          s.arrows.splice(i, 1); continue;
        }
        // Draw arrow
        const angle = Math.atan2(a.vy, a.vx);
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(angle);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
        // Arrowhead
        ctx.fillStyle = '#607D8B';
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
        // Feather
        ctx.strokeStyle = '#F5F5F5';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-12, -5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-12, 5); ctx.stroke();
        ctx.restore();
      }
    }

    function drawPrey(ctx, dt) {
      for (const p of s.prey) {
        if (!p.alive) {
          p.hitAnim -= dt;
          if (p.hitAnim <= 0) continue;
          ctx.save();
          ctx.globalAlpha = p.hitAnim / 500;
          ctx.font = `${24 + (1 - p.hitAnim / 500) * 20}px serif`;
          ctx.textAlign = 'center';
          ctx.fillText('✨', p.x, p.y);
          ctx.restore();
          continue;
        }
        p.x += p.dir * p.speed * dt / 1000;
        p.wobble += dt * 0.01;
        const bob = p.flying ? Math.sin(p.wobble) * 8 : Math.sin(p.wobble * 1.5) * 3;

        ctx.save();
        ctx.translate(p.x, p.y + bob);
        if (p.dir < 0) ctx.scale(-1, 1);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();

        // Remove if offscreen
        if (p.x < -80 || p.x > canvasRef.current.width + 80) {
          p.alive = false;
        }
      }
    }

    function checkCollisions() {
      for (const a of s.arrows) {
        if (!a.alive) continue;
        for (const p of s.prey) {
          if (!p.alive) continue;
          const dx = a.x - p.x;
          const dy = a.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < p.size * 0.8) {
            a.alive = false;
            p.alive = false;
            p.hitAnim = 500;
            addScore(p.pts);
            s.hitTexts.push({ x: p.x, y: p.y - 20, text: `+${p.pts}`, alpha: 1, vy: -1.5, color: p.boss ? '#FFD700' : '#34D399' });
          }
        }
      }
    }

    function drawAim(ctx) {
      const power = Math.min(1, s.aimCharge / AIM_CHARGE_MAX);
      ctx.save();
      ctx.globalAlpha = 0.7;
      // Crosshair
      ctx.strokeStyle = power > 0.5 ? '#FFD700' : '#fff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s.aim.x - 16, s.aim.y); ctx.lineTo(s.aim.x + 16, s.aim.y);
      ctx.moveTo(s.aim.x, s.aim.y - 16); ctx.lineTo(s.aim.x, s.aim.y + 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(s.aim.x, s.aim.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Power arc
      if (s.shooting && power > 0) {
        ctx.strokeStyle = `hsl(${120 - power * 120}, 90%, 55%)`;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(s.aim.x, s.aim.y, 18, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawHitTexts(ctx, dt) {
      for (let i = s.hitTexts.length - 1; i >= 0; i--) {
        const t = s.hitTexts[i];
        t.y += t.vy; t.alpha -= dt * 0.002;
        if (t.alpha <= 0) { s.hitTexts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }
    }

    function drawHUD(ctx, W, H) {
      // Aim power bar
      if (s.shooting) {
        const power = Math.min(1, s.aimCharge / AIM_CHARGE_MAX);
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(W / 2 - 60, H - 28, 120, 14);
        const barColor = power > 0.7 ? '#EF4444' : power > 0.4 ? '#FBBF24' : '#34D399';
        ctx.fillStyle = barColor;
        ctx.fillRect(W / 2 - 60, H - 28, 120 * power, 14);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(W / 2 - 60, H - 28, 120, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('蓄力', W / 2, H - 17);
        ctx.restore();
      }

      // Controls hint
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('WASD移动 · 鼠标瞄准 · 按住左键蓄力 · 松开射箭', 10, H - 10);
      ctx.restore();
    }

    function loop(ts) {
      if (ended || !stateRef.current) return;
      const dt = lastTRef.current ? ts - lastTRef.current : 16;
      lastTRef.current = ts;
      s.phase += dt * 0.0004;

      // Aim charge
      if (s.shooting) s.aimCharge = Math.min(AIM_CHARGE_MAX, s.aimCharge + dt);

      // Spawn prey
      s.spawnTimer += dt;
      if (s.spawnTimer >= s.spawnInterval) {
        s.spawnTimer = 0;
        s.spawnInterval = Math.max(1200, s.spawnInterval - 30);
        s.prey.push(makePrey(W, H, null, s.nextId++));
        s.waveCount++;
        // Occasional boss
        if (s.waveCount % 8 === 0) {
          s.prey.push(makePrey(W, H, PREY_TYPES[4], s.nextId++));
        }
      }

      checkCollisions();

      drawBg(ctx, W, H, s.phase);
      drawLeaves(ctx, W, H, dt);
      drawPrey(ctx, dt);
      drawArrows(ctx, dt);
      drawHorse(ctx, W, H, dt);
      drawAim(ctx);
      drawHitTexts(ctx, dt);
      drawHUD(ctx, W, H);

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [ended, shoot, onFinish, addScore]);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'crosshair' }}>
      <canvas
        ref={canvasRef}
        width={720}
        height={480}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 16 }}
      />
    </div>
  );
}
