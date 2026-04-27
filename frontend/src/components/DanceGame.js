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

// 谱面：由 librosa 对 bgm.mp3 做节拍检测生成（BPM≈143.6），共330个音符，覆盖约100秒
// 每个音符 { track: 0-3, time: ms }，track 对应 ←↓↑→
const BGM_CHART = [{"track":1,"time":1602},{"track":2,"time":1996},{"track":3,"time":2414},{"track":1,"time":2623},{"track":0,"time":2832},{"track":1,"time":3227},{"track":2,"time":3645},{"track":3,"time":4063},{"track":0,"time":4167},{"track":1,"time":4272},{"track":0,"time":4481},{"track":1,"time":4876},{"track":2,"time":5294},{"track":3,"time":5712},{"track":1,"time":5921},{"track":0,"time":6130},{"track":1,"time":6524},{"track":2,"time":6919},{"track":3,"time":7337},{"track":0,"time":7441},{"track":1,"time":7546},{"track":0,"time":7755},{"track":1,"time":8173},{"track":2,"time":8568},{"track":3,"time":8986},{"track":1,"time":9195},{"track":0,"time":9404},{"track":1,"time":9822},{"track":2,"time":10216},{"track":3,"time":10634},{"track":0,"time":10738},{"track":1,"time":10843},{"track":0,"time":11052},{"track":1,"time":11447},{"track":2,"time":11865},{"track":3,"time":12283},{"track":1,"time":12480},{"track":0,"time":12678},{"track":1,"time":13096},{"track":2,"time":13514},{"track":3,"time":13908},{"track":0,"time":14012},{"track":1,"time":14117},{"track":0,"time":14326},{"track":1,"time":14721},{"track":2,"time":15139},{"track":3,"time":15580},{"track":1,"time":15777},{"track":0,"time":15975},{"track":1,"time":16370},{"track":2,"time":16788},{"track":3,"time":17205},{"track":0,"time":17309},{"track":1,"time":17414},{"track":0,"time":17623},{"track":1,"time":18018},{"track":2,"time":18436},{"track":3,"time":18854},{"track":1,"time":19063},{"track":0,"time":19272},{"track":1,"time":19667},{"track":2,"time":20062},{"track":3,"time":20480},{"track":0,"time":20584},{"track":1,"time":20688},{"track":0,"time":20897},{"track":1,"time":21292},{"track":2,"time":21710},{"track":3,"time":22151},{"track":1,"time":22348},{"track":0,"time":22546},{"track":1,"time":22964},{"track":2,"time":23359},{"track":3,"time":23777},{"track":0,"time":23881},{"track":1,"time":23986},{"track":0,"time":24195},{"track":1,"time":24613},{"track":2,"time":25007},{"track":3,"time":25425},{"track":1,"time":25634},{"track":0,"time":25843},{"track":1,"time":26238},{"track":2,"time":26633},{"track":3,"time":27051},{"track":0,"time":27155},{"track":1,"time":27260},{"track":0,"time":27469},{"track":1,"time":27887},{"track":2,"time":28305},{"track":3,"time":28699},{"track":1,"time":28885},{"track":0,"time":29071},{"track":1,"time":29512},{"track":2,"time":29930},{"track":3,"time":30348},{"track":0,"time":30446},{"track":1,"time":30545},{"track":0,"time":30743},{"track":1,"time":31161},{"track":2,"time":31602},{"track":3,"time":32020},{"track":1,"time":32217},{"track":0,"time":32415},{"track":1,"time":32809},{"track":2,"time":33227},{"track":3,"time":33645},{"track":0,"time":33743},{"track":1,"time":33842},{"track":0,"time":34040},{"track":1,"time":34458},{"track":2,"time":34876},{"track":3,"time":35294},{"track":1,"time":35491},{"track":0,"time":35689},{"track":1,"time":36083},{"track":2,"time":36478},{"track":3,"time":36919},{"track":0,"time":37023},{"track":1,"time":37128},{"track":0,"time":37337},{"track":1,"time":37732},{"track":2,"time":38150},{"track":3,"time":38545},{"track":1,"time":38754},{"track":0,"time":38963},{"track":1,"time":39404},{"track":2,"time":39799},{"track":3,"time":40216},{"track":0,"time":40320},{"track":1,"time":40425},{"track":0,"time":40634},{"track":1,"time":41052},{"track":2,"time":41447},{"track":3,"time":41865},{"track":1,"time":42062},{"track":0,"time":42260},{"track":1,"time":42655},{"track":2,"time":43073},{"track":3,"time":43514},{"track":0,"time":43612},{"track":1,"time":43711},{"track":0,"time":43908},{"track":1,"time":44326},{"track":2,"time":44721},{"track":3,"time":45116},{"track":1,"time":45313},{"track":0,"time":45511},{"track":1,"time":45929},{"track":2,"time":46370},{"track":3,"time":46788},{"track":0,"time":46886},{"track":1,"time":46985},{"track":0,"time":47182},{"track":1,"time":47624},{"track":2,"time":48018},{"track":3,"time":48436},{"track":1,"time":48645},{"track":0,"time":48854},{"track":1,"time":49249},{"track":2,"time":49667},{"track":3,"time":50062},{"track":0,"time":50166},{"track":1,"time":50271},{"track":0,"time":50480},{"track":1,"time":50898},{"track":2,"time":51292},{"track":3,"time":51710},{"track":1,"time":51919},{"track":0,"time":52128},{"track":1,"time":52523},{"track":2,"time":52941},{"track":3,"time":53382},{"track":0,"time":53480},{"track":1,"time":53579},{"track":0,"time":53777},{"track":1,"time":54172},{"track":2,"time":54590},{"track":3,"time":55008},{"track":1,"time":55217},{"track":0,"time":55426},{"track":1,"time":55843},{"track":2,"time":56238},{"track":3,"time":56656},{"track":0,"time":56754},{"track":1,"time":56853},{"track":0,"time":57051},{"track":1,"time":57469},{"track":2,"time":57887},{"track":3,"time":58305},{"track":1,"time":58514},{"track":0,"time":58723},{"track":1,"time":59141},{"track":2,"time":59535},{"track":3,"time":59953},{"track":0,"time":60051},{"track":1,"time":60150},{"track":0,"time":60348},{"track":1,"time":60766},{"track":2,"time":61184},{"track":3,"time":61579},{"track":1,"time":61788},{"track":0,"time":61997},{"track":1,"time":62392},{"track":2,"time":62809},{"track":3,"time":63227},{"track":0,"time":63331},{"track":1,"time":63436},{"track":0,"time":63645},{"track":1,"time":64040},{"track":2,"time":64458},{"track":3,"time":64876},{"track":1,"time":65085},{"track":0,"time":65294},{"track":1,"time":65712},{"track":2,"time":66107},{"track":3,"time":66525},{"track":0,"time":66623},{"track":1,"time":66722},{"track":0,"time":66919},{"track":1,"time":67314},{"track":2,"time":67755},{"track":3,"time":68173},{"track":1,"time":68382},{"track":0,"time":68591},{"track":1,"time":68986},{"track":2,"time":69404},{"track":3,"time":69822},{"track":0,"time":69920},{"track":1,"time":70019},{"track":0,"time":70217},{"track":1,"time":70635},{"track":2,"time":71053},{"track":3,"time":71471},{"track":1,"time":71668},{"track":0,"time":71865},{"track":1,"time":72283},{"track":2,"time":72678},{"track":3,"time":73096},{"track":0,"time":73194},{"track":1,"time":73293},{"track":0,"time":73491},{"track":1,"time":73885},{"track":2,"time":74327},{"track":3,"time":74745},{"track":1,"time":74953},{"track":0,"time":75162},{"track":1,"time":75557},{"track":2,"time":75975},{"track":3,"time":76393},{"track":0,"time":76491},{"track":1,"time":76590},{"track":0,"time":76788},{"track":1,"time":77206},{"track":2,"time":77624},{"track":3,"time":78042},{"track":1,"time":78239},{"track":0,"time":78437},{"track":1,"time":78854},{"track":2,"time":79249},{"track":3,"time":79644},{"track":0,"time":79754},{"track":1,"time":79864},{"track":0,"time":80085},{"track":1,"time":80503},{"track":2,"time":80898},{"track":3,"time":81316},{"track":1,"time":81525},{"track":0,"time":81734},{"track":1,"time":82152},{"track":2,"time":82546},{"track":3,"time":82964},{"track":0,"time":83062},{"track":1,"time":83161},{"track":0,"time":83359},{"track":1,"time":83777},{"track":2,"time":84172},{"track":3,"time":84613},{"track":1,"time":84810},{"track":0,"time":85008},{"track":1,"time":85426},{"track":2,"time":85820},{"track":3,"time":86238},{"track":0,"time":86342},{"track":1,"time":86447},{"track":0,"time":86656},{"track":1,"time":87074},{"track":2,"time":87469},{"track":3,"time":87887},{"track":1,"time":88096},{"track":0,"time":88305},{"track":1,"time":88723},{"track":2,"time":89118},{"track":3,"time":89536},{"track":0,"time":89640},{"track":1,"time":89745},{"track":0,"time":89954},{"track":1,"time":90372},{"track":2,"time":90766},{"track":3,"time":91184},{"track":1,"time":91381},{"track":0,"time":91579},{"track":1,"time":91997},{"track":2,"time":92392},{"track":3,"time":92810},{"track":0,"time":92914},{"track":1,"time":93019},{"track":0,"time":93228},{"track":1,"time":93646},{"track":2,"time":94040},{"track":3,"time":94458},{"track":1,"time":94644},{"track":0,"time":94830},{"track":1,"time":95271},{"track":2,"time":95689},{"track":3,"time":96084},{"track":0,"time":96188},{"track":1,"time":96293},{"track":0,"time":96502},{"track":1,"time":96920},{"track":2,"time":97338},{"track":3,"time":97756},{"track":1,"time":97953},{"track":0,"time":98150},{"track":1,"time":98568},{"track":2,"time":98986},{"track":3,"time":99381},{"track":0,"time":99479},{"track":1,"time":99578},{"track":0,"time":99776}];

function buildChart() {
  return BGM_CHART;
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
    chart: buildChart(),
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
    // 判定时间：游戏内经过时间，与谱面 time 直接对应
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
    s.bgmOffsetMs = 0;    // 游戏开始时 BGM 的播放位置（ms）
    s.chartIndex = 0;
    s.chart = buildChart();
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
      const bgmEl = document.querySelector('audio[src*="bgm"]') || document.querySelector('audio');
      if (!s.startTime) {
        s.startTime = ts;
        // 记录游戏开始时 BGM 的绝对位置，用于节拍对齐
        s.bgmOffsetMs = bgmEl ? bgmEl.currentTime * 1000 : 0;
      }
      // elapsed：游戏内经过时间（ms），从0开始，与谱面 time 直接对应
      const elapsed = ts - s.startTime;
      // bgmPhase：BGM 当前相位（取模谱面长度），用于节拍精确对齐
      // 谱面 time 直接用 elapsed 匹配，无需偏移

      s.bg.phase += dt * 0.0005;

      // Spawn notes：谱面 time 从0开始，直接与 elapsed 比较
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

      // End check：谱面播完且音符清空，或游戏时长超过100s
      if ((s.chartIndex >= s.chart.length && s.notes.length === 0 && elapsed > 2000) || elapsed > 100000) {
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
