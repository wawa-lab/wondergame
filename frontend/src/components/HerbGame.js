import React, { useEffect, useRef } from 'react';

const W = 800, H = 520;

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function randomRange(mn, mx) { return Math.random() * (mx - mn) + mn; }
function lerp(a, b, t) { return a + (b - a) * t; }

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

const HERB_DEFS = [
  { kind: 'jinyin',  name: '金銀花', pts: 10,  tool: 'sickle', emoji: '🌼', color: '#FFD700', clicksNeeded: 3, shy: false },
  { kind: 'bohe',    name: '薄荷',   pts: 8,   tool: 'sickle', emoji: '🌿', color: '#90EE90', clicksNeeded: 3, shy: false },
  { kind: 'renshen', name: '人参',   pts: 50,  tool: 'hoe',    emoji: '🥕', color: '#FF8C00', clicksNeeded: 1, shy: true  },
  { kind: 'lingzhi', name: '灵芝',   pts: 40,  tool: 'hoe',    emoji: '🍄', color: '#CC44AA', clicksNeeded: 1, shy: false },
  { kind: 'poison',  name: '毒草',   pts: -20, tool: 'any',    emoji: '☠️', color: '#556B2F', clicksNeeded: 1, shy: false },
  { kind: 'rain',    name: '雨燕草', pts: 35,  tool: 'sickle', emoji: '💧', color: '#87CEEB', clicksNeeded: 2, shy: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// drawBackground
// ─────────────────────────────────────────────────────────────────────────────
function drawBackground(ctx, frame, raining) {
  // 1. Base ground gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   '#6aaa48');
  grad.addColorStop(0.5, '#4e8f32');
  grad.addColorStop(1,   '#3a7020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Dirt path
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(W * 0.5, H);
  ctx.bezierCurveTo(W * 0.45, H * 0.7, W * 0.6, H * 0.4, W * 0.75, 0);
  ctx.strokeStyle = '#8B6B3D';
  ctx.lineWidth = 28;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W * 0.5, H);
  ctx.bezierCurveTo(W * 0.45, H * 0.7, W * 0.6, H * 0.4, W * 0.75, 0);
  ctx.strokeStyle = '#A07848';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // 3. Grass tufts (100 deterministic)
  ctx.save();
  ctx.strokeStyle = '#2d6e18';
  ctx.lineWidth = 1;
  for (let i = 0; i < 100; i++) {
    const gx = ((i * 127 + 31) % (W - 120)) + 110;
    const gy = ((i * 83 + 17) % (H - 90)) + 40;
    const gh = 6 + (i % 6);
    ctx.beginPath();
    ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - gh);
    ctx.moveTo(gx, gy); ctx.lineTo(gx + 2, gy - gh);
    ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - gh - 2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Bamboo forest — left strip (x: 0-90)
  const bambooL = [
    { x: 8, w: 5, h: 160 }, { x: 20, w: 6, h: 145 }, { x: 33, w: 5, h: 162 },
    { x: 48, w: 6, h: 140 }, { x: 62, w: 5, h: 155 }, { x: 76, w: 6, h: 148 },
    { x: 14, w: 4, h: 130 }, { x: 55, w: 4, h: 138 },
  ];
  bambooL.forEach(({ x, w, h }) => {
    ctx.save();
    const bg = ctx.createLinearGradient(x, H - h, x, H);
    bg.addColorStop(0, '#5B8C2A');
    bg.addColorStop(1, '#3d6020');
    ctx.fillStyle = bg;
    ctx.fillRect(x - w/2, H - h, w, h);
    ctx.fillStyle = '#4a7a1e';
    for (let sy = H - h + 10; sy < H; sy += 28) {
      ctx.beginPath();
      ctx.ellipse(x, sy, w / 2 + 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const leafAngles = [-0.6, 0, 0.5, -1.0];
    leafAngles.forEach((ang, li) => {
      const lx = x + Math.cos(ang) * 14;
      const ly = H - h - 5 + li * 4 - Math.sin(Math.abs(ang)) * 8;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang - 0.2);
      ctx.fillStyle = '#4a8a20';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-3, -5, -5, -12, 0, -18);
      ctx.bezierCurveTo(5, -12, 4, -5, 0, 0);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  });

  // 5. Bamboo forest — right strip (x: 710-800)
  const bambooR = [
    { x: 792, w: 5, h: 150 }, { x: 780, w: 6, h: 165 }, { x: 767, w: 5, h: 142 },
    { x: 752, w: 6, h: 157 }, { x: 738, w: 5, h: 150 }, { x: 724, w: 6, h: 162 },
    { x: 786, w: 4, h: 132 }, { x: 745, w: 4, h: 140 },
  ];
  bambooR.forEach(({ x, w, h }) => {
    ctx.save();
    const bg = ctx.createLinearGradient(x, H - h, x, H);
    bg.addColorStop(0, '#5B8C2A');
    bg.addColorStop(1, '#3d6020');
    ctx.fillStyle = bg;
    ctx.fillRect(x - w/2, H - h, w, h);
    ctx.fillStyle = '#4a7a1e';
    for (let sy = H - h + 10; sy < H; sy += 28) {
      ctx.beginPath();
      ctx.ellipse(x, sy, w / 2 + 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const leafAngles = [0.6, 0, -0.5, 1.0];
    leafAngles.forEach((ang, li) => {
      const lx = x + Math.cos(ang) * 14;
      const ly = H - h - 5 + li * 4 - Math.sin(Math.abs(ang)) * 8;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang + 0.2);
      ctx.fillStyle = '#4a8a20';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-3, -5, -5, -12, 0, -18);
      ctx.bezierCurveTo(5, -12, 4, -5, 0, 0);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  });

  // 6. Mossy rocks
  const rocks = [
    { x: 185, y: 120, rx: 18, ry: 12, rot: 0.2 },
    { x: 420, y: 88,  rx: 15, ry: 10, rot: -0.1 },
    { x: 545, y: 295, rx: 21, ry: 14, rot: 0.3 },
    { x: 295, y: 375, rx: 16, ry: 11, rot: -0.2 },
    { x: 135, y: 275, rx: 14, ry: 10, rot: 0.1 },
    { x: 650, y: 180, rx: 19, ry: 13, rot: 0.25 },
  ];
  rocks.forEach(({ x, y, rx, ry, rot }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(2, ry * 0.6, rx * 0.9, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const rg = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 2, 0, 0, rx);
    rg.addColorStop(0, '#909090');
    rg.addColorStop(1, '#505050');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,120,40,0.6)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.2, -ry * 0.3, rx * 0.35, ry * 0.28, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rx * 0.25, -ry * 0.2, rx * 0.28, ry * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 7. Small stream
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 0);
  ctx.bezierCurveTo(W * 0.25, H * 0.15, W * 0.35, H * 0.25, W * 0.4, H * 0.3);
  ctx.bezierCurveTo(W * 0.5, H * 0.4, W * 0.6, H * 0.6, W * 0.7, H);
  ctx.strokeStyle = 'rgba(64,148,196,0.7)';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  const shimBase = (frame * 0.5) % 1;
  for (let si = 0; si < 5; si++) {
    const t = (si / 5 + shimBase) % 1;
    const sx = W * 0.15 + (W * 0.7 - W * 0.15) * t;
    const sy = H * t * 0.95;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 2);
    ctx.lineTo(sx + 5, sy + 2);
    ctx.stroke();
  }
  [[W*0.22, H*0.08], [W*0.38, H*0.27], [W*0.60, H*0.60]].forEach(([lx, ly]) => {
    ctx.save();
    ctx.fillStyle = '#2d8a3a';
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0.3, Math.PI * 2 - 0.3);
    ctx.lineTo(lx, ly);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();

  // 8. Mist wisps
  [[160, 200, 110, 55], [370, 145, 130, 58], [530, 340, 118, 50], [250, 380, 95, 42]].forEach(([mx, my, mrx, mry], i) => {
    ctx.save();
    const drift = Math.sin(frame * 0.004 + i) * 6;
    ctx.globalAlpha = 0.06 + 0.04 * ((i % 2));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(mx + drift, my, mrx, mry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 9. Sunbeam
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = 'rgba(255,220,100,1)';
  [[0, 0, W*0.45, H], [0, 0, W*0.3, H*0.7], [0, 0, W*0.6, H*0.5]].forEach(([bx1, by1, bx2, by2]) => {
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(bx2, by2);
    ctx.lineTo(bx2 - 40, by2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // 10. Rain
  if (raining) {
    ctx.save();
    ctx.fillStyle = 'rgba(100,140,200,0.12)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(180,210,255,0.55)';
    ctx.lineWidth = 1.2;
    const rainOff = (frame * 4) % 80;
    for (let ri = 0; ri < 100; ri++) {
      const rx2 = ((ri * 137 + rainOff * 3) % W);
      const ry2 = ((ri * 89 + rainOff * 2) % H);
      ctx.beginPath();
      ctx.moveTo(rx2, ry2);
      ctx.lineTo(rx2 + Math.sin(-15 * Math.PI / 180) * 14, ry2 + Math.cos(-15 * Math.PI / 180) * 14);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// drawHerbSprite — canvas-drawn botanical sprites (no emoji)
// Called with ctx already translated to herb center
// ─────────────────────────────────────────────────────────────────────────────
function drawHerbSprite(ctx, kind, color, frame) {
  ctx.save();
  if (kind === 'jinyin') {
    // 金银花 — honeysuckle: trumpet flowers on a vine
    // Stem
    ctx.strokeStyle = '#5a8c30';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-4, 2, 4, -4, 0, -10);
    ctx.stroke();
    // Side branch
    ctx.beginPath();
    ctx.moveTo(-1, -2);
    ctx.bezierCurveTo(-6, -5, -10, -3, -12, -6);
    ctx.stroke();
    // Leaves
    ctx.fillStyle = '#5da832';
    [[0, -3, 0.3], [-5, -4, -0.5], [3, -7, 0.8]].forEach(([lx, ly, rot]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // Flowers (trumpet-shaped)
    const flowerPos = [[0, -10], [-12, -6], [4, -14]];
    flowerPos.forEach(([fx, fy], fi) => {
      const wobble = Math.sin(frame * 0.04 + fi * 1.2) * 1;
      ctx.save();
      ctx.translate(fx + wobble, fy);
      // petals
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        ctx.fillStyle = fi === 0 ? '#fff8c0' : '#FFD700';
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * 3.5, Math.sin(pa) * 3.5, 2.5, 1.5, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      // center
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

  } else if (kind === 'bohe') {
    // 薄荷 — mint: square stem with opposite oval leaves
    ctx.strokeStyle = '#4a8c28';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -12);
    ctx.stroke();
    // Leaf pairs
    const leafPairs = [[0, 4], [0, -2], [0, -8]];
    leafPairs.forEach(([, ly], i) => {
      const lw = 7 - i;
      ctx.fillStyle = i === 0 ? '#60c040' : '#50a830';
      // left leaf
      ctx.save();
      ctx.translate(-2, ly);
      ctx.rotate(-0.3 - i * 0.1);
      ctx.beginPath();
      ctx.ellipse(-lw * 0.5, 0, lw, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // vein
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-lw, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.restore();
      // right leaf
      ctx.save();
      ctx.translate(2, ly);
      ctx.rotate(0.3 + i * 0.1);
      ctx.beginPath();
      ctx.fillStyle = i === 0 ? '#60c040' : '#50a830';
      ctx.ellipse(lw * 0.5, 0, lw, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lw, 0);
      ctx.stroke();
      ctx.restore();
    });
    // Flower cluster at top
    ctx.fillStyle = '#c8a0e8';
    for (let ci = 0; ci < 5; ci++) {
      const ca = (ci / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ca) * 3, -12 + Math.sin(ca) * 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (kind === 'renshen') {
    // 人参 — ginseng: root with tendrils + compound leaves
    // Root body
    const rg = ctx.createLinearGradient(-5, 2, 5, 14);
    rg.addColorStop(0, '#f0c878');
    rg.addColorStop(1, '#c89040');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(0, 8, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Root tendrils
    ctx.strokeStyle = '#c89040';
    ctx.lineWidth = 1;
    [[-3, 14, -5, 20], [1, 15, 4, 21], [-1, 16, -2, 22], [2, 13, 6, 18]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(x1 + (x2 - x1) * 0.5 + (Math.random() - 0.5) * 3, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
    });
    // Stem
    ctx.strokeStyle = '#5a8c30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, -6);
    ctx.stroke();
    // Compound leaf cluster
    const leafAngles = [-0.8, -0.3, 0.2, 0.7, 1.2];
    leafAngles.forEach((la, li) => {
      ctx.save();
      ctx.translate(Math.cos(la - Math.PI / 2) * 6, -6 + Math.sin(la - Math.PI / 2) * 4);
      ctx.rotate(la);
      ctx.fillStyle = li === 2 ? '#70c040' : '#5aaa28';
      ctx.beginPath();
      ctx.ellipse(0, -4, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, -8);
      ctx.stroke();
      ctx.restore();
    });
    // Glow effect for shy herb
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(frame * 0.06);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

  } else if (kind === 'lingzhi') {
    // 灵芝 — reishi mushroom: fan cap + stipe
    // Stipe (stem)
    const sg = ctx.createLinearGradient(-3, 4, 3, 16);
    sg.addColorStop(0, '#8B4513');
    sg.addColorStop(1, '#5c2c08');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(0, 12, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cap (fan-shaped, concentric rings)
    const capGrad = ctx.createRadialGradient(0, 4, 1, 0, 4, 13);
    capGrad.addColorStop(0, '#CC44AA');
    capGrad.addColorStop(0.5, '#992288');
    capGrad.addColorStop(1, '#661166');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.arc(0, 4, 13, Math.PI * 1.1, Math.PI * 1.9);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
    // Concentric ring texture
    ctx.strokeStyle = 'rgba(255,180,255,0.3)';
    ctx.lineWidth = 1;
    [6, 9, 12].forEach(r => {
      ctx.beginPath();
      ctx.arc(0, 4, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });
    // Lacquer shine
    ctx.fillStyle = 'rgba(255,200,255,0.25)';
    ctx.beginPath();
    ctx.arc(-3, 0, 5, Math.PI * 1.2, Math.PI * 1.7);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    // Spore dots at edge
    ctx.fillStyle = 'rgba(200,100,220,0.6)';
    for (let di = 0; di < 5; di++) {
      const da = Math.PI * (1.1 + di * 0.16);
      ctx.beginPath();
      ctx.arc(Math.cos(da) * 13, 4 + Math.sin(da) * 13, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (kind === 'poison') {
    // 毒草 — poison: dark jagged leaves + warning spots
    // Stem (dark)
    ctx.strokeStyle = '#3d5c1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-2, 4, 2, -2, 0, -10);
    ctx.stroke();
    // Jagged leaves
    const leafData = [[-8, 0, -0.5], [8, -2, 0.5], [-5, -7, -0.8], [5, -9, 0.6]];
    leafData.forEach(([lx, ly, rot]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = '#3d6020';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(3, -2);
      ctx.lineTo(6, -4);
      ctx.lineTo(4, 0);
      ctx.lineTo(7, 2);
      ctx.lineTo(2, 3);
      ctx.lineTo(0, 6);
      ctx.lineTo(-2, 3);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    // Warning spots (purple/black)
    ctx.fillStyle = 'rgba(80,0,80,0.7)';
    [[-3, -4], [4, 0], [-6, 2], [2, -8]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Skull-like marking on main leaf
    ctx.fillStyle = 'rgba(200,200,200,0.5)';
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,0,40,0.7)';
    ctx.beginPath();
    ctx.arc(-1, -4, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1, -4, 0.8, 0, Math.PI * 2);
    ctx.fill();

  } else if (kind === 'rain') {
    // 雨燕草 — rain swallow grass: delicate blue-white flower
    // Stem with water drops
    ctx.strokeStyle = '#5090b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-3, 4, 3, -2, 0, -10);
    ctx.stroke();
    // Feathery leaves
    ctx.strokeStyle = '#70b8d8';
    ctx.lineWidth = 0.8;
    [[-6, 2, -0.7], [6, 0, 0.6], [-4, -5, -0.9], [4, -7, 0.8]].forEach(([lx, ly, rot]) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      for (let fi = 0; fi < 4; fi++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-3 + fi * 2, -(fi + 1) * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
    // Blue flowers (5-petal)
    [[0, -10], [-5, -6]].forEach(([fx, fy]) => {
      const wobble = Math.sin(frame * 0.05 + fx * 0.1) * 1.5;
      ctx.save();
      ctx.translate(fx + wobble * 0.3, fy + wobble);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        ctx.fillStyle = p % 2 === 0 ? '#a0d0f0' : '#c0e8ff';
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * 4, Math.sin(pa) * 4, 2.5, 1.5, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // Rain drops
    ctx.fillStyle = 'rgba(150,210,255,0.7)';
    [[-2, 6], [3, 3], [-5, -1]].forEach(([dx, dy]) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// drawHerbPlayer — canvas-drawn farmer character (no emoji)
// Called with ctx already translated to player center
// ─────────────────────────────────────────────────────────────────────────────
function drawHerbPlayer(ctx, tool, vx, vy, frame) {
  ctx.save();
  const walkCycle = Math.sin(frame * 0.18) * 0.15;
  const isMoving = Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3;
  const legSwing = isMoving ? walkCycle : 0;
  const armSwing = isMoving ? -walkCycle : 0;
  const facingLeft = vx < -0.3;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  const legColor = '#5c3a1e';
  ctx.strokeStyle = legColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  // Left leg
  ctx.save();
  ctx.rotate(-legSwing);
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(-3, 13);
  ctx.stroke();
  // Left shoe
  ctx.fillStyle = '#3a2010';
  ctx.beginPath();
  ctx.ellipse(-3.5, 13, 3.5, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Right leg
  ctx.save();
  ctx.rotate(legSwing);
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.lineTo(3, 13);
  ctx.stroke();
  ctx.fillStyle = '#3a2010';
  ctx.beginPath();
  ctx.ellipse(3.5, 13, 3.5, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Robe/body
  const robeGrad = ctx.createLinearGradient(-7, -4, 7, 8);
  robeGrad.addColorStop(0, '#6b8c5a');
  robeGrad.addColorStop(1, '#4a6a3a');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-5, -4);
  ctx.lineTo(5, -4);
  ctx.lineTo(7, 4);
  ctx.closePath();
  ctx.fill();
  // Robe collar/sash
  ctx.strokeStyle = '#8aaa70';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.lineTo(0, 0);
  ctx.lineTo(2, -4);
  ctx.stroke();
  // Belt
  ctx.fillStyle = '#8B5c20';
  ctx.fillRect(-6, 1, 12, 2.5);

  // Arms
  ctx.strokeStyle = '#6b8c5a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Tool arm (right or left depending on facing)
  const toolArmX = facingLeft ? -5 : 5;
  const toolArmDir = facingLeft ? -1 : 1;
  ctx.save();
  ctx.rotate(armSwing * toolArmDir);
  ctx.beginPath();
  ctx.moveTo(toolArmX, -2);
  ctx.lineTo(toolArmX + toolArmDir * 4, 6);
  ctx.stroke();
  // Draw tool
  ctx.save();
  ctx.translate(toolArmX + toolArmDir * 4, 6);
  if (tool === 'sickle') {
    // Sickle: curved blade
    ctx.strokeStyle = '#c8c8c8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 6, -Math.PI * 0.3, Math.PI * 0.6);
    ctx.stroke();
    // Handle
    ctx.strokeStyle = '#8B5c20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 7);
    ctx.stroke();
    // Blade tip
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(Math.cos(-Math.PI * 0.3) * 6, Math.sin(-Math.PI * 0.3) * 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Hoe: straight head + handle
    ctx.strokeStyle = '#8B5c20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 9);
    ctx.stroke();
    // Hoe head
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();
    ctx.lineCap = 'round';
  }
  ctx.restore();
  ctx.restore();

  // Other arm (relaxed swing)
  const otherArmX = facingLeft ? 5 : -5;
  ctx.save();
  ctx.rotate(-armSwing * toolArmDir);
  ctx.beginPath();
  ctx.moveTo(otherArmX, -2);
  ctx.lineTo(otherArmX - toolArmDir * 3, 5);
  ctx.stroke();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#e8c090';
  ctx.beginPath();
  ctx.ellipse(0, -5, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const headGrad = ctx.createRadialGradient(-2, -10, 1, 0, -10, 7);
  headGrad.addColorStop(0, '#f0c890');
  headGrad.addColorStop(1, '#d4a070');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -10, 7, 0, Math.PI * 2);
  ctx.fill();

  // Straw hat
  ctx.fillStyle = '#d4aa50';
  // Brim
  ctx.beginPath();
  ctx.ellipse(0, -15, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crown
  const hatGrad = ctx.createRadialGradient(-2, -20, 1, 0, -19, 7);
  hatGrad.addColorStop(0, '#e8c060');
  hatGrad.addColorStop(1, '#b89030');
  ctx.fillStyle = hatGrad;
  ctx.beginPath();
  ctx.arc(0, -19, 6, 0, Math.PI * 2);
  ctx.fill();
  // Hat band
  ctx.strokeStyle = '#8B5c20';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -16, 7, 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Face
  const eyeX = facingLeft ? -2 : 2;
  // Eye
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath();
  ctx.arc(eyeX, -10, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX + 0.4, -10.4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Smile
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(eyeX * 0.3, -8.5, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Eyebrow
  ctx.strokeStyle = '#4a2a10';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(eyeX - 1.5, -12);
  ctx.lineTo(eyeX + 1.5, -11.5);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HerbGame React component
// props: addScore(n), ended, onFinish()
// ─────────────────────────────────────────────────────────────────────────────
function HerbGame({ addScore, ended, onFinish }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ———————————— initialise state ————————————
    const s = {
      frame: 0,
      player: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
      tool: 'sickle',          // 'sickle' | 'hoe'
      herbs: [],
      score: 0,
      raining: Math.random() < 0.35,
      keys: {},
      animId: null,

      // poisoned state
      poisoned: false,
      poisonTimer: 0,

      // combo system
      perfectCount: 0,         // consecutive perfects
      comboActive: false,
      comboTimer: 0,

      // per-herb interaction state
      activeHerb: null,        // herb object currently being harvested
      clickProgress: 0,        // clicks done for multi-click herbs
      qteHeld: false,          // is mouse held for QTE
      qtePower: 0,             // 0-1 fill
      qteDir: 1,               // oscillation direction

      // floating texts
      floats: [],              // [{x,y,text,color,alpha,vy,life}]
    };
    stateRef.current = s;

    // Build herb instances (3 per def)
    s.herbs = HERB_DEFS.flatMap(def =>
      Array.from({ length: 3 }, () => ({
        ...def,
        x: randomRange(100, 700),
        y: randomRange(60, 460),
        collected: false,
        scale: 0.85 + Math.random() * 0.3,
        pulseOff: Math.random() * Math.PI * 2,
      }))
    );

    // ———————————— input handlers ————————————
    const onKeyDown = (e) => {
      s.keys[e.key] = true;
      if (e.key === '1') s.tool = 'sickle';
      if (e.key === '2') s.tool = 'hoe';
    };
    const onKeyUp = (e) => { s.keys[e.key] = false; };

    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);
      // find nearby uncollected herb
      const near = s.herbs.find(h => {
        if (h.collected) return false;
        const dx = pos.x - h.x, dy = pos.y - h.y;
        return Math.sqrt(dx*dx + dy*dy) < 40;
      });
      if (!near) return;
      // tool check
      const toolOk = near.tool === 'any' || near.tool === s.tool;
      if (!toolOk) {
        spawnFloat(near.x, near.y - 20, '工具不匹配!', '#FF8888');
        return;
      }
      // poison herb -> immediate
      if (near.kind === 'poison') {
        near.collected = true;
        s.score += near.pts;
        addScore?.(near.pts);
        s.poisoned = true;
        s.poisonTimer = 180; // 3 seconds at 60fps
        spawnFloat(near.x, near.y - 20, '中毒! -20', '#88FF44');
        s.perfectCount = 0;
        return;
      }
      // QTE herb (clicksNeeded === 1, tool === hoe, not poison)
      if (near.clicksNeeded === 1) {
        s.activeHerb = near;
        s.qteHeld = true;
        s.qtePower = 0;
        s.qteDir = 1;
        return;
      }
      // multi-click herb
      if (s.activeHerb !== near) {
        s.activeHerb = near;
        s.clickProgress = 0;
      }
      s.clickProgress += 1;
      spawnFloat(near.x, near.y - 20, `${s.clickProgress}/${near.clicksNeeded}`, '#FFFFFF');
      if (s.clickProgress >= near.clicksNeeded) {
        near.collected = true;
        s.score += near.pts;
        addScore?.(near.pts);
        spawnFloat(near.x, near.y - 30, `+${near.pts}`, '#FFD700');
        s.activeHerb = null;
        s.clickProgress = 0;
        s.perfectCount += 1;
        checkCombo();
      }
    };

    const onMouseUp = (e) => {
      if (e.button !== 0) return;
      if (!s.qteHeld || !s.activeHerb) { s.qteHeld = false; return; }
      s.qteHeld = false;
      const h = s.activeHerb;
      s.activeHerb = null;
      const p = s.qtePower;
      let pts = 0;
      let label = '';
      if (p >= 0.40 && p <= 0.65) {
        pts = 50; label = '完美! +50'; s.perfectCount += 1; checkCombo();
      } else if (p >= 0.25 && p <= 0.75) {
        pts = 25; label = '良好! +25'; s.perfectCount = 0;
      } else {
        pts = 0; label = '失败'; s.perfectCount = 0;
        h.collected = true; // herb disappears
        spawnFloat(h.x, h.y - 30, label, '#FF4444');
        return;
      }
      h.collected = true;
      s.score += pts;
      addScore?.(pts);
      spawnFloat(h.x, h.y - 30, label, pts === 50 ? '#FFD700' : '#90EE90');
    };

    const checkCombo = () => {
      if (s.perfectCount >= 3) {
        s.comboActive = true;
        s.comboTimer = 300; // 5 seconds
        s.perfectCount = 0;
        spawnFloat(W / 2, H / 2 - 40, '药王附体!', '#FFD700');
      }
    };

    const spawnFloat = (x, y, text, color) => {
      s.floats.push({ x, y, text, color, alpha: 1, vy: -1.2, life: 80 });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    // ———————————— game loop ————————————
    const loop = () => {
      if (ended) { onFinish?.(); return; }
      s.frame++;
      const f = s.frame;

      // —— player movement
      let speed = 2.5;
      if (s.poisoned) speed *= 0.5;
      if (s.comboActive) speed += 1;
      if (s.keys['Shift'] || s.keys['shift']) speed = Math.min(speed, 1.2);

      if (s.keys['w'] || s.keys['W'] || s.keys['ArrowUp'])    s.player.vy -= 0.6;
      if (s.keys['s'] || s.keys['S'] || s.keys['ArrowDown'])  s.player.vy += 0.6;
      if (s.keys['a'] || s.keys['A'] || s.keys['ArrowLeft'])  s.player.vx -= 0.6;
      if (s.keys['d'] || s.keys['D'] || s.keys['ArrowRight']) s.player.vx += 0.6;
      s.player.vx = clamp(s.player.vx * 0.82, -speed, speed);
      s.player.vy = clamp(s.player.vy * 0.82, -speed, speed);
      s.player.x  = clamp(s.player.x + s.player.vx, 20, W - 20);
      s.player.y  = clamp(s.player.y + s.player.vy, 20, H - 20);

      const playerSpeed = Math.sqrt(s.player.vx*s.player.vx + s.player.vy*s.player.vy);

      // —— timers
      if (s.poisoned) { s.poisonTimer--; if (s.poisonTimer <= 0) s.poisoned = false; }
      if (s.comboActive) { s.comboTimer--; if (s.comboTimer <= 0) s.comboActive = false; }

      // —— QTE power oscillation
      if (s.qteHeld && s.activeHerb) {
        if (s.comboActive) {
          s.qtePower = 0.52; // auto-perfect in combo mode
        } else {
          s.qtePower += 0.008 * s.qteDir;
          if (s.qtePower >= 1) { s.qtePower = 1; s.qteDir = -1; }
          if (s.qtePower <= 0) { s.qtePower = 0; s.qteDir =  1; }
        }
      }

      // —— shy herb flee
      s.herbs.forEach(h => {
        if (h.collected || !h.shy) return;
        const dx = s.player.x - h.x, dy = s.player.y - h.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80 && playerSpeed > 2) {
          h.x = clamp(h.x - dx * 0.08 + randomRange(-5, 5), 100, 700);
          h.y = clamp(h.y - dy * 0.08 + randomRange(-5, 5), 60, 460);
        }
      });

      // —— rain-only herb visibility
      // rain herb: only visible when raining

      // —— draw
      drawBackground(ctx, f, s.raining);

      // draw herbs
      s.herbs.forEach(h => {
        if (h.collected) return;
        // rain herb only visible when raining
        if (h.kind === 'rain' && !s.raining) return;

        ctx.save();
        ctx.translate(h.x, h.y);
        const pulse = 1 + 0.08 * Math.sin(f * 0.05 + h.pulseOff);
        ctx.scale(h.scale * pulse, h.scale * pulse);

        // glow
        if (h.kind === 'rain' && s.raining) {
          ctx.shadowColor = h.color;
          ctx.shadowBlur = 16 + 6 * Math.sin(f * 0.08);
        } else {
          ctx.shadowColor = h.color;
          ctx.shadowBlur = 6;
        }

        // circle bg
        ctx.fillStyle = h.color + '44';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // canvas-drawn herb sprite
        ctx.shadowBlur = 0;
        drawHerbSprite(ctx, h.kind, h.color, f);

        // name tag
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(h.name, 0, 22);

        ctx.restore();

        // nearby hint
        const dx = s.player.x - h.x, dy = s.player.y - h.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const toolOk = h.tool === 'any' || h.tool === s.tool;
        if (dist < 35 && toolOk && !s.qteHeld) {
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          const hint = h.clicksNeeded === 1 ? '按住鼠标蓄力' : `点击采摘(${s.activeHerb === h ? s.clickProgress : 0}/${h.clicksNeeded})`;
          ctx.fillText(hint, h.x, h.y - 28);
          ctx.restore();
        }
      });

      // draw player
      ctx.save();
      ctx.translate(s.player.x, s.player.y);
      if (s.poisoned) {
        ctx.shadowColor = '#44FF44';
        ctx.shadowBlur = 14;
      }
      drawHerbPlayer(ctx, s.tool, s.player.vx, s.player.vy, f);
      ctx.restore();

      // tool indicator above player
      ctx.save();
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#FFD9A0';
      ctx.fillText(s.tool === 'sickle' ? '药镰' : '药锄', s.player.x, s.player.y - 30);
      ctx.restore();

      // QTE bar
      if (s.qteHeld && s.activeHerb) {
        const bx = s.player.x - 30, by = s.player.y - 50, bw = 60, bh = 8;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 4);
        ctx.fill();
        // zone indicators
        ctx.fillStyle = 'rgba(255,200,0,0.3)';
        roundRect(ctx, bx + bw * 0.25, by - 2, bw * 0.5, bh + 4, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,255,100,0.4)';
        roundRect(ctx, bx + bw * 0.40, by - 2, bw * 0.25, bh + 4, 3);
        ctx.fill();
        // fill bar
        const fillColor = s.qtePower >= 0.40 && s.qtePower <= 0.65 ? '#00FF88'
                        : s.qtePower >= 0.25 && s.qtePower <= 0.75 ? '#FFD700'
                        : '#FF4444';
        ctx.fillStyle = fillColor;
        roundRect(ctx, bx, by, bw * s.qtePower, bh, 3);
        ctx.fill();
        ctx.restore();
      }

      // floating texts
      s.floats = s.floats.filter(ft => ft.life > 0);
      s.floats.forEach(ft => {
        ft.y += ft.vy;
        ft.life -= 1;
        ft.alpha = ft.life / 80;
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // HUD
      // left: score + tool
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, 8, 8, 180, 44, 10);
      ctx.fill();
      ctx.fillStyle = '#A5D6A7';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('采集得分：' + s.score, 16, 26);
      ctx.fillStyle = '#FFD9A0';
      ctx.font = '11px sans-serif';
      ctx.fillText('工具：' + (s.tool === 'sickle' ? '药镰' : '药锄'), 16, 44);

      // combo badge
      if (s.comboActive) {
        const cx = W / 2;
        ctx.save();
        ctx.fillStyle = 'rgba(255,180,0,0.22)';
        roundRect(ctx, cx - 70, 6, 140, 28, 10);
        ctx.fill();
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('药王附体 ' + Math.ceil(s.comboTimer / 60) + 's', cx, 25);
        ctx.restore();
      }

      // poisoned overlay
      if (s.poisoned) {
        ctx.save();
        ctx.fillStyle = 'rgba(50,200,50,0.07)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // check all collected
      const remaining = s.herbs.filter(h => {
        if (h.collected) return false;
        if (h.kind === 'rain' && !s.raining) return false; // invisible herbs don't count
        return true;
      }).length;
      if (remaining === 0) { onFinish?.(); return; }

      s.animId = requestAnimationFrame(loop);
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', width: '100%', maxWidth: W, borderRadius: '12px', cursor: 'crosshair' }}
    />
  );
}

export default HerbGame;
