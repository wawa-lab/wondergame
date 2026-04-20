/**
 * DanceGame.js — 霓裳古风舞蹈节奏游戏
 * QQ炫舞风格：节拍箭头从轨道底部升起，在判定线时按对应方向键
 * 古风美术：水墨渐变背景、飘落花瓣、丝带粒子特效
 */
import React, { useEffect, useRef, useCallback } from 'react';

const TRACKS = 4; // ← ↓ ↑ →
const TRACK_KEYS = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const TRACK_LABELS = ['←', '↓', '↑', '→'];
const TRACK_COLORS = ['#F472B6', '#A78BFA', '#34D399', '#FBBF24'];
const TRACK_GLOW   = ['rgba(244,114,182,0.7)', 'rgba(167,139,250,0.7)', 'rgba(52,211,153,0.7)', 'rgba(251,191,36,0.7)'];

const JUDGE_Y_RATIO = 0.82; // 判定线在画布高度的比例
const NOTE_SPEED = 640;     // px/s（canvas翻倍后同步翻倍）
const PERFECT_WINDOW = 55;  // ms
const GOOD_WINDOW    = 110;
const MISS_WINDOW    = 160;

// 谱面：每个音符 { track: 0-3, time: ms }，覆盖约100秒
function buildChart(difficulty = 1) {
  const bpm = 100 + difficulty * 10;
  const beat = 60000 / bpm;
  const chart = [];
  // 100s 内可容纳的拍数（留1.5s前奏 + 1s尾部）
  const totalBeats = Math.floor((98000) / beat);
  for (let b = 0; b < totalBeats; b++) {
    const t = 1500 + b * beat;
    // 基础单音
    chart.push({ track: b % 4, time: t });
    // 每4拍加一个副音
    if (b % 4 === 3) {
      chart.push({ track: (b + 2) % 4, time: t + beat * 0.5 });
    }
    // 中段加密（20-60拍）
    if (b >= 20 && b < 60 && b % 2 === 1) {
      chart.push({ track: (b + 1) % 4, time: t + beat * 0.25 });
    }
    // 后段加密（80拍后）
    if (b >= 80 && b % 3 === 0) {
      chart.push({ track: (b + 3) % 4, time: t + beat * 0.5 });
      chart.push({ track: (b + 1) % 4, time: t + beat * 0.75 });
    }
  }
  return chart.sort((a, b) => a.time - b.time);
}

// 花瓣粒子
function makePetals(count) {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 3 + Math.random() * 5,
    vx: (Math.random() - 0.5) * 0.15,
    vy: 0.05 + Math.random() * 0.12,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.04,
    alpha: 0.4 + Math.random() * 0.5,
    hue: 320 + Math.random() * 40,
  }));
}

// 方向键 → 姿势名映射
const POSE_MAP_KEYS = ['left', 'down', 'up', 'right'];

// 舞姿图片映射：方向键 → 图片路径
const POSE_IMGS = {
  idle:  '/assets/character/outfits/age17_dress1.png',
  left:  '/assets/character/dance/left.png',
  down:  '/assets/character/dance/down.png',
  up:    '/assets/character/dance/up.png',
  right: '/assets/character/dance/right.png',
};

export default function DanceGame({ addScore, ended, onFinish }) {
  const canvasRef   = useRef(null);
  const dancerImgs  = useRef({});   // { idle, left, down, up, right } → Image对象
  const stateRef    = useRef({
    notes: [],
    petals: makePetals(28),
    keyDown: [false, false, false, false],
    keyFlash: [0, 0, 0, 0],
    judgements: [],
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    startTime: null,
    chartIndex: 0,
    chart: buildChart(1),
    finished: false,
    ribbons: [],
    bg: { phase: 0 },
    dancer: {
      bobPhase: 0,
      glowAlpha: 0,
      currentPose: 'idle',   // 当前显示的姿势名
      poseTimer: 0,          // 姿势持续计时 ms
      frameAlpha: 1,         // 当前帧透明度（用于淡入）
      torso: 0,              // 身体倾斜（用于律动）
      targetTorso: 0,
    },
  });
  const rafRef    = useRef(null);
  const lastTRef  = useRef(null);

  // 预加载所有舞姿图片
  useEffect(() => {
    Object.entries(POSE_IMGS).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { dancerImgs.current[key] = img; };
    });
  }, []);

  // 判定
  const judge = useCallback((trackIdx) => {
    const s = stateRef.current;
    if (!s.startTime) return;
    const now = performance.now() - s.startTime;
    const W = 0; // canvas width placeholder — use stateRef canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const judgeY = canvas.height * JUDGE_Y_RATIO;
    const trackW = canvas.width / TRACKS;
    const cx = trackW * trackIdx + trackW / 2;

    // Find closest unhit note on this track
    let best = null, bestDist = Infinity;
    for (const n of s.notes) {
      if (n.track !== trackIdx || n.hit !== null) continue;
      const dist = Math.abs(now - n.time);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    if (!best || bestDist > MISS_WINDOW) {
      // Empty press — small penalty visual
      s.judgements.push({ text: '空', x: cx, y: judgeY - 20, alpha: 1, color: '#aaa', vy: -1.5 });
      return;
    }

    best.hit = true;
    let text, color, pts;
    if (bestDist <= PERFECT_WINDOW) {
      text = 'Perfect!'; color = '#FFD700'; pts = 10;
      s.perfect++;
    } else if (bestDist <= GOOD_WINDOW) {
      text = 'Good'; color = '#34D399'; pts = 6;
      s.good++;
    } else {
      text = 'Late'; color = '#FB923C'; pts = 2;
      s.good++;
    }
    s.combo++;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
    const bonus = Math.floor(s.combo / 10);
    addScore(pts + bonus);
    s.judgements.push({ text, x: cx, y: judgeY - 30, alpha: 1, color, vy: -2 });

    // Ribbon burst
    for (let i = 0; i < 6; i++) {
      s.ribbons.push({
        x: cx / canvas.width,
        y: judgeY / canvas.height,
        vx: (Math.random() - 0.5) * 0.012,
        vy: -0.008 - Math.random() * 0.01,
        len: 20 + Math.random() * 30,
        alpha: 1,
        hue: TRACK_COLORS[trackIdx],
        rot: Math.random() * Math.PI,
      });
    }
  }, [addScore]);

  useEffect(() => {
    if (ended) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    s.startTime = null;
    s.chartIndex = 0;
    s.chart = buildChart(1);
    s.notes = [];
    s.combo = 0; s.perfect = 0; s.good = 0; s.miss = 0;
    lastTRef.current = null;

    // 方向键 → 舞者姿势映射（与 POSE_MAP_KEYS 一致）
    const onKey = (e) => {
      const idx = TRACK_KEYS.indexOf(e.key);
      if (idx === -1) return;
      e.preventDefault();
      if (s.keyDown[idx]) return;
      s.keyDown[idx] = true;
      s.keyFlash[idx] = 180;
      // 切换舞者图片姿势
      s.dancer.currentPose = POSE_MAP_KEYS[idx];
      s.dancer.poseTimer = 420;   // 持续420ms后回idle
      s.dancer.glowAlpha = 1.0;
      s.dancer.frameAlpha = 0.0;  // 触发淡入
      s.dancer.targetTorso = (idx === 0 ? -1 : idx === 3 ? 1 : 0); // 左右倾斜
      judge(idx);
    };
    const onKeyUp = (e) => {
      const idx = TRACK_KEYS.indexOf(e.key);
      if (idx !== -1) s.keyDown[idx] = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    function drawBg(ctx, W, H, phase) {
      // 水墨渐变背景
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `hsl(${320 + Math.sin(phase) * 10}, 40%, 8%)`);
      grad.addColorStop(0.5, `hsl(${280 + Math.cos(phase * 0.7) * 8}, 35%, 12%)`);
      grad.addColorStop(1, `hsl(${260}, 30%, 6%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 远景山水轮廓
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#C084FC';
      // 山1
      ctx.beginPath();
      ctx.moveTo(0, H * 0.55);
      ctx.bezierCurveTo(W * 0.15, H * 0.3, W * 0.3, H * 0.25, W * 0.5, H * 0.35);
      ctx.bezierCurveTo(W * 0.7, H * 0.45, W * 0.85, H * 0.28, W, H * 0.4);
      ctx.lineTo(W, H * 0.55); ctx.closePath(); ctx.fill();
      // 山2
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#818CF8';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.65);
      ctx.bezierCurveTo(W * 0.2, H * 0.42, W * 0.4, H * 0.38, W * 0.6, H * 0.5);
      ctx.bezierCurveTo(W * 0.75, H * 0.58, W * 0.9, H * 0.4, W, H * 0.52);
      ctx.lineTo(W, H * 0.65); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // 绘制古风舞者人物（PNG图片分左右两半，各自绕肩旋转实现手臂晃动）
    function drawDancer(ctx, W, H, dt) {
      const d = s.dancer;
      const imgs = dancerImgs.current;

      // 更新律动
      d.bobPhase += dt * 0.003;

      // 姿势计时器 → 回idle
      if (d.poseTimer > 0) {
        d.poseTimer -= dt;
        if (d.poseTimer <= 0) {
          d.currentPose = 'idle';
          d.poseTimer = 0;
          d.frameAlpha = 0.0; // 切回idle时也淡入
          d.targetTorso = 0;
        }
      }

      // 身体倾斜插值
      d.torso += (d.targetTorso - d.torso) * Math.min(1, dt * 0.01);

      // 淡入当前帧
      d.frameAlpha = Math.min(1, d.frameAlpha + dt * 0.012);

      // 发光衰减
      d.glowAlpha = Math.max(0, d.glowAlpha - dt * 0.003);

      const img = imgs[d.currentPose] || imgs.idle;
      if (!img) return;

      const cx   = W * 0.5;
      const cy   = H * 0.78;
      const bob  = Math.sin(d.bobPhase) * 3;
      const imgH = H * 0.72; // 随canvas高度自适应，充分利用分辨率
      const imgW = (img.naturalWidth / img.naturalHeight) * imgH;

      const bodySwing = d.torso * 0.06 + Math.sin(d.bobPhase * 0.8) * 0.018;
      const sway      = d.torso * 5;

      ctx.save();
      ctx.translate(cx + sway, cy + bob);
      ctx.rotate(bodySwing);

      // 发光光晕
      if (d.glowAlpha > 0) {
        const grd = ctx.createRadialGradient(0, -imgH * 0.5, 10, 0, -imgH * 0.5, 110);
        grd.addColorStop(0, `rgba(180,230,180,${d.glowAlpha * 0.4})`);
        grd.addColorStop(1, 'rgba(180,230,180,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, -imgH * 0.5, 200, 0, Math.PI * 2); ctx.fill();
      }

      // 绘制当前姿势图片（带淡入）
      ctx.globalAlpha = d.frameAlpha;
      ctx.drawImage(img, -imgW / 2, -imgH, imgW, imgH);

      ctx.restore();
    }

    function drawPetals(ctx, W, H, dt) {
      for (const p of s.petals) {
        p.x += p.vx * dt * 0.001;
        p.y += p.vy * dt * 0.001;
        p.rot += p.vr;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        ctx.save();
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.translate(p.x * W, p.y * H);
        ctx.rotate(p.rot);
        ctx.fillStyle = `hsl(${p.hue}, 80%, 75%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawRibbons(ctx, W, H, dt) {
      for (let i = s.ribbons.length - 1; i >= 0; i--) {
        const r = s.ribbons[i];
        r.x += r.vx; r.y += r.vy; r.alpha -= dt * 0.0015; r.rot += 0.06;
        if (r.alpha <= 0) { s.ribbons.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = r.hue;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.translate(r.x * W, r.y * H);
        ctx.rotate(r.rot);
        ctx.beginPath();
        ctx.moveTo(-r.len / 2, 0);
        ctx.bezierCurveTo(-r.len / 4, -r.len * 0.3, r.len / 4, r.len * 0.3, r.len / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawTracks(ctx, W, H) {
      const trackW = W / TRACKS;
      const judgeY = H * JUDGE_Y_RATIO;
      for (let i = 0; i < TRACKS; i++) {
        const x = i * trackW;
        // Track lane
        const lg = ctx.createLinearGradient(x, 0, x + trackW, 0);
        lg.addColorStop(0, 'rgba(0,0,0,0)');
        lg.addColorStop(0.5, `rgba(${hexToRgb(TRACK_COLORS[i])},0.06)`);
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, 0, trackW, H);

        // Lane divider
        if (i > 0) {
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 8]);
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Key flash
        if (s.keyFlash[i] > 0) {
          ctx.save();
          ctx.globalAlpha = s.keyFlash[i] / 180 * 0.35;
          ctx.fillStyle = TRACK_COLORS[i];
          ctx.fillRect(x, judgeY - 40, trackW, 55);
          ctx.restore();
        }

        // Judge zone ring
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.004 + i) * 0.15;
        ctx.strokeStyle = TRACK_COLORS[i];
        ctx.lineWidth = 2.5;
        const cx = x + trackW / 2;
        ctx.beginPath();
        ctx.arc(cx, judgeY, trackW * 0.20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Key label
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = TRACK_COLORS[i];
        ctx.font = `bold ${Math.floor(trackW * 0.18)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TRACK_LABELS[i], x + trackW / 2, judgeY);
        ctx.restore();
      }

      // Judge line
      ctx.save();
      ctx.globalAlpha = 0.6;
      const jg = ctx.createLinearGradient(0, judgeY, W, judgeY);
      jg.addColorStop(0, 'rgba(255,255,255,0)');
      jg.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      jg.addColorStop(0.7, 'rgba(255,255,255,0.8)');
      jg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = jg;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, judgeY); ctx.lineTo(W, judgeY); ctx.stroke();
      ctx.restore();
    }

    function drawNotes(ctx, W, H) {
      const trackW = W / TRACKS;
      const judgeY = H * JUDGE_Y_RATIO;
      for (const n of s.notes) {
        if (n.hit !== null) continue;
        const cx = n.track * trackW + trackW / 2;
        const r = trackW * 0.18;
        // Glow
        ctx.save();
        ctx.globalAlpha = 0.5;
        const grad = ctx.createRadialGradient(cx, n.y, 0, cx, n.y, r * 1.8);
        grad.addColorStop(0, TRACK_GLOW[n.track]);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, n.y, r * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Note body
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = TRACK_COLORS[n.track];
        ctx.shadowColor = TRACK_COLORS[n.track];
        ctx.shadowBlur = 28;
        ctx.beginPath(); ctx.arc(cx, n.y, r, 0, Math.PI * 2); ctx.fill();

        // Arrow
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(r * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TRACK_LABELS[n.track], cx, n.y);
        ctx.restore();
      }
    }

    function drawJudgements(ctx, dt) {
      for (let i = s.judgements.length - 1; i >= 0; i--) {
        const j = s.judgements[i];
        j.y += j.vy; j.alpha -= dt * 0.002;
        if (j.alpha <= 0) { s.judgements.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = j.alpha;
        ctx.fillStyle = j.color;
        ctx.font = `bold 36px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(j.text, j.x, j.y);
        ctx.restore();
      }
    }

    function drawHUD(ctx, W, H) {
      // Combo
      if (s.combo >= 5) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${Math.min(64, 36 + s.combo)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 24;
        ctx.fillText(`${s.combo} COMBO`, W / 2, H * 0.12);
        ctx.restore();
      }
    }

    function loop(ts) {
      if (ended || s.finished) return;
      const dt = lastTRef.current ? ts - lastTRef.current : 16;
      lastTRef.current = ts;
      if (!s.startTime) s.startTime = ts;
      const elapsed = ts - s.startTime;

      s.bg.phase += dt * 0.0005;

      // Spawn notes
      const judgeY = canvas.height * JUDGE_Y_RATIO;
      const spawnY = -80;
      const travelTime = ((judgeY - spawnY) / NOTE_SPEED) * 1000;
      while (s.chartIndex < s.chart.length && s.chart[s.chartIndex].time <= elapsed + travelTime) {
        const c = s.chart[s.chartIndex++];
        s.notes.push({ track: c.track, time: c.time, y: spawnY, hit: null });
      }

      // Update notes
      for (let i = s.notes.length - 1; i >= 0; i--) {
        const n = s.notes[i];
        if (n.hit !== null) { s.notes.splice(i, 1); continue; }
        n.y += NOTE_SPEED * dt / 1000;
        if (n.y > canvas.height + 80) {
          // Miss
          s.notes.splice(i, 1);
          s.miss++;
          s.combo = 0;
          const cx = n.track * (canvas.width / TRACKS) + (canvas.width / TRACKS) / 2;
          s.judgements.push({ text: 'Miss', x: cx, y: judgeY - 10, alpha: 1, color: '#EF4444', vy: -1.2 });
        }
      }

      // Key flash decay
      for (let i = 0; i < TRACKS; i++) {
        if (s.keyFlash[i] > 0) s.keyFlash[i] = Math.max(0, s.keyFlash[i] - dt * 0.8);
      }

      // Draw
      const W = canvas.width, H = canvas.height;
      drawBg(ctx, W, H, s.bg.phase);
      drawPetals(ctx, W, H, dt);
      drawDancer(ctx, W, H, dt);  // 舞者人物（在轨道之后，在音符之前）
      drawRibbons(ctx, W, H, dt);
      drawTracks(ctx, W, H);
      drawNotes(ctx, W, H);
      drawJudgements(ctx, dt);
      drawHUD(ctx, W, H);

      // End check
      if (s.chartIndex >= s.chart.length && s.notes.length === 0 && elapsed > 2000) {
        s.finished = true;
        onFinish();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [ended, judge, onFinish]);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={1440}
        height={960}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 16, imageRendering: 'crisp-edges' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)',
        pointerEvents: 'none',
      }}>
        ← ↓ ↑ → 方向键 · 节拍准确按下
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
