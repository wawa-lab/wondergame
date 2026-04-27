import React, { useEffect, useRef, useState } from 'react';

const W = 860, H = 520;

// ─── helpers ───────────────────────────────────────────────────────────────
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
  ctx.closePath();
}

function randomRange(mn, mx) { return Math.random() * (mx - mn) + mn; }

// ─── draw background ───────────────────────────────────────────────────────
function drawBackground(ctx, W, H, frame) {
  // 1. sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  sky.addColorStop(0, '#87CEEB');
  sky.addColorStop(1, '#E0F4FF');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 2. sun + glow
  const sunX = W - 80, sunY = 60;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  glow.addColorStop(0, 'rgba(255,220,50,0.35)');
  glow.addColorStop(1, 'rgba(255,220,50,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
  ctx.fill();

  // 3. distant mountains — each segs array: [cpx,cpy, ex,ey, ...]
  const mountains = [
    {
      color: '#a8c88a',
      start: [0, H * 0.42],
      segs: [
        [W * 0.18, H * 0.28, W * 0.38, H * 0.38],
        [W * 0.55, H * 0.25, W * 0.72, H * 0.37],
        [W * 0.86, H * 0.30, W,        H * 0.35],
      ],
    },
    {
      color: '#8ab5a0',
      start: [0, H * 0.48],
      segs: [
        [W * 0.12, H * 0.36, W * 0.28, H * 0.44],
        [W * 0.48, H * 0.31, W * 0.65, H * 0.42],
        [W * 0.82, H * 0.33, W,        H * 0.40],
      ],
    },
  ];
  mountains.forEach(({ color, start, segs }) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    segs.forEach(([cpx, cpy, ex, ey]) => ctx.quadraticCurveTo(cpx, cpy, ex, ey));
    ctx.lineTo(W, H * 0.55);
    ctx.lineTo(0, H * 0.55);
    ctx.closePath();
    ctx.fill();
  });

  // 4. ground gradient
  const groundY = H * 0.45;
  const ground = ctx.createLinearGradient(0, groundY, 0, H);
  ground.addColorStop(0, '#5aaa3a');
  ground.addColorStop(1, '#3d8a20');
  ctx.fillStyle = ground;
  ctx.fillRect(0, groundY, W, H - groundY);

  // 5. fence
  const fenceY = groundY - 4;
  ctx.fillStyle = '#8B6914';
  for (let fx = 20; fx < W - 20; fx += 38) {
    ctx.fillRect(fx, fenceY - 28, 7, 32);
  }
  ctx.fillStyle = '#A0782A';
  ctx.fillRect(20, fenceY - 22, W - 40, 5);
  ctx.fillRect(20, fenceY - 10, W - 40, 5);

  // 6. grass tufts
  ctx.strokeStyle = '#2d6e10';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 80; i++) {
    const gx = (i * 127 + 11) % (W - 40) + 20;
    const gy = groundY + (i * 83) % (H - groundY - 20) + 10;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 4, gy - 7);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 4, gy - 7);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy - 9);
    ctx.stroke();
  }

  // 7. flowers
  const flowerColors = ['#FFB7C5', '#FFE066', '#FFFFFF', '#FF9EBC'];
  for (let i = 0; i < 25; i++) {
    const fx = (i * 173 + 37) % (W - 60) + 30;
    const fy = groundY + (i * 97 + 13) % (H - groundY - 30) + 15;
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.beginPath();
    const r = 3 + (i % 3);
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. pond
  ctx.fillStyle = '#A8D8EA';
  ctx.beginPath();
  ctx.ellipse(100, H - 55, 68, 30, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  const shimmerOffset = (frame * 0.3) % 20;
  for (let si = 0; si < 3; si++) {
    ctx.beginPath();
    ctx.moveTo(50 + si * 20 + shimmerOffset, H - 55 + si * 6 - 6);
    ctx.lineTo(70 + si * 20 + shimmerOffset, H - 55 + si * 6 - 6);
    ctx.stroke();
  }

  // 9. oak tree
  const tx = W - 90, ty = H - 50;
  ctx.fillStyle = '#5C3317';
  ctx.fillRect(tx - 8, ty - 80, 16, 85);
  const canopyColors = ['#2d5a27', '#3a7a32', '#4a9940'];
  [[tx, ty - 105, 38], [tx - 25, ty - 85, 32], [tx + 22, ty - 85, 32]].forEach(([cx, cy, cr], idx) => {
    ctx.fillStyle = canopyColors[idx];
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ─── draw sheep ────────────────────────────────────────────────────────────
function drawSheep(ctx, sheep, isNear) {
  const { x, y, wool, hunger, facing, dying, starvation } = sheep;

  // fade-out when dying
  const alpha = dying > 0 ? dying / 90 : 1;
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  // 饥饿缩放：hunger越高体型越小（0.72~1.0）
  const hungerScale = 1 - (hunger / 100) * 0.28;
  // 羊毛膨胀：wool越高毛绒越大（1.0~1.55）
  const woolPuff = 1 + (wool / 100) * 0.55;

  ctx.save();
  ctx.translate(x, y);
  if (facing === -1) ctx.scale(-1, 1);
  ctx.scale(hungerScale, hungerScale);

  // glow when near
  if (isNear) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(255,220,50,0.65)';
  }

  // 羊毛颜色：刚剪完偏米粉，长满后纯白
  const woolColor = wool < 25 ? '#E8C8A8' : '#F5F5F0';
  const woolTex   = wool < 25 ? '#DDB898' : '#EEEEEA';

  // 绒毛圆半径随 woolPuff 膨胀
  const fluffR = 9 * woolPuff;
  // 主体椭圆也随毛量膨胀
  const bodyRx = 22 * woolPuff, bodyRy = 16 * woolPuff;

  // wool body ellipse
  ctx.fillStyle = woolColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // fluffy texture circles
  ctx.fillStyle = woolTex;
  const fluffPts = [
    [-12, -8], [0, -13], [12, -8],
    [-14, 2],  [14, 2],  [0, 10],
  ];
  fluffPts.forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.arc(ox * woolPuff, oy * woolPuff, fluffR, 0, Math.PI * 2);
    ctx.fill();
  });

  // re-draw body core on top to mask edge fluff
  ctx.fillStyle = woolColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx * 0.88, bodyRy * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // head（不随毛量缩放，保持正常大小）
  const headOff = bodyRx + 2;
  ctx.fillStyle = '#E8DCC8';
  ctx.beginPath();
  ctx.arc(headOff, -2, 10, 0, Math.PI * 2);
  ctx.fill();

  // ears
  ctx.fillStyle = '#D4C0A0';
  ctx.beginPath();
  ctx.ellipse(headOff - 2, -12, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headOff + 7, -10, 4, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(headOff + 2, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headOff + 7, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // pink nose
  ctx.fillStyle = '#FF9BAE';
  ctx.beginPath();
  ctx.arc(headOff + 5, 1, 2, 0, Math.PI * 2);
  ctx.fill();

  // legs（腿长随饥饿缩放自然跟随）
  ctx.fillStyle = '#C8B89A';
  [[-10, bodyRy], [-3, bodyRy + 2], [3, bodyRy + 2], [10, bodyRy]].forEach(([lx, ly]) => {
    ctx.fillRect(lx - 2, ly, 4, 10);
  });

  // tail
  ctx.fillStyle = woolColor;
  ctx.beginPath();
  ctx.arc(-bodyRx - 2, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ── hunger / starvation bubble
  if (hunger >= 100 && starvation > 0) {
    // starvation warning — flashes red
    const flash = Math.floor(starvation / 20) % 2 === 0;
    ctx.save();
    ctx.fillStyle = flash ? 'rgba(220,30,30,0.92)' : 'rgba(255,80,80,0.85)';
    roundRect(ctx, x - 28, y - 48, 56, 20, 6);
    ctx.fill();
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    const pct = Math.min(100, Math.round((starvation / 1200) * 100));
    ctx.fillText(`⚠️ 快饿死 ${pct}%`, x, y - 38);
    ctx.restore();
  } else if (hunger > 60) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, x - 20, y - 44, 40, 18, 6);
    ctx.fill();
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#555';
    ctx.fillText('🌿 饿', x, y - 35);
    ctx.restore();
  }

  // ── state bars（世界空间，不受缩放影响）
  const barW = 40;
  const bx = x - barW / 2;
  const by = y + 32 + (wool > 70 ? 8 : 0); // 毛多时往下移避免遮挡
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, bx, by, barW, 5, 2);
  ctx.fill();
  ctx.fillStyle = '#FFD700';
  roundRect(ctx, bx, by, barW * (wool / 100), 5, 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, bx, by + 7, barW, 5, 2);
  ctx.fill();
  // hunger bar turns red when near starvation
  ctx.fillStyle = starvation > 600 ? '#FF4444' : '#5CDB5C';
  roundRect(ctx, bx, by + 7, barW * (hunger / 100), 5, 2);
  ctx.fill();

  ctx.font = '9px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✂', bx - 10, by + 2);
  ctx.fillText('🌿', bx - 10, by + 9);

  ctx.globalAlpha = 1;
}

// ─── draw player ───────────────────────────────────────────────────────────
function drawPlayer(ctx, player, showTool) {
  const { x, y, facing } = player;

  ctx.save();
  if (facing === -1) {
    ctx.translate(x * 2, 0);
    ctx.scale(-1, 1);
  }

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = '#5C3317';
  ctx.fillRect(x - 6, y + 6, 5, 11);
  ctx.fillRect(x + 1, y + 6, 5, 11);

  // body
  ctx.fillStyle = '#8B4513';
  roundRect(ctx, x - 8, y - 8, 16, 16, 3);
  ctx.fill();

  // arms
  ctx.fillStyle = '#7A3B10';
  ctx.fillRect(x - 14, y - 6, 7, 5);
  ctx.fillRect(x + 7,  y - 6, 7, 5);

  // head
  ctx.fillStyle = '#FDBCB4';
  ctx.beginPath();
  ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(x - 3, y - 17, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 3, y - 17, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - 14, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // straw hat brim
  ctx.fillStyle = '#D4A017';
  ctx.beginPath();
  ctx.ellipse(x, y - 24, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // hat crown
  ctx.fillStyle = '#C49010';
  ctx.fillRect(x - 7, y - 32, 14, 10);
  // hat band
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x - 7, y - 28, 14, 3);

  // tool (scissors or hay)
  if (showTool === 'shear') {
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 10);
    ctx.lineTo(x + 18, y - 2);
    ctx.moveTo(x + 18, y - 10);
    ctx.lineTo(x + 10, y - 2);
    ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 14, y - 6, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (showTool === 'feed') {
    ctx.fillStyle = '#7CB97C';
    ctx.fillRect(x + 8, y - 12, 3, 10);
    ctx.fillRect(x + 13, y - 14, 3, 12);
    ctx.fillRect(x + 18, y - 10, 3, 8);
  }

  ctx.restore();
}

// ─── draw HUD ──────────────────────────────────────────────────────────────
function drawHUD(ctx, score, timeLeft, hint, cooldownPct) {

  // bottom dark panel
  ctx.fillStyle = 'rgba(20,20,20,0.72)';
  roundRect(ctx, 0, H - 52, W, 52, 0);
  ctx.fill();

  // score (left)
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('🐑 ' + score, 18, H - 26);

  // time (center)
  ctx.textAlign = 'center';
  ctx.fillStyle = timeLeft <= 8 ? '#FF4444' : '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('⏱ ' + timeLeft + 's', W / 2, H - 26);

  // hint (right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FDE68A';
  ctx.font = '13px Arial';
  ctx.fillText(hint, W - 18, H - 26);

  // action cooldown indicator (small bar top-right of HUD)
  if (cooldownPct > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, W - 90, H - 50, 72, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#FFB347';
    roundRect(ctx, W - 90, H - 50, 72 * (1 - cooldownPct), 6, 3);
    ctx.fill();
  }
}

// ─── draw particles ────────────────────────────────────────────────────────
function drawParticles(ctx, particles) {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ─── draw floating effects ─────────────────────────────────────────────────
function drawEffects(ctx, effects) {
  effects.forEach((ef) => {
    ctx.globalAlpha = ef.life;
    ctx.fillStyle = ef.color;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ef.text, ef.x, ef.y);
  });
  ctx.globalAlpha = 1;
}

// ─── draw end screen ───────────────────────────────────────────────────────
function drawEndScreen(ctx, score, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 46px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('🎉 牧场收工！', W / 2, H / 2 - 60);

  ctx.font = 'bold 38px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('得分: ' + score, W / 2, H / 2 + 0);

  let grade = '继续努力';
  if (score >= 80) grade = '优秀牧羊人 🏆';
  else if (score >= 50) grade = '称职农夫 ✅';
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText(grade, W / 2, H / 2 + 52);

  ctx.font = '16px Arial';
  ctx.fillStyle = 'rgba(245,230,236,0.7)';
  ctx.fillText('正在结算劳动收获...', W / 2, H / 2 + 96);
}

// ─── main component ────────────────────────────────────────────────────────
function RanchGame({ onComplete, onExit }) {
  const canvasRef = useRef(null);
  const keysRef   = useRef({});
  const gameRef   = useRef(null);

  const [score,     setScore]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(30);
  const [gameState, setGameState] = useState('playing');

  // initialise game state once
  if (!gameRef.current) {
    const sheep = [];
    const placed = [];
    for (let i = 0; i < 8; i++) {
      let sx, sy, tries = 0;
      do {
        sx = randomRange(80, W - 100);
        sy = randomRange(H * 0.5, H - 80);
        tries++;
      } while (tries < 50 && placed.some(p => Math.hypot(p.x - sx, p.y - sy) < 70));
      placed.push({ x: sx, y: sy });
      sheep.push({
        id: i,
        x: sx, y: sy,
        vx: randomRange(-0.6, 0.6),
        vy: randomRange(-0.4, 0.4),
        wool:   randomRange(20, 90),
        hunger: randomRange(10, 70),
        facing: 1,
        shearCooldown: 0,  // frames until shearing is allowed again
        feedCooldown:  0,  // frames until feeding is allowed again
        starvation: 0,     // frames spent at hunger=100; die after threshold
        dying: 0,          // fade-out counter (>0 = dying animation)
      });
    }
    gameRef.current = {
      score: 0,
      player: { x: 200, y: H * 0.7, vx: 0, vy: 0, facing: 1 },
      sheep,
      particles: [],
      effects: [],
      actionCooldown: 0,
      frame: 0,
      hint: 'WASD移动 J剪毛 K喂草',
    };
  }

  // ── game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width  = W;
    canvas.height = H;

    const g = gameRef.current;

    const spawnParticles = (x, y, type) => {
      const count = type === 'shear' ? 10 : 8;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(1, 3.5);
        g.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          r: randomRange(3, 7),
          color: type === 'shear' ? (Math.random() > 0.5 ? '#FFFFFF' : '#EEE8D5') : '#7CDB7C',
          life: 40,
          maxLife: 40,
        });
      }
    };

    const addEffect = (x, y, text, color) => {
      g.effects.push({ x, y, text, color, life: 1 });
    };

    const nearestSheep = (radius) => {
      const { player, sheep } = g;
      let best = null, bestDist = Infinity;
      sheep.forEach(s => {
        const d = Math.hypot(player.x - s.x, player.y - s.y);
        if (d < bestDist) { bestDist = d; best = s; }
      });
      return bestDist <= radius ? best : null;
    };

    // ~15s at 60fps before the same sheep can be sheared/fed again
    const SHEAR_CD = 900;
    const FEED_CD  = 720;

    const doShear = (target) => {
      if (!target) { addEffect(g.player.x, g.player.y - 40, '离羊太远', '#aaa'); return; }
      if (target.shearCooldown > 0) {
        addEffect(target.x, target.y - 30, '刚剪过了', '#aaa'); return;
      }
      if (target.wool >= 60) {
        target.wool = 10;
        target.shearCooldown = SHEAR_CD;
        g.score = clamp(g.score + 8, 0, 100);
        setScore(g.score);
        spawnParticles(target.x, target.y, 'shear');
        addEffect(target.x, target.y - 30, '+8 剪羊毛✂️', '#FFD700');
        g.actionCooldown = 48;
      } else {
        addEffect(target.x, target.y - 30, '羊毛未长好', '#aaa');
      }
    };

    const doFeed = (target) => {
      if (!target) { addEffect(g.player.x, g.player.y - 40, '离羊太远', '#aaa'); return; }
      if (target.feedCooldown > 0) {
        addEffect(target.x, target.y - 30, '刚喂过了', '#aaa'); return;
      }
      if (target.hunger >= 50) {
        target.hunger = Math.max(0, target.hunger - 45);
        target.feedCooldown = FEED_CD;
        g.score = clamp(g.score + 5, 0, 100);
        setScore(g.score);
        spawnParticles(target.x, target.y, 'feed');
        addEffect(target.x, target.y - 30, '+5 喂草🌿', '#5CDB5C');
        g.actionCooldown = 48;
      } else {
        addEffect(target.x, target.y - 30, '不饿', '#aaa');
      }
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      const nav = ['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','j','k'];
      if (nav.includes(key)) e.preventDefault();
      if (gameRef.current._ended) return;
      if (g.actionCooldown > 0) return;
      if (key === 'j') doShear(nearestSheep(70));
      if (key === 'k') doFeed(nearestSheep(70));
    };
    const onKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup',   onKeyUp);

    let rafId;
    const loop = () => {
      const k = keysRef.current;
      const p = g.player;

      // player movement with smooth velocity
      const accel = 1.0, friction = 0.82, speed = 7;
      if (k.arrowleft  || k.a) p.vx -= accel;
      if (k.arrowright || k.d) p.vx += accel;
      if (k.arrowup    || k.w) p.vy -= accel;
      if (k.arrowdown  || k.s) p.vy += accel;
      p.vx *= friction;
      p.vy *= friction;
      p.vx = clamp(p.vx, -speed, speed);
      p.vy = clamp(p.vy, -speed, speed);
      p.x += p.vx;
      p.y += p.vy;
      p.x = clamp(p.x, 20, W - 20);
      p.y = clamp(p.y, H * 0.47, H - 30);
      if (Math.abs(p.vx) > 0.2) p.facing = p.vx < 0 ? -1 : 1;

      // sheep wander + starvation
      // ~20s at hunger=100 before death (20*60=1200 frames); 90-frame fade-out
      const STARVE_LIMIT = 1200;
      const DYING_FRAMES = 90;
      g.sheep.forEach(s => {
        if (s.dying > 0) { s.dying--; return; }  // frozen while fading out
        if (Math.random() < 0.008) {
          s.vx = randomRange(-0.8, 0.8);
          s.vy = randomRange(-0.5, 0.5);
        }
        s.x += s.vx;
        s.y += s.vy;
        s.x = clamp(s.x, 50, W - 120);
        s.y = clamp(s.y, H * 0.5, H - 70);
        if (s.x <= 50 || s.x >= W - 120) s.vx *= -1;
        if (s.y <= H * 0.5 || s.y >= H - 70) s.vy *= -1;
        if (Math.abs(s.vx) > 0.1) s.facing = s.vx < 0 ? -1 : 1;
        // slower growth to suit 90s game — wool ready ~every 25s, hunger every 30s
        s.wool   = Math.min(100, s.wool   + 0.022);
        s.hunger = Math.min(100, s.hunger + 0.018);
        if (s.shearCooldown > 0) s.shearCooldown--;
        if (s.feedCooldown  > 0) s.feedCooldown--;
        // starvation counter
        if (s.hunger >= 100) {
          s.starvation++;
          if (s.starvation >= STARVE_LIMIT && s.dying === 0) {
            s.dying = DYING_FRAMES;
            addEffect(s.x, s.y - 40, '💀 饿死了', '#FF4444');
          }
        } else {
          s.starvation = 0;
        }
      });
      // remove fully faded sheep
      g.sheep = g.sheep.filter(s => s.dying !== 1);

      // update particles
      g.particles = g.particles.filter(p => p.life > 0);
      g.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
      });

      // update effects
      g.effects = g.effects.filter(ef => ef.life > 0);
      g.effects.forEach(ef => { ef.y -= 0.5; ef.life -= 0.018; });

      if (g.actionCooldown > 0) g.actionCooldown--;

      // hint text
      const near = nearestSheep(70);
      if (near) {
        if (near.wool >= 60 && near.shearCooldown === 0) g.hint = 'J 剪羊毛 ✂️  (毛够了!)';
        else if (near.hunger >= 50 && near.feedCooldown === 0) g.hint = 'K 喂草 🌿 (羊饿了!)';
        else if (near.shearCooldown > 0 || near.feedCooldown > 0) g.hint = '此羊刚操作过，换一只';
        else g.hint = '等待羊毛生长或变饿';
      } else {
        g.hint = 'WASD移动 接近羊群';
      }

      // ── draw ──
      drawBackground(ctx, W, H, g.frame);

      const nearestForGlow = nearestSheep(70);
      g.sheep.forEach(s => drawSheep(ctx, s, s === nearestForGlow));

      // player tool hint
      let tool = null;
      if (near && near.wool >= 60) tool = 'shear';
      else if (near && near.hunger >= 50) tool = 'feed';
      drawPlayer(ctx, p, tool);

      drawParticles(ctx, g.particles);
      drawEffects(ctx, g.effects);

      const cdPct = g.actionCooldown / 48;
      drawHUD(ctx, g.score, gameRef.current._timeLeft ?? 90, g.hint, cdPct);

      if (gameRef.current._ended) {
        drawEndScreen(ctx, g.score, W, H);
      }

      g.frame++;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (gameRef.current) gameRef.current._timeLeft = next;
        if (next <= 0) {
          clearInterval(timer);
          if (gameRef.current) gameRef.current._ended = true;
          setGameState('ended');
          setTimeout(() => onComplete?.(gameRef.current?.score ?? 0), 2000);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #1a0a0f 0%, #2d1520 50%, #1a0a0f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          fontSize: '22px',
          fontWeight: '800',
          color: '#C9A84C',
          letterSpacing: '2px',
        }}
      >
        ✂️ 牧场剪羊毛
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          maxWidth: '900px',
          height: 'auto',
          borderRadius: '20px',
          border: '3px solid rgba(201,168,76,0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          cursor: 'default',
        }}
      />

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div
          style={{
            color: 'rgba(245,230,236,0.7)',
            fontSize: '13px',
            textAlign: 'center',
            lineHeight: 1.8,
          }}
        >
          WASD / 方向键 移动 &nbsp;|&nbsp; J 剪羊毛 &nbsp;|&nbsp; K 喂草
        </div>
        <button
          onClick={() => onExit?.()}
          style={{
            padding: '6px 18px',
            background: 'rgba(80,30,30,0.85)',
            border: '1.5px solid rgba(201,168,76,0.5)',
            borderRadius: '8px',
            color: '#F5E6EC',
            fontSize: '13px',
            cursor: 'pointer',
            letterSpacing: '1px',
          }}
        >
          退出
        </button>
      </div>
    </div>
  );
}

export default RanchGame;
