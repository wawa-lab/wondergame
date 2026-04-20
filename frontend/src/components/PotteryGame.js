import React, { useEffect, useRef, useCallback } from 'react';

function clamp(v, mn, mx) {
  return Math.max(mn, Math.min(mx, v));
}

// 兼容不支持 roundRect 的浏览器
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 制陶烧窑 Canvas 游戏 v2
 * - 饱满的陶轮场景：工坊背景、窑炉、转盘
 * - A/D 键控转速，鼠标按住左右拖动塑形
 * - 滚轮调接触层数
 * - 火焰粒子、泥土飞溅粒子
 * - 转速过高 + 大幅形变 => 陶胚断裂
 */
function PotteryGame({ addScore, ended }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const keysRef   = useRef({});

  const W = 600, H = 400;
  const LAYERS = 24;
  const LAYER_H = 220 / LAYERS;
  const BASE_Y  = H - 70;
  const CX      = W / 2;

  const initState = useCallback(() => {
    const radii = [];
    for (let i = 0; i < LAYERS; i++) {
      const t = i / (LAYERS - 1);
      // 陶瓶形状：底部窄，中部宽，口部略收
      radii.push(12 + 58 * Math.sin(t * Math.PI) * (t < 0.55 ? 1 : 0.72) + 4);
    }
    stateRef.current = {
      radii,
      rpm: 0,
      rotation: 0,
      mouseDown: false,
      mouseX: 0,
      mouseY: 0,
      brushSize: 3,
      failed: false,
      time: 0,
      particles: [],       // 泥土飞溅
      flames: [],          // 窑火火焰粒子
      smokeParticles: [],  // 烟雾
      handY: 0,            // 工匠手部位置动画
      wobble: 0,           // 陶胚晃动（失败时）
      wobbleV: 0,
    };
  }, []);

  // 生成火焰粒子
  const spawnFlame = useCallback((s) => {
    const flameX = W - 115 + (Math.random() - 0.5) * 28;
    const flameBaseY = H - 30;
    s.flames.push({
      x: flameX,
      y: flameBaseY,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(1.5 + Math.random() * 2.5),
      life: 1,
      r: 6 + Math.random() * 10,
      hue: 15 + Math.random() * 35,
    });
  }, []);

  const spawnSmoke = useCallback((s) => {
    s.smokeParticles.push({
      x: W - 115 + (Math.random() - 0.5) * 20,
      y: H - 80,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.6 + Math.random() * 0.8),
      life: 1,
      r: 8 + Math.random() * 14,
    });
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;
    ctx.clearRect(0, 0, W, H);

    // ── 背景：工坊内景 ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0e08');
    bg.addColorStop(0.6, '#2e1508');
    bg.addColorStop(1, '#1a0a04');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 地面
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(0, H - 55, W, 55);
    ctx.fillStyle = 'rgba(80,40,10,0.4)';
    for (let i = 0; i < W; i += 38) {
      ctx.fillRect(i, H - 55, 36, 2);
    }

    // 左侧墙面纹理
    ctx.fillStyle = 'rgba(60,30,10,0.35)';
    for (let y = 20; y < H - 55; y += 28) {
      ctx.fillRect(0, y, 80 + Math.sin(y * 0.1) * 10, 1);
    }

    // ── 右侧窑炉 ──
    const kilnX = W - 130, kilnY = H - 55, kilnW = 110, kilnH = 120;
    // 窑炉主体
    const kilnGrad = ctx.createLinearGradient(kilnX, kilnY - kilnH, kilnX + kilnW, kilnY);
    kilnGrad.addColorStop(0, '#5a2a10');
    kilnGrad.addColorStop(0.5, '#7a3a18');
    kilnGrad.addColorStop(1, '#3a1a08');
    ctx.fillStyle = kilnGrad;
    roundRect(ctx, kilnX, kilnY - kilnH, kilnW, kilnH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,120,40,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 窑口（拱形）
    ctx.fillStyle = '#0a0400';
    ctx.beginPath();
    ctx.ellipse(kilnX + kilnW / 2, kilnY - 18, 28, 34, 0, Math.PI, 0);
    ctx.fill();
    // 窑口内发光
    const fireGlow = ctx.createRadialGradient(kilnX + kilnW / 2, kilnY - 18, 2, kilnX + kilnW / 2, kilnY - 18, 30);
    fireGlow.addColorStop(0, 'rgba(255,160,40,0.7)');
    fireGlow.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.ellipse(kilnX + kilnW / 2, kilnY - 18, 28, 34, 0, Math.PI, 0);
    ctx.fill();

    // 窑炉砖纹
    ctx.strokeStyle = 'rgba(100,50,15,0.6)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      const rowY = kilnY - kilnH + 20 + row * 22;
      const offset = (row % 2) * 18;
      for (let col = -1; col < 4; col++) {
        const bx = kilnX + 6 + col * 28 + offset;
        ctx.strokeRect(bx, rowY, 24, 18);
      }
    }

    // 窑炉烟囱
    ctx.fillStyle = '#4a2010';
    ctx.fillRect(kilnX + kilnW / 2 - 10, kilnY - kilnH - 30, 20, 34);
    ctx.strokeStyle = 'rgba(150,80,30,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(kilnX + kilnW / 2 - 10, kilnY - kilnH - 30, 20, 34);

    // ── 烟雾粒子 ──
    ctx.save();
    s.smokeParticles = s.smokeParticles.filter(p => p.life > 0);
    s.smokeParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vx += (Math.random() - 0.5) * 0.1;
      p.life -= 0.012;
      ctx.globalAlpha = p.life * 0.28;
      ctx.fillStyle = `rgb(120,80,50)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1.5 - p.life), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // ── 火焰粒子 ──
    ctx.save();
    s.flames = s.flames.filter(p => p.life > 0);
    s.flames.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx += (Math.random() - 0.5) * 0.15;
      p.life -= 0.028;
      const alpha = p.life * 0.88;
      const r = p.r * p.life;
      const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      fg.addColorStop(0, `hsla(${p.hue + 20},100%,80%,${alpha})`);
      fg.addColorStop(0.5, `hsla(${p.hue},100%,55%,${alpha * 0.7})`);
      fg.addColorStop(1, `hsla(${p.hue - 10},100%,30%,0)`);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // ── 陶轮工作台 ──
    // 工作台桌面
    const tableGrad = ctx.createLinearGradient(CX - 130, 0, CX + 130, 0);
    tableGrad.addColorStop(0, '#4a2808');
    tableGrad.addColorStop(0.5, '#6a3c18');
    tableGrad.addColorStop(1, '#4a2808');
    ctx.fillStyle = tableGrad;
    roundRect(ctx, CX - 130, BASE_Y - 8, 260, 30, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,100,40,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 桌腿
    ctx.fillStyle = '#3a1a08';
    ctx.fillRect(CX - 120, BASE_Y + 22, 18, H - BASE_Y - 22);
    ctx.fillRect(CX + 102, BASE_Y + 22, 18, H - BASE_Y - 22);

    // 陶轮转盘
    const diskGrad = ctx.createRadialGradient(CX, BASE_Y - 2, 6, CX, BASE_Y - 2, 86);
    diskGrad.addColorStop(0, '#9a6030');
    diskGrad.addColorStop(0.6, '#6a3a18');
    diskGrad.addColorStop(1, '#3a1808');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(CX, BASE_Y - 2, 86, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,150,70,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 转盘辐射纹路（随转速旋转）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,190,100,0.22)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const a = s.rotation + (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * 8, BASE_Y - 2 + Math.sin(a) * 1.3);
      ctx.lineTo(CX + Math.cos(a) * 82, BASE_Y - 2 + Math.sin(a) * 12);
      ctx.stroke();
    }
    // 中心圆
    ctx.fillStyle = 'rgba(180,100,40,0.8)';
    ctx.beginPath();
    ctx.ellipse(CX, BASE_Y - 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 陶胚 ──
    if (!s.failed) {
      const wobX = s.wobble * 0.5;

      // 构建截面曲线点
      const rPts = [], lPts = [];
      for (let i = 0; i < LAYERS; i++) {
        const y = BASE_Y - 14 - i * LAYER_H;
        rPts.push({ x: CX + s.radii[i] + wobX * (i / LAYERS), y });
        lPts.push({ x: CX - s.radii[i] + wobX * (i / LAYERS), y });
      }

      // 陶胚主体填充
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(CX + wobX * 0.1, BASE_Y - 6);
      ctx.lineTo(rPts[0].x, rPts[0].y);
      for (let i = 1; i < rPts.length; i++) {
        const p0 = rPts[i - 1], p1 = rPts[i];
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      }
      const tR = rPts[rPts.length - 1], tL = lPts[lPts.length - 1];
      ctx.lineTo(tR.x, tR.y);
      ctx.quadraticCurveTo(tR.x, tR.y - 6, (tR.x + tL.x) / 2, tR.y - 9);
      ctx.quadraticCurveTo(tL.x, tL.y - 6, tL.x, tL.y);
      for (let i = lPts.length - 2; i >= 0; i--) {
        const p0 = lPts[i + 1], p1 = lPts[i];
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      }
      ctx.lineTo(lPts[0].x, lPts[0].y);
      ctx.lineTo(CX + wobX * 0.1, BASE_Y - 6);
      ctx.closePath();

      // 陶土颜色渐变（左右 + 上下）
      const clayGrad = ctx.createLinearGradient(CX - 110, 0, CX + 110, 0);
      clayGrad.addColorStop(0, '#5a2a10');
      clayGrad.addColorStop(0.2, '#a05828');
      clayGrad.addColorStop(0.45, '#c87848');
      clayGrad.addColorStop(0.55, '#d4906a');
      clayGrad.addColorStop(0.8, '#a05828');
      clayGrad.addColorStop(1, '#5a2a10');
      ctx.fillStyle = clayGrad;
      ctx.fill();

      // 高光（左侧反光）
      const hlGrad = ctx.createLinearGradient(CX - 90, 0, CX - 20, 0);
      hlGrad.addColorStop(0, 'rgba(255,220,160,0)');
      hlGrad.addColorStop(0.4, 'rgba(255,220,160,0.18)');
      hlGrad.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = hlGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,210,160,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 高速旋转条纹
      if (s.rpm > 10) {
        const al = Math.min(0.4, s.rpm / 220);
        ctx.save();
        ctx.globalAlpha = al;
        ctx.strokeStyle = 'rgba(255,240,200,0.9)';
        ctx.lineWidth = 0.7;
        for (let i = 1; i < LAYERS - 1; i += 3) {
          const ry = BASE_Y - 14 - i * LAYER_H;
          const rr = s.radii[i] + wobX * (i / LAYERS);
          ctx.beginPath(); ctx.moveTo(CX - rr + 6, ry); ctx.lineTo(CX - rr + 2, ry); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(CX + rr - 6, ry); ctx.lineTo(CX + rr - 2, ry); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();

      // 工匠手部（鼠标按住时显示）
      if (s.mouseDown && s.rpm > 4) {
        const li = Math.floor(((BASE_Y - 14 - s.mouseY) / (LAYERS * LAYER_H)) * LAYERS);
        if (li >= 0 && li < LAYERS) {
          // 塑形接触区高亮
          const lo = clamp(li - s.brushSize, 0, LAYERS - 1);
          const hi = clamp(li + s.brushSize, 0, LAYERS - 1);
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,120,0.08)';
          ctx.fillRect(CX - 120, BASE_Y - 14 - hi * LAYER_H - LAYER_H / 2, 240, (hi - lo + 1) * LAYER_H + LAYER_H);
          ctx.strokeStyle = 'rgba(255,230,80,0.65)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          const ty = BASE_Y - 14 - li * LAYER_H;
          ctx.beginPath(); ctx.moveTo(CX - 140, ty); ctx.lineTo(CX + 140, ty); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // 手部图标（简化为工具符号）
          const handSide = s.mouseX > CX ? 1 : -1;
          const handX = CX + handSide * (s.radii[li] + 22);
          ctx.save();
          ctx.font = '22px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.85;
          ctx.fillText('🤚', handX, ty);
          ctx.restore();
        }
      }
    } else {
      // 断裂失败画面
      ctx.save();
      ctx.fillStyle = 'rgba(255,60,30,0.12)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = 'bold 34px serif';
      ctx.fillStyle = '#FF7060';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💥 陶胚断裂！', CX, H / 2 - 18);
      ctx.font = '16px serif';
      ctx.fillStyle = 'rgba(255,200,180,0.85)';
      ctx.fillText('转速过高，形变率超限', CX, H / 2 + 20);
      ctx.font = '13px serif';
      ctx.fillStyle = 'rgba(255,180,140,0.6)';
      ctx.fillText('继续塑形可重新累积分数', CX, H / 2 + 46);
      ctx.restore();
    }

    // ── 泥土飞溅粒子 ──
    ctx.save();
    s.particles = s.particles.filter(p => p.life > 0);
    s.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.vx *= 0.98; p.life -= 0.038;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life + 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // ── HUD 转速仪表 ──
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, 10, 10, 210, 100, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(200,150,60,0.4)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = '#FFD7A8'; ctx.font = 'bold 11px serif'; ctx.textAlign = 'left';
    ctx.fillText('🏺 制陶烧窑', 20, 28);

    ctx.font = '10px serif'; ctx.fillStyle = 'rgba(255,210,150,0.8)';
    ctx.fillText('A/D 键 — 减速 / 加速', 20, 46);
    ctx.fillText('鼠标拖拽 — 塑形陶胚', 20, 60);
    ctx.fillText('滚轮 — 调节接触层数 (' + s.brushSize + '层)', 20, 74);

    // 转速显示
    const rpmColor = s.rpm > 160 ? '#FF5555' : s.rpm > 80 ? '#FFD055' : '#55E855';
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = rpmColor;
    ctx.fillText('RPM ' + String(Math.round(s.rpm)).padStart(3, '0'), 20, 94);

    // 转速条
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(80, 84, 128, 8);
    const rg = ctx.createLinearGradient(80, 0, 208, 0);
    rg.addColorStop(0, '#4ade80'); rg.addColorStop(0.55, '#facc15'); rg.addColorStop(1, '#ef4444');
    ctx.fillStyle = rg; ctx.fillRect(80, 84, 128 * clamp(s.rpm / 200, 0, 1), 8);
    ctx.restore();

    // ── 右上角得分提示 ──
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, W - 130, 10, 118, 42, 10); ctx.fill();
    ctx.fillStyle = '#FDE68A'; ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
    ctx.fillText('持续塑形 +1分/次', W - 71, 28);
    ctx.fillStyle = 'rgba(255,200,100,0.7)'; ctx.font = '10px serif';
    ctx.fillText('高速旋转中得分更高', W - 71, 44);
    ctx.restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loopFn = useCallback(() => {
    const s = stateRef.current;
    if (!s || ended) return;
    s.time++;

    // 转速自然衰减
    s.rpm = Math.max(0, s.rpm - 0.6);
    // 键盘控速
    if (keysRef.current['a'] || keysRef.current['arrowleft']) s.rpm = Math.max(0, s.rpm - 3.2);
    if (keysRef.current['d'] || keysRef.current['arrowright']) s.rpm = Math.min(200, s.rpm + 4.2);
    // 旋转角
    s.rotation += (s.rpm / 60) * (2 * Math.PI) / 60;

    // 陶胚晃动衰减
    if (s.failed) {
      s.wobbleV += -s.wobble * 0.15 + (Math.random() - 0.5) * 0.5;
      s.wobble += s.wobbleV;
      s.wobbleV *= 0.88;
    } else {
      s.wobble *= 0.9;
    }

    // 塑形逻辑
    if (s.mouseDown && !s.failed) {
      const li = Math.floor(((BASE_Y - 14 - s.mouseY) / (LAYERS * LAYER_H)) * LAYERS);
      if (li >= 0 && li < LAYERS) {
        const targetR = clamp(Math.abs(s.mouseX - CX), 8, 108);
        const morphSpeed = clamp(s.rpm / 90, 0, 1) * 0.2;
        if (morphSpeed > 0.004) {
          const delta = Math.abs(targetR - s.radii[li]);
          // 断裂判定
          if (delta > 48 + (200 - s.rpm) * 0.12 && s.rpm > 110) {
            s.failed = true;
            s.wobble = 8;
            for (let i = 0; i < 28; i++) {
              const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 7;
              s.particles.push({
                x: CX, y: BASE_Y - 120,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5,
                r: 3 + Math.random() * 6, life: 1,
                color: `hsl(${18 + Math.random() * 25},68%,${45 + Math.random() * 15}%)`,
              });
            }
            addScore(2);
          } else {
            for (let di = -s.brushSize; di <= s.brushSize; di++) {
              const idx = clamp(li + di, 0, LAYERS - 1);
              const w = 1 - Math.abs(di) / (s.brushSize + 1);
              s.radii[idx] = clamp(s.radii[idx] + (targetR - s.radii[idx]) * morphSpeed * w, 8, 108);
            }
            // 泥土飞溅
            if (s.rpm > 20 && Math.random() < 0.14) {
              const side = Math.random() < 0.5 ? -1 : 1;
              s.particles.push({
                x: CX + side * s.radii[li],
                y: BASE_Y - 14 - li * LAYER_H,
                vx: side * (1 + Math.random() * 3.5),
                vy: -Math.random() * 2.5,
                r: 1.5 + Math.random() * 3.5,
                life: 0.65 + Math.random() * 0.35,
                color: `hsl(${22 + Math.random() * 14},62%,${42 + Math.random() * 12}%)`,
              });
            }
          }
        }
      }
    }

    // 持续塑形得分（每50帧，需要有一定转速）
    if (s.time % 50 === 0 && !s.failed && s.rpm > 18) addScore(1);

    // 窑炉火焰
    if (s.time % 3 === 0) spawnFlame(s);
    if (s.time % 12 === 0) spawnSmoke(s);

    drawFrame();
    rafRef.current = requestAnimationFrame(loopFn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawFrame, addScore, ended, spawnFlame, spawnSmoke]);

  useEffect(() => {
    initState();
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onKD = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    };
    const onKU = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const s = stateRef.current; if (!s) return;
      s.brushSize = clamp(s.brushSize + (e.deltaY < 0 ? 1 : -1), 1, 8);
    };
    const getXY = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };
    const onMD = (e) => {
      const s = stateRef.current; if (!s) return;
      const p = getXY(e); s.mouseDown = true; s.mouseX = p.x; s.mouseY = p.y;
    };
    const onMM = (e) => {
      const s = stateRef.current; if (!s) return;
      const p = getXY(e); s.mouseX = p.x; s.mouseY = p.y;
    };
    const onMU = () => { const s = stateRef.current; if (s) s.mouseDown = false; };

    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    rafRef.current = requestAnimationFrame(loopFn);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
    };
  }, [initState, loopFn]);

  useEffect(() => {
    if (ended && rafRef.current) cancelAnimationFrame(rafRef.current);
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
        boxShadow: '0 0 40px rgba(180,80,20,0.3)',
      }}
    />
  );
}

export default PotteryGame;
