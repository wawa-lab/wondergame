import React, { useEffect, useRef, useCallback } from 'react';

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
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

const W = 620, H = 420;
const GAME_DURATION = 30;

// 得分上限100分。30秒内理论最高：
//   鱼叉捕鱼：约每4秒1条 × 7次 = 7×5 = 35分
//   抄网捞虾：约每5秒1网3只 × 5次 = 15×3×2(大丰收)×5 = 但上限钳制
//   锦鲤：+15分（稀有）
// 分值设计：青鱼+5，虾+4，锦鲤+15，连击/大丰收加成，总分 Math.min(100, score)

function spawnFish(id) {
  const side = Math.floor(Math.random() * 4);
  let x, y, vx, vy;
  const speed = 1.2 + Math.random() * 0.8;
  if (side === 0) { x = Math.random() * W; y = 30; vx = (Math.random() - 0.5) * 2; vy = speed; }
  else if (side === 1) { x = W - 30; y = Math.random() * H; vx = -speed; vy = (Math.random() - 0.5) * 2; }
  else if (side === 2) { x = Math.random() * W; y = H - 30; vx = (Math.random() - 0.5) * 2; vy = -speed; }
  else { x = 30; y = Math.random() * H; vx = speed; vy = (Math.random() - 0.5) * 2; }
  return { id, type: 'fish', x, y, vx, vy, baseVx: vx, baseVy: vy, swimPhase: Math.random() * Math.PI * 2, color: `hsl(${25 + Math.random() * 20},90%,55%)`, alive: true, fleeing: false };
}

function spawnShrimp(id) {
  return {
    id, type: 'shrimp',
    x: 60 + Math.random() * (W - 120),
    y: 60 + Math.random() * (H - 120),
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    dirTimer: 30 + Math.random() * 30,
    alpha: 0.7 + Math.random() * 0.3,
    alive: true,
  };
}

function spawnKoi(id) {
  return {
    id, type: 'koi',
    x: 80 + Math.random() * (W - 160),
    y: 80 + Math.random() * (H - 160),
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    dirTimer: 20 + Math.random() * 20,
    shimmer: 0,
    alive: true,
  };
}

function spawnPuffer(id) {
  return {
    id, type: 'puffer',
    x: 80 + Math.random() * (W - 160),
    y: 80 + Math.random() * (H - 160),
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    spineAngle: 0,
    alive: true,
  };
}


function initState() {
  const entities = [];
  let id = 0;
  for (let i = 0; i < 5; i++) entities.push(spawnFish(id++));
  for (let i = 0; i < 4; i++) entities.push(spawnShrimp(id++));
  entities.push(spawnKoi(id++));
  entities.push(spawnPuffer(id++));

  const corals = [];
  const coralColors = ['#ff6b6b','#ff9f43','#f368e0','#00d2d3','#54a0ff','#5f27cd','#ff9ff3'];
  for (let i = 0; i < 18; i++) {
    corals.push({
      x: Math.random() < 0.5 ? (Math.random() * 60) : (W - Math.random() * 60),
      y: 20 + Math.random() * (H - 40),
      r: 8 + Math.random() * 14,
      color: coralColors[Math.floor(Math.random() * coralColors.length)],
      type: Math.random() < 0.5 ? 'circle' : 'ellipse',
      rx: 6 + Math.random() * 10,
      ry: 10 + Math.random() * 18,
    });
    corals.push({
      x: 20 + Math.random() * (W - 40),
      y: Math.random() < 0.5 ? (Math.random() * 60) : (H - Math.random() * 60),
      r: 8 + Math.random() * 14,
      color: coralColors[Math.floor(Math.random() * coralColors.length)],
      type: Math.random() < 0.5 ? 'circle' : 'ellipse',
      rx: 6 + Math.random() * 10,
      ry: 10 + Math.random() * 18,
    });
  }

  const lilyPads = [];
  for (let i = 0; i < 7; i++) {
    lilyPads.push({
      x: 80 + Math.random() * (W - 160),
      y: 60 + Math.random() * (H - 120),
      r: 18 + Math.random() * 14,
      angle: Math.random() * Math.PI * 2,
    });
  }

  return {
    frame: 0,
    timeLeft: GAME_DURATION,
    lastTime: null,
    score: 0,
    entities,
    nextId: id,
    particles: [],
    wakeParticles: [],
    boat: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: 0 },
    harpoon: null,
    qte: null,
    net: null,
    stun: 0,
    stamina: 100,
    combo: 0,
    comboTimer: 0,
    frenzy: 0,
    flashRed: 0,
    flashGold: 0,
    bigCatch: 0,
    corals,
    lilyPads,
    spawnTimer: 120,
    koiAlive: true,
    finished: false,
  };
}


function updateEntities(s, keys, mouse) {
  const boat = s.boat;

  // Boat movement
  if (s.stun <= 0) {
    const accel = 0.35;
    if (keys['w'] || keys['ArrowUp']) boat.vy -= accel;
    if (keys['s'] || keys['ArrowDown']) boat.vy += accel;
    if (keys['a'] || keys['ArrowLeft']) boat.vx -= accel;
    if (keys['d'] || keys['ArrowRight']) boat.vx += accel;
  }
  boat.vx *= 0.88;
  boat.vy *= 0.88;
  boat.x = clamp(boat.x + boat.vx, 20, W - 20);
  boat.y = clamp(boat.y + boat.vy, 20, H - 20);
  const boatSpeed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
  if (boatSpeed > 0.1) boat.angle = Math.atan2(boat.vy, boat.vx);

  // Wake particles
  if (boatSpeed > 0.5 && s.frame % 4 === 0) {
    s.wakeParticles.push({
      x: boat.x - Math.cos(boat.angle) * 12,
      y: boat.y - Math.sin(boat.angle) * 12,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      life: 30, maxLife: 30, r: 3 + Math.random() * 3,
    });
  }
  s.wakeParticles = s.wakeParticles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--;
    return p.life > 0;
  });

  // Update entities
  s.entities.forEach(e => {
    if (!e.alive) return;
    const dx = e.x - boat.x;
    const dy = e.y - boat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (e.type === 'fish') {
      e.swimPhase += 0.08;
      const perpX = -e.vy;
      const perpY = e.vx;
      const plen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      const swayAmt = Math.sin(e.swimPhase) * 0.6;
      e.fleeing = dist < 80 || boatSpeed > 2;
      const speedMult = e.fleeing ? 2.2 : 1;
      let tvx = e.baseVx * speedMult + (perpX / plen) * swayAmt;
      let tvy = e.baseVy * speedMult + (perpY / plen) * swayAmt;
      if (e.fleeing) {
        const fleeNorm = dist > 0.1 ? dist : 1;
        tvx += (dx / fleeNorm) * 3;
        tvy += (dy / fleeNorm) * 3;
      }
      e.vx = e.vx * 0.85 + tvx * 0.15;
      e.vy = e.vy * 0.85 + tvy * 0.15;
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < 15) { e.x = 15; e.vx = Math.abs(e.vx); e.baseVx = Math.abs(e.baseVx); }
      if (e.x > W - 15) { e.x = W - 15; e.vx = -Math.abs(e.vx); e.baseVx = -Math.abs(e.baseVx); }
      if (e.y < 15) { e.y = 15; e.vy = Math.abs(e.vy); e.baseVy = Math.abs(e.baseVy); }
      if (e.y > H - 15) { e.y = H - 15; e.vy = -Math.abs(e.vy); e.baseVy = -Math.abs(e.baseVy); }
    } else if (e.type === 'shrimp') {
      e.dirTimer--;
      if (e.dirTimer <= 0) {
        e.dirTimer = 30 + Math.random() * 30;
        const ang = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 1.5;
        e.vx = Math.cos(ang) * spd;
        e.vy = Math.sin(ang) * spd;
      }
      e.x += e.vx; e.y += e.vy;
      if (e.x < 20 || e.x > W - 20) e.vx *= -1;
      if (e.y < 20 || e.y > H - 20) e.vy *= -1;
      e.x = clamp(e.x, 20, W - 20);
      e.y = clamp(e.y, 20, H - 20);
    } else if (e.type === 'koi') {
      e.dirTimer--;
      e.shimmer = (e.shimmer + 0.1) % (Math.PI * 2);
      if (e.dirTimer <= 0) {
        e.dirTimer = 15 + Math.random() * 25;
        const ang = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 2;
        e.vx = Math.cos(ang) * spd;
        e.vy = Math.sin(ang) * spd;
      }
      e.x += e.vx; e.y += e.vy;
      if (e.x < 20 || e.x > W - 20) { e.vx *= -1; e.x = clamp(e.x, 20, W - 20); }
      if (e.y < 20 || e.y > H - 20) { e.vy *= -1; e.y = clamp(e.y, 20, H - 20); }
    } else if (e.type === 'puffer') {
      e.spineAngle += 0.02;
      e.x += e.vx; e.y += e.vy;
      if (e.x < 25 || e.x > W - 25) { e.vx *= -1; e.x = clamp(e.x, 25, W - 25); }
      if (e.y < 25 || e.y > H - 25) { e.vy *= -1; e.y = clamp(e.y, 25, H - 25); }
    }
  });
}


function updateHarpoon(s, addScore) {
  if (!s.harpoon) return;
  const h = s.harpoon;

  if (h.phase === 'flying') {
    h.x += h.vx;
    h.y += h.vy;
    h.trail = h.trail || [];
    h.trail.push({ x: h.x, y: h.y });
    if (h.trail.length > 8) h.trail.shift();

    let hit = null;
    for (const e of s.entities) {
      if (!e.alive) continue;
      if (e.type !== 'fish' && e.type !== 'koi') continue;
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) { hit = e; break; }
    }
    if (hit) {
      h.phase = 'qte';
      h.target = hit;
      h.qteClicks = 0;
      h.qteTimer = 120;
      hit.qteWiggle = 0;
    } else if (h.x < 0 || h.x > W || h.y < 0 || h.y > H) {
      s.harpoon = null;
      s.stamina = Math.max(0, s.stamina - 5);
    }
  } else if (h.phase === 'qte') {
    h.qteTimer--;
    if (h.target && h.target.alive) {
      h.target.qteWiggle = Math.sin(s.frame * 0.4) * 8;
    }
    if (h.qteTimer <= 0) {
      // fail - fish escapes
      if (h.target) { h.target.qteWiggle = 0; }
      s.harpoon = null;
      s.combo = 0;
    }
  }
}

function updateNet(s, addScore) {
  if (!s.net) return;
  const n = s.net;
  if (n.phase === 'charging') {
    const elapsed = (Date.now() - n.startTime) / 1500;
    n.radius = Math.min(100, elapsed * 100);
  } else if (n.phase === 'released') {
    // capture was handled on release
    s.net = null;
  }
}

function updateParticles(s) {
  s.particles = s.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    p.r *= 0.96;
    return p.life > 0;
  });
}

function spawnParticles(s, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    s.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 1,
      life: 30 + Math.random() * 20,
      r: 3 + Math.random() * 4,
      color,
    });
  }
}

function handleSpawning(s) {
  s.spawnTimer--;
  if (s.spawnTimer <= 0) {
    s.spawnTimer = 80 + Math.random() * 80;
    const fishCount = s.entities.filter(e => e.alive && e.type === 'fish').length;
    const shrimpCount = s.entities.filter(e => e.alive && e.type === 'shrimp').length;
    const koiCount = s.entities.filter(e => e.alive && e.type === 'koi').length;
    const pufferCount = s.entities.filter(e => e.alive && e.type === 'puffer').length;

    if (fishCount < 6) s.entities.push(spawnFish(s.nextId++));
    else if (shrimpCount < 5) s.entities.push(spawnShrimp(s.nextId++));
    else if (koiCount < 1) { s.entities.push(spawnKoi(s.nextId++)); s.koiAlive = true; }
    else if (pufferCount < 2) s.entities.push(spawnPuffer(s.nextId++));
  }
  // Prune dead entities
  s.entities = s.entities.filter(e => e.alive);
}


// ========== DRAWING FUNCTIONS ==========

function drawWater(ctx, frame) {
  // Base water gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a4a8a');
  grad.addColorStop(0.5, '#0d6e9e');
  grad.addColorStop(1, '#0a3d6b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Caustic light patterns
  ctx.save();
  for (let gx = 0; gx < W; gx += 38) {
    for (let gy = 0; gy < H; gy += 38) {
      const t = frame * 0.018;
      const ox = Math.sin(t + gx * 0.05) * 6;
      const oy = Math.cos(t * 0.7 + gy * 0.05) * 6;
      const alpha = 0.04 + Math.abs(Math.sin(t + gx * 0.03 + gy * 0.04)) * 0.06;
      ctx.beginPath();
      ctx.arc(gx + ox, gy + oy, 10 + Math.sin(t + gx * 0.1) * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,200,255,${alpha})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCorals(ctx, corals) {
  corals.forEach(c => {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = c.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    if (c.type === 'circle') {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // small bumps
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * c.r * 0.7, c.y + Math.sin(a) * c.r * 0.7, c.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawLilyPads(ctx, lilyPads, frame) {
  lilyPads.forEach(lp => {
    ctx.save();
    ctx.translate(lp.x, lp.y);
    ctx.rotate(lp.angle + Math.sin(frame * 0.01 + lp.x) * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, lp.r, 0.2, Math.PI * 2 - 0.2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34,120,50,0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,80,30,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Lotus flower (5 petals)
    const fx = lp.r * 0.1, fy = -lp.r * 0.15;
    const pr = lp.r * 0.22;
    for (let pi = 0; pi < 5; pi++) {
      const pa = (pi / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(pa) * pr * 0.6, fy + Math.sin(pa) * pr * 0.6, pr * 0.55, pr * 0.35, pa, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${180 + pi * 10},${200 + pi * 8},0.92)`;
      ctx.fill();
    }
    // Center stamen
    ctx.beginPath();
    ctx.arc(fx, fy, pr * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,230,80,0.95)';
    ctx.fill();
    ctx.restore();
  });
}

function drawBoat(ctx, boat, frame) {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.angle + Math.PI / 2);
  // Hull shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  // Hull
  ctx.fillStyle = '#8B4513';
  roundRect(ctx, -14, -22, 28, 44, 8);
  ctx.fill();
  // Hull detail
  ctx.fillStyle = '#a0522d';
  roundRect(ctx, -11, -18, 22, 32, 6);
  ctx.fill();
  // Cabin
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5c3317';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,230,255,0.6)';
  ctx.beginPath();
  ctx.arc(-2, -2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWake(ctx, wakeParticles) {
  wakeParticles.forEach(p => {
    const alpha = (p.life / p.maxLife) * 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,240,255,${alpha})`;
    ctx.fill();
  });
}


function drawFish(ctx, e) {
  ctx.save();
  const wiggle = e.qteWiggle || 0;
  ctx.translate(e.x + wiggle, e.y);
  const angle = Math.atan2(e.vy, e.vx);
  ctx.rotate(angle);

  const tailWag = Math.sin(e.swimPhase * 2) * 3;

  // Tail (fork-shaped)
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-19, -8 + tailWag);
  ctx.lineTo(-15, -1);
  ctx.lineTo(-19, 8 + tailWag);
  ctx.lineTo(-15, 1);
  ctx.closePath();
  ctx.fill();

  // Dorsal fin
  ctx.fillStyle = e.color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.quadraticCurveTo(2, -14, 8, -7);
  ctx.lineTo(4, -6);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pectoral fin
  ctx.fillStyle = e.color;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(5, 9, -2, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Body gradient
  const grad = ctx.createLinearGradient(-13, -7, 13, 7);
  grad.addColorStop(0, e.color);
  grad.addColorStop(0.45, `hsl(${30 + Math.random() * 10},95%,72%)`);
  grad.addColorStop(1, '#fff4a0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scale pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.7;
  for (let si = 0; si < 3; si++) {
    const sx = -4 + si * 5;
    ctx.beginPath();
    ctx.arc(sx, 0, 4, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + 2, 3, 3.5, Math.PI * 0.2, Math.PI * 0.9);
    ctx.stroke();
  }

  // Belly highlight
  ctx.fillStyle = 'rgba(255,255,220,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 2, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(7, -2, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(7.7, -2.6, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // Iris
  ctx.fillStyle = 'rgba(80,40,0,0.7)';
  ctx.beginPath();
  ctx.arc(7.2, -2.2, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(12, 1, 2, Math.PI * 0.7, Math.PI * 1.3);
  ctx.stroke();

  ctx.restore();
}

function drawShrimp(ctx, e) {
  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.translate(e.x, e.y);
  const angle = Math.atan2(e.vy, e.vx);
  ctx.rotate(angle);

  // Tail fan
  ctx.fillStyle = 'rgba(255,140,160,0.7)';
  for (let tf = -2; tf <= 2; tf++) {
    ctx.save();
    ctx.rotate(tf * 0.25);
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-21, -4);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-21, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Abdomen segments (curved body)
  for (let i = 0; i < 5; i++) {
    const segX = -10 + i * 5;
    const segY = Math.sin(i * 0.7) * 1.5;
    const segR = 3.8 - i * 0.3;
    const segGrad = ctx.createRadialGradient(segX - 1, segY - 1, 0.5, segX, segY, segR);
    segGrad.addColorStop(0, 'rgba(255,200,210,0.95)');
    segGrad.addColorStop(1, 'rgba(220,100,130,0.85)');
    ctx.fillStyle = segGrad;
    ctx.beginPath();
    ctx.ellipse(segX, segY, segR, segR * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    // segment line
    if (i < 4) {
      ctx.strokeStyle = 'rgba(180,60,80,0.4)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(segX + segR - 0.5, segY - segR * 0.5);
      ctx.lineTo(segX + segR - 0.5, segY + segR * 0.5);
      ctx.stroke();
    }
  }

  // Cephalothorax (head+chest)
  const headGrad = ctx.createRadialGradient(9, -1, 1, 9, 0, 7);
  headGrad.addColorStop(0, '#ffccd4');
  headGrad.addColorStop(1, '#e07090');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(9, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rostrum (pointed snout)
  ctx.fillStyle = '#cc5070';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(22, -2);
  ctx.lineTo(16, 1);
  ctx.closePath();
  ctx.fill();

  // Antennae (long)
  ctx.strokeStyle = 'rgba(200,80,100,0.75)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(15, -2);
  ctx.quadraticCurveTo(20, -8, 26, -10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, 2);
  ctx.quadraticCurveTo(20, 8, 26, 9);
  ctx.stroke();

  // Short antennules
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(14, -1);
  ctx.lineTo(18, -4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 1);
  ctx.lineTo(18, 4);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#1a0810';
  ctx.beginPath();
  ctx.arc(14, -2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,200,0.6)';
  ctx.beginPath();
  ctx.arc(14.5, -2.5, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Walking legs (3 pairs, simplified)
  ctx.strokeStyle = 'rgba(200,100,120,0.55)';
  ctx.lineWidth = 0.6;
  for (let li = 0; li < 3; li++) {
    const lx = 4 + li * 3;
    ctx.beginPath();
    ctx.moveTo(lx, 4);
    ctx.lineTo(lx - 1, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx, -4);
    ctx.lineTo(lx - 1, -10);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawKoi(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const angle = Math.atan2(e.vy, e.vx);
  ctx.rotate(angle);

  const shimmer = e.shimmer;
  const shimmerBright = 55 + Math.sin(shimmer * 1.3) * 18;
  const shimmerHue = 45 + Math.sin(shimmer) * 22;

  // Outer glow
  ctx.shadowColor = `hsla(${shimmerHue},100%,${shimmerBright}%,0.7)`;
  ctx.shadowBlur = 18 + Math.sin(shimmer) * 6;

  // Tail — flowing double lobe
  const tailWag = Math.sin(shimmer * 0.8) * 4;
  ctx.fillStyle = `hsl(${shimmerHue},100%,${shimmerBright - 5}%)`;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-20, -5 + tailWag, -24, -12 + tailWag);
  ctx.quadraticCurveTo(-20, -2, -12, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-20, 5 + tailWag, -24, 12 + tailWag);
  ctx.quadraticCurveTo(-20, 2, -12, 0);
  ctx.fill();

  // Ventral fin
  ctx.fillStyle = `hsla(${shimmerHue},100%,${shimmerBright - 10}%,0.75)`;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.quadraticCurveTo(0, 16, 6, 10);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.quadraticCurveTo(4, -18, 10, -9);
  ctx.lineTo(6, -7);
  ctx.closePath();
  ctx.fill();

  // Body base
  const bodyGrad = ctx.createLinearGradient(-16, -9, 16, 9);
  bodyGrad.addColorStop(0, `hsl(${shimmerHue},100%,${shimmerBright + 5}%)`);
  bodyGrad.addColorStop(0.4, `hsl(${shimmerHue + 10},100%,${shimmerBright}%)`);
  bodyGrad.addColorStop(1, '#ffaa00');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Koi color patches (red/white/black markings)
  ctx.fillStyle = 'rgba(220,40,20,0.65)';
  ctx.beginPath();
  ctx.ellipse(-3, -3, 6, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,240,240,0.5)';
  ctx.beginPath();
  ctx.ellipse(5, 2, 5, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,20,20,0.4)';
  ctx.beginPath();
  ctx.ellipse(-7, 2, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scale shimmer highlights
  ctx.strokeStyle = `rgba(255,255,180,${0.3 + Math.sin(shimmer * 2) * 0.15})`;
  ctx.lineWidth = 0.8;
  for (let si = 0; si < 4; si++) {
    const sx = -8 + si * 5;
    ctx.beginPath();
    ctx.arc(sx, 0, 4.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  // Belly shine
  ctx.fillStyle = `rgba(255,255,220,${0.3 + Math.sin(shimmer) * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(2, 3, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Whiskers
  ctx.strokeStyle = 'rgba(200,160,0,0.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.quadraticCurveTo(18, -5, 20, -7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 2);
  ctx.quadraticCurveTo(18, 5, 20, 7);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(11, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,100,0.9)';
  ctx.beginPath();
  ctx.arc(11, -3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(11.3, -3.3, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(11.8, -3.8, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPuffer(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  const sa = e.spineAngle;

  // Outer spine glow
  ctx.shadowColor = 'rgba(220,160,0,0.4)';
  ctx.shadowBlur = 8;

  // Spines (two-tone: base thick, tip thin)
  for (let i = 0; i < 14; i++) {
    const ang = sa + (i / 14) * Math.PI * 2;
    const baseX = Math.cos(ang) * 12;
    const baseY = Math.sin(ang) * 12;
    const tipX = Math.cos(ang) * 22;
    const tipY = Math.sin(ang) * 22;
    // spine base
    ctx.strokeStyle = '#b07800';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + (tipX - baseX) * 0.5, baseY + (tipY - baseY) * 0.5);
    ctx.stroke();
    // spine tip
    ctx.strokeStyle = '#e8c040';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(baseX + (tipX - baseX) * 0.5, baseY + (tipY - baseY) * 0.5);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Small tail fin
  ctx.fillStyle = '#e8b030';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-18, -5);
  ctx.lineTo(-17, 0);
  ctx.lineTo(-18, 5);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Body (inflated sphere)
  const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 13);
  bodyGrad.addColorStop(0, '#fffce8');
  bodyGrad.addColorStop(0.5, '#f0d060');
  bodyGrad.addColorStop(1, '#c88010');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();

  // Belly (lighter underside)
  ctx.fillStyle = 'rgba(255,255,230,0.45)';
  ctx.beginPath();
  ctx.ellipse(1, 4, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spot pattern
  ctx.fillStyle = 'rgba(140,80,0,0.35)';
  const spots = [[-3, -4, 2.5], [4, -2, 2], [-5, 3, 1.8], [2, 5, 1.5], [-1, 0, 3]];
  spots.forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Pectoral fin
  ctx.fillStyle = 'rgba(200,140,20,0.65)';
  ctx.beginPath();
  ctx.moveTo(4, 5);
  ctx.quadraticCurveTo(10, 12, 2, 14);
  ctx.quadraticCurveTo(-1, 10, 4, 5);
  ctx.fill();

  // Eye (large, characteristic of pufferfish)
  ctx.fillStyle = '#0a0505';
  ctx.beginPath();
  ctx.arc(7, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  // Iris ring
  ctx.strokeStyle = 'rgba(200,160,0,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(7, -4, 3, 0, Math.PI * 2);
  ctx.stroke();
  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7.2, -4.2, 2, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(8.2, -5.2, 1, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (small, beak-like)
  ctx.strokeStyle = 'rgba(100,60,0,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(11, 2, 2.5, Math.PI * 0.8, Math.PI * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(13, 2);
  ctx.stroke();

  ctx.restore();
}


function drawHarpoon(ctx, harpoon) {
  if (!harpoon) return;
  const h = harpoon;

  if (h.trail && h.trail.length > 1) {
    ctx.save();
    for (let i = 1; i < h.trail.length; i++) {
      const alpha = (i / h.trail.length) * 0.5;
      ctx.strokeStyle = `rgba(255,220,100,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.trail[i - 1].x, h.trail[i - 1].y);
      ctx.lineTo(h.trail[i].x, h.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (h.phase === 'flying') {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.atan2(h.vy, h.vx));
    ctx.fillStyle = '#e8d060';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c0a020';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-18, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNet(ctx, net, frame) {
  if (!net || net.phase !== 'charging') return;
  const r = net.radius;
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -(frame % 20);
  ctx.strokeStyle = `rgba(100,180,255,${0.5 + Math.sin(frame * 0.1) * 0.2})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(net.x, net.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(80,160,255,${0.08 + Math.sin(frame * 0.1) * 0.03})`;
  ctx.beginPath();
  ctx.arc(net.x, net.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawQTE(ctx, harpoon, frame) {
  if (!harpoon || harpoon.phase !== 'qte') return;
  const h = harpoon;
  const barW = 160;
  const barX = W / 2 - barW / 2;
  const barY = H - 60;
  const progress = h.qteClicks / 5;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, barX - 10, barY - 30, barW + 20, 55, 8);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, barX, barY, barW, 16, 8);
  ctx.fill();

  const pColor = progress < 0.5 ? '#4af' : progress < 0.9 ? '#fa0' : '#0f0';
  ctx.fillStyle = pColor;
  roundRect(ctx, barX, barY, barW * progress, 16, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`快速点击! ${h.qteClicks}/5`, W / 2, barY - 10);
  ctx.textAlign = 'left';

  // Timer flash
  const timeLeft = h.qteTimer / 120;
  if (timeLeft < 0.3 && frame % 10 < 5) {
    ctx.fillStyle = 'rgba(255,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawParticles(ctx, particles) {
  particles.forEach(p => {
    const alpha = p.life / 50;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color.startsWith('rgba') ? p.color : p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}


function drawHUD(ctx, s) {
  // Score panel
  ctx.save();
  ctx.fillStyle = 'rgba(0,20,50,0.7)';
  roundRect(ctx, 8, 8, 140, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`分数: ${s.score}`, 18, 31);

  // Time panel
  ctx.fillStyle = 'rgba(0,20,50,0.7)';
  roundRect(ctx, W - 130, 8, 122, 36, 8);
  ctx.fill();
  const tColor = s.timeLeft <= 10 ? '#ff4444' : '#aef';
  ctx.fillStyle = tColor;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(s.timeLeft)}s`, W - 14, 31);
  ctx.textAlign = 'left';

  // Stamina bar
  const stBarX = 10, stBarY = H - 28, stBarW = 160, stBarH = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, stBarX, stBarY, stBarW, stBarH, 6);
  ctx.fill();
  const stColor = s.stamina > 60 ? '#4af' : s.stamina > 30 ? '#fa0' : '#f44';
  ctx.fillStyle = stColor;
  roundRect(ctx, stBarX, stBarY, stBarW * (s.stamina / 100), stBarH, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px sans-serif';
  ctx.fillText('体力', stBarX + 4, stBarY + stBarH - 2);

  // Stun indicator
  if (s.stun > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, W / 2 - 80, H / 2 - 25, 160, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`击晕! ${(s.stun / 60).toFixed(1)}s`, W / 2, H / 2 + 7);
    ctx.textAlign = 'left';
  }

  // Frenzy indicator
  if (s.frenzy > 0) {
    ctx.fillStyle = 'rgba(255,100,0,0.85)';
    roundRect(ctx, W / 2 - 70, 50, 140, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`狂热! ${(s.frenzy / 60).toFixed(1)}s`, W / 2, 70);
    ctx.textAlign = 'left';
  }

  // Big Catch indicator
  if (s.bigCatch > 0) {
    const alpha = Math.min(1, s.bigCatch / 30);
    ctx.fillStyle = `rgba(255,215,0,${alpha * 0.9})`;
    roundRect(ctx, W / 2 - 75, 88, 150, 30, 8);
    ctx.fill();
    ctx.fillStyle = `rgba(80,0,0,${alpha})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('大丰收! x2', W / 2, 108);
    ctx.textAlign = 'left';
  }

  // Combo display
  if (s.combo >= 2) {
    ctx.fillStyle = 'rgba(255,140,0,0.85)';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`连击 x${s.combo}`, 155, 30);
  }

  ctx.restore();
}

function drawFlash(ctx, s) {
  if (s.flashRed > 0) {
    ctx.fillStyle = `rgba(255,0,0,${(s.flashRed / 30) * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.flashGold > 0) {
    ctx.fillStyle = `rgba(255,215,0,${(s.flashGold / 30) * 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }
}


function FishingGame({ addScore, ended, onFinish }) {
  const canvasRef = useRef(null);
  const sRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: W / 2, y: H / 2, left: false, right: false, rightStart: 0 });

  const init = useCallback(() => {
    sRef.current = initState();
  }, []);

  const loop = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = sRef.current;
    const mouse = mouseRef.current;
    const keys = keysRef.current;

    if (!s.lastTime) s.lastTime = timestamp;
    const dt = Math.min((timestamp - s.lastTime) / 1000, 0.1);
    s.lastTime = timestamp;
    s.frame++;

    if (!ended && !s.finished) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) {
        s.timeLeft = 0;
        s.finished = true;
        const finalScore = Math.min(100, Math.max(0, s.score));
        addScore && addScore(finalScore);  // 一次性上报最终得分（0-100）
        onFinish && onFinish();
      }
    }

    // Timers
    if (s.stun > 0) s.stun--;
    if (s.frenzy > 0) s.frenzy--;
    if (s.flashRed > 0) s.flashRed--;
    if (s.flashGold > 0) s.flashGold--;
    if (s.bigCatch > 0) s.bigCatch--;
    if (s.comboTimer > 0) { s.comboTimer--; if (s.comboTimer === 0) s.combo = 0; }

    // Stamina recovery
    if (s.stamina < 100) s.stamina = Math.min(100, s.stamina + 0.08);

    // Net phase update
    if (mouse.right && !s.net && s.stun <= 0) {
      s.net = { phase: 'charging', x: mouse.x, y: mouse.y, startTime: Date.now(), radius: 0 };
    }
    if (!mouse.right && s.net && s.net.phase === 'charging') {
      // Release net: capture shrimp and check puffer
      const r = s.net.radius;
      const nx = s.net.x, ny = s.net.y;
      let caught = [];
      let hitPuffer = false;
      s.entities.forEach(e => {
        if (!e.alive) return;
        const dx = e.x - nx, dy = e.y - ny;
        if (Math.sqrt(dx * dx + dy * dy) <= r) {
          if (e.type === 'shrimp') caught.push(e);
          if (e.type === 'puffer') hitPuffer = true;
        }
      });

      if (hitPuffer) {
        s.flashRed = 30;
        s.stun = 120;
        s.score = Math.max(0, s.score - 8);
        spawnParticles(s, nx, ny, '#ff4444', 15);
      } else if (caught.length > 0) {
        const bonus = caught.length >= 3 ? 2 : 1;
        if (caught.length >= 3) { s.bigCatch = 90; }
        caught.forEach(e => {
          e.alive = false;
          const pts = 4 * bonus;   // 虾+4，大丰收×2=+8
          s.score = Math.min(100, s.score + pts);
          spawnParticles(s, e.x, e.y, '#80ffff', 10);
        });
        if (caught.length >= 3) s.flashGold = 20;
      }
      s.net = null;
    }

    // Update harpoon
    updateHarpoon(s, addScore);

    // Update entities
    if (s.stun <= 0) updateEntities(s, keys, mouse);

    // Particles
    updateParticles(s);

    // Spawning
    handleSpawning(s);

    // ========== DRAW ==========
    drawWater(ctx, s.frame);
    drawCorals(ctx, s.corals);
    drawLilyPads(ctx, s.lilyPads, s.frame);
    drawWake(ctx, s.wakeParticles);

    s.entities.forEach(e => {
      if (!e.alive) return;
      if (e.type === 'fish') drawFish(ctx, e);
      else if (e.type === 'shrimp') drawShrimp(ctx, e);
      else if (e.type === 'koi') drawKoi(ctx, e);
      else if (e.type === 'puffer') drawPuffer(ctx, e);
    });

    drawBoat(ctx, s.boat, s.frame);
    drawHarpoon(ctx, s.harpoon);
    if (s.net) drawNet(ctx, s.net, s.frame);
    drawParticles(ctx, s.particles);
    drawQTE(ctx, s.harpoon, s.frame);
    drawHUD(ctx, s);
    drawFlash(ctx, s);

    if (!ended && !s.finished) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [ended, addScore, onFinish]);

  useEffect(() => {
    init();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onKey = (e, down) => {
      keysRef.current[e.key] = down;
      keysRef.current[e.key.toLowerCase()] = down;
    };
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
    };
    const onMouseDown = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      mouseRef.current.x = mx;
      mouseRef.current.y = my;
      const s = sRef.current;
      if (e.button === 0) {
        mouseRef.current.left = true;
        // Harpoon
        if (!s.harpoon && s.stun <= 0 && s.stamina >= 8) {
          if (s.harpoon && s.harpoon.phase === 'qte') return;
          if (s.harpoon) return;
          const bx = s.boat.x, by = s.boat.y;
          const dx = mx - bx, dy = my - by;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = s.frenzy > 0 ? 18 : 14;
          s.harpoon = {
            phase: 'flying',
            x: bx, y: by,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            trail: [],
          };
          s.stamina = Math.max(0, s.stamina - 8);
        }
      } else if (e.button === 2) {
        mouseRef.current.right = true;
        mouseRef.current.rightStart = Date.now();
      }
    };
    const onMouseUp = (e) => {
      if (e.button === 0) mouseRef.current.left = false;
      if (e.button === 2) mouseRef.current.right = false;
    };
    const onCtxMenu = (e) => e.preventDefault();
    const onQteClick = (e) => {
      const s = sRef.current;
      if (s.harpoon && s.harpoon.phase === 'qte') {
        s.harpoon.qteClicks++;
        if (s.harpoon.qteClicks >= 5) {
          // Success
          const target = s.harpoon.target;
          if (target && target.alive) {
            target.alive = false;
            target.qteWiggle = 0;
            const pts = target.type === 'koi' ? 15 : 5;  // 锦鲤+15，青鱼+5
            const bonusPts = s.frenzy > 0 ? pts * 2 : pts;
            s.score = Math.min(100, s.score + bonusPts);
            spawnParticles(s, target.x, target.y, target.type === 'koi' ? '#ffd700' : '#88aaff', 18);
            if (target.type === 'koi') { s.flashGold = 25; }
            s.combo = (s.combo || 0) + 1;
            s.comboTimer = 180;
            if (s.combo >= 3 && s.frenzy <= 0) {
              s.frenzy = 300;
            }
          }
          s.harpoon = null;
        }
      }
    };

    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onCtxMenu);
    canvas.addEventListener('click', onQteClick);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', (e) => onKey(e, true));
      window.removeEventListener('keyup', (e) => onKey(e, false));
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onCtxMenu);
      canvas.removeEventListener('click', onQteClick);
    };
  }, [init, loop]);

  useEffect(() => {
    if (ended) cancelAnimationFrame(rafRef.current);
  }, [ended]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        display: 'block',
        borderRadius: 14,
        cursor: 'crosshair',
        width: '100%',
        height: 'auto',
        userSelect: 'none',
        boxShadow: '0 0 40px rgba(0,150,255,0.3)',
      }}
    />
  );
}

export default FishingGame;
