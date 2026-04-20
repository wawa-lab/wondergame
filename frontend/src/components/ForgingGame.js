import React, { useEffect, useRef, useCallback } from 'react';

/**
 * 《铁与烬》打铁锻造游戏 v3
 *
 * 三阶段状态机：
 *   FURNACE  熔炉  — Q键鼓风，将温度推入"完美区间"后取出
 *   ANVIL    铁砧  — 鼠标点击随机出现的节点，节奏缩圈判定 Perfect/Good/Miss，Combo倍率
 *   QUENCH   淬火  — 滑块QTE，Space在蓝色区间按下完成定型
 *
 * 技能键：
 *   Space  冲刺移动（FURNACE/ANVIL→QUENCH）/ 淬火确认
 *   Q      风箱鼓风（FURNACE区）
 *   E      凝神·子弹时间（停止温度流失3s，自动吸附，CD 10s）
 *   R      符文共鸣（满怒气，接下来5次必定Perfect）
 *
 * 得分权重：温度分20% + 锻打分50% + 淬火分30%
 */

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// 安全的圆角矩形（兼容不支持 roundRect 的浏览器）
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

const W = 620, H = 420;
const CX = W / 2, CY = H / 2;

// 阶段常量
const PHASE = { FURNACE: 'FURNACE', ANVIL: 'ANVIL', QUENCH: 'QUENCH', RESULT: 'RESULT' };

// 温度区间
const TEMP_MIN = 0, TEMP_MAX = 100;
const TEMP_PERFECT_LO = 72, TEMP_PERFECT_HI = 90;
const TEMP_MELT = 98; // 过热熔化

// 节点判定半径
const HIT_PERFECT = 14, HIT_GOOD = 28;

function ForgingGame({ addScore, ended, onFinish }) {
  const canvasRef = useRef(null);
  const sRef = useRef(null);   // 全部游戏状态
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: CX, y: CY, down: false, rightDown: false, rightStart: 0 });

  /* ─────────────── 初始化 ─────────────── */
  const init = useCallback(() => {
    sRef.current = {
      phase: PHASE.FURNACE,
      time: 0,

      // 温度
      temp: 20,
      tempScore: 0,      // 记录取出时温度分

      // 体力 / 怒气
      stamina: 100,
      rage: 0,           // 0~100

      // 技能冷却
      eCooldown: 0,      // E键冷却帧数
      eBulletTime: 0,    // 子弹时间剩余帧
      runeCount: 0,      // 符文共鸣剩余次数

      // 风箱动画
      bellowsAnim: 0,

      // 铁砧阶段
      anvilScore: 0,
      combo: 0,
      maxCombo: 0,
      targets: [],       // { x,y,born,life,radius,shrinkSpeed }
      hitFeedbacks: [],  // { x,y,text,color,life }
      hammerAnim: 0,     // 锤击动画帧 (0=静止, >0=挥动)
      hammerX: CX, hammerY: CY - 60,
      chargeStart: 0,    // 右键蓄力开始帧
      isCharging: false,
      particles: [],

      // 淬火阶段
      sliderPos: 0,      // 0~1 滑块位置
      sliderDir: 1,
      sliderSpeed: 0.008,
      quenchDone: false,
      quenchScore: 0,

      // 冲刺动画
      dashAnim: 0,
      dashDir: 0,

      // 闪烁提示
      flashMsg: '',
      flashLife: 0,

      // 最终评级
      finalGrade: '',
      finalScore: 0,

      // 烬焰粒子（背景）
      embers: Array.from({ length: 18 }, () => ({
        x: Math.random() * W,
        y: H - 20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.4 + Math.random() * 1.2),
        life: Math.random(),
        maxLife: 0.6 + Math.random() * 0.6,
        r: 1.5 + Math.random() * 3,
      })),
    };
  }, []);

  /* ─────────────── 生成节点 ─────────────── */
  const spawnTarget = useCallback(() => {
    const s = sRef.current;
    if (s.targets.length >= 5) return;
    const margin = 80;
    s.targets.push({
      x: margin + Math.random() * (W - margin * 2),
      y: 100 + Math.random() * (H - 200),
      born: s.time,
      life: 1,
      radius: 38,          // 缩圈起始半径
      shrinkSpeed: 0.012 + Math.random() * 0.008,
    });
  }, []);

  /* ─────────────── 命中判定 ─────────────── */
  const hitTarget = useCallback((mx, my, isPower) => {
    const s = sRef.current;
    let hit = false;
    s.targets = s.targets.filter(t => {
      const dist = Math.hypot(mx - t.x, my - t.y);
      // 自动吸附（子弹时间）
      const effectiveDist = s.eBulletTime > 0 ? Math.min(dist, HIT_PERFECT - 1) : dist;

      let grade = null;
      if (effectiveDist <= HIT_PERFECT) grade = 'PERFECT';
      else if (effectiveDist <= HIT_GOOD) grade = 'GOOD';
      else if (effectiveDist <= 50) grade = 'MISS';

      if (grade === null) return true; // 没打到这个节点
      hit = true;

      // 体力消耗
      const cost = isPower ? 18 : 8;
      s.stamina = Math.max(0, s.stamina - cost);

      // 得分
      let pts = 0;
      const mult = s.runeCount > 0 ? 2.0 : (1 + Math.min(s.combo, 10) * 0.1);

      if (grade === 'PERFECT' || s.runeCount > 0) {
        pts = Math.round((isPower ? 8 : 4) * mult);
        s.combo++;
        s.rage = Math.min(100, s.rage + (isPower ? 12 : 6));
        s.hitFeedbacks.push({ x: t.x, y: t.y - 20, text: s.runeCount > 0 ? '** PERFECT **' : 'PERFECT', color: '#FFD700', life: 1 });
        if (s.runeCount > 0) s.runeCount--;
      } else if (grade === 'GOOD') {
        pts = Math.round((isPower ? 4 : 2) * mult);
        s.combo++;
        s.rage = Math.min(100, s.rage + 3);
        s.hitFeedbacks.push({ x: t.x, y: t.y - 20, text: 'GOOD', color: '#88FF88', life: 1 });
      } else {
        pts = 0;
        s.combo = 0;
        s.stamina = Math.max(0, s.stamina - 10); // 空砸额外扣体力
        s.hitFeedbacks.push({ x: t.x, y: t.y - 20, text: 'MISS', color: '#FF6666', life: 1 });
      }

      s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.anvilScore += pts;
      addScore(pts);

      // 火星粒子
      for (let i = 0; i < (isPower ? 16 : 8); i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * (isPower ? 6 : 3);
        s.particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, r: 2 + Math.random() * 3, life: 0.8 + Math.random() * 0.5 });
      }
      s.hammerAnim = 12;

      return false; // 节点消除
    });

    // 打空铁砧（没命中任何节点）
    if (!hit && !s.eBulletTime) {
      s.combo = 0;
      s.stamina = Math.max(0, s.stamina - 5);
      s.hitFeedbacks.push({ x: mx, y: my, text: 'MISS', color: '#FF6666', life: 0.8 });
    }
  }, [addScore]);

  /* ─────────────── 主循环 ─────────────── */
  const loop = useCallback(() => {
    const s = sRef.current;
    if (!s || ended) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    s.time++;

    const bt = s.eBulletTime > 0; // 子弹时间中

    /* === FURNACE 阶段逻辑 === */
    if (s.phase === PHASE.FURNACE) {
      // Q键鼓风（升温加快，冷却减慢，让完美区间更容易达到）
      if (keysRef.current['q']) {
        s.temp = Math.min(TEMP_MAX, s.temp + 1.8);
        s.stamina = Math.max(0, s.stamina - 0.12);
        s.bellowsAnim = (s.bellowsAnim + 1) % 20;
      } else {
        // 自然冷却（减慢，给玩家更多操作窗口）
        s.temp = Math.max(0, s.temp - 0.03);
      }
      // 过热检查
      if (s.temp >= TEMP_MELT) {
        s.temp = 20;
        s.flashMsg = '铁料熔化！重新加热';
        s.flashLife = 90;
      }
      // Space 冲刺取出（需在完美区间）
      if (keysRef.current[' '] && !keysRef.current['_spaceConsumed']) {
        keysRef.current['_spaceConsumed'] = true;
        keysRef.current['_quenchSpaceReady'] = false; // 进入ANVIL时重置淬火标记
        if (s.temp >= TEMP_PERFECT_LO && s.temp <= TEMP_PERFECT_HI) {
          s.tempScore = 100;
          s.flashMsg = '完美出炉！';
          s.flashLife = 60;
        } else if (s.temp >= 50) {
          s.tempScore = Math.round(((s.temp - 50) / (TEMP_PERFECT_LO - 50)) * 70);
          s.flashMsg = '温度偏低，凑合用吧';
          s.flashLife = 60;
        } else {
          s.tempScore = 10;
          s.flashMsg = '温度太低，打不动！';
          s.flashLife = 60;
        }
        s.dashAnim = 20; s.dashDir = 1;
        s.phase = PHASE.ANVIL;
        // 开始生成节点
        spawnTarget();
      }
    }

    /* === ANVIL 阶段逻辑 === */
    else if (s.phase === PHASE.ANVIL) {
      // 温度持续下降（子弹时间暂停）
      if (!bt) s.temp = Math.max(0, s.temp - 0.055);

      // 体力恢复（慢速）
      s.stamina = Math.min(100, s.stamina + 0.08);

      // 冷却计时
      if (s.eCooldown > 0) s.eCooldown--;
      if (s.eBulletTime > 0) s.eBulletTime--;

      // 节点生成（每55帧一个，最多5个）
      if (s.time % 55 === 0) spawnTarget();

      // 节点缩圈 & 超时消除
      s.targets = s.targets.map(t => ({
        ...t,
        radius: Math.max(0, t.radius - t.shrinkSpeed * 40),
        life: t.life - 0.004,
      })).filter(t => t.life > 0 && t.radius > 0);

      // 右键蓄力重击
      if (mouseRef.current.rightDown && !s.isCharging) {
        s.isCharging = true;
        s.chargeStart = s.time;
      }
      if (!mouseRef.current.rightDown && s.isCharging) {
        s.isCharging = false;
        const chargeFrames = s.time - s.chargeStart;
        // 节奏缩圈：蓄力时间对应某个节点的缩圈进度
        hitTarget(mouseRef.current.x, mouseRef.current.y, true);
        s.stamina = Math.max(0, s.stamina - 12);
      }

      // 锤击动画衰减
      if (s.hammerAnim > 0) s.hammerAnim--;

      // 温度耗尽 → 淬火
      if (s.temp <= 0) {
        s.phase = PHASE.QUENCH;
        s.dashAnim = 20; s.dashDir = 1;
        s.targets = [];
        s.flashMsg = '进入淬火阶段！';
        s.flashLife = 70;
        keysRef.current['_spaceConsumed'] = true; // 防止立即触发淬火
        keysRef.current['_quenchSpaceReady'] = false;
      }

      // Space 主动进入淬火
      if (keysRef.current[' '] && !keysRef.current['_spaceConsumed']) {
        keysRef.current['_spaceConsumed'] = true;
        keysRef.current['_quenchSpaceReady'] = false; // 需重新按Space才能淬火
        s.phase = PHASE.QUENCH;
        s.dashAnim = 20; s.dashDir = 1;
        s.targets = [];
        s.stamina = Math.max(0, s.stamina - 20);
      }
    }

    /* === QUENCH 阶段逻辑 === */
    else if (s.phase === PHASE.QUENCH) {
      // 进入淬火后，等待Space键松开再重新按下才能触发淬火判定
      if (!keysRef.current[' ']) {
        keysRef.current['_quenchSpaceReady'] = true;
      }
      if (!s.quenchDone) {
        s.sliderPos += s.sliderDir * s.sliderSpeed * (bt ? 0.4 : 1);
        if (s.sliderPos >= 1) { s.sliderPos = 1; s.sliderDir = -1; }
        if (s.sliderPos <= 0) { s.sliderPos = 0; s.sliderDir = 1; }
        s.sliderSpeed = Math.min(0.022, s.sliderSpeed + 0.00008); // 越来越快

        if (keysRef.current[' '] && keysRef.current['_quenchSpaceReady'] && !keysRef.current['_spaceConsumed']) {
          keysRef.current['_spaceConsumed'] = true;
          s.quenchDone = true;
          // 判定：蓝色区间 0.38~0.62
          const pos = s.sliderPos;
          if (pos >= 0.38 && pos <= 0.62) {
            s.quenchScore = 100;
            s.flashMsg = '完美淬火！武器获得词条：锋利';
            s.flashLife = 90;
          } else if (pos >= 0.28 && pos <= 0.72) {
            s.quenchScore = 60;
            s.flashMsg = '淬火良好，稍有瑕疵';
            s.flashLife = 80;
          } else {
            s.quenchScore = 20;
            s.flashMsg = pos < 0.38 ? '太早！武器偏软' : '太晚！武器易碎';
            s.flashLife = 80;
          }
          // 结算
          setTimeout(() => {
            const ts = s.tempScore * 0.2;
            const as = Math.min(s.anvilScore, 300) / 300 * 50;
            const qs = s.quenchScore * 0.3;
            const total = Math.round(ts + as + qs);
            s.finalScore = total;
            s.finalGrade = total >= 90 ? 'SS' : total >= 75 ? 'S' : total >= 58 ? 'A' : total >= 40 ? 'B' : 'C';
            s.phase = PHASE.RESULT;
            // 向父组件报告最终得分（映射到0-35区间）
            addScore(Math.round(total * 0.35));
            // 3秒后通知父组件结束游戏
            setTimeout(() => { onFinish?.(); }, 3000);
          }, 1200);
        }
      }
    }

    /* === 公共技能逻辑 === */
    // E — 凝神子弹时间
    if (keysRef.current['e'] && !keysRef.current['_eConsumed'] && s.eCooldown <= 0 && s.phase === PHASE.ANVIL) {
      keysRef.current['_eConsumed'] = true;
      s.eBulletTime = 180; // 3秒@60fps
      s.eCooldown = 600;   // 10秒
      s.flashMsg = '凝神！温度冻结3秒';
      s.flashLife = 60;
    }
    // R — 符文共鸣（满怒气）
    if (keysRef.current['r'] && !keysRef.current['_rConsumed'] && s.rage >= 100 && s.phase === PHASE.ANVIL) {
      keysRef.current['_rConsumed'] = true;
      s.runeCount = 5;
      s.rage = 0;
      s.flashMsg = '符文共鸣！接下来5次必定Perfect！';
      s.flashLife = 90;
      // 全屏震动粒子
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6;
        s.particles.push({ x: CX, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3 + Math.random() * 4, life: 1, gold: true });
      }
    }

    // 冲刺动画衰减
    if (s.dashAnim > 0) s.dashAnim--;

    // 闪烁衰减
    if (s.flashLife > 0) s.flashLife--;

    // 粒子更新
    s.particles = s.particles.filter(p => p.life > 0);
    s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.97; p.life -= 0.028; });

    // hitFeedback 衰减
    s.hitFeedbacks = s.hitFeedbacks.filter(f => f.life > 0);
    s.hitFeedbacks.forEach(f => { f.y -= 0.8; f.life -= 0.025; });

    // 烬焰粒子
    s.embers.forEach(e => {
      e.x += e.vx; e.y += e.vy; e.vx += (Math.random() - 0.5) * 0.05;
      e.life -= 0.008;
      if (e.life <= 0) {
        e.x = Math.random() * W; e.y = H - 10 - Math.random() * 30;
        e.life = e.maxLife; e.vy = -(0.4 + Math.random() * 1.2);
      }
    });

    draw(ctx, s);
    rafRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, spawnTarget, hitTarget, addScore, onFinish]);

  /* ─────────────── 绘制 ─────────────── */
  function draw(ctx, s) {
    ctx.clearRect(0, 0, W, H);

    // ── 背景 ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#06040a');
    bg.addColorStop(1, '#0e0814');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // 砖墙纹理
    ctx.strokeStyle = 'rgba(50,35,65,0.45)'; ctx.lineWidth = 0.8;
    for (let row = 0; row < 10; row++) {
      const ry = row * 42;
      const off = (row % 2) * 40;
      for (let col = -1; col < 9; col++) ctx.strokeRect(col * 80 + off, ry, 76, 38);
    }

    // 地面
    ctx.fillStyle = '#0c0a10'; ctx.fillRect(0, H - 38, W, 38);
    ctx.strokeStyle = 'rgba(80,60,110,0.3)'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 28) { ctx.beginPath(); ctx.moveTo(i, H - 38); ctx.lineTo(i, H); ctx.stroke(); }

    // 烬焰粒子（背景装饰）
    ctx.save();
    s.embers.forEach(e => {
      ctx.globalAlpha = e.life / e.maxLife * 0.7;
      ctx.fillStyle = `hsl(${20 + Math.random() * 20},100%,${55 + Math.random() * 20}%)`;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // ── 根据阶段绘制场景 ──
    if (s.phase === PHASE.FURNACE) drawFurnaceScene(ctx, s);
    else if (s.phase === PHASE.ANVIL) drawAnvilScene(ctx, s);
    else if (s.phase === PHASE.QUENCH) drawQuenchScene(ctx, s);
    else if (s.phase === PHASE.RESULT) drawResultScene(ctx, s);

    // ── 全局HUD ──
    drawHUD(ctx, s);

    // ── 粒子 ──
    ctx.save();
    s.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.gold ? `hsl(45,100%,${60 + p.life * 30}%)` : `hsl(${25 + p.life * 20},100%,${50 + p.life * 25}%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // ── 命中反馈文字 ──
    ctx.save();
    s.hitFeedbacks.forEach(f => {
      ctx.globalAlpha = f.life;
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.text.startsWith('**') ? 17 : 14}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.restore();

    // ── 闪烁提示 ──
    if (s.flashLife > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.flashLife / 30);
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.flashMsg, CX, 36);
      ctx.restore();
    }

    // ── 子弹时间边框 ──
    if (s.eBulletTime > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(120,200,255,${0.4 + 0.3 * Math.sin(s.time * 0.2)})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.restore();
    }

    // ── 符文共鸣特效 ──
    if (s.runeCount > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,215,0,${0.5 + 0.3 * Math.sin(s.time * 0.3)})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.restore();
    }
  }

  /* ─────────────── 熔炉场景 ─────────────── */
  function drawFurnaceScene(ctx, s) {
    const fx = CX - 80, fy = H - 38;

    // 熔炉主体
    const fg = ctx.createLinearGradient(fx, fy - 180, fx + 160, fy);
    fg.addColorStop(0, '#2a1535'); fg.addColorStop(0.5, '#3e2050'); fg.addColorStop(1, '#1a0c20');
    ctx.fillStyle = fg;
    roundRect(ctx, fx, fy - 180, 160, 180, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,100,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();

    // 炉口发光
    const tempRatio = s.temp / TEMP_MAX;
    const glowColor = tempRatio > 0.88 ? `rgba(255,255,${Math.floor(180 + 75 * (tempRatio - 0.88) / 0.12)},` :
      tempRatio > 0.65 ? `rgba(255,${Math.floor(200 * (tempRatio - 0.65) / 0.23)},0,` :
      `rgba(${Math.floor(80 + 175 * tempRatio)},0,0,`;

    ctx.fillStyle = '#050208';
    ctx.beginPath(); ctx.ellipse(CX, fy - 32, 44, 52, 0, Math.PI, 0); ctx.fill();

    const gg = ctx.createRadialGradient(CX, fy - 32, 3, CX, fy - 32, 50);
    gg.addColorStop(0, glowColor + '0.85)');
    gg.addColorStop(0.6, glowColor + '0.4)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(CX, fy - 32, 44, 52, 0, Math.PI, 0); ctx.fill();

    // 炉口火焰 — layered flame tongues with glow
    const tempRatioFlame = s.temp / TEMP_MAX;
    for (let layer = 0; layer < 3; layer++) {
      const layerAlpha = [0.45, 0.6, 0.8][layer];
      const layerScale = [1.3, 1.0, 0.65][layer];
      for (let i = 0; i < 5; i++) {
        const bx = CX - 36 + i * 18 + Math.sin(s.time * 0.12 + i * 0.9 + layer) * 5;
        const fh = (28 + Math.sin(s.time * 0.09 + i * 1.4 + layer * 0.7) * 16) * layerScale * tempRatioFlame;
        const flameColor = layer === 0
          ? `rgba(255,${Math.floor(60 + tempRatioFlame * 40)},0,${layerAlpha})`
          : layer === 1
          ? `rgba(255,${Math.floor(130 + tempRatioFlame * 60)},0,${layerAlpha})`
          : `rgba(255,${Math.floor(220 + tempRatioFlame * 35)},${Math.floor(tempRatioFlame * 80)},${layerAlpha})`;
        ctx.save();
        ctx.fillStyle = flameColor;
        ctx.beginPath();
        ctx.moveTo(bx - 10 * layerScale, fy - 32);
        ctx.quadraticCurveTo(bx - 6 * layerScale, fy - 32 - fh * 0.5, bx + Math.sin(s.time * 0.15 + i) * 4, fy - 32 - fh);
        ctx.quadraticCurveTo(bx + 6 * layerScale, fy - 32 - fh * 0.5, bx + 10 * layerScale, fy - 32);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // Ember sparks rising from furnace
    if (s.time % 3 === 0 && tempRatioFlame > 0.3) {
      s.embers.push({
        x: CX + (Math.random() - 0.5) * 50,
        y: fy - 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1.5 + Math.random() * 2.5),
        life: 0.7 + Math.random() * 0.5,
        maxLife: 0.7 + Math.random() * 0.5,
        r: 1.2 + Math.random() * 2,
      });
    }

    // 砖纹
    ctx.strokeStyle = 'rgba(100,60,140,0.5)'; ctx.lineWidth = 0.8;
    for (let row = 0; row < 5; row++) {
      const ry = fy - 170 + row * 26;
      const off = (row % 2) * 20;
      for (let col = -1; col < 4; col++) ctx.strokeRect(fx + 6 + col * 30 + off, ry, 26, 22);
    }

    // 烟囱
    ctx.fillStyle = '#1e1228';
    ctx.fillRect(CX - 14, fy - 180 - 44, 28, 48);
    ctx.strokeStyle = 'rgba(140,80,200,0.4)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(CX - 14, fy - 180 - 44, 28, 48);

    // 风箱（Q键动画）
    const bellY = fy - 80;
    ctx.fillStyle = '#3a2040';
    roundRect(ctx, fx - 68, bellY - 20, 60, 38, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,220,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 风箱把手动画
    const bellOff = keysRef.current['q'] ? Math.sin(s.bellowsAnim * 0.6) * 6 : 0;
    ctx.fillStyle = '#6a3a80';
    ctx.fillRect(fx - 22, bellY - 6 + bellOff, 14, 24);
    // 风管
    ctx.strokeStyle = 'rgba(180,120,240,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fx - 8, bellY + 8); ctx.lineTo(fx, bellY + 8); ctx.stroke();

    // 温度计（右侧）
    drawThermometer(ctx, s, W - 58, 60, 28, 240);

    // 操作提示
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 10, H - 110, 200, 68, 10);
    ctx.fill();
    ctx.fillStyle = '#DDB8FF'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Q 键持续鼓风升温', 20, H - 93);
    ctx.fillText('完美区间: 72~90°', 20, H - 77);
    ctx.fillText('Space 取出铁料（进入锻打）', 20, H - 61);
    ctx.fillText('注意: 超过98°铁料熔化！', 20, H - 45);
    ctx.restore();
  }

  /* ─────────────── 铁砧场景 ─────────────── */
  function drawAnvilScene(ctx, s) {
    // 铁砧台
    const ax = CX - 110, ay = CY + 80;
    ctx.save();
    ctx.fillStyle = '#1c1c28';
    ctx.beginPath();
    ctx.moveTo(ax, ay - 40); ctx.lineTo(ax + 220, ay - 40);
    ctx.lineTo(ax + 236, ay); ctx.lineTo(ax - 16, ay); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2e2e44'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#282838';
    roundRect(ctx, ax, ay - 50, 220, 14, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,100,160,0.5)'; ctx.stroke();
    // 支柱
    ctx.fillStyle = '#141420';
    ctx.fillRect(ax + 30, ay, 34, H - ay - 38);
    ctx.fillRect(ax + 156, ay, 34, H - ay - 38);
    ctx.restore();

    // 铁块（温度颜色 + 锻打形变效果）
    const tc = getIronColor(s.temp / TEMP_MAX);
    const hammerDeform = s.hammerAnim > 0 ? (s.hammerAnim / 12) * 3 : 0;
    ctx.save();
    if (s.temp > 30) {
      ctx.shadowColor = tc;
      ctx.shadowBlur = 22 + (s.temp / TEMP_MAX) * 35;
    }
    // Iron block with slight deformation on hit
    const ironGrad = ctx.createLinearGradient(CX - 55, CY - 30, CX + 55, CY + 40);
    ironGrad.addColorStop(0, tc);
    ironGrad.addColorStop(0.4, `rgba(255,255,200,${0.15 + (s.temp / TEMP_MAX) * 0.2})`);
    ironGrad.addColorStop(1, tc);
    ctx.fillStyle = ironGrad;
    roundRect(ctx, CX - 55, CY - 30 + hammerDeform, 110, 70 - hammerDeform, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Surface texture lines (hammer marks)
    ctx.strokeStyle = `rgba(0,0,0,${0.2 + (s.temp / TEMP_MAX) * 0.1})`;
    ctx.lineWidth = 1;
    for (let li = 0; li < 4; li++) {
      const lx = CX - 40 + li * 28;
      ctx.beginPath();
      ctx.moveTo(lx, CY - 25 + hammerDeform);
      ctx.lineTo(lx + 10, CY + 35 - hammerDeform);
      ctx.stroke();
    }
    // Edge highlight
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + (s.temp / TEMP_MAX) * 0.35})`;
    ctx.lineWidth = 2;
    roundRect(ctx, CX - 55, CY - 30 + hammerDeform, 110, 70 - hammerDeform, 8);
    ctx.stroke();
    ctx.restore();

    // 目标节点（缩圈 — 锻造热点效果）
    s.targets.forEach(t => {
      ctx.save();
      // Outer glow ring (shrinking)
      const ringAlpha = t.life * 0.85;
      ctx.shadowColor = `rgba(255,180,0,${ringAlpha * 0.6})`;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = `rgba(255,200,50,${ringAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed approach ring
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -(t.radius * 0.5);
      ctx.strokeStyle = `rgba(255,140,30,${t.life * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.radius * 0.75, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Perfect zone fill (inner)
      const innerGrad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, HIT_PERFECT);
      innerGrad.addColorStop(0, `rgba(255,255,180,${t.life * 0.9})`);
      innerGrad.addColorStop(1, `rgba(255,200,50,${t.life * 0.5})`);
      ctx.fillStyle = innerGrad;
      ctx.beginPath(); ctx.arc(t.x, t.y, HIT_PERFECT, 0, Math.PI * 2); ctx.fill();

      // Good zone ring
      ctx.strokeStyle = `rgba(255,100,50,${t.life * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(t.x, t.y, HIT_GOOD, 0, Math.PI * 2); ctx.stroke();

      // Crosshair
      ctx.strokeStyle = `rgba(255,80,20,${t.life * 0.8})`;
      ctx.lineWidth = 1.2;
      const ch = 16;
      ctx.beginPath(); ctx.moveTo(t.x - ch, t.y); ctx.lineTo(t.x - HIT_PERFECT - 2, t.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x + HIT_PERFECT + 2, t.y); ctx.lineTo(t.x + ch, t.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x, t.y - ch); ctx.lineTo(t.x, t.y - HIT_PERFECT - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t.x, t.y + HIT_PERFECT + 2); ctx.lineTo(t.x, t.y + ch); ctx.stroke();

      ctx.restore();
    });

    // 锤子
    const hammerSwing = s.hammerAnim > 0 ? -(s.hammerAnim / 12) * 0.8 : 0;
    const mx2 = mouseRef.current.x, my2 = mouseRef.current.y;
    ctx.save();
    ctx.translate(mx2, my2 - 50);
    ctx.rotate(hammerSwing);
    // 柄
    ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 44); ctx.stroke();
    // 头
    ctx.fillStyle = s.runeCount > 0 ? '#FFD700' : '#888898';
    ctx.strokeStyle = s.runeCount > 0 ? '#FFEE44' : '#aaaacc'; ctx.lineWidth = 1.5;
    roundRect(ctx, -13, -16, 26, 20, 4);
    ctx.fill(); ctx.stroke();
    // 符文发光
    if (s.runeCount > 0) {
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,220,50,0.5)';
      roundRect(ctx, -13, -16, 26, 20, 4);
      ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 右键蓄力指示
    if (s.isCharging) {
      const chargeRatio = clamp((s.time - s.chargeStart) / 60, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(255,${Math.floor(200 - chargeRatio * 150)},50,0.8)`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(mx2, my2 - 50, 22 + chargeRatio * 14, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // 操作提示
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 10, H - 100, 220, 58, 10);
    ctx.fill();
    ctx.fillStyle = '#DDB8FF'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('左键 轻击节点 · 右键蓄力重击', 20, H - 83);
    ctx.fillText('E 凝神子弹时间 · R 符文共鸣（满怒气）', 20, H - 67);
    ctx.fillText('Space 提前进入淬火', 20, H - 51);
    ctx.restore();
  }

  /* ─────────────── 淬火场景 ─────────────── */
  function drawQuenchScene(ctx, s) {
    // 水槽
    const qx = CX - 140, qy = CY + 30;
    const wg = ctx.createLinearGradient(qx, qy, qx, qy + 80);
    wg.addColorStop(0, '#0a2a4a'); wg.addColorStop(1, '#041828');
    ctx.fillStyle = wg;
    roundRect(ctx, qx, qy, 280, 80, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,140,220,0.6)'; ctx.lineWidth = 2; ctx.stroke();

    // 水面波纹 (animated ripples)
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const wt = (s.time * 0.04 + i * 0.9) % (Math.PI * 2);
      const wx = qx + 20 + i * 38 + Math.sin(wt) * 10;
      const wy = qy + 10 + Math.cos(wt * 0.7) * 3;
      const wlen = 20 + Math.sin(wt * 1.3) * 8;
      ctx.strokeStyle = `rgba(120,200,255,${0.2 + Math.sin(wt) * 0.1})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + wlen * 0.5, wy - 2, wx + wlen, wy);
      ctx.stroke();
    }
    // Water depth shimmer
    for (let di = 0; di < 4; di++) {
      const dt = (s.time * 0.025 + di * 1.5) % (Math.PI * 2);
      ctx.fillStyle = `rgba(60,150,220,${0.06 + Math.sin(dt) * 0.03})`;
      ctx.beginPath();
      ctx.ellipse(qx + 50 + di * 50, qy + 50, 20 + di * 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 武器（红热插入水中）
    const weaponY = s.quenchDone ? qy + 20 : qy - 40 + Math.sin(s.time * 0.08) * 5;
    ctx.save();
    ctx.fillStyle = s.quenchDone ? '#446688' : getIronColor(0.6);
    if (!s.quenchDone) { ctx.shadowColor = getIronColor(0.6); ctx.shadowBlur = 20; }
    ctx.fillRect(CX - 8, weaponY, 16, 70);
    ctx.shadowBlur = 0;
    // 剑柄
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(CX - 18, weaponY + 60, 36, 12);
    ctx.restore();

    // 蒸汽 — layered rising steam clouds
    if (s.quenchDone) {
      for (let i = 0; i < 10; i++) {
        const steamPhase = (s.time * 0.6 + i * 18) % 80;
        const steamT = steamPhase / 80;
        const sx2 = CX - 40 + i * 10 + Math.sin(s.time * 0.08 + i * 0.7) * 8;
        const sy2 = qy - 5 - steamPhase * 1.2;
        const sr = (4 + i * 1.2) * (0.5 + steamT * 0.8);
        const alpha = (1 - steamT) * 0.55 * (0.6 + Math.sin(s.time * 0.1 + i) * 0.2);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        const steamGrad = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, sr);
        steamGrad.addColorStop(0, 'rgba(200,230,255,0.8)');
        steamGrad.addColorStop(1, 'rgba(160,200,240,0)');
        ctx.fillStyle = steamGrad;
        ctx.beginPath();
        ctx.arc(sx2, sy2, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 滑块QTE
    if (!s.quenchDone) {
      const barX = CX - 150, barY = CY - 60, barW = 300, barH = 24;
      // 背景
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, barX - 4, barY - 4, barW + 8, barH + 8, 8);
      ctx.fill();
      // 整体轨道
      ctx.fillStyle = '#1a1a2e';
      roundRect(ctx, barX, barY, barW, barH, 6);
      ctx.fill();
      // 蓝色完美区间
      const plo = 0.38, phi = 0.62;
      ctx.fillStyle = 'rgba(50,150,255,0.5)';
      ctx.fillRect(barX + barW * plo, barY, barW * (phi - plo), barH);
      // 蓝色区间边框
      ctx.strokeStyle = 'rgba(100,200,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(barX + barW * plo, barY, barW * (phi - plo), barH);
      // 滑块
      const sx3 = barX + s.sliderPos * barW;
      ctx.fillStyle = '#FF4444';
      ctx.beginPath(); ctx.moveTo(sx3, barY - 8); ctx.lineTo(sx3 - 8, barY + barH + 4); ctx.lineTo(sx3 + 8, barY + barH + 4); ctx.closePath(); ctx.fill();
      // 标签
      ctx.fillStyle = '#88CCFF'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('完美淬火区', barX + barW * ((plo + phi) / 2), barY - 12);
      ctx.fillStyle = '#FFE066'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Space 键淬火！', CX, barY + barH + 28);
    }
  }

  /* ─────────────── 结算场景 ─────────────── */
  function drawResultScene(ctx, s) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);

    const gradeColors = { SS: '#FFD700', S: '#FF8C00', A: '#44FF88', B: '#44AAFF', C: '#AAAAAA' };
    const gc = gradeColors[s.finalGrade] || '#FFFFFF';

    ctx.textAlign = 'center';
    ctx.fillStyle = gc;
    ctx.font = `bold 72px sans-serif`;
    ctx.shadowColor = gc; ctx.shadowBlur = 30;
    ctx.fillText(s.finalGrade, CX, CY - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('武器品质评级', CX, CY - 80);

    ctx.fillStyle = '#DDD'; ctx.font = '14px sans-serif';
    ctx.fillText(`总分: ${s.finalScore} / 100`, CX, CY + 30);
    ctx.fillText(`温度分: ${s.tempScore}  锻打分: ${Math.min(Math.round(s.anvilScore / 300 * 100), 100)}  淬火分: ${s.quenchScore}`, CX, CY + 54);
    ctx.fillText(`最高连击: ${s.maxCombo}`, CX, CY + 78);

    const desc = { SS: '传说级神器，名留千古！', S: '精品武器，锋利无比！', A: '优质武器，略有瑕疵', B: '普通武器，尚可使用', C: '粗制滥造，勉强凑合' };
    ctx.fillStyle = gc; ctx.font = '16px sans-serif';
    ctx.fillText(desc[s.finalGrade] || '', CX, CY + 108);
    ctx.restore();
  }

  /* ─────────────── HUD ─────────────── */
  function drawHUD(ctx, s) {
    // 阶段指示器
    const phases = [
      { key: PHASE.FURNACE, label: '① 熔炉' },
      { key: PHASE.ANVIL,   label: '② 铁砧' },
      { key: PHASE.QUENCH,  label: '③ 淬火' },
    ];
    phases.forEach((p, i) => {
      const px2 = 10 + i * 118, py2 = 10;
      const active = s.phase === p.key;
      ctx.fillStyle = active ? 'rgba(180,100,255,0.35)' : 'rgba(0,0,0,0.45)';
      roundRect(ctx, px2, py2, 112, 28, 8);
      ctx.fill();
      if (active) { ctx.strokeStyle = 'rgba(200,140,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.fillStyle = active ? '#FFE066' : 'rgba(180,160,200,0.6)';
      ctx.font = active ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, px2 + 56, py2 + 18);
    });

    // 体力条
    const hx = W - 160, hy = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, hx, hy, 148, 56, 10);
    ctx.fill();
    ctx.fillStyle = '#DDB8FF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('体力', hx + 8, hy + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(hx + 8, hy + 20, 130, 8);
    const sg = ctx.createLinearGradient(hx + 8, 0, hx + 138, 0);
    sg.addColorStop(0, '#FF4444'); sg.addColorStop(0.5, '#FFAA22'); sg.addColorStop(1, '#44FF88');
    ctx.fillStyle = sg; ctx.fillRect(hx + 8, hy + 20, 130 * (s.stamina / 100), 8);

    // 怒气条
    ctx.fillStyle = '#DDB8FF'; ctx.font = '10px sans-serif';
    ctx.fillText('怒气 (R键)', hx + 8, hy + 40);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(hx + 8, hy + 44, 130, 8);
    const rg2 = ctx.createLinearGradient(hx + 8, 0, hx + 138, 0);
    rg2.addColorStop(0, '#AA44FF'); rg2.addColorStop(1, '#FFD700');
    ctx.fillStyle = rg2; ctx.fillRect(hx + 8, hy + 44, 130 * (s.rage / 100), 8);

    // Combo
    if (s.combo >= 2) {
      ctx.save();
      const scale = 1 + Math.min(s.combo * 0.04, 0.5);
      ctx.translate(CX, 66);
      ctx.scale(scale, scale);
      ctx.fillStyle = s.combo >= 8 ? '#FFD700' : '#FF8844';
      ctx.font = `bold ${18 + Math.min(s.combo, 8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${s.combo} COMBO  ×${(1 + Math.min(s.combo, 10) * 0.1).toFixed(1)}`, 0, 0);
      ctx.restore();
    }

    // E技能冷却
    if (s.phase === PHASE.ANVIL) {
      const ex2 = 10, ey2 = 56;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, ex2, ey2, 88, 28, 8);
      ctx.fill();
      const eCd = s.eCooldown / 600;
      ctx.fillStyle = eCd > 0 ? 'rgba(80,80,80,0.5)' : 'rgba(120,200,255,0.3)';
      roundRect(ctx, ex2, ey2, Math.round(88 * (1 - eCd)), 28, 8);
      ctx.fill();
      ctx.fillStyle = eCd > 0 ? '#888' : '#88CCFF';
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(eCd > 0 ? `E CD ${Math.ceil(s.eCooldown / 60)}s` : 'E 凝神', ex2 + 44, ey2 + 18);

      // 子弹时间剩余
      if (s.eBulletTime > 0) {
        ctx.fillStyle = '#88CCFF'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${(s.eBulletTime / 60).toFixed(1)}s`, ex2 + 44, ey2 + 38);
      }
    }
  }

  /* ─────────────── 温度计 ─────────────── */
  function drawThermometer(ctx, s, x, y, w, h) {
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 12);
    ctx.fill();
    // 轨道
    ctx.fillStyle = '#1a0a20';
    roundRect(ctx, x, y, w, h, w / 2);
    ctx.fill();
    // 完美区间背景
    const plo = (TEMP_PERFECT_LO / TEMP_MAX) * h;
    const phi = (TEMP_PERFECT_HI / TEMP_MAX) * h;
    ctx.fillStyle = 'rgba(50,220,100,0.25)';
    ctx.fillRect(x, y + h - phi, w, phi - plo);
    ctx.strokeStyle = 'rgba(80,255,120,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y + h - phi, w, phi - plo);
    // 温度填充
    const tempH = (s.temp / TEMP_MAX) * h;
    const tg2 = ctx.createLinearGradient(0, y + h, 0, y);
    tg2.addColorStop(0, '#4466FF'); tg2.addColorStop(0.35, '#CC2200');
    tg2.addColorStop(0.65, '#FF8800'); tg2.addColorStop(0.9, '#FFFFFF');
    ctx.fillStyle = tg2;
    roundRect(ctx, x, y + h - tempH, w, tempH, w / 2);
    ctx.fill();
    // 标签
    ctx.fillStyle = '#DDB8FF'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('温度', x + w / 2, y - 10);
    ctx.fillStyle = '#88FF88'; ctx.font = '9px sans-serif';
    ctx.fillText('完美', x + w / 2, y + h - (plo + phi) / 2 + 3);
    ctx.fillStyle = '#FFD7A8'; ctx.font = 'bold 11px monospace';
    ctx.fillText(Math.round(s.temp) + '°', x + w / 2, y + h + 18);
  }

  /* ─────────────── 铁块颜色 ─────────────── */
  function getIronColor(t) {
    if (t > 0.88) return `rgb(255,255,${Math.floor(180 + 75 * (t - 0.88) / 0.12)})`;
    if (t > 0.65) return `rgb(255,${Math.floor(200 * (t - 0.65) / 0.23)},0)`;
    if (t > 0.35) return `rgb(${Math.floor(140 + 115 * (t - 0.35) / 0.30)},${Math.floor(20 * (t - 0.35) / 0.30)},0)`;
    const v = Math.floor(30 + 80 * (t / 0.35));
    return `rgb(${v},${Math.floor(v * 0.55)},${Math.floor(v * 0.55)})`;
  }

  /* ─────────────── 事件绑定 ─────────────── */
  useEffect(() => {
    init();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getXY = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };

    const onKD = (e) => {
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
      if (!keysRef.current[k]) {
        keysRef.current[k] = true;
        keysRef.current['_' + k + 'Consumed'] = false;
        // 重置消费标记
        if (k === ' ') keysRef.current['_spaceConsumed'] = false;
        if (k === 'e') keysRef.current['_eConsumed'] = false;
        if (k === 'r') keysRef.current['_rConsumed'] = false;
      }
      if ([' ', 'q', 'e', 'r', 'w', 'a', 's', 'd'].includes(k)) e.preventDefault();
    };
    const onKU = (e) => {
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
      keysRef.current[k] = false;
    };

    const onMM = (e) => {
      const p = getXY(e);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;
    };
    const onMD = (e) => {
      const s = sRef.current; if (!s) return;
      if (e.button === 0) {
        mouseRef.current.down = true;
        if (s.phase === PHASE.ANVIL) hitTarget(mouseRef.current.x, mouseRef.current.y, false);
      }
      if (e.button === 2) {
        mouseRef.current.rightDown = true;
        e.preventDefault();
      }
    };
    const onMU = (e) => {
      if (e.button === 0) mouseRef.current.down = false;
      if (e.button === 2) mouseRef.current.rightDown = false;
    };
    const onCM = (e) => e.preventDefault();

    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    window.addEventListener('mousemove', onMM);
    canvas.addEventListener('mousedown', onMD);
    window.addEventListener('mouseup', onMU);
    canvas.addEventListener('contextmenu', onCM);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      window.removeEventListener('mousemove', onMM);
      canvas.removeEventListener('mousedown', onMD);
      window.removeEventListener('mouseup', onMU);
      canvas.removeEventListener('contextmenu', onCM);
    };
  }, [init, loop, hitTarget]);

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
        boxShadow: '0 0 50px rgba(140,60,220,0.35)',
      }}
    />
  );
}

export default ForgingGame;
