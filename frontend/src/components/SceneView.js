import React, {useCallback, useEffect, useRef, useState, useMemo, memo} from 'react';
import axios from 'axios';
import ITEM_HINTS from '../itemHints';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

// ─────────────────────────────────────────
// 时间/天气滤镜系统
// ─────────────────────────────────────────

// 根据月份(1-12)和季节推算一天中的时段
function getTimeOfDay(monthInYear, season) {
  // 用月份的奇偶 + 季节模拟：
  // 春(1-3月): 早晨 / 午后 / 傍晚
  // 夏(4-6月): 午后 / 傍晚 / 夜晚
  // 秋(7-9月): 傍晚 / 早晨 / 午后
  // 冬(10-12月): 夜晚 / 早晨 / 午后
  const m = ((monthInYear - 1) % 3); // 0,1,2
  const map = {
    spring: ['dawn', 'afternoon', 'dusk'],
    summer: ['afternoon', 'dusk', 'night'],
    autumn: ['dusk', 'dawn', 'afternoon'],
    winter: ['night', 'dawn', 'afternoon'],
  };
  return (map[season] || map.spring)[m];
}

// 时段 → 滤镜配置
const TIME_FILTERS = {
  dawn: {
    label: '晨曦',
    icon: '🌅',
    overlay: 'linear-gradient(180deg, rgba(255,200,120,0.18) 0%, rgba(255,150,80,0.08) 60%, rgba(100,60,120,0.05) 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(80,30,10,0.35) 100%)',
    cssFilter: 'brightness(1.08) saturate(1.15) sepia(0.12)',
    particleColor: '#FFD580',
  },
  afternoon: {
    label: '午后',
    icon: '☀️',
    overlay: 'linear-gradient(180deg, rgba(255,240,180,0.10) 0%, rgba(255,220,100,0.05) 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 55%, rgba(40,20,0,0.25) 100%)',
    cssFilter: 'brightness(1.05) saturate(1.08)',
    particleColor: '#FFF5C0',
  },
  dusk: {
    label: '黄昏',
    icon: '🌆',
    overlay: 'linear-gradient(180deg, rgba(255,100,50,0.22) 0%, rgba(180,60,80,0.15) 50%, rgba(60,20,60,0.10) 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(80,20,40,0.50) 100%)',
    cssFilter: 'brightness(0.95) saturate(1.3) sepia(0.18)',
    particleColor: '#FF8C60',
  },
  night: {
    label: '夜晚',
    icon: '🌙',
    overlay: 'linear-gradient(180deg, rgba(20,10,60,0.35) 0%, rgba(10,5,40,0.25) 100%)',
    vignette: 'radial-gradient(ellipse at center, transparent 35%, rgba(5,2,20,0.65) 100%)',
    cssFilter: 'brightness(0.80) saturate(0.85) hue-rotate(10deg)',
    particleColor: '#8888FF',
  },
};

// 天气滤镜覆盖层组件
const TimeWeatherOverlay = memo(function TimeWeatherOverlay({ monthInYear, season }) {
  const tod = getTimeOfDay(monthInYear || 1, season || 'spring');
  const cfg = TIME_FILTERS[tod] || TIME_FILTERS.afternoon;

  return (
    <>
      {/* 色调叠加 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 7,
        background: cfg.overlay,
        pointerEvents: 'none',
        transition: 'background 1.5s ease',
        mixBlendMode: 'multiply',
      }} />
      {/* 暗角 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 8,
        background: cfg.vignette,
        pointerEvents: 'none',
        transition: 'background 1.5s ease',
      }} />
      {/* 时段标签 */}
      <div style={{
        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 12, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
        borderRadius: '20px', padding: '3px 10px',
        fontSize: '11px', color: 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(255,255,255,0.12)',
        letterSpacing: '1px',
      }}>
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </div>
    </>
  );
});

// 兼容字符串和 {text, image} 两种对话格式
function getDialogueText(d) {
  return typeof d === 'string' ? d : (d?.text ?? '');
}
function getDialogueImage(d) {
  return typeof d === 'string' ? null : (d?.image ?? null);
}

// ─────────────────────────────────────────
// 场景粒子配置：每种场景对应的粒子类型
// ─────────────────────────────────────────
const SCENE_PARTICLES = {
  bedroom:        { type: 'petals',    color: '#FFB7C5', count: 18 },
  art_studio:     { type: 'ink',       color: '#8B7355', count: 14 },
  inn:            { type: 'fireflies', color: '#FFD700', count: 20 },
  ancient_street: { type: 'fireflies', color: '#FFA040', count: 22 },
  grassland:      { type: 'wind',      color: '#C8E6C9', count: 25 },
  royal_court:    { type: 'gold',      color: '#FFD700', count: 16 },
  etiquette_hall: { type: 'petals',    color: '#E8D5B7', count: 14 },
  medicine_hall:  { type: 'spores',    color: '#A5D6A7', count: 18 },
};

// ─────────────────────────────────────────
// Canvas 粒子系统
// ─────────────────────────────────────────
const ParticleCanvas = memo(function ParticleCanvas({ sceneId, width, height }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  const config = SCENE_PARTICLES[sceneId] || { type: 'petals', color: '#FFB7C5', count: 15 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // 初始化粒子
    const initParticle = (i) => {
      const base = {
        x: Math.random() * width,
        y: config.type === 'fireflies' ? Math.random() * height : -10 - Math.random() * 40,
        opacity: Math.random() * 0.6 + 0.2,
        size: Math.random() * 6 + 3,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: Math.random() * 0.5 + 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
      };
      if (config.type === 'fireflies') {
        base.speedY = (Math.random() - 0.5) * 0.4;
        base.speedX = (Math.random() - 0.5) * 0.6;
        base.size = Math.random() * 3 + 2;
        base.pulseSpeed = Math.random() * 0.04 + 0.02;
        base.glowRadius = Math.random() * 8 + 6;
      }
      if (config.type === 'wind') {
        base.length = Math.random() * 30 + 15;
        base.speedX = Math.random() * 2 + 1;
        base.speedY = (Math.random() - 0.5) * 0.3;
        base.opacity = Math.random() * 0.3 + 0.05;
      }
      return base;
    };

    particlesRef.current = Array.from({ length: config.count }, (_, i) => initParticle(i));

    const draw = (p, t) => {
      ctx.save();
      if (config.type === 'petals') {
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(-p.size * 0.15, -p.size * 0.1, p.size * 0.3, p.size * 0.15, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.type === 'ink') {
        ctx.globalAlpha = p.opacity * 0.5;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.strokeStyle = config.color;
        ctx.lineWidth = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.bezierCurveTo(-p.size * 0.3, -p.size * 0.4, p.size * 0.3, p.size * 0.4, p.size, 0);
        ctx.stroke();
      } else if (config.type === 'fireflies') {
        const pulse = Math.sin(t * p.pulseSpeed + p.phase);
        const alpha = p.opacity * (0.5 + pulse * 0.5);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius);
        glow.addColorStop(0, `${config.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.type === 'wind') {
        ctx.globalAlpha = p.opacity;
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.length, p.y + p.speedY * 10);
        ctx.stroke();
      } else if (config.type === 'gold') {
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, '#FFD700');
        grad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const angle = (k / 4) * Math.PI * 2;
          const r = k % 2 === 0 ? p.size : p.size * 0.4;
          k === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
                  : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else if (config.type === 'spores') {
        ctx.globalAlpha = p.opacity * (0.4 + Math.sin(t * 0.02 + p.phase) * 0.3);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    let t = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      t++;

      particlesRef.current.forEach(p => {
        draw(p, t);
        p.x += p.speedX + Math.sin(t * 0.01 + p.phase) * 0.3;
        p.y += p.speedY;
        p.rotation += p.rotSpeed || 0;

        if (config.type === 'fireflies') {
          p.x += Math.sin(t * 0.02 + p.phase) * 0.5;
          p.y += Math.cos(t * 0.015 + p.phase) * 0.3;
          if (p.x < -20) p.x = width + 10;
          if (p.x > width + 20) p.x = -10;
          if (p.y < -20) p.y = height + 10;
          if (p.y > height + 20) p.y = -10;
        } else if (config.type === 'wind') {
          if (p.x > width + 50) { p.x = -50; p.y = Math.random() * height; }
        } else {
          if (p.y > height + 20) {
            p.y = -15;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 10;
          if (p.x > width + 20) p.x = -10;
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [sceneId, width, height, config]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 6,
        opacity: 0.75,
      }}
    />
  );
});

// ─────────────────────────────────────────
// 计算气泡的安全位置（防止超出场景边界）
// position: { left: %, top: % }  containerRef: 场景容器 ref
// 返回 { left, top, transform, bubbleTail } CSS 样式描述
// ─────────────────────────────────────────
function useSafePosition(position, containerRef, bubbleMaxW = 300) {
  const [safeStyle, setSafeStyle] = useState({
    left: `${position.left}%`,
    top: `${position.top}%`,
    transform: 'translate(-50%, calc(-100% - 54px))',
    tailLeft: '22px',
    tailSide: 'bottom',
    opacity: 0, // 隐藏直到 ResizeObserver 计算完正确位置
  });

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const compute = () => {
      const cw = container.offsetWidth;
      const ch = container.offsetHeight;
      if (!cw || !ch) return; // 容器还没布局完，跳过
      const px = (position.left / 100) * cw;
      const py = (position.top / 100) * ch;
      const bubbleW = Math.min(bubbleMaxW, cw * 0.9);
      const bubbleH = 260;

      let leftPx = px - bubbleW / 2;
      if (leftPx < 8) leftPx = 8;
      if (leftPx + bubbleW > cw - 8) leftPx = cw - bubbleW - 8;
      const tailLeftPx = Math.max(14, Math.min(px - leftPx, bubbleW - 14));

      let topVal, tailSide;
      if (py - bubbleH - 54 >= 8) {
        topVal = `${py}px`;
        tailSide = 'bottom';
      } else {
        topVal = `${py + 54}px`;
        tailSide = 'top';
      }

      setSafeStyle({
        left: `${leftPx}px`,
        top: topVal,
        transform: tailSide === 'bottom' ? 'translateY(-100%)' : 'translateY(0)',
        tailLeft: `${tailLeftPx}px`,
        tailSide,
        opacity: 1,
      });
    };

    compute();
    // 监听容器尺寸变化（首次渲染宽度为0时会在resize后修正）
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [position, containerRef, bubbleMaxW]);

  return safeStyle;
}

// ─────────────────────────────────────────
// consequence 阶段 —— 独立组件（修复 hooks 规则报错）
// ─────────────────────────────────────────
function ConsequenceView({ consequenceData, onClose, safeStyle, onSceneChange, currentSceneId }) {
  const [charImgErr, setCharImgErr] = useState(false);
  const { consequence } = consequenceData;

  // 目标场景与当前场景相同时不跳转（宫廷内遇到宫廷人物，无需再跳转）
  const needsSceneChange = consequence?.type === 'scene_character'
    && consequence.scene
    && onSceneChange
    && consequence.scene !== currentSceneId;

  // 关闭时若 consequence 含 scene 字段且需要跳转则触发场景跳转
  const handleClose = useCallback(() => {
    onClose();
    if (needsSceneChange) {
      onSceneChange(consequence.scene);
    }
  }, [onClose, consequence, onSceneChange, needsSceneChange]);
  const isSceneChar = consequence.type === 'scene_character';
  const { tailLeft, tailSide } = safeStyle;

  const tailTopStyle = tailSide === 'bottom'
    ? { bottom: '-9px', top: 'auto' }
    : { top: '-9px', bottom: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center' };
  const tailTopStyleBorder = tailSide === 'bottom'
    ? { bottom: '-11px', top: 'auto' }
    : { top: '-11px', bottom: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center' };

  return (
    <div style={{
      position: 'absolute',
      left: safeStyle.left,
      top: safeStyle.top,
      transform: safeStyle.transform,
      zIndex: 30,
      userSelect: 'none',
      opacity: safeStyle.opacity ?? 1,
      animation: 'bubblePop 0.3s cubic-bezier(.34,1.56,.64,1) both',
      filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
      maxWidth: '300px',
      minWidth: '200px',
      width: 'min(300px, 48vw)',
    }}>
      <div style={{
        background: isSceneChar
          ? 'linear-gradient(145deg, rgba(20,8,15,0.98), rgba(35,12,28,0.98))'
          : 'linear-gradient(145deg, rgba(254,248,228,0.98), rgba(250,236,196,0.98))',
        borderRadius: '16px',
        padding: '14px',
        boxShadow: isSceneChar
          ? '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(201,168,76,0.6)'
          : '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(201,168,76,0.7)',
        border: `1.5px solid ${isSceneChar ? 'rgba(201,168,76,0.65)' : 'rgba(201,168,76,0.85)'}`,
        position: 'relative',
      }}>
        {/* 新角色出现（scene_character类型） */}
        {isSceneChar && consequence.characterImage && !charImgErr && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '60px', height: '80px', flexShrink: 0, borderRadius: '10px',
              overflow: 'hidden', border: '2px solid rgba(201,168,76,0.5)',
              background: 'rgba(0,0,0,0.3)',
            }}>
              <img
                src={consequence.characterImage}
                alt="角色"
                onError={() => setCharImgErr(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              />
            </div>
            <div style={{ flex: 1, paddingTop: '2px' }}>
              <div style={{ fontSize: '10px', color: '#C9A84C', letterSpacing: '2px', marginBottom: '4px', opacity: 0.8 }}>
                ✦ 新角色登场
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.85)', lineHeight: '1.6', fontStyle: 'italic' }}>
                {consequence.nextDialogue}
              </div>
            </div>
          </div>
        )}
        {/* 普通对话结果 / 图片加载失败时 */}
        {(!isSceneChar || charImgErr) && consequence.nextDialogue && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              fontSize: '13px',
              color: isSceneChar ? 'rgba(245,230,236,0.9)' : '#2D1500',
              lineHeight: '1.7', fontWeight: '500', fontStyle: 'italic',
            }}>
              「{consequence.nextDialogue}」
            </div>
          </div>
        )}
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          style={{
            width: '100%', padding: '8px',
            background: isSceneChar
              ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.15))'
              : 'rgba(201,168,76,0.2)',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: '8px', color: '#C9A84C',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isSceneChar ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.15))' : 'rgba(201,168,76,0.2)'; }}
        >
          {needsSceneChange ? '✨ 前往相见' : '✨ 明白了'}
        </button>
        {/* 气泡尾 */}
        <div style={{
          position: 'absolute', left: tailLeft,
          width: 0, height: 0,
          borderLeft: '9px solid transparent', borderRight: '5px solid transparent',
          borderTop: isSceneChar ? '9px solid rgba(20,8,15,0.98)' : '9px solid rgba(250,236,196,0.98)',
          ...tailTopStyle,
        }} />
        <div style={{
          position: 'absolute', left: `calc(${tailLeft} - 1px)`,
          width: 0, height: 0,
          borderLeft: '10px solid transparent', borderRight: '6px solid transparent',
          borderTop: '11px solid rgba(201,168,76,0.6)',
          zIndex: -1,
          ...tailTopStyleBorder,
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// NPC 气泡对话（叠加在 activeImage 上）—— 带头像 + 选项分支版
// ─────────────────────────────────────────
// 场景图裁剪头像渲染
// imgW/imgH: 原图尺寸, cols/rows: 网格数
// cx/cy: 目标格中心在原图中的百分比位置
// zoom 自动计算：让一格高度恰好填满容器（cover by cell height）
function SceneAvatarCircle({ sceneAvatar, size = 38 }) {
  const { scene, cx, cy, imgW = 1408, imgH = 768, cols = 20, rows = 20 } = sceneAvatar;
  // 一格在原图中的像素尺寸
  const cellH = imgH / rows; // 38.4px
  // zoom: 让一格高度 = 容器高度
  const zoom = size / cellH;
  // 缩放后图片像素尺寸
  const scaledW = imgW * zoom;
  const scaledH = imgH * zoom;
  // 目标点在缩放图中的像素位置
  const targetX = (cx / 100) * scaledW;
  const targetY = (cy / 100) * scaledH;
  // background-position: 让目标点居中于容器
  const posX = -(targetX - size / 2);
  const posY = -(targetY - size / 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      backgroundImage: `url(${scene})`,
      backgroundSize: `${scaledW}px ${scaledH}px`,
      backgroundPosition: `${posX}px ${posY}px`,
      backgroundRepeat: 'no-repeat',
    }} />
  );
}

// 从文字内容推断情绪 → CSS class
function detectMood(text) {
  if (!text) return null;
  if (/笑|开心|高兴|喜|好极|太棒|哈哈|欢|乐|妙|赞/.test(text)) return 'bubble-mood-happy';
  if (/悲|难过|伤心|泪|哭|可惜|叹|愁|怜|苦/.test(text)) return 'bubble-mood-sad';
  if (/怒|气|恼|愤|哼|滚|无礼|放肆|岂敢/.test(text)) return 'bubble-mood-angry';
  if (/神秘|奇异|古怪|秘密|天机|命运|玄/.test(text)) return 'bubble-mood-mysterious';
  return null;
}

// 打字机 hook：逐字显示，支持外部 skip 信号跳到末尾
function useTypewriter(text, speed = 38, skip = false) {
  const [count, setCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setCount(i);
      if (i >= text.length) clearInterval(intervalRef.current);
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [text, speed]);

  useEffect(() => {
    if (skip && text) {
      clearInterval(intervalRef.current);
      setCount(text.length);
    }
  }, [skip, text]);

  return Math.min(count, text?.length || 0);
}

function NpcBubble({ npc, position, onClose, onChoice, containerRef, onSceneChange, onItemGift, onDialogueImage, currentSceneId }) {
  const [phase, setPhase] = useState('dialogues'); // 'dialogues' | 'choice' | 'consequence'
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [avatarErr, setAvatarErr] = useState(false);
  const [consequenceData, setConsequenceData] = useState(null); // 选择后的结果
  const [choosingId, setChoosingId] = useState(null); // 正在处理的选项
  const [skipTyping, setSkipTyping] = useState(false); // 跳过打字机

  const hasDialogues = npc.dialogues && npc.dialogues.length > 0;
  const hasChoice = !!npc.dialogueWithChoice;

  // 安全定位
  const safeStyle = useSafePosition(position, containerRef);

  // 当前对话文字
  const currentDialogueText = phase === 'dialogues' && npc.dialogues?.[dialogueIdx]
    ? getDialogueText(npc.dialogues[dialogueIdx])
    : '';
  const typeCount = useTypewriter(currentDialogueText, 36, skipTyping);
  const displayedText = currentDialogueText.slice(0, typeCount);
  const isTyping = typeCount < currentDialogueText.length;
  const moodClass = detectMood(currentDialogueText);

  // 切换到新对话时重置跳过标志
  useEffect(() => { setSkipTyping(false); }, [dialogueIdx]);

  // 挂载时触发第0句的图片（让第一句对话也能切换背景）
  useEffect(() => {
    const img = getDialogueImage(npc.dialogues?.[0]);
    if (img) onDialogueImage?.(img);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击下一句 / 进入选项（打字未完成时先跳到末尾）
  const handleNext = useCallback(() => {
    if (isTyping) {
      setSkipTyping(true);
      return;
    }
    if (phase === 'dialogues') {
      if (dialogueIdx < npc.dialogues.length - 1) {
        const nextIdx = dialogueIdx + 1;
        setDialogueIdx(nextIdx);
        const img = getDialogueImage(npc.dialogues[nextIdx]);
        if (img) onDialogueImage?.(img);
      } else if (hasChoice) {
        setPhase('choice');
      } else {
        onClose();
      }
    } else if (phase === 'consequence') {
      onClose();
    }
  }, [isTyping, phase, dialogueIdx, npc.dialogues, hasChoice, onClose, onDialogueImage]);

  // ESC 关闭
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 处理选项点击
  const handleChoiceClick = useCallback(async (choice) => {
    if (choosingId) return;
    setChoosingId(choice.id);
    // 若选项含赠礼数据，立即触发礼物弹窗
    if (choice.giftItem) {
      onItemGift?.(choice.giftItem);
    }
    try {
      const result = await onChoice(npc.id, choice.id);
      if (result) {
        const ctype = result.consequence?.type;
        // npc_absent：handleNpcChoiceResult 已处理提示，直接关闭气泡
        // scene_character：handleNpcChoiceResult 已设好 subScene，直接关闭气泡
        if (ctype === 'npc_absent' || ctype === 'scene_character') {
          onClose();
          return;
        }
        setConsequenceData({ choice, consequence: result.consequence });
        setPhase('consequence');
      } else {
        setPhase('consequence');
        setConsequenceData({ choice, consequence: choice.consequence });
      }
    } catch (err) {
      // scene_character consequence는 에러 시에도 ConsequenceView로 보내지 않음
      if (choice.consequence?.type !== 'scene_character') {
        setConsequenceData({ choice, consequence: choice.consequence });
        setPhase('consequence');
      } else {
        onClose();
      }
    } finally {
      setChoosingId(null);
    }
  }, [choosingId, onChoice, npc.id, onItemGift, onClose]);

  const hasAvatar = npc.avatar && !avatarErr;

  // ── consequence 阶段交由独立组件渲染（规避 hooks 规则） ──
  if (phase === 'consequence' && consequenceData) {
    return <ConsequenceView consequenceData={consequenceData} onClose={onClose} safeStyle={safeStyle} onSceneChange={onSceneChange} currentSceneId={currentSceneId} />;
  }

  const { tailLeft, tailSide } = safeStyle;
  const tailTopStyle = tailSide === 'bottom'
    ? { bottom: '-9px', top: 'auto' }
    : { top: '-9px', bottom: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center' };
  const tailTopStyleBorder = tailSide === 'bottom'
    ? { bottom: '-11px', top: 'auto' }
    : { top: '-11px', bottom: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center' };

  // ── 渲染普通对话阶段 ──
  if (phase === 'dialogues') {
    return (
      <div
        style={{
          position: 'absolute',
          left: safeStyle.left,
          top: safeStyle.top,
          transform: safeStyle.transform,
          zIndex: 30,
          userSelect: 'none',
          opacity: safeStyle.opacity ?? 1,
          animation: 'bubblePop 0.25s cubic-bezier(.34,1.56,.64,1) both',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
          maxWidth: '260px',
          minWidth: '160px',
          width: 'min(260px, 44vw)',
        }}
      >
        <div
          onClick={handleNext}
          className={moodClass || ''}
          style={{
            background: 'linear-gradient(145deg, rgba(254,248,228,0.98), rgba(250,236,196,0.98))',
            borderRadius: '16px 16px 16px 4px',
            padding: '12px 14px 10px 14px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(201,168,76,0.7)',
            border: '1.5px solid rgba(201,168,76,0.85)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}>
          {/* 头像 + 名字行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(201,168,76,0.7)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              background: 'rgba(50,25,10,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {npc.sceneAvatar ? (
                <SceneAvatarCircle sceneAvatar={npc.sceneAvatar} size={38} />
              ) : hasAvatar ? (
                <img src={`${npc.avatar}?v=2`} alt={npc.name} loading="lazy" onError={() => setAvatarErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '20px' }}>{npc.emoji}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#5C3000', lineHeight: '1.2', marginBottom: '2px' }}>
                {npc.name}
              </div>
              <div style={{
                fontSize: '10px', color: '#A06820',
                background: 'rgba(201,168,76,0.18)', borderRadius: '6px',
                padding: '1px 6px', display: 'inline-block',
                border: '1px solid rgba(201,168,76,0.3)',
              }}>
                {npc.role}
              </div>
            </div>
            <div style={{
              fontSize: '10px', color: '#C9A84C', alignSelf: 'flex-start',
              background: 'rgba(201,168,76,0.12)', borderRadius: '8px', padding: '2px 7px',
              border: '1px solid rgba(201,168,76,0.25)', whiteSpace: 'nowrap',
            }}>
              {dialogueIdx + 1}/{npc.dialogues.length}{hasChoice ? '+' : ''}
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(201,168,76,0.3)', marginBottom: '8px', borderRadius: '1px' }} />

          <div style={{ fontSize: '13px', color: '#2D1500', lineHeight: '1.7', fontWeight: '500', letterSpacing: '0.02em', minHeight: '1.7em' }}>
            「{displayedText}
            {isTyping && <span style={{ display: 'inline-block', width: '2px', height: '13px', background: '#8B5E20', marginLeft: '1px', verticalAlign: 'middle', animation: 'float 0.6s ease-in-out infinite' }} />}
            {!isTyping && '」'}
          </div>

          <div style={{
            fontSize: '10px', marginTop: '8px',
            textAlign: 'right',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
            color: isTyping ? 'rgba(139,94,32,0.4)' : (dialogueIdx < npc.dialogues.length - 1 || hasChoice) ? '#8B5E20' : '#B04030',
            opacity: isTyping ? 0.5 : 0.85,
            transition: 'opacity 0.3s ease',
          }}>
            {isTyping
              ? <><span>阅读中…</span></>
              : dialogueIdx < npc.dialogues.length - 1
              ? <><span>点击继续</span><span style={{ animation: 'bounce 1s ease-in-out infinite', display: 'inline-block' }}>▶</span></>
              : hasChoice
              ? <><span style={{ color: '#D4517A', fontWeight: '700' }}>💬 有对话选项</span><span style={{ animation: 'bounce 1s ease-in-out infinite', display: 'inline-block' }}>▶</span></>
              : <><span>点击关闭</span><span>✕</span></>
            }
          </div>

          {/* 气泡尾 */}
          <div style={{
            position: 'absolute', bottom: '-9px', left: '22px',
            width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '5px solid transparent',
            borderTop: '9px solid rgba(250,236,196,0.98)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-11px', left: '21px',
            width: 0, height: 0,
            borderLeft: '10px solid transparent', borderRight: '6px solid transparent',
            borderTop: '11px solid rgba(201,168,76,0.7)',
            zIndex: -1,
          }} />
        </div>
      </div>
    );
  }

  // ── 渲染选项阶段 ──
  if (phase === 'choice') {
    const dwc = npc.dialogueWithChoice;
    // 兼容旧格式（text+choices）和新格式（question+options）
    const text = dwc.text || dwc.question;
    const choices = dwc.choices || dwc.options || [];
    return (
      <div style={{
        position: 'absolute',
        left: safeStyle.left,
        top: safeStyle.top,
        transform: safeStyle.transform,
        zIndex: 30,
        userSelect: 'none',
        opacity: safeStyle.opacity ?? 1,
        animation: 'bubblePop 0.25s cubic-bezier(.34,1.56,.64,1) both',
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
        maxWidth: '280px',
        minWidth: '220px',
        width: 'min(280px, 46vw)',
      }}>
        <div style={{
          background: 'linear-gradient(145deg, rgba(30,10,20,0.97), rgba(45,15,30,0.97))',
          borderRadius: '16px',
          padding: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(212,81,122,0.6)',
          border: '1.5px solid rgba(212,81,122,0.7)',
          position: 'relative',
        }}>
          {/* 头像行 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(212,81,122,0.6)',
              background: 'rgba(50,10,30,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {npc.sceneAvatar ? (
                <SceneAvatarCircle sceneAvatar={npc.sceneAvatar} size={34} />
              ) : hasAvatar ? (
                <img src={`${npc.avatar}?v=2`} alt={npc.name} loading="lazy" onError={() => setAvatarErr(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '18px' }}>{npc.emoji}</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#F4A0C0' }}>{npc.name}</div>
              <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>请作出选择</div>
            </div>
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'rgba(245,230,236,0.3)', cursor: 'pointer',
                fontSize: '14px', padding: '2px 4px',
              }}
            >✕</button>
          </div>

          {/* 选项按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {choices.map((choice, idx) => {
              const isChoosing = choosingId === choice.id;
              const isDecline = choice.positive === false || choice.id.startsWith('decline') || choice.id.startsWith('politely');
              return (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceClick(choice)}
                  disabled={!!choosingId}
                  style={{
                    background: isChoosing
                      ? 'rgba(212,81,122,0.4)'
                      : isDecline
                      ? 'rgba(255,255,255,0.06)'
                      : 'linear-gradient(135deg, rgba(212,81,122,0.25), rgba(160,48,88,0.2))',
                    border: `1px solid ${isDecline ? 'rgba(255,255,255,0.12)' : 'rgba(212,81,122,0.5)'}`,
                    borderRadius: '10px',
                    padding: '9px 12px',
                    cursor: choosingId ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    color: isDecline ? 'rgba(245,230,236,0.55)' : '#F4A0C0',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontWeight: isDecline ? '400' : '600',
                  }}
                  onMouseEnter={e => {
                    if (!choosingId) {
                      e.currentTarget.style.background = isDecline
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, rgba(212,81,122,0.4), rgba(160,48,88,0.3))';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isChoosing
                      ? 'rgba(212,81,122,0.4)'
                      : isDecline ? 'rgba(255,255,255,0.06)'
                      : 'linear-gradient(135deg, rgba(212,81,122,0.25), rgba(160,48,88,0.2))';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>
                    {isChoosing ? '⏳' : isDecline ? '↩' : `${idx + 1}️⃣`}
                  </span>
                  {choice.text}
                </button>
              );
            })}
          </div>

          {/* 气泡尾 */}
          <div style={{
            position: 'absolute', bottom: '-9px', left: '22px',
            width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '5px solid transparent',
            borderTop: '9px solid rgba(45,15,30,0.97)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-11px', left: '21px',
            width: 0, height: 0,
            borderLeft: '10px solid transparent', borderRight: '6px solid transparent',
            borderTop: '11px solid rgba(212,81,122,0.6)',
            zIndex: -1,
          }} />
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────
// NPC 可点击热点（叠加在场景图上）—— 使用人物头像 + 脉冲光环 + 点击涟漪
// ─────────────────────────────────────────
const NpcHotspot = memo(function NpcHotspot({ npc, position, onActivate, hasVisited, onDirectEnter }) {
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handleClick = useCallback(() => {
    const id = Date.now();
    setRipples(r => [...r, id]);
    setTimeout(() => setRipples(r => r.filter(x => x !== id)), 600);
    if (hasVisited && onDirectEnter) {
      onDirectEnter();
    } else {
      onActivate(npc.id);
    }
  }, [onActivate, npc.id, hasVisited, onDirectEnter]);

  const hasChoice = !!npc.dialogueWithChoice;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${npc.name}（${npc.role}）`}
      style={{
        position: 'absolute',
        left: `${position.left}%`,
        top: `${position.top}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 20,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        animation: 'hotspotFloat 2.8s ease-in-out infinite',
        willChange: 'transform',
      }}
    >
      {/* 名字标签（常驻，悬停时加强） */}
      <div style={{
        background: hovered ? 'rgba(15,5,10,0.95)' : 'rgba(10,4,8,0.78)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        padding: '3px 10px',
        fontSize: '11px',
        color: hovered ? '#FFD9A0' : 'rgba(255,220,160,0.85)',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.35)'}`,
        boxShadow: hovered ? '0 3px 12px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.4)',
        transition: 'all 0.18s ease',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
        <span style={{ fontSize: '13px', lineHeight: 1 }}>{npc.emoji}</span>
        {npc.name}
        {hasChoice && !hasVisited && (
          <span style={{
            fontSize: '9px', color: '#F4A0C0',
            background: 'rgba(212,81,122,0.25)',
            borderRadius: '4px', padding: '0 4px',
            border: '1px solid rgba(212,81,122,0.3)',
          }}>对话</span>
        )}
        {hasVisited && onDirectEnter && (
          <span style={{
            fontSize: '9px', color: '#A0E8C0',
            background: 'rgba(80,200,120,0.2)',
            borderRadius: '4px', padding: '0 4px',
            border: '1px solid rgba(80,200,120,0.3)',
          }}>再遇</span>
        )}
      </div>

      {/* 光环指示点 */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 脉冲光环 */}
        <div style={{
          position: 'absolute',
          width: hovered ? '36px' : '28px',
          height: hovered ? '36px' : '28px',
          borderRadius: '50%',
          border: `1.5px solid ${hovered ? 'rgba(255,210,100,0.7)' : 'rgba(255,210,100,0.35)'}`,
          animation: 'npcPulseRing 2s ease-in-out infinite',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: hovered ? '46px' : '38px',
          height: hovered ? '46px' : '38px',
          borderRadius: '50%',
          border: `1px solid ${hovered ? 'rgba(255,210,100,0.35)' : 'rgba(255,210,100,0.12)'}`,
          animation: 'npcPulseRing 2s ease-in-out infinite 0.7s',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
        }} />

        {/* 点击涟漪 */}
        {ripples.map(id => (
          <div key={id} style={{
            position: 'absolute',
            width: '50px', height: '50px',
            borderRadius: '50%',
            border: '2px solid rgba(255,210,100,0.8)',
            animation: 'npcRipple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }} />
        ))}

        {/* 中心指示点 */}
        <div style={{
          width: hovered ? '16px' : '12px',
          height: hovered ? '16px' : '12px',
          borderRadius: '50%',
          background: hovered
            ? 'radial-gradient(circle, rgba(255,220,100,1) 0%, rgba(220,160,40,0.9) 100%)'
            : 'radial-gradient(circle, rgba(255,210,100,0.9) 0%, rgba(200,140,30,0.7) 100%)',
          boxShadow: hovered
            ? '0 0 12px rgba(255,200,60,0.9), 0 0 4px rgba(255,220,100,1)'
            : '0 0 6px rgba(255,200,60,0.5)',
          transition: 'all 0.2s ease',
          outline: hasChoice ? '2px solid rgba(212,81,122,0.6)' : 'none',
          outlineOffset: '2px',
        }} />
      </div>

      {/* 底部箭头 */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: `5px solid ${hovered ? 'rgba(255,210,100,0.9)' : 'rgba(255,210,100,0.45)'}`,
        transition: 'border-color 0.2s ease',
        animation: 'pulse 1.8s ease-in-out infinite',
      }} />
    </div>
  );
});

// ─────────────────────────────────────────
// 子场景对话框 —— 底部自动弹出，支持多轮对话 + ABCD选项
// subScene: { subSceneDialogues: [], subSceneChoices: {text, options: [{id,label,text}]} }
// ─────────────────────────────────────────
function SubSceneDialogueBox({ subScene, onClose, onChoiceSelect, onItemGift, onDialogueImage }) {
  const dialogues = subScene.subSceneDialogues || [];
  const choicesData = subScene.subSceneChoices;

  // phase: 'dialogue' | 'choices' | 'response' | 'followup'
  const [phase, setPhase] = useState('dialogue');
  const [step, setStep] = useState(0);
  const [responseLines, setResponseLines] = useState([]);
  const [responseStep, setResponseStep] = useState(0);
  const [followUpLines, setFollowUpLines] = useState([]);
  const [followUpStep, setFollowUpStep] = useState(0);
  const [affinityGain, setAffinityGain] = useState(null);
  const [selectedOptId, setSelectedOptId] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 挂载时初始化第一句的立绘图片
  useEffect(() => {
    const img = getDialogueImage(dialogues[0]);
    if (img) onDialogueImage?.(img);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 好感浮动动画自动消失
  useEffect(() => {
    if (affinityGain !== null) {
      const t = setTimeout(() => setAffinityGain(null), 2200);
      return () => clearTimeout(t);
    }
  }, [affinityGain]);

  const handleNext = () => {
    if (phase === 'dialogue') {
      if (step < dialogues.length - 1) {
        const nextStep = step + 1;
        setStep(nextStep);
        const img = getDialogueImage(dialogues[nextStep]);
        if (img) onDialogueImage?.(img);
      } else if (choicesData) {
        setPhase('choices');
      } else {
        onClose?.();
      }
    } else if (phase === 'response') {
      if (responseStep < responseLines.length - 1) {
        setResponseStep(prev => prev + 1);
      } else if (followUpLines.length > 0) {
        setPhase('followup');
        setFollowUpStep(0);
      } else {
        onClose?.();
      }
    } else if (phase === 'followup') {
      if (followUpStep < followUpLines.length - 1) {
        setFollowUpStep(prev => prev + 1);
      } else {
        onClose?.();
      }
    }
  };

  const handleChoiceClick = (opt) => {
    setSelectedOptId(opt.id);
    onChoiceSelect?.(opt.id, opt);
    if (opt.giftItem) onItemGift?.(opt.giftItem);

    // 好感浮动
    const isPositive = opt.id.endsWith('_c') || opt.id.endsWith('_d') ||
      /_(c|d)_/.test(opt.id) ||
      ['mf_c','mf_d','mf2_c','mf2_d','mf3_c','mf3_d',
       'ww_c','ww_d','ww2_c','ww2_d','ww3_c','ww3_d',
       'st_c','st_d','st2_c','st2_d','st3_c','st3_d',
       'df_c','df_d','df2_c','df2_d','df3_c','df3_d'].includes(opt.id);
    const isNegative = opt.id.endsWith('_a') || opt.id.endsWith('_b') ||
      /_(a|b)_/.test(opt.id);
    if (isPositive) {
      const gain = subScene.storyStage >= 3 ? 15 : subScene.storyStage === 2 ? 10 : 8;
      setAffinityGain(gain);
    } else if (isNegative) {
      const loss = subScene.storyStage >= 3 ? -8 : subScene.storyStage === 2 ? -5 : -3;
      setAffinityGain(loss);
    }

    // 若有反应台词则进入 response 阶段，否则若有后续对话进入 followup，否则关闭
    const responses = opt.responseDialogue
      ? (Array.isArray(opt.responseDialogue) ? opt.responseDialogue : [opt.responseDialogue])
      : [];
    const followUps = opt.followUpDialogues
      ? (Array.isArray(opt.followUpDialogues) ? opt.followUpDialogues : [opt.followUpDialogues])
      : [];

    if (responses.length > 0) {
      setResponseLines(responses);
      setFollowUpLines(followUps);
      setResponseStep(0);
      setPhase('response');
    } else if (followUps.length > 0) {
      setFollowUpLines(followUps);
      setFollowUpStep(0);
      setPhase('followup');
    } else {
      onClose?.();
    }
  };

  const isDialoguePhase = phase === 'dialogue';
  const isChoicesPhase = phase === 'choices';
  const isResponsePhase = phase === 'response';
  const isFollowUpPhase = phase === 'followup';

  const currentDialogue = isDialoguePhase ? getDialogueText(dialogues[step])
    : isResponsePhase ? getDialogueText(responseLines[responseStep])
    : isFollowUpPhase ? getDialogueText(followUpLines[followUpStep])
    : null;

  const isNarratorLine = currentDialogue && !currentDialogue.includes('：') && !currentDialogue.includes(':');

  return (
    <div style={{
      width: '100%',
      padding: '12px 0 4px',
      userSelect: 'none',
      animation: 'dialogueFadeUp 0.3s ease both',
      position: 'relative',
    }}>
      {/* 好感浮动动画 */}
      {affinityGain !== null && (
        <div key={affinityGain + Date.now()} style={{
          position: 'absolute', top: '-10px', right: '24px',
          fontSize: '18px', fontWeight: '700',
          color: affinityGain > 0 ? '#FFB8D0' : '#FF7070',
          textShadow: affinityGain > 0 ? '0 0 12px rgba(255,120,160,0.8)' : '0 0 12px rgba(255,80,80,0.8)',
          pointerEvents: 'none',
          animation: 'affinityFloat 2.2s ease forwards',
          zIndex: 10,
        }}>
          {affinityGain > 0 ? `好感 +${affinityGain} 💕` : `好感 ${affinityGain} 💔`}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(145deg, rgba(20,8,15,0.97), rgba(35,12,28,0.97))',
        borderRadius: '0 0 16px 16px',
        padding: '18px 24px 16px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,210,100,0.6)',
        border: '2px solid rgba(255,210,100,0.65)',
        borderTop: '1px solid rgba(255,210,100,0.3)',
      }}>
        {/* ── 对话 / 反应 / 后续 阶段 ── */}
        {(isDialoguePhase || isResponsePhase || isFollowUpPhase) && (
          <>
            <div style={{
              fontSize: '13px', color: 'rgba(255,210,100,0.75)', letterSpacing: '2px',
              marginBottom: '10px', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}>
              {subScene.avatar && (
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid rgba(255,210,100,0.6)',
                  background: 'rgba(20,8,15,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {avatarError
                    ? <span>🧑</span>
                    : <img src={subScene.avatar} alt={subScene.npcName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarError(true)} />
                  }
                </div>
              )}
              <span>✦ {subScene.npcName || '剧情'} ✦</span>
              {subScene.visitCount > 0 && isDialoguePhase && (
                <span style={{
                  fontSize: '11px', color: 'rgba(255,180,80,0.65)',
                  background: 'rgba(255,180,80,0.1)', borderRadius: '8px',
                  padding: '1px 7px', border: '1px solid rgba(255,180,80,0.25)',
                  letterSpacing: '0.5px'
                }}>
                  第{subScene.visitCount}次相遇
                </span>
              )}
              {isResponsePhase && (
                <span style={{
                  fontSize: '11px', color: 'rgba(255,160,180,0.7)',
                  background: 'rgba(255,120,160,0.1)', borderRadius: '8px',
                  padding: '1px 7px', border: '1px solid rgba(255,120,160,0.25)',
                  letterSpacing: '0.5px'
                }}>
                  回应
                </span>
              )}
            </div>
            <div
              key={`${phase}-${step}-${responseStep}-${followUpStep}`}
              style={{
                fontSize: '16px',
                color: isNarratorLine ? 'rgba(200,180,210,0.85)' : 'rgba(245,230,236,0.95)',
                lineHeight: '1.8',
                minHeight: '50px', marginBottom: '14px',
                fontStyle: isNarratorLine ? 'italic' : 'normal',
                animation: 'dialogueFadeUp 0.25s ease both',
              }}
            >
              {currentDialogue}
            </div>
            <div
              onClick={handleNext}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                gap: '8px', fontSize: '12px', color: 'rgba(255,210,100,0.8)',
                cursor: 'pointer', transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
            >
              <span>{(isResponsePhase || isFollowUpPhase) && responseStep === responseLines.length - 1 && followUpLines.length === 0 ? '离开' : '点击继续'}</span>
              <span>→</span>
            </div>
          </>
        )}

        {/* ── 选项模式 ── */}
        {isChoicesPhase && (
          <>
            <div style={{
              fontSize: '13px', color: 'rgba(255,210,100,0.75)', letterSpacing: '2px',
              marginBottom: '10px', textAlign: 'center'
            }}>
              ✦ 选择你的回应 ✦
            </div>
            <div style={{
              fontSize: '16px', color: 'rgba(245,230,236,0.95)', lineHeight: '1.8',
              marginBottom: '16px', textAlign: 'center', fontStyle: 'italic'
            }}>
              {choicesData.text}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px'
            }}>
              {choicesData.options.map(opt => {
                const isSelected = selectedOptId === opt.id;
                const isDisabled = !!selectedOptId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleChoiceClick(opt)}
                    disabled={isDisabled}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,210,100,0.25), rgba(200,150,60,0.2))'
                        : 'linear-gradient(135deg, rgba(40,20,30,0.9), rgba(60,30,45,0.9))',
                      border: `2px solid ${isSelected ? 'rgba(255,210,100,0.9)' : 'rgba(255,210,100,0.5)'}`,
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: isDisabled && !isSelected ? 'rgba(255,230,200,0.35)' : 'rgba(255,230,200,0.9)',
                      fontSize: '14px',
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      lineHeight: '1.6',
                      opacity: isDisabled && !isSelected ? 0.5 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!isDisabled) {
                        e.currentTarget.style.borderColor = 'rgba(255,210,100,0.95)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(60,30,45,0.95), rgba(80,40,60,0.95))';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isDisabled) {
                        e.currentTarget.style.borderColor = 'rgba(255,210,100,0.5)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40,20,30,0.9), rgba(60,30,45,0.9))';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <span style={{ fontWeight: '700', color: isSelected ? '#FFE566' : '#FFD9A0', marginRight: '8px' }}>
                      {isSelected ? '✓' : opt.label}:
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 工具：根据头部4格（10×10格子坐标，1-based）计算头像裁剪区域
// cells: [格1, 格2, 格3, 格4]，格号 = (行-1)*10 + 列
// 取4格覆盖区域的中心 2列×2行 作为头像圆圈内容
// 返回：{ startColPct, startRowPct, spanColPct, spanRowPct }（百分比，相对于原图宽高）
// ─────────────────────────────────────────
function cellToAvatarStyle(cells) {
  const COLS = 10;
  const ROWS = 10;

  // 兼容旧的单格数字传入
  const cellArr = Array.isArray(cells) ? cells : [cells || 29];

  // 把格号转为 0-based 行/列
  const coords = cellArr.map(c => {
    const idx = Math.max(0, c - 1);
    return { row: Math.floor(idx / COLS), col: idx % COLS };
  });

  // 4格覆盖的行列范围（0-based）
  const minRow = Math.min(...coords.map(c => c.row));
  const maxRow = Math.max(...coords.map(c => c.row));
  const minCol = Math.min(...coords.map(c => c.col));
  const maxCol = Math.max(...coords.map(c => c.col));

  // 每格占整图的百分比
  const cellW = 100 / COLS;   // 10%
  const cellH = 100 / ROWS;   // 10%

  // 头像区域：完整覆盖这4格（minRow~maxRow+1, minCol~maxCol+1）
  // 再向四周各扩展半格，让头像不紧贴边缘
  const padCol = 0.3, padRow = 0.3;
  const startColPct = Math.max(0, (minCol - padCol) * cellW);
  const startRowPct = Math.max(0, (minRow - padRow) * cellH);
  const endColPct   = Math.min(100, (maxCol + 1 + padCol) * cellW);
  const endRowPct   = Math.min(100, (maxRow + 1 + padRow) * cellH);
  const spanColPct  = endColPct - startColPct;
  const spanRowPct  = endRowPct - startRowPct;

  return { startColPct, startRowPct, spanColPct, spanRowPct };
}

// ─────────────────────────────────────────
// 活动场景大图视图（含 NPC 热点 + 气泡）
// ─────────────────────────────────────────
function ActiveSceneView({ scene, npcsMap, character, wardrobe, onNpcChoice, onSceneChange, onItemGift, fullWidth, onInteractionEnd, onNpcActivate, onNpcBubbleClose, sceneEntryImage, sceneEntryBonus }) {
  const [activeBubble, setActiveBubble] = useState(null); // npc.id
  const [activeNpcData, setActiveNpcData] = useState(null); // 随机选取后的 npc 数据
  const [bgError, setBgError] = useState(false);
  const [entryImgError, setEntryImgError] = useState(false);
  const [absentNotice, setAbsentNotice] = useState(null); // NPC 不在时的提示文字
  // 子场景数据：{ image, cells } — 直接替换底图，不叠加
  const [subScene, setSubScene] = useState(null);
  const [subSceneImgError, setSubSceneImgError] = useState(false);
  // 对话驱动的图片覆盖
  const [bubbleOverrideImg, setBubbleOverrideImg] = useState(null);
  const [subSceneOverrideImg, setSubSceneOverrideImg] = useState(null);
  // 场景内图容器 ref（供气泡安全定位使用）
  const sceneImgRef = useRef(null);
  const outerRef = useRef(null);
  // 场景容器尺寸（供粒子 canvas 使用）
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  // 场景切换过渡
  const [transitioning, setTransitioning] = useState(false);
  const prevSceneRef = useRef(scene.id);

  // 监听容器尺寸变化
  useEffect(() => {
    const el = sceneImgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 场景切换过渡动画
  useEffect(() => {
    if (prevSceneRef.current !== scene.id) {
      prevSceneRef.current = scene.id;
      setTransitioning(true);
      const t = setTimeout(() => setTransitioning(false), 500);
      return () => clearTimeout(t);
    }
  }, [scene.id]);

  // 当父场景切换时，重置子场景和图片错误状态
  useEffect(() => {
    setSubScene(null);
    setActiveBubble(null);
    setBgError(false);
    setEntryImgError(false);
    setSubSceneImgError(false);
    setBubbleOverrideImg(null);
  }, [scene.id]);

  // 预加载相邻场景图片
  useEffect(() => {
    if (!scene.activeImage) return;
    const img = new Image();
    img.src = scene.activeImage;
  }, [scene.activeImage]);

  // 场景底图始终独立渲染，覆盖图（对话图/入场图）叠在上方
  const effectiveEntryImage = sceneEntryImage && !entryImgError ? sceneEntryImage : null;
  // 覆盖图：对话覆盖图 > Gemini入场图；二者均为可选叠加层，失败不影响底图
  const overlayImg = bubbleOverrideImg || effectiveEntryImage || null;
  // sceneEntryImage 更新时重置入场图错误
  useEffect(() => { setEntryImgError(false); }, [sceneEntryImage]);
  const hasImg = !!scene.activeImage && !bgError;
  const positions = scene.npcPositions || {};

  const handleActivate = (npcId, npcOverride) => {
    // 允许父组件拦截（返回 true 表示已处理，不展示气泡）
    if (onNpcActivate && onNpcActivate(npcId)) return;
    if (activeBubble === npcId) {
      setActiveBubble(null);
      setActiveNpcData(null);
      return;
    }
    // 已有气泡对话时，不允许点击其他NPC（防止误触关闭）
    if (activeBubble) return;
    // 若 NPC 有 dialogueSets，按 visitRange 或 condition 选对应 set
    const npc = npcOverride || npcsMap?.[npcId];
    if (npc && npc.dialogueSets && npc.dialogueSets.length > 0) {
      const fav = character?.favorability || {};
      const subVisits = character?.subSceneVisits || {};
      // 优先按 visitRange 匹配（+1 是因为本次点击算一次新见面）
      const visitCount = (subVisits[npcId] || 0) + 1;
      let set = npc.dialogueSets.find(s => s.visitRange && visitCount >= s.visitRange[0] && visitCount <= s.visitRange[1]);
      if (!set) {
        // 没有 visitRange 时，按 condition 筛选后随机
        const eligible = npc.dialogueSets.filter(s => {
          if (!s.condition) return true;
          const c = s.condition;
          if (c.minFav && Object.entries(c.minFav).some(([k, v]) => (fav[k] || 0) < v)) return false;
          if (c.maxFav && Object.entries(c.maxFav).some(([k, v]) => (fav[k] || 0) > v)) return false;
          if (c.minVisits && Object.entries(c.minVisits).some(([k, v]) => (subVisits[k] || 0) < v)) return false;
          if (c.hasItem && !character?.inventory?.some(i => i.id === c.hasItem)) return false;
          return true;
        });
        const pool = eligible.length > 0 ? eligible : npc.dialogueSets;
        set = pool[Math.floor(Math.random() * pool.length)];
      }
      // 如果 visitRange 没有匹配到，用最后一个 set（最高阶段）
      if (!set) set = npc.dialogueSets[npc.dialogueSets.length - 1];
      setActiveNpcData({
        ...npc,
        dialogues: set.dialogues || npc.dialogues,
        dialogueWithChoice: set.dialogueWithChoice !== undefined ? set.dialogueWithChoice : (npc.dialogueWithChoice || null),
        stageImage: set.stageImage || null,
      });
    } else if (npc && npc.dialogues && npc.dialogues.length > 1) {
      // 没有 dialogueSets 但有多句对话：随机打乱顺序，每次展示不同内容
      const shuffled = [...npc.dialogues].sort(() => Math.random() - 0.5);
      // 取前1~2句展示（保留 dialogueWithChoice）
      const sliceLen = Math.min(2, shuffled.length);
      setActiveNpcData({
        ...npc,
        dialogues: shuffled.slice(0, sliceLen),
      });
    } else {
      setActiveNpcData(null);
    }
    setActiveBubble(npcId);
  };

  // NPC 选项选择后的回调
  const handleNpcChoiceResult = useCallback(async (npcId, choiceId) => {
    if (!onNpcChoice) return null;
    const result = await onNpcChoice(npcId, choiceId);

    // NPC 不在：关闭气泡，显示提示，不切换子场景
    if (result?.consequence?.type === 'npc_absent') {
      const absentName = result.consequence.npcName || 'TA';
      const notice = result.consequence.reason || `${absentName}不在`;
      onNpcBubbleClose?.(npcId);
      setActiveBubble(null);
      setActiveNpcData(null);
      setAbsentNotice(notice);
      setTimeout(() => setAbsentNotice(null), 3500);
      return result;
    }

    if (result?.consequence?.type === 'scene_character' && (result.consequence.characterImage || result.consequence.subSceneDialogues?.length > 0)) {
      const charImg = result.consequence.characterImage;
      // 从全身图路径推导出裁剪头像路径，例如 /assets/character/outfits/npc_wangwenyu.png
      // -> /assets/npc_avatars/npc_wangwenyu_avatar.png
      const baseName = charImg.replace(/.*\/([^/]+)\.png$/i, '$1');
      const avatarImg = `/assets/npc_avatars/${baseName}_avatar.png`;
      // subSceneDialogues 已包含完整对话列表（含第一句）；
      // 若为空则用 nextDialogue 作为兜底，避免重复叠加
      const extraDialogues = result.consequence.subSceneDialogues || [];
      const baseDialogue = result.consequence.nextDialogue || '';
      const allDialogues = extraDialogues.length > 0
        ? extraDialogues
        : (baseDialogue ? [baseDialogue] : []);
      // 用第一句对话的立绘图作为初始显示图，若无则回退到 characterImage
      const firstDialogueImg = getDialogueImage(allDialogues[0]) || charImg;
      console.log('[SubScene]', result.consequence.npcId, 'visitCount:', result.consequence.visitCount, 'firstImg:', firstDialogueImg, 'dialogues[0]:', allDialogues[0]);
      setSubScene({
        image: firstDialogueImg,
        avatar: avatarImg,
        cells: result.consequence.characterCells || result.consequence.characterCell || [26, 27, 36, 37],
        npcName: result.consequence.npcName || '',
        npcId: result.consequence.npcId || null,
        nextDialogue: baseDialogue,
        subSceneDialogues: allDialogues,
        subSceneChoices: result.consequence.subSceneChoices || null,
        visitCount: result.consequence.visitCount || 0,
        storyStage: result.consequence.storyStage || 1,
        stageImage: result.consequence.stageImage || null,
        sourceNpcId: npcId,
        _ts: Date.now(),
      });
      setActiveBubble(null);
      setActiveNpcData(null);
      setBubbleOverrideImg(null);
    }
    return result;
  }, [onNpcChoice, onNpcBubbleClose]);

  return (
    <div ref={outerRef} style={{
      position: 'relative',
      borderRadius: fullWidth ? '0' : '18px',
      marginBottom: '18px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    }}>
      {/* 场景图容器 */}
      <div ref={sceneImgRef} style={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%',
        background: 'linear-gradient(135deg, #1a0a0f, #2d1520)',
        minHeight: '260px',
        borderRadius: fullWidth ? '0' : '18px',
        overflow: 'hidden',
      }}>
        {/* ── 底图（场景原图，subScene 激活时隐藏） ── */}
        {hasImg && !subScene && (
          <img
            key={scene.activeImage}
            src={scene.activeImage}
            alt={scene.name}
            onError={() => setBgError(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              filter: (() => {
                const tod = getTimeOfDay(character?.monthInfo?.monthInYear || 1, character?.monthInfo?.season || 'spring');
                return TIME_FILTERS[tod]?.cssFilter || 'none';
              })(),
              transition: 'filter 1.5s ease',
            }}
          />
        )}
        {!hasImg && !subScene && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '80px', opacity: 0.1
          }}>
            {scene.bgEmoji}
          </div>
        )}
        {/* ── 覆盖图（对话图/入场图，叠在底图上，加载失败不影响底图） ── */}
        {overlayImg && (
          <img
            key={overlayImg}
            src={overlayImg}
            alt=""
            onError={() => {
              if (overlayImg === bubbleOverrideImg) setBubbleOverrideImg(null);
              else setEntryImgError(true);
            }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              animation: 'overlayFadeIn 0.4s ease both',
              filter: (() => {
                const tod = getTimeOfDay(character?.monthInfo?.monthInYear || 1, character?.monthInfo?.season || 'spring');
                return TIME_FILTERS[tod]?.cssFilter || 'none';
              })(),
              transition: 'filter 1.5s ease',
            }}
          />
        )}

        {/* ── 子场景：NPC 立绘/阶段插图叠加（替换场景底图） ── */}
        {subScene && subSceneImgError && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(40,15,30,0.7) 0%, rgba(10,3,8,0.4) 100%)',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '48px', opacity: 0.25 }}>🎭</span>
          </div>
        )}
        {subScene && (() => {
          const displayImg = subSceneOverrideImg || subScene.stageImage || subScene.image;
          if (!displayImg || subSceneImgError) return null;
          const isCover = !!(subSceneOverrideImg || subScene.stageImage);
          return (
            <img
              key={displayImg}
              src={displayImg}
              alt={subScene.npcName || 'NPC'}
              onError={() => setSubSceneImgError(true)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: isCover ? 'cover' : 'contain',
                objectPosition: isCover ? 'center top' : 'center center',
                animation: 'overlayFadeIn 0.4s ease both',
                pointerEvents: 'none',
              }}
            />
          );
        })()}

        {/* ── dialogueSets NPC 阶段插图覆盖 ── */}
        {activeBubble && activeNpcData?.stageImage && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 8,
            animation: 'overlayFadeIn 0.4s ease both',
            pointerEvents: 'none',
          }}>
            <img
              src={activeNpcData.stageImage}
              alt="场景插图"
              onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* ── 粒子系统 Canvas ── */}
        {containerSize.w > 0 && !subScene && (
          <ParticleCanvas
            sceneId={scene.id}
            width={containerSize.w}
            height={containerSize.h || Math.round(containerSize.w * 0.5625)}
          />
        )}

        {/* ── 时间/天气滤镜层 ── */}
        {!subScene && (
          <TimeWeatherOverlay
            monthInYear={character?.monthInfo?.monthInYear}
            season={character?.monthInfo?.season}
          />
        )}

        {/* ── 场景切换过渡遮罩 ── */}
        {transitioning && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 25,
            background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, rgba(10,3,8,0.7) 100%)',
            animation: 'sceneTransitionFade 0.5s ease both',
            pointerEvents: 'none',
          }} />
        )}

        {/* 底部渐变遮罩 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(to top, rgba(8,3,6,0.62) 0%, transparent 100%)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* ── 父场景：NPC 热点 + 气泡 ── */}
        {!subScene && scene.npcs?.map(npcId => {
          const npc = npcsMap?.[npcId];
          const pos = positions[npcId];
          if (!npc || !pos) return null;
          const subVisits = character?.subSceneVisits || {};

          // 子场景NPC不在父场景显示，只通过引介者对话进入
          if (npc.isSubSceneNpc) return null;

          // 普通NPC：始终保留引介选项，让玩家可以随故事进展多次通过引介者拜访子场景NPC
          const npcForBubble = npc;

          const hasVisited = (subVisits[npcId] || 0) > 0;
          // 查找引介子场景NPC的选项，认识后仍保留（随故事进展对话会变化）
          const sceneCharChoiceId = (() => {
            if (!hasVisited) return null;
            const allChoices = [
              ...(npc.dialogueWithChoice?.choices || npc.dialogueWithChoice?.options || []),
              ...(npc.dialogueSets || []).flatMap(s => s.dialogueWithChoice?.choices || s.dialogueWithChoice?.options || []),
            ];
            for (const choice of allChoices) {
              const cons = choice.consequence;
              if (cons?.type === 'scene_character') return choice.id;
            }
            return null;
          })();

          return (
            <NpcHotspot key={npcId} npc={npcForBubble} position={pos} onActivate={(id) => handleActivate(id, npcForBubble)}
              hasVisited={hasVisited && !!sceneCharChoiceId}
              onDirectEnter={hasVisited && sceneCharChoiceId ? () => handleNpcChoiceResult(npcId, sceneCharChoiceId) : null} />
          );
        })}


        {/* ── NPC 不在提示 ── */}
        {absentNotice && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 60,
            background: 'rgba(10,4,8,0.88)',
            border: '1.5px solid rgba(212,81,122,0.5)',
            borderRadius: '16px',
            padding: '14px 28px',
            backdropFilter: 'blur(10px)',
            animation: 'dialogueFadeUp 0.25s ease both',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '15px', color: 'rgba(245,210,220,0.9)', fontWeight: '600', letterSpacing: '1px' }}>
              {absentNotice}
            </span>
          </div>
        )}

        {/* ── 子场景：返回按钮（仅在场景图内部的左上角） ── */}
        {subScene && (
          <button
            onClick={() => { setSubScene(null); setSubSceneOverrideImg(null); setBgError(false); onInteractionEnd?.(); }}
            style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px', padding: '5px 12px',
              color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px',
              zIndex: 50, transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,81,122,0.5)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
          >
            ← 返回
          </button>
        )}

        {/* 左下角：场景名 + 氛围 */}
        <div style={{
          position: 'absolute', left: '12px', bottom: '12px', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))' }}>
              {scene.icon}
            </span>
            <h2 style={{
              fontSize: '20px', fontWeight: '800', margin: 0,
              background: 'linear-gradient(135deg, #ffffff, #FFD9A0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))'
            }}>
              {subScene ? '相遇' : scene.name}
            </h2>
          </div>
          {!subScene && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(212,81,122,0.35)', backdropFilter: 'blur(6px)',
              borderRadius: '20px', padding: '3px 12px',
              fontSize: '11px', color: '#FFD9D9', width: 'fit-content',
              border: '1px solid rgba(212,81,122,0.4)'
            }}>
              ✦ {scene.ambience}
            </div>
          )}
        </div>

        {/* 道具提示横幅（当背包有与本场景相关的道具时显示） */}
        {!subScene && (() => {
          const inv = character?.inventory || [];
          // 收集本场景相关的道具提示
          const sceneHints = [];
          inv.forEach(item => {
            const hints = ITEM_HINTS[item.id] || [];
            hints.forEach(h => {
              if (h.scene === scene.id) {
                sceneHints.push({ emoji: item.emoji || '✨', name: item.name, tip: h.tip, icon: h.icon });
              }
            });
          });
          if (sceneHints.length === 0) return null;
          return (
            <div style={{
              position: 'absolute', bottom: '12px', right: '12px', zIndex: 15,
              display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '200px',
            }}>
              {sceneHints.slice(0, 2).map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(201,168,76,0.18)', backdropFilter: 'blur(8px)',
                  borderRadius: '10px', padding: '5px 9px',
                  border: '1px solid rgba(201,168,76,0.4)',
                  animation: 'bubblePop 0.3s ease both',
                }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{h.emoji}</span>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#C9A84C', lineHeight: 1.2 }}>{h.name}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(245,230,236,0.6)', lineHeight: 1.3 }}>可在此处使用</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* 有NPC时的提示（子场景时隐藏） */}
        {!subScene && scene.npcs?.length > 0 && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 10,
            background: 'rgba(20,8,15,0.75)', backdropFilter: 'blur(6px)',
            borderRadius: '12px', padding: '5px 10px',
            fontSize: '11px', color: '#F4A0C0',
            border: '1px solid rgba(212,81,122,0.3)',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}>
            <span style={{ animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>💬</span>
            点击人物可互动
          </div>
        )}
      </div>

      {/* ── NPC 气泡：渲染在 overflow:hidden 容器外，避免被裁剪 ── */}
      {!subScene && activeBubble && (() => {
        const npc = activeNpcData || npcsMap?.[activeBubble];
        const pos = positions[activeBubble];
        if (!npc || !pos) return null;
        return (
          <NpcBubble
            key={activeBubble}
            npc={npc}
            position={pos}
            onClose={() => { onNpcBubbleClose?.(activeBubble); setActiveBubble(null); setActiveNpcData(null); setBubbleOverrideImg(null); setBgError(false); }}
            onChoice={handleNpcChoiceResult}
            containerRef={sceneImgRef}
            onSceneChange={onSceneChange}
            onItemGift={onItemGift}
            onDialogueImage={img => { if (img) setBubbleOverrideImg(img); }}
            currentSceneId={scene.id}
          />
        );
      })()}

      {/* ── 入场属性加成 banner（场景图下方，Gemini图加载完后显示） ── */}
      {sceneEntryBonus && sceneEntryImage && !subScene && (() => {
        const SNAMES = { charm:'魅力', wisdom:'才学', spirit:'灵气', affinity:'亲和', courage:'胆识', vitality:'体力', wildness:'野性', culinary:'厨艺', medical:'医术', poetry:'诗才', music:'乐艺', painting:'画艺', reputation:'声望', rhetoric:'口才', statecraft:'政治', martial:'武术', command:'统帅', morality:'道德' };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'linear-gradient(135deg, rgba(12,8,4,0.95), rgba(20,14,6,0.95))', borderTop: '1px solid rgba(201,168,76,0.25)', flexWrap: 'wrap', animation: 'overlayFadeIn 0.5s ease' }}>
            <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', letterSpacing: '2px', flexShrink: 0 }}>✦ 到访加成</span>
            {Object.entries(sceneEntryBonus).map(([k, v]) => (
              <span key={k} style={{ fontSize: '12px', padding: '3px 10px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '12px', color: '#34D399', fontWeight: '700' }}>
                {SNAMES[k] || k} +{v}
              </span>
            ))}
          </div>
        );
      })()}

      {/* ── 子场景对话框：移出 overflow:hidden 容器，放在图片区正下方 ── */}
      {subScene && (
        <SubSceneDialogueBox
          key={subScene._ts || `${subScene.npcId}_${subScene.visitCount}`}
          subScene={subScene}
          onClose={() => { if (subScene.sourceNpcId) onNpcBubbleClose?.(subScene.sourceNpcId); setSubScene(null); setSubSceneOverrideImg(null); setSubSceneImgError(false); setBgError(false); onInteractionEnd?.(); }}
          onChoiceSelect={(optionId, opt) => {
            if (!subScene.npcId) return;
            const npcId = subScene.npcId;
            // 记录本次选择，供下次见面衔接（用静态 axios 确保可靠发送）
            axios.post(`${API_BASE}/game/event`, {
              eventType: 'npc_last_choice',
              payload: { npcId, optionId, text: opt?.text || opt?.label || '', recallText: opt?.recallText || '' }
            }).catch(() => {});
            // C/D选项（主动型）上报好感度增加，A/B选项上报减少
            const isPos = optionId.endsWith('_c') || optionId.endsWith('_d') ||
                optionId.includes('_c_') || optionId.includes('_d_') ||
                ['mf_c','mf_d','mf2_c','mf2_d','mf3_c','mf3_d',
                 'ww_c','ww_d','ww2_c','ww2_d','ww3_c','ww3_d',
                 'st_c','st_d','st2_c','st2_d','st3_c','st3_d',
                 'df_c','df_d','df2_c','df2_d','df3_c','df3_d'].includes(optionId);
            const isNeg = !isPos && (optionId.endsWith('_a') || optionId.endsWith('_b') ||
                optionId.includes('_a_') || optionId.includes('_b_'));
            if (isPos) {
              const gain = subScene.storyStage >= 3 ? 15 : subScene.storyStage === 2 ? 10 : 8;
              axios.post(`${API_BASE}/game/event`, {
                eventType: 'npc_affection',
                payload: { npcId, value: gain }
              }).catch(() => {});
            } else if (isNeg) {
              const loss = subScene.storyStage >= 3 ? -8 : subScene.storyStage === 2 ? -5 : -3;
              axios.post(`${API_BASE}/game/event`, {
                eventType: 'npc_affection',
                payload: { npcId, value: loss }
              }).catch(() => {});
            }
          }}
          onItemGift={onItemGift}
          onDialogueImage={img => { if (img && !subScene.stageImage) { setSubSceneOverrideImg(img); setSubSceneImgError(false); } }}
        />
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes bubblePop {
          from { opacity: 0; transform: translate(-50%, calc(-90% - 30px)) scale(0.7); }
          to   { opacity: 1; transform: translate(-50%, calc(-100% - 30px)) scale(1); }
        }
        @keyframes hotspotFloat {
          0%, 100% { transform: translate(-50%, -100%) translateY(0px); }
          50%       { transform: translate(-50%, -100%) translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes npcPulseRing {
          0%, 100% { transform: scale(1);    opacity: 0.8; }
          50%       { transform: scale(1.18); opacity: 0.3; }
        }
        @keyframes npcRipple {
          0%   { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes hotspotPulseRing {
          0%, 100% { box-shadow: 0 0 0 3px rgba(255,180,50,0.2), 0 0 14px rgba(255,180,50,0.45); border-color: rgba(255,210,100,0.75); }
          50%      { box-shadow: 0 0 0 5px rgba(255,180,50,0.35), 0 0 22px rgba(255,180,50,0.7); border-color: rgba(255,210,100,1); }
        }
        @keyframes dialogueFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes affinityFloat {
          0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
          15%  { opacity: 1; transform: translateY(-8px) scale(1.1); }
          70%  { opacity: 1; transform: translateY(-28px) scale(1); }
          100% { opacity: 0; transform: translateY(-44px) scale(0.9); }
        }
        @keyframes sceneTransitionFade {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────
// 宫廷人物系统（新版：头像卡片网格弹窗）
// ─────────────────────────────────────────

// 10个宫廷人物，从低到高排列
const COURT_NPCS = [
  {
    id: 'maid',
    name: '宫女',
    avatarFile: 'maid.png',
    rank: 0,
    // 每月对话（1-12月，循环）
    monthlyDialogues: {
      1:  { type: 'chat',    text: '新年伊始，宫里到处张灯结彩，奴婢给小姐拜年啦！' },
      2:  { type: 'gossip',  text: '听说皇后娘娘最近心情不好，宫里人人都小心翼翼的……' },
      3:  { type: 'chat',    text: '小姐若有空，不妨去古街逛逛，听说那儿的布庄最近来了新花样！', scene: 'ancient_street', event: 'fabric_shop_new' },
      4:  { type: 'chat',    text: '春日里百花盛开，小姐气色越来越好了，真是羡煞旁人！' },
      5:  { type: 'gossip',  text: '奴婢偷听到，芳华郡主和四皇子最近闹了矛盾，具体原因不知道……' },
      6:  { type: 'chat',    text: '奴婢听人说，草原上这个季节有一种珍贵的药草，懂医术的人去了定有收获！', scene: 'grassland', event: 'rare_herb' },
      7:  { type: 'chat',    text: '七夕将至，宫里的姐妹们都在偷偷绣手帕，小姐有心上人了吗？' },
      8:  { type: 'gossip',  text: '听说翰林院最近来了位新学士，才华横溢，宫里的小姐们都在议论呢！' },
      9:  { type: 'chat',    text: '重阳节快到了，小姐不如去药堂走走，说不定能学到什么养生秘方！', scene: 'medicine_hall', event: 'autumn_remedy' },
      10: { type: 'chat',    text: '秋风送爽，奴婢最近学了一道点心，改天给小姐尝尝！' },
      11: { type: 'gossip',  text: '宫里传言说，皇上最近在物色新的宫廷乐师，不知是真是假……' },
      12: { type: 'chat',    text: '年关将近，客栈里总有各地来的商旅，说不定能听到有趣的消息！', scene: 'inn', event: 'merchant_news' },
    },
    gift: { name: '宫廷胭脂', emoji: '💄' },
  },
  {
    id: 'musician',
    name: '乐师',
    avatarFile: 'musician.png',
    rank: 1,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '新春佳节，在下为小姐弹奏一曲《梅花引》，愿小姐岁岁平安。' },
      2:  { type: 'gossip',  text: '宫廷宴会上，贵妃娘娘点名要听《霓裳羽衣》，可在下一时忘了谱子，真是狼狈……' },
      3:  { type: 'chat',    text: '春日里，画室的学子们正在切磋画技，若小姐有兴趣，不妨去看看，或许能遇见知音！', scene: 'art_studio', event: 'spring_art_gathering' },
      4:  { type: 'chat',    text: '小姐今日气色极好，在下有感而发，想为小姐谱一首新曲，不知小姐可有雅兴？' },
      5:  { type: 'gossip',  text: '听说宫廷女师最近在教皇子们学琴，四皇子天赋不错，皇后娘娘很高兴呢。' },
      6:  { type: 'chat',    text: '夏日夜晚，草原上会有牧民围火歌唱，那里的民间曲调别有风味，小姐若去定会喜欢！', scene: 'grassland', event: 'folk_music_night' },
      7:  { type: 'chat',    text: '七夕月圆，在下新谱了一曲《鹊桥仙》，愿天下有情人终成眷属。' },
      8:  { type: 'gossip',  text: '翰林院来的那位新学士，据说也精通音律，在下想与他切磋切磋。' },
      9:  { type: 'chat',    text: '礼仪堂最近在排练宫廷大典的乐曲，小姐若去旁听，说不定能学到不少！', scene: 'etiquette_hall', event: 'ceremony_rehearsal' },
      10: { type: 'chat',    text: '秋高气爽，在下最爱在这时节弹琴，万物萧瑟之中，音符显得格外清澈。' },
      11: { type: 'gossip',  text: '宫里要举办冬日音乐会，皇上亲自点了几首曲目，在下正在苦练呢！' },
      12: { type: 'chat',    text: '年末了，客栈里有位来自江南的说书人，据说会唱一种失传的古调，小姐有兴趣吗？', scene: 'inn', event: 'ancient_melody' },
    },
    gift: { name: '丝竹谱册', emoji: '📜' },
  },
  {
    id: 'cook',
    name: '厨子',
    avatarFile: 'cook.png',
    rank: 2,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '新年好！小人今年新研了一道"百福糕"，小姐尝尝，保管喜欢！' },
      2:  { type: 'gossip',  text: '贵妃娘娘昨日嫌菜咸了，把小人骂得狗血淋头……唉，宫里的日子不好过啊。' },
      3:  { type: 'chat',    text: '春天的草原上有新鲜的野菜，小人最爱用来做汤，小姐若去草原，帮小人带些回来？', scene: 'grassland', event: 'wild_vegetables' },
      4:  { type: 'chat',    text: '小姐，小人最近研究出一道"桃花酥"，用的是新鲜桃花，香甜可口，请小姐品鉴！' },
      5:  { type: 'gossip',  text: '听说古街新开了一家香料铺子，进了不少西域来的稀罕玩意儿，小人想去瞧瞧！' },
      6:  { type: 'chat',    text: '夏日里，药堂的大夫会来宫里送消暑药材，小人顺便问问有没有新鲜食材，小姐也可以去看看！', scene: 'medicine_hall', event: 'summer_herbs' },
      7:  { type: 'chat',    text: '七夕佳节，小人特制了一道"鹊桥饼"，愿小姐早遇良缘！' },
      8:  { type: 'gossip',  text: '宫里来了位新御厨，据说是从江南请来的，手艺了得，小人要好好向他学习！' },
      9:  { type: 'chat',    text: '秋天是螃蟹最肥的时候，古街的市集上有新鲜的大闸蟹，小姐若去，记得多买些！', scene: 'ancient_street', event: 'crab_season' },
      10: { type: 'chat',    text: '深秋了，小人炖了一锅羊肉汤，暖身暖心，小姐要不要来一碗？' },
      11: { type: 'gossip',  text: '年末宫廷大宴，皇上钦点了十二道菜，小人正忙得不可开交，头发都快掉光了！' },
      12: { type: 'chat',    text: '年关了，客栈里的掌柜每年这时候都会做一道"团圆饭"，味道据说一绝，小姐不去尝尝？', scene: 'inn', event: 'reunion_feast' },
    },
    gift: { name: '宫廷糕点', emoji: '🍡' },
  },
  {
    id: 'guardcommander',
    name: '侍卫将领',
    avatarFile: 'guardcommander.png',
    rank: 3,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '新春佳节，末将在此恭祝凌小姐平安顺遂，万事如意！' },
      2:  { type: 'gossip',  text: '近来宫里来了几个形迹可疑的人，末将已加强了巡逻，小姐出行须多加小心。' },
      3:  { type: 'chat',    text: '春猎即将开始，将军府那边正在备马选将，小姐若有兴趣，不妨去将军府见识一番！', scene: 'general_mansion', event: 'spring_hunt_prep' },
      4:  { type: 'chat',    text: '凌小姐的胆识令末将刮目相看，将门之后，果然与众不同！' },
      5:  { type: 'gossip',  text: '听说边关最近有些动荡，将军大人已奉命前往视察，宫里气氛有些紧张。' },
      6:  { type: 'chat',    text: '草原上有一处演武场，每年夏天会有比武大会，小姐若去，说不定能见识到真正的武艺！', scene: 'grassland', event: 'martial_contest' },
      7:  { type: 'chat',    text: '七夕夜，末将奉命加强宫廷守卫，凌小姐若在宫中，末将定护您周全。' },
      8:  { type: 'gossip',  text: '宫里新来了几位武艺高强的侍卫，据说是皇上从各地选拔来的，末将压力不小啊！' },
      9:  { type: 'chat',    text: '秋日将军府会有骑射比武，宇文拓将军亲自督阵，小姐若去参观，说不定能结识不少豪杰！', scene: 'general_mansion', event: 'autumn_archery' },
      10: { type: 'chat',    text: '深秋了，末将最近在练一套新的剑法，凌小姐若有兴趣，可以来观摩！' },
      11: { type: 'gossip',  text: '听说有人在暗中打探宫廷的守卫规律，末将已上报皇上，正在彻查。' },
      12: { type: 'chat',    text: '年末了，客栈里有不少江湖人士聚集，小姐若去，或许能听到一些有趣的消息！', scene: 'inn', event: 'jianghu_gathering' },
    },
    gift: { name: '护身玉牌', emoji: '🪬' },
  },
  {
    id: 'minister',
    name: '大臣',
    avatarFile: 'minister.png',
    rank: 4,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌小姐，新春佳节，老夫代满朝文武恭贺小姐，愿小姐前程似锦！' },
      2:  { type: 'gossip',  text: '朝堂上，礼部与户部为今年的春祭经费争论不休，老夫居中调停，着实费神。' },
      3:  { type: 'chat',    text: '礼仪堂近日新开了一门"宫廷礼仪精修课"，凌小姐若去学习，定能在宫中如鱼得水！', scene: 'etiquette_hall', event: 'etiquette_masterclass' },
      4:  { type: 'chat',    text: '春日里，老夫在花园中见到一株罕见的兰花，想到凌小姐，便折了一枝带来。' },
      5:  { type: 'gossip',  text: '听说皇上有意在今年秋天举行一场诗会，届时朝野才俊云集，凌小姐或可一展才华！' },
      6:  { type: 'chat',    text: '翰林院今夏会开放藏书楼，难得的机会，凌小姐若去，定能找到不少珍贵典籍！', scene: 'art_studio', event: 'library_open' },
      7:  { type: 'chat',    text: '七夕佳节，老夫的孙女也在宫中，凌小姐若有空，不妨与她相聚。' },
      8:  { type: 'gossip',  text: '翰林院新来的那位学士，据说是前朝遗老的后人，来历颇为神秘……' },
      9:  { type: 'chat',    text: '皇上将于重阳节在宫中举行诗会，凌小姐若提前在书院苦练诗才，届时定能出彩！', scene: 'art_studio', event: 'poetry_contest_prep' },
      10: { type: 'chat',    text: '凌小姐的才学让老夫刮目相看，若有机会，老夫愿向皇上举荐！' },
      11: { type: 'gossip',  text: '宫廷年末大典将至，老夫正忙于礼仪筹备，着实繁琐，但也是老夫的职责所在。' },
      12: { type: 'chat',    text: '年关了，古街的书市每年这时候最热闹，各地书商云集，小姐若去，定有收获！', scene: 'ancient_street', event: 'year_end_book_fair' },
    },
    gift: { name: '御赐文房四宝', emoji: '🖌️' },
  },
  {
    id: 'general',
    name: '将军',
    avatarFile: 'general.png',
    rank: 5,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌小姐，你父亲曾是本将的袍泽，今日见到你，倍感亲切，新年快乐！' },
      2:  { type: 'gossip',  text: '边关传来消息，北方游牧部落有异动，本将已向皇上请命，随时准备出征。' },
      3:  { type: 'chat',    text: '春日里，将军府演武场正在操练新兵，宇文拓将军亲自指教，小姐若去，或许能见识真正的将门武艺！', scene: 'general_mansion', event: 'northern_horses' },
      4:  { type: 'chat',    text: '凌小姐的胆识不输男儿，你父亲若知道，定会感到骄傲！' },
      5:  { type: 'gossip',  text: '宫中有人向皇上进谗言，说本将拥兵自重，本将问心无愧，但仍需谨慎行事。' },
      6:  { type: 'chat',    text: '草原上有一支神秘的游商队伍，每年夏天经过，据说带有珍贵的异域宝物，小姐若去或许能遇见！', scene: 'grassland', event: 'exotic_merchants' },
      7:  { type: 'chat',    text: '七夕夜，本将想起了远在边关的将士们，不知他们今夜是否也在思念家人……' },
      8:  { type: 'gossip',  text: '兵部尚书与本将政见不合，最近在朝堂上多有摩擦，皇上也有些不悦。' },
      9:  { type: 'chat',    text: '秋猎将至，皇上会在草原上设立行营，小姐若有机会随行，定能见识到皇家猎场的壮观！', scene: 'grassland', event: 'imperial_hunt' },
      10: { type: 'chat',    text: '深秋了，本将最近在整理父亲留下的兵书，有些地方颇有感悟，改日与你分享。' },
      11: { type: 'gossip',  text: '听说皇上有意在明年春天御驾亲征，朝堂上议论纷纷，本将已做好随时出发的准备。' },
      12: { type: 'chat',    text: '年末了，京城里有不少从边关归来的老兵，在客栈里聚会，他们的故事值得一听！', scene: 'inn', event: 'veterans_gathering' },
    },
    gift: { name: '将军令牌', emoji: '🏅' },
  },
  {
    id: 'princess',
    name: '公主',
    avatarFile: 'princess.png',
    rank: 6,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌若雪！新年快乐！本宫给你带了宫里新制的糕点，快来尝尝！' },
      2:  { type: 'gossip',  text: '皇兄最近总是闷闷不乐，本宫问他，他也不说，你说他是怎么了？' },
      3:  { type: 'chat',    text: '本宫最近迷上了画画！听说画室的先生技艺超群，小姐若去，我们可以一起学！', scene: 'art_studio', event: 'princess_painting' },
      4:  { type: 'chat',    text: '春天真好！本宫想和你去御花园放风筝，你愿意吗？' },
      5:  { type: 'gossip',  text: '母后最近在为本宫物色驸马，本宫才不要嫁人呢，烦死了！' },
      6:  { type: 'chat',    text: '本宫听说草原上的牧民有一种神奇的草药，据说能让皮肤变好，小姐去草原时帮本宫问问？', scene: 'grassland', event: 'beauty_herb' },
      7:  { type: 'chat',    text: '七夕节本宫想做一个荷包送给……咳咳，总之，凌姐姐你会绣花吗？' },
      8:  { type: 'gossip',  text: '那个翰林院的新学士，本宫觉得他看本宫的眼神有些奇怪，你觉得呢？' },
      9:  { type: 'chat',    text: '礼仪堂最近在教新式宫廷舞蹈，本宫偷偷去学了，可好看了！小姐也去看看吧！', scene: 'etiquette_hall', event: 'new_court_dance' },
      10: { type: 'chat',    text: '秋天来了，本宫最爱赏菊花！改天我们一起去御花园，好不好？' },
      11: { type: 'gossip',  text: '本宫听说皇兄最近在研究什么秘密，连本宫都不告诉，哼！' },
      12: { type: 'chat',    text: '年末了，古街的灯会最热闹，本宫想偷溜出去玩，小姐要不要陪本宫？', scene: 'ancient_street', event: 'lantern_festival' },
    },
    gift: { name: '公主珍珠耳坠', emoji: '💎' },
  },
  {
    id: 'prince',
    name: '皇子',
    avatarFile: 'prince.png',
    rank: 7,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌若雪，新年伊始，本皇子听闻你在京城颇有才名，今日一见，果然名不虚传。' },
      2:  { type: 'gossip',  text: '朝堂上几位皇兄争权，本皇子置身事外，只愿专心学问，但父皇似乎另有打算……' },
      3:  { type: 'chat',    text: '本皇子近日在研读一部古籍，其中提到了一种失传的医术，据说药堂的老大夫知道一些线索！', scene: 'medicine_hall', event: 'ancient_medical_text' },
      4:  { type: 'chat',    text: '春日里，本皇子在御花园写了一首诗，自觉尚可，不知凌小姐可否指教？' },
      5:  { type: 'gossip',  text: '宫中传言，父皇有意在几位皇子中选一位监国，本皇子压力颇大……' },
      6:  { type: 'chat',    text: '本皇子听说草原上有一位隐居的高人，学问渊博，若能拜访，定有所得，小姐可有兴趣同往？', scene: 'grassland', event: 'hermit_scholar' },
      7:  { type: 'chat',    text: '七夕佳节，本皇子谱了一首词，却苦于无人赏析，凌小姐才学出众，可否赐教？' },
      8:  { type: 'gossip',  text: '翰林院来的那位新学士，本皇子与他深谈过，此人学问深厚，来历却颇为神秘……' },
      9:  { type: 'chat',    text: '重阳诗会将至，本皇子在苦练诗才，书院的先生说，若能在诗会上夺魁，父皇会刮目相看！', scene: 'art_studio', event: 'poetry_contest' },
      10: { type: 'chat',    text: '秋风送爽，本皇子最近在临摹王羲之的字帖，进步不大，凌小姐可有什么心得？' },
      11: { type: 'gossip',  text: '宫中有传言，父皇已有意立太子，几位皇兄蠢蠢欲动，本皇子只想置身事外……' },
      12: { type: 'chat',    text: '年末了，本皇子听说礼仪堂会举行一场特别的年终典礼，小姐若去观摩，定有所得！', scene: 'etiquette_hall', event: 'year_end_ceremony' },
    },
    gift: { name: '皇子亲笔诗稿', emoji: '📝' },
  },
  {
    id: 'empress',
    name: '皇后',
    avatarFile: 'empress.png',
    rank: 8,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌若雪，新春佳节，本宫见你气色甚好，想必这段时日过得充实。' },
      2:  { type: 'gossip',  text: '宫中有几位嫔妃争宠，闹得乌烟瘴气，本宫已命人彻查，不得有任何逾矩之举。' },
      3:  { type: 'chat',    text: '本宫听闻礼仪堂近日来了一位德高望重的老嬷嬷，专门教授宫廷礼仪，凌小姐若去，本宫会让人关照你。', scene: 'etiquette_hall', event: 'empress_recommendation' },
      4:  { type: 'chat',    text: '春日里，本宫在御花园设了茶宴，凌小姐的才情令满座宾客赞叹，本宫甚感欣慰。' },
      5:  { type: 'gossip',  text: '皇上近日龙体微恙，本宫忧心忡忡，已命太医院日夜守候，望皇上早日康复。' },
      6:  { type: 'chat',    text: '本宫听说药堂有一位医术精湛的大夫，擅长调理女子体质，凌小姐若有需要，本宫可为你引荐。', scene: 'medicine_hall', event: 'empress_doctor_referral' },
      7:  { type: 'chat',    text: '七夕佳节，本宫为宫中嫔妃设了宴，凌小姐的礼仪举止令本宫十分满意。' },
      8:  { type: 'gossip',  text: '宫中有人向皇上进言，欲动摇本宫的地位，本宫心中有数，凌小姐，宫中行事须谨慎。' },
      9:  { type: 'chat',    text: '本宫打算在重阳节后在宫中举办一场书画展，凌小姐若能呈上佳作，本宫定会为你美言！', scene: 'art_studio', event: 'empress_art_exhibition' },
      10: { type: 'chat',    text: '秋意渐浓，本宫见你一路走来，成长颇多，本宫心中甚慰，望你继续努力。' },
      11: { type: 'gossip',  text: '宫中关于立太子的传言越来越多，本宫须小心应对，凌小姐，近日宫中敏感，你行事须更加谨慎。' },
      12: { type: 'chat',    text: '年末了，本宫听说古街有一家老字号的绸缎庄，专门为宫廷供货，凌小姐若去，可提本宫的名号，定有优待！', scene: 'ancient_street', event: 'empress_silk_shop' },
    },
    gift: { name: '皇后赐凤钗', emoji: '🪭' },
  },
  {
    id: 'emperor',
    name: '皇上',
    avatarFile: 'emperor.png',
    rank: 9,
    monthlyDialogues: {
      1:  { type: 'chat',    text: '凌若雪，新春佳节，朕见你气宇不凡，将门之后，果然不同寻常。' },
      2:  { type: 'gossip',  text: '朝堂之上，朕最近在考察几位皇子的才能，你觉得，何为真正的帝王之才？' },
      3:  { type: 'chat',    text: '朕听闻礼仪堂的教习说你礼仪精进，甚为欣慰。朕有意在春祭上让你随行，你须提前去礼仪堂好好准备！', scene: 'etiquette_hall', event: 'imperial_ceremony_prep' },
      4:  { type: 'chat',    text: '春日里，朕在御花园中遇见你，你的才情与气度令朕印象深刻。' },
      5:  { type: 'gossip',  text: '朕最近在考虑一件大事，关乎江山社稷，暂不便透露，但你的未来，朕自有安排。' },
      6:  { type: 'chat',    text: '朕听说草原上有一支神秘的部落，掌握着一种古老的医术，朕有意派人前往，你若有兴趣，可前往草原一探！', scene: 'grassland', event: 'imperial_mission' },
      7:  { type: 'chat',    text: '七夕之夜，朕在御花园赏月，见你独自一人，朕颇有感慨，你可有心中所念之人？' },
      8:  { type: 'gossip',  text: '朝中有人结党营私，朕已心中有数，只是时机未到，凌若雪，你须记住，宫中行事，忠心为本。' },
      9:  { type: 'chat',    text: '朕将于重阳节举办诗会，届时朝野才俊云集，你若能在诗会上一展才华，朕定会另眼相看！', scene: 'art_studio', event: 'imperial_poetry_contest' },
      10: { type: 'chat',    text: '秋风萧瑟，朕见你一路走来，成长颇多，朕心甚慰，望你不忘初心，继续精进。' },
      11: { type: 'gossip',  text: '朕近日在考虑立太子一事，此乃国之大事，朕须慎重，凌若雪，你觉得，何为明君之道？' },
      12: { type: 'chat',    text: '年末了，朕有意在明年春天举行一场大典，你须在礼仪堂好好准备，届时朕会亲自考核！', scene: 'etiquette_hall', event: 'imperial_grand_ceremony' },
    },
    gift: { name: '御赐金如意', emoji: '✨' },
  },
];

// localStorage keys for court system
const COURT_MEET_KEY = 'courtMeetCounts';
const COURT_LAST_MET_KEY = 'courtLastMetMonth';

function getCourtMeetCounts() {
  try { return JSON.parse(localStorage.getItem(COURT_MEET_KEY) || '{}'); }
  catch { return {}; }
}

function saveCourtMeetCounts(counts) {
  localStorage.setItem(COURT_MEET_KEY, JSON.stringify(counts));
}

function getCourtLastMetMonth() {
  try { return JSON.parse(localStorage.getItem(COURT_LAST_MET_KEY) || '{}'); }
  catch { return {}; }
}

function saveCourtLastMetMonth(data) {
  localStorage.setItem(COURT_LAST_MET_KEY, JSON.stringify(data));
}

// 判断某个NPC是否已解锁（前一个人已见满2次）
function isNpcUnlocked(npcIndex, meetCounts) {
  if (npcIndex === 0) return true;
  const prevNpc = COURT_NPCS[npcIndex - 1];
  return (meetCounts[prevNpc.id] || 0) >= 2;
}

// 见面成功概率（基于rank，越高越难）
function getMeetSuccessRate(rank) {
  return 0.9 - rank * 0.04;
}

// ─────────────────────────────────────────
// 宫廷人物选择弹窗（新版：头像卡片网格）
// ─────────────────────────────────────────
function CourtCharacterModal({ onClose, character, onMeetResult }) {
  const [meetCounts, setMeetCounts] = useState(() => getCourtMeetCounts());
  const [lastMetMonth, setLastMetMonth] = useState(() => getCourtLastMetMonth());
  const gameMonth = character?.gameMonth || 1;
  const monthInYear = character?.monthInfo?.monthInYear || ((gameMonth - 1) % 12 + 1);

  const handleSelectNpc = (npc, idx) => {
    if (!isNpcUnlocked(idx, meetCounts)) return;

    // 本月已见过，引导下个月再来
    if (lastMetMonth[npc.id] === gameMonth) {
      onMeetResult({ npc, success: false, alreadyMet: true, dialogue: null, gift: null });
      onClose();
      return;
    }

    const successRate = getMeetSuccessRate(npc.rank);
    const success = Math.random() < successRate;

    let dialogue = null;
    if (success) {
      const monthDialogue = npc.monthlyDialogues[monthInYear] || npc.monthlyDialogues[1];
      dialogue = monthDialogue;

      // 更新见面次数（上限2次，见满2次即可解锁下一个人物）
      const newCounts = { ...meetCounts };
      newCounts[npc.id] = Math.min((newCounts[npc.id] || 0) + 1, 2);
      setMeetCounts(newCounts);
      saveCourtMeetCounts(newCounts);
    }

    // 记录本月已见（无论成功失败都记录，避免反复骚扰）
    const newLastMet = { ...lastMetMonth, [npc.id]: gameMonth };
    setLastMetMonth(newLastMet);
    saveCourtLastMetMonth(newLastMet);

    // 皇上：传递当前累计见面次数（用于按顺序展示四张立绘）
    const emperorVisitCount = npc.id === 'emperor' ? (meetCounts[npc.id] || 0) : null;
    onMeetResult({
      npc,
      success,
      alreadyMet: false,
      dialogue,
      gift: success ? npc.gift : null,
      emperorVisitCount,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(3,1,6,0.92)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '96vw', maxWidth: '680px',
        maxHeight: '92vh',
        background: 'linear-gradient(160deg, #0e0510 0%, #1c0a18 50%, #0e0510 100%)',
        border: '1.5px solid rgba(201,168,76,0.45)',
        borderRadius: '22px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.25)',
        padding: '22px 20px 18px',
        position: 'relative',
        overflowY: 'auto',
      }}>
        {/* 关闭按钮 */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '14px', right: '16px',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%', width: '30px', height: '30px',
          color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>✕</button>

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', letterSpacing: '4px', marginBottom: '5px' }}>
            宫廷 · 第{monthInYear}月
          </div>
          <h2 style={{
            fontSize: '20px', fontWeight: '800', margin: 0,
            background: 'linear-gradient(135deg, #FFD700, #FFA040)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>今天要去见谁呢？</h2>
        </div>

        {/* 10个角色网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
        }}>
          {COURT_NPCS.map((npc, idx) => {
            const unlocked = isNpcUnlocked(idx, meetCounts);
            const metThisMonth = lastMetMonth[npc.id] === gameMonth;
            return (
              <CourtNpcCard
                key={npc.id}
                npc={npc}
                unlocked={unlocked}
                metThisMonth={metThisMonth}
                onClick={() => handleSelectNpc(npc, idx)}
              />
            );
          })}
        </div>

        <style>{`
          @keyframes courtCardIn {
            from { opacity: 0; transform: translateY(12px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

function CourtNpcCard({ npc, unlocked, metThisMonth, onClick }) {
  const [hovered, setHovered] = useState(false);
  const clickable = unlocked && !metThisMonth;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => clickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '7px',
        padding: '10px 6px 8px',
        borderRadius: '14px',
        background: hovered
          ? 'rgba(201,168,76,0.14)'
          : metThisMonth
            ? 'rgba(80,50,30,0.18)'
            : unlocked
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.3)',
        border: hovered
          ? '1.5px solid rgba(255,215,0,0.65)'
          : metThisMonth
            ? '1px solid rgba(160,120,50,0.35)'
            : unlocked
              ? '1px solid rgba(201,168,76,0.3)'
              : '1px solid rgba(100,60,80,0.3)',
        cursor: clickable ? 'pointer' : 'not-allowed',
        transition: 'all 0.18s ease',
        animation: 'courtCardIn 0.35s ease both',
        position: 'relative',
        filter: unlocked && !metThisMonth ? 'none' : 'grayscale(50%) brightness(0.6)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 6px 20px rgba(201,168,76,0.25)' : 'none',
      }}
    >
      {/* 头像 */}
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        border: hovered
          ? '2px solid rgba(255,215,0,0.8)'
          : metThisMonth
            ? '2px solid rgba(160,120,50,0.4)'
            : unlocked
              ? '2px solid rgba(201,168,76,0.45)'
              : '2px solid rgba(100,60,80,0.4)',
        boxShadow: hovered ? '0 0 14px rgba(255,215,0,0.4)' : 'none',
        background: 'rgba(20,8,16,0.8)',
      }}>
        <img
          src={`/assets/npc_avatars/${npc.avatarFile}`}
          alt={npc.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* 名字 */}
      <div style={{
        fontSize: '13px', fontWeight: '700',
        color: hovered ? '#FFD700' : metThisMonth ? 'rgba(180,140,80,0.65)' : unlocked ? 'rgba(245,220,200,0.9)' : 'rgba(160,110,130,0.6)',
        letterSpacing: '1px',
        textAlign: 'center',
      }}>{npc.name}</div>

      {/* 本月已见标记 */}
      {metThisMonth && (
        <div style={{
          fontSize: '10px', color: 'rgba(180,140,80,0.6)',
          letterSpacing: '0.5px',
        }}>本月已见</div>
      )}

      {/* 锁图标（未解锁） */}
      {!unlocked && (
        <div style={{
          position: 'absolute', top: '6px', right: '6px',
          fontSize: '12px', opacity: 0.7,
        }}>🔒</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// 宫廷见面结果对话框
// ─────────────────────────────────────────
function CourtMeetResultDialogue({ result, onClose, onSceneHint }) {
  const { npc, success, alreadyMet, dialogue, gift, emperorVisitCount } = result;

  // 皇上立绘：按累计见面次数（0-based）顺序展示4张
  const EMPEROR_STAGE_IMAGES = [
    '/assets/stage_images/royal_emperor_s1.png',
    '/assets/stage_images/royal_emperor_s2.png',
    '/assets/stage_images/royal_emperor_s3.png',
    '/assets/stage_images/royal_emperor_s4.png',
  ];
  const emperorStageImage = npc.id === 'emperor' && success
    ? EMPEROR_STAGE_IMAGES[Math.min((emperorVisitCount || 0), 3)]
    : null;

  const handleHintClick = () => {
    if (dialogue?.type === 'hint' && dialogue?.scene) {
      onSceneHint(dialogue.scene, dialogue.event);
    }
    onClose();
  };

  const borderColor = alreadyMet
    ? 'rgba(120,90,40,0.45)'
    : success
      ? 'rgba(201,168,76,0.45)'
      : 'rgba(180,40,60,0.45)';

  const bgGradient = alreadyMet
    ? 'linear-gradient(135deg, rgba(18,10,5,0.97), rgba(30,18,8,0.97))'
    : success
      ? 'linear-gradient(135deg, rgba(15,6,12,0.97), rgba(28,12,20,0.97))'
      : 'linear-gradient(135deg, rgba(20,5,10,0.97), rgba(35,8,15,0.97))';

  return (
    <div style={{
      marginTop: '14px',
      background: bgGradient,
      border: `1px solid ${borderColor}`,
      borderRadius: '14px',
      padding: '18px 20px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      animation: 'dialogueFadeUp 0.3s ease both',
    }}>
      {/* 皇上立绘（按见面次数顺序显示） */}
      {emperorStageImage && (
        <div style={{
          width: '100%', borderRadius: '10px', overflow: 'hidden',
          marginBottom: '14px',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 0 30px rgba(201,168,76,0.15)',
          animation: 'dialogueFadeUp 0.4s ease both',
        }}>
          <img
            src={emperorStageImage}
            alt="皇上"
            style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: '260px' }}
            onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* 头像 */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden',
          border: `2px solid ${alreadyMet ? 'rgba(160,120,50,0.45)' : success ? 'rgba(201,168,76,0.55)' : 'rgba(180,40,60,0.5)'}`,
          background: 'rgba(20,8,16,0.8)',
          filter: alreadyMet ? 'grayscale(40%) brightness(0.7)' : 'none',
        }}>
          <img
            src={`/assets/npc_avatars/${npc.avatarFile}`}
            alt={npc.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* 内容 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: alreadyMet ? 'rgba(180,140,80,0.7)' : success ? '#FFD700' : '#F47080' }}>
              {npc.name}
            </span>
            {success && gift && (
              <span style={{
                fontSize: '11px', color: 'rgba(201,168,76,0.7)',
                background: 'rgba(201,168,76,0.12)', borderRadius: '8px', padding: '2px 8px',
              }}>
                {gift.emoji} 赠予了{gift.name}
              </span>
            )}
          </div>

          {alreadyMet ? (
            <div style={{
              fontSize: '13px', color: 'rgba(200,170,120,0.75)', lineHeight: 1.85,
              letterSpacing: '0.5px',
            }}>
              本月已与{npc.name}见过面了，下个月再来拜访吧。
            </div>
          ) : success ? (
            <>
              <div style={{
                fontSize: '13px', color: 'rgba(240,220,210,0.88)', lineHeight: 1.85,
                fontStyle: 'italic', letterSpacing: '0.5px',
              }}>
                「{dialogue?.text}」
              </div>
              {dialogue?.type === 'hint' && (() => {
                const SCENE_NAME_MAP = { grassland:'草原', inn:'客栈', ancient_street:'古街', medicine_hall:'百草堂', art_studio:'翰墨苑', etiquette_hall:'礼仪学院', general_mansion:'将军府', lakeside_pavilion:'碧波亭', mountain_monastery:'云顶禅院', desert_oasis:'呜沙沟', royal_court:'宫廷', bedroom:'锦绣阁' };
                const SCENE_IMG_MAP = { grassland:'/assets/scenes/outdoor.jpg', inn:'/assets/scenes/inn_new.jpg', ancient_street:'/assets/scenes/street_new.jpg', medicine_hall:'/assets/scenes/medicine_hall_new.jpg', art_studio:'/assets/scenes/art_studio_new.jpg', etiquette_hall:'/assets/scenes/classroom.jpg', general_mansion:'/assets/scenes/general_mansion.jpg', lakeside_pavilion:'/assets/scenes/lakeside_pavilion.jpg', mountain_monastery:'/assets/scenes/mountain_monastery.jpg', desert_oasis:'/assets/scenes/desert_oasis.jpg' };
                const sceneName = SCENE_NAME_MAP[dialogue.scene] || dialogue.scene;
                const sceneImg = SCENE_IMG_MAP[dialogue.scene];
                return (
                  <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.25)' }}>
                    {sceneImg && (
                      <div style={{ width: '100%', height: '80px', overflow: 'hidden', position: 'relative' }}>
                        <img src={sceneImg} alt={sceneName} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} onError={e => e.currentTarget.parentElement.style.display='none'} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,5,8,0.85))' }} />
                        <div style={{ position: 'absolute', bottom: '6px', left: '10px', fontSize: '11px', fontWeight: '700', color: '#C9A84C', letterSpacing: '1px' }}>{sceneName}</div>
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'rgba(201,168,76,0.75)', background: 'rgba(201,168,76,0.06)', padding: '7px 12px', letterSpacing: '0.5px' }}>
                      💡 前往{sceneName}，可能触发特殊事件！
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{
              fontSize: '13px', color: 'rgba(240,180,190,0.85)', lineHeight: 1.85,
              letterSpacing: '0.5px',
            }}>
              被赶出来了……{npc.name}今日心情不佳，侍卫将你请出了宫门。
            </div>
          )}
        </div>
      </div>

      {/* 按钮行 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
        {success && dialogue?.type === 'hint' && dialogue?.scene && (
          <button onClick={handleHintClick} style={{
            padding: '7px 18px', borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.75), rgba(160,110,30,0.75))',
            border: '1px solid rgba(201,168,76,0.45)',
            color: '#FFF8E0', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
          }}>前往探索 →</button>
        )}
        <button onClick={onClose} style={{
          padding: '7px 20px', borderRadius: '9px',
          background: 'rgba(40,20,30,0.75)', border: '1px solid rgba(150,100,120,0.3)',
          color: 'rgba(200,170,180,0.7)', cursor: 'pointer', fontSize: '12px',
        }}>告辞</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 场景横幅（选择场景时用 bgImage）
// ─────────────────────────────────────────
function SceneBanner({ scene }) {
  const [bgError, setBgError] = useState(false);
  useEffect(() => { setBgError(false); }, [scene.id]);
  const hasBg = scene.bgImage && !bgError;

  return (
    <div style={{
      borderRadius: '18px', marginBottom: '18px',
      position: 'relative', overflow: 'hidden',
      border: '1px solid rgba(212,81,122,0.25)',
      height: '220px',
      background: hasBg ? 'transparent' : 'linear-gradient(135deg, #1a0a0f, #2d1520)',
    }}>
      {hasBg ? (
        <img
          src={scene.bgImage}
          alt={scene.name}
          onError={() => setBgError(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '100px', opacity: 0.08, userSelect: 'none', pointerEvents: 'none'
        }}>
          {scene.bgEmoji}
        </div>
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(10,3,8,0.82) 0%, rgba(10,3,8,0.45) 55%, rgba(10,3,8,0.08) 100%)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}>
            {scene.icon}
          </span>
          <div>
            <h2 style={{
              fontSize: '24px', fontWeight: '700', marginBottom: '4px',
              background: 'linear-gradient(135deg, #FFFFFF, #FFD9A0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              {scene.name}
            </h2>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(212,81,122,0.3)', borderRadius: '20px',
              padding: '3px 12px', fontSize: '12px', color: '#FFD9D9',
              backdropFilter: 'blur(4px)'
            }}>
              ✦ {scene.ambience}
            </div>
          </div>
        </div>
        <p style={{
          fontSize: '13px', color: 'rgba(255,245,250,0.7)',
          lineHeight: '1.65', maxWidth: '360px',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)'
        }}>
          {scene.description}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// NpcCard（侧边列表形式）
// ─────────────────────────────────────────
function NpcCard({ npc, onTalk }) {
  const [talking, setTalking] = useState(false);

  const handleTalk = async () => {
    setTalking(true);
    await onTalk(npc.id);
    setTimeout(() => setTalking(false), 1000);
  };

  return (
    <div
      style={{
        background: 'rgba(30,10,20,0.6)', border: '1px solid rgba(212,81,122,0.2)',
        borderRadius: '14px', padding: '16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'all 0.3s ease', cursor: 'pointer'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = '1px solid rgba(212,81,122,0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(212,81,122,0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = '1px solid rgba(212,81,122,0.2)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: '54px', height: '54px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(212,81,122,0.2), rgba(201,168,76,0.2))',
        border: '2px solid rgba(212,81,122,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        {npc.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#F4A0C0', marginBottom: '2px' }}>
          {npc.name}
          {npc.dialogueWithChoice && (
            <span style={{
              marginLeft: '6px', fontSize: '10px', color: '#C9A84C',
              background: 'rgba(201,168,76,0.15)', borderRadius: '6px',
              padding: '1px 6px', border: '1px solid rgba(201,168,76,0.3)',
            }}>
              💬 有剧情
            </span>
          )}
        </div>
        <div style={{
          fontSize: '11px', color: '#C9A84C', marginBottom: '4px',
          background: 'rgba(201,168,76,0.15)', display: 'inline-block',
          padding: '1px 8px', borderRadius: '10px'
        }}>
          {npc.role}
        </div>
        <p style={{
          fontSize: '12px', color: 'rgba(245,230,236,0.5)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {npc.description}
        </p>
      </div>
      <button
        onClick={handleTalk}
        disabled={talking}
        style={{
          background: talking ? 'rgba(212,81,122,0.2)' : 'linear-gradient(135deg, #D4517A, #A03058)',
          border: 'none', borderRadius: '10px', color: 'white',
          cursor: talking ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap',
          transition: 'all 0.3s ease', flexShrink: 0
        }}
      >
        {talking ? '...' : '💬 搭话'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// CourseCard（参加活动）
// ─────────────────────────────────────────
function CourseCard({ course, character, onAttend, skillConfig }) {
  const [attending, setAttending] = useState(false);
  const [recentResult, setRecentResult] = useState(null);

  const checkRequirements = () => {
    const reqs = course.requiredSkills || {};
    return Object.entries(reqs).reduce((unmet, [skill, required]) => {
      const current = character.skills?.[skill] || 0;
      if (current < required) {
        const skillName = skillConfig?.[skill]?.name || skill;
        unmet.push(`${skillName} ${required}`);
      }
      return unmet;
    }, []);
  };

  const unmetReqs = checkRequirements();
  const canAfford = !course.cost.gold || (character.gold >= course.cost.gold);
  const canAttend = unmetReqs.length === 0 && canAfford;

  const handleAttend = async () => {
    setAttending(true);
    setRecentResult(null);
    try {
      await onAttend(course.id);
      setRecentResult('success');
    } catch {
      setRecentResult('failed');
    }
    setTimeout(() => { setAttending(false); setRecentResult(null); }, 2000);
  };

  return (
    <div style={{
      background: 'rgba(30,10,20,0.7)',
      border: `1px solid ${recentResult === 'success' ? 'rgba(52,211,153,0.5)' : 'rgba(212,81,122,0.2)'}`,
      borderRadius: '14px', padding: '16px',
      transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden'
    }}>
      {recentResult === 'success' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(52,211,153,0.1), transparent)',
          borderRadius: '14px', pointerEvents: 'none', animation: 'fadeIn 0.3s ease'
        }} />
      )}
      <div style={{ display: 'flex', gap: '14px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
          background: canAttend
            ? 'linear-gradient(135deg, rgba(212,81,122,0.2), rgba(160,48,88,0.2))'
            : 'rgba(0,0,0,0.2)',
          border: `1px solid ${canAttend ? 'rgba(212,81,122,0.3)' : 'rgba(255,255,255,0.05)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px'
        }}>
          {course.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h4 style={{
              fontSize: '15px', fontWeight: '700', margin: 0,
              color: canAttend ? '#F4A0C0' : 'rgba(245,230,236,0.4)'
            }}>
              {course.name}
            </h4>
            {course.cost.gold > 0 && (
              <span style={{
                fontSize: '11px', padding: '1px 7px', borderRadius: '8px',
                background: canAfford ? 'rgba(201,168,76,0.2)' : 'rgba(239,68,68,0.2)',
                color: canAfford ? '#C9A84C' : '#F87171'
              }}>
                💰 {course.cost.gold}
              </span>
            )}
            <span style={{
              fontSize: '11px', padding: '1px 7px', borderRadius: '8px',
              background: 'rgba(96,165,250,0.1)', color: '#60A5FA', marginLeft: 'auto'
            }}>
              ⏱ {course.duration}分钟
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)', lineHeight: '1.5', marginBottom: '8px' }}>
            {course.description}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {Object.entries(course.skillGains).map(([skill, gain]) => {
              const config = skillConfig?.[skill];
              return (
                <span key={skill} style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '8px',
                  background: `${config?.color || '#999'}20`,
                  color: config?.color || '#999',
                  border: `1px solid ${config?.color || '#999'}40`
                }}>
                  {config?.icon || '+'} {config?.name || skill} +{gain}
                </span>
              );
            })}
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '8px',
              background: 'rgba(251,191,36,0.1)', color: '#FBBF24'
            }}>
              ⭐ EXP +{course.exp}
            </span>
          </div>
          {unmetReqs.length > 0 && (
            <div style={{
              fontSize: '11px', color: '#F87171',
              background: 'rgba(239,68,68,0.1)', borderRadius: '6px',
              padding: '4px 8px', marginBottom: '6px'
            }}>
              🔒 需要：{unmetReqs.join('、')}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={handleAttend}
        disabled={!canAttend || attending}
        style={{
          width: '100%', marginTop: '12px', padding: '10px',
          background: !canAttend ? 'rgba(100,100,100,0.2)' : attending ? 'rgba(212,81,122,0.4)' : 'linear-gradient(135deg, #D4517A, #A03058)',
          border: 'none', borderRadius: '10px',
          color: !canAttend ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: !canAttend ? 'not-allowed' : attending ? 'wait' : 'pointer',
          fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
          letterSpacing: '1px', transition: 'all 0.3s ease'
        }}
      >
        {attending ? '🌸 修炼中...' : !canAttend ? '条件不足' : '✨ 开始修炼'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// 修炼结果弹窗
// ─────────────────────────────────────────
function CourseResultModal({ result, onClose }) {
  if (!result) return null;
  const skillEntries = Object.entries(result.skillChanges || {});

  return (
    <div style={{
      position: 'relative',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.05) 0%, transparent 50%), linear-gradient(160deg, #080e10 0%, #0e1a18 50%, #080e10 100%)',
      border: '1.5px solid rgba(52,211,153,0.45)',
      borderRadius: '6px',
      padding: '40px 22px 20px',
      marginBottom: '16px',
      boxShadow: '0 0 0 1px rgba(52,211,153,0.10), 0 8px 40px rgba(52,211,153,0.12), inset 0 0 40px rgba(0,0,0,0.3)',
      animation: 'courseScrollIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
      overflow: 'hidden',
    }}>
      {/* 古风卷轴边框纹样 */}
      {/* 顶部三色横线 */}
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2.5px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), rgba(52,211,153,0.8), rgba(201,168,76,0.6), rgba(52,211,153,0.8), rgba(52,211,153,0.3), transparent)' }} />
      <div style={{ position: 'absolute', top: '4px', left: '18%', right: '18%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.35), transparent)' }} />
      {/* 底部横线 */}
      <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '2.5px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), rgba(52,211,153,0.8), rgba(201,168,76,0.6), rgba(52,211,153,0.8), rgba(52,211,153,0.3), transparent)' }} />
      {/* 左右竖线 */}
      <div style={{ position: 'absolute', left: 0, top: '10%', bottom: '10%', width: '2.5px', background: 'linear-gradient(180deg, transparent, rgba(52,211,153,0.5), transparent)' }} />
      <div style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '2.5px', background: 'linear-gradient(180deg, transparent, rgba(52,211,153,0.5), transparent)' }} />
      {/* 四角装饰 */}
      {[{t:'8px',l:'8px'},{t:'8px',r:'8px'},{b:'8px',l:'8px'},{b:'8px',r:'8px'}].map((pos,i) => (
        <div key={i} style={{
          position:'absolute', ...pos, width:'16px', height:'16px',
          borderTop: (pos.t) ? '1.5px solid rgba(52,211,153,0.6)' : 'none',
          borderBottom: (pos.b) ? '1.5px solid rgba(52,211,153,0.6)' : 'none',
          borderLeft: (pos.l) ? '1.5px solid rgba(52,211,153,0.6)' : 'none',
          borderRight: (pos.r) ? '1.5px solid rgba(52,211,153,0.6)' : 'none',
        }} />
      ))}

      {/* 顶部印章标签 */}
      <div style={{
        position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #080e10, #0e1a18)',
        border: '1.5px solid rgba(52,211,153,0.5)', borderTop: 'none',
        borderRadius: '0 0 10px 10px', padding: '3px 16px 5px',
        fontSize: '11px', color: '#34D399', letterSpacing: '3px',
        display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '8px', opacity: 0.7 }}>✦</span>
        <span>修炼完成</span>
        <span style={{ fontSize: '8px', opacity: 0.7 }}>✦</span>
      </div>

      {/* 关闭按钮 */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: '6px', color: 'rgba(52,211,153,0.5)',
        cursor: 'pointer', fontSize: '13px', width: '24px', height: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.15)'; e.currentTarget.style.color = 'rgba(52,211,153,0.9)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.color = 'rgba(52,211,153,0.5)'; }}
      >×</button>

      {/* 故事文本 */}
      {result.storyText && (
        <div style={{
          position: 'relative',
          background: 'rgba(52,211,153,0.03)',
          border: '1px solid rgba(52,211,153,0.18)',
          borderRadius: '6px', padding: '10px 12px 10px 16px', marginBottom: '14px',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2.5px', background: 'linear-gradient(180deg, transparent, rgba(52,211,153,0.7), transparent)' }} />
          <p style={{ fontSize: '13px', color: 'rgba(245,230,236,0.78)', lineHeight: '1.8', margin: 0, fontStyle: 'italic' }}>
            「{result.storyText}」
          </p>
        </div>
      )}

      {/* 技能标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
        {skillEntries.map(([skill, change], idx) => (
          <div key={skill} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.04))',
            border: '1px solid rgba(52,211,153,0.28)',
            borderRadius: '6px', padding: '6px 11px',
            animation: `fadeIn 0.3s ease ${idx * 0.07}s both`,
          }}>
            <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)' }}>{skill}</span>
            <div style={{ width: '1px', height: '10px', background: 'rgba(52,211,153,0.3)' }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#34D399' }}>
              {change.before}<span style={{ color: 'rgba(52,211,153,0.4)', margin: '0 2px', fontSize: '9px' }}>→</span>{change.after}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#4ADE80', background: 'rgba(74,222,128,0.1)', borderRadius: '4px', padding: '1px 5px' }}>+{change.gain}</span>
          </div>
        ))}
      </div>

      {/* 升级提示 */}
      {result.leveledUp && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(212,81,122,0.08))',
          borderRadius: '6px', textAlign: 'center',
          border: '1px solid rgba(251,191,36,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#FBBF24', textShadow: '0 0 12px rgba(251,191,36,0.5)', letterSpacing: '2px' }}>恭喜升级！</span>
        </div>
      )}

      <style>{`
        @keyframes courseScrollIn {
          from { opacity: 0; transform: scaleY(0.5); transform-origin: top center; }
          60%  { opacity: 1; transform: scaleY(1.02); transform-origin: top center; }
          to   { opacity: 1; transform: scaleY(1); transform-origin: top center; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────
// 宫廷场景对话框 + 出发按钮（图片下方）
// ─────────────────────────────────────────
function CourtDepartureBar({ onDepart }) {
  return (
    <div style={{
      marginTop: '14px',
      background: 'linear-gradient(135deg, rgba(20,8,15,0.9), rgba(35,15,25,0.9))',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: '14px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {/* 对话框文字区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(180,100,40,0.2))',
          border: '1.5px solid rgba(201,168,76,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>🏛️</div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(201,168,76,0.55)', letterSpacing: '2px', marginBottom: '3px' }}>
            宫廷
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(245,220,200,0.9)', letterSpacing: '1px' }}>
            今天要见谁呢？
          </div>
        </div>
      </div>

      {/* 出发按钮 */}
      <button
        onClick={onDepart}
        style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.85), rgba(160,110,30,0.85))',
          border: '1px solid rgba(201,168,76,0.6)',
          borderRadius: '12px',
          color: '#FFF8E0',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
          letterSpacing: '2px',
          boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220,185,90,0.95), rgba(180,130,50,0.95))';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(201,168,76,0.45)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.85), rgba(160,110,30,0.85))';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,168,76,0.3)';
        }}
      >
        出发 ✦
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// 场景随机活动系统
// ─────────────────────────────────────────
const SCENE_RANDOM_ACTIVITIES = {
  ancient_street: [
    { id: 'bargain', icon: '🛍️', title: '讨价还价', desc: '摊主开价颇高，你能争取到合理价格吗？', type: 'choice', options: [{ label: '据理力争', result: '你机智地指出了货物的瑕疵，最终以七折成交，口才+2', skill: 'rhetoric', jade: 2, delta: 2 }, { label: '爽快付款', result: '摊主感激你的大方，额外赠了一件小物件，亲和+1', skill: 'affinity', jade: 1, delta: 1 }] },
    { id: 'lost_child', icon: '👧', title: '迷路孩童', desc: '街角有个孩子在哭泣，似乎找不到家人了。', type: 'choice', options: [{ label: '帮助寻找', result: '你耐心地帮孩子找到了父母，街坊们纷纷称赞，道德+2', skill: 'morality', jade: 2, delta: 2 }, { label: '告知官差', result: '你机智地找来了街口的官差，问题迎刃而解，口才+1', skill: 'rhetoric', jade: 1, delta: 1 }] },
    { id: 'street_show', icon: '🎭', title: '街头杂耍', desc: '一位艺人正在表演精彩的杂技，引来众人围观。', type: 'observe', result: '精彩的表演让你心情大好，感受到了民间艺术的魅力，灵气+1', skill: 'spirit', jade: 1, delta: 1 },
    { id: 'rare_goods', icon: '💎', title: '奇珍异货', desc: '一个神秘商人展示了一件来自西域的稀奇物件。', type: 'choice', options: [{ label: '仔细研究', result: '你认真研究了这件西域货品，眼界大开，才学+2', skill: 'wisdom', jade: 2, delta: 2 }, { label: '询问来历', result: '商人讲述了西域的奇异风土，你听得入迷，灵气+1', skill: 'spirit', jade: 1, delta: 1 }] },
    { id: 'poetry_wall', icon: '📜', title: '诗词擂台', desc: '街角有人张贴诗词，邀人对句。', type: 'choice', options: [{ label: '大胆应对', result: '你对出了一句颇有意境的诗，围观者喝彩，诗才+2声望+1', skill: 'poetry', jade: 2, delta: 2 }, { label: '驻足欣赏', result: '细细品味他人诗句，心有所得，诗才+1', skill: 'poetry', jade: 1, delta: 1 }] },
  ],
  inn: [
    { id: 'storyteller', icon: '📖', title: '说书先生', desc: '茶馆里说书先生正在讲述一段江湖奇事。', type: 'observe', result: '精彩的故事让你浮想联翩，才学+1灵气+1', skill: 'wisdom', jade: 1, delta: 1 },
    { id: 'chess_game', icon: '♟️', title: '棋局观战', desc: '两位老者正在下棋，棋局颇为精妙。', type: 'choice', options: [{ label: '旁观学习', result: '你看出了一步妙棋，默默记下，才学+2', skill: 'wisdom', jade: 2, delta: 2 }, { label: '挑战一局', result: '虽然落败，但老者指点了你几招，才学+1', skill: 'wisdom', jade: 1, delta: 1 }] },
    { id: 'traveler_tale', icon: '🗺️', title: '旅人见闻', desc: '一位从远方来的旅人正在讲述异乡见闻。', type: 'observe', result: '旅人的故事让你对远方充满向往，胆识+1灵气+1', skill: 'courage', jade: 1, delta: 1 },
    { id: 'culinary_secret', icon: '🍜', title: '厨艺秘诀', desc: '掌柜的正在指点厨娘改进菜肴，你在旁听了个大概。', type: 'observe', result: '学到了一个调味小技巧，厨艺+2', skill: 'culinary', jade: 2, delta: 2 },
  ],
  royal_court: [
    { id: 'court_etiquette', icon: '👑', title: '宫廷礼仪', desc: '一位老嬷嬷正在纠正宫女的礼仪，你也在旁学习。', type: 'observe', result: '宫廷礼仪精妙，你记下了几个要点，亲和+1魅力+1', skill: 'affinity', jade: 1, delta: 1 },
    { id: 'imperial_garden', icon: '🌸', title: '御花园赏花', desc: '御花园中百花盛开，景色宜人。', type: 'observe', result: '美景令人心旷神怡，灵气+2', skill: 'spirit', jade: 2, delta: 2 },
    { id: 'court_music', icon: '🎵', title: '宫廷乐曲', desc: '远处传来悠扬的宫廷乐曲，令人陶醉。', type: 'observe', result: '优美的乐声让你有所感悟，乐艺+1', skill: 'music', jade: 1, delta: 1 },
  ],
  grassland: [
    { id: 'wild_herbs', icon: '🌿', title: '野外采药', desc: '草原上长着许多不常见的植物，有些可能是珍贵药材。', type: 'choice', options: [{ label: '仔细辨认', result: '你认出了几株珍贵药草，医术+2', skill: 'medical', jade: 2, delta: 2 }, { label: '随手采摘', result: '采了一些常见草药，医术+1', skill: 'medical', jade: 1, delta: 1 }] },
    { id: 'wild_horse', icon: '🐎', title: '野马奔驰', desc: '远处一匹野马正在奔跑，雄姿英发。', type: 'observe', result: '野马的自由奔放感染了你，野性+1胆识+1', skill: 'wildness', jade: 1, delta: 1 },
    { id: 'stargazing', icon: '⭐', title: '仰望星空', desc: '草原上空气清新，星空格外明亮。', type: 'observe', result: '繁星点点，心旷神怡，灵气+2', skill: 'spirit', jade: 2, delta: 2 },
    { id: 'archery_practice', icon: '🏹', title: '射箭练习', desc: '草原上有人在练习射箭，你也想试试。', type: 'choice', options: [{ label: '认真练习', result: '连射十箭，命中七箭，武术+2', skill: 'martial', jade: 2, delta: 2 }, { label: '旁观学习', result: '观察射箭技巧，记下要领，武术+1', skill: 'martial', jade: 1, delta: 1 }] },
  ],
  etiquette_hall: [
    { id: 'dance_practice', icon: '💃', title: '舞蹈练习', desc: '礼仪堂正在进行舞蹈排练，你可以一起参与。', type: 'choice', options: [{ label: '全力投入', result: '你跟着练习了一套新舞步，魅力+2', skill: 'charm', jade: 2, delta: 2 }, { label: '观摩学习', result: '欣赏了优美的舞蹈，灵气+1', skill: 'spirit', jade: 1, delta: 1 }] },
    { id: 'calligraphy', icon: '🖌️', title: '书法练习', desc: '有人在练习书法，笔墨飘香。', type: 'observe', result: '你临摹了几个字，画艺+1才学+1', skill: 'painting', jade: 1, delta: 1 },
    { id: 'flower_arrangement', icon: '🌺', title: '插花艺术', desc: '礼仪堂的老师正在教授插花技艺。', type: 'observe', result: '学习了插花的意境，魅力+1灵气+1', skill: 'charm', jade: 1, delta: 1 },
  ],
  medicine_hall: [
    { id: 'herb_study', icon: '🌿', title: '草药研究', desc: '药房里摆满了各种草药，散发着清香。', type: 'choice', options: [{ label: '认真研读', result: '你翻阅了几本药典，医术+2才学+1', skill: 'medical', jade: 2, delta: 2 }, { label: '闻香辨药', result: '通过气味辨认出了几种草药，医术+1', skill: 'medical', jade: 1, delta: 1 }] },
    { id: 'patient_care', icon: '💊', title: '协助诊治', desc: '有病人前来就诊，大夫正在忙碌。', type: 'choice', options: [{ label: '主动协助', result: '你帮忙递送药材，学到了不少，医术+2道德+1', skill: 'medical', jade: 2, delta: 2 }, { label: '旁观学习', result: '观察大夫的诊治方法，医术+1', skill: 'medical', jade: 1, delta: 1 }] },
    { id: 'meditation', icon: '🧘', title: '静心调息', desc: '药堂一角有人在打坐调息，气氛宁静。', type: 'observe', result: '你也静坐片刻，灵气+2', skill: 'spirit', jade: 2, delta: 2 },
  ],
  art_studio: [
    { id: 'painting_session', icon: '🖼️', title: '写生练习', desc: '画室里光线充足，是练习丹青的好时机。', type: 'choice', options: [{ label: '认真作画', result: '你完成了一幅不错的写生，画艺+2', skill: 'painting', jade: 2, delta: 2 }, { label: '欣赏名作', result: '细细品味名家画作，画艺+1才学+1', skill: 'painting', jade: 1, delta: 1 }] },
    { id: 'poetry_composition', icon: '📜', title: '即兴作诗', desc: '窗外景色宜人，诗意盎然。', type: 'choice', options: [{ label: '提笔作诗', result: '你写下一首小诗，诗才+2', skill: 'poetry', jade: 2, delta: 2 }, { label: '欣赏风景', result: '美景让你心情愉悦，灵气+1', skill: 'spirit', jade: 1, delta: 1 }] },
    { id: 'music_practice', icon: '🎵', title: '琴音悠扬', desc: '有人在弹奏古琴，曲调优美。', type: 'observe', result: '聆听美妙琴声，乐艺+1灵气+1', skill: 'music', jade: 1, delta: 1 },
  ],
  lakeside_pavilion: [
    { id: 'moon_gazing', icon: '🌙', title: '月下独思', desc: '湖面倒映着月影，一轮圆月将水面染成银白。你独自坐在石栏边，听见远处有人低声吟诗。', type: 'observe', result: '「疏影横斜水清浅，暗香浮动月黄昏。」月色令人沉醉，灵气+2诗才+1', skill: 'spirit', jade: 2, delta: 2 },
    { id: 'fishing', icon: '🎣', title: '垂钓湖边', desc: '湖边一位老翁独自垂钓，神情闲适。他见你来了，笑着说："姑娘，坐吧，鱼不急，人也不急。"', type: 'choice', options: [{ label: '借竿一试', result: '等了许久，鱼线一动，你屏住呼吸——钓上来一条银色小鱼，老翁哈哈大笑。体力+1灵气+2', skill: 'spirit', jade: 2, delta: 2 }, { label: '静坐听风', result: '老翁说：「水静则清，心静则明。」你若有所悟，灵气+2才学+1', skill: 'spirit', jade: 2, delta: 2 }] },
    { id: 'poetry_exchange', icon: '📜', title: '诗词唱和', desc: '亭台上聚了几位文人，正在以"月"为题作诗。见你来了，一位书生拱手道："姑娘可愿赐教？"', type: 'choice', options: [{ label: '欣然应对', result: '你吟出一句「举杯邀明月，对影成三人」，众人齐声叫好，诗才+2声望+1', skill: 'poetry', jade: 2, delta: 2 }, { label: '谦辞旁听', result: '你静静聆听，将几句佳词默默记下，诗才+1灵气+1', skill: 'poetry', jade: 1, delta: 1 }] },
    { id: 'fallen_scholar', icon: '📖', title: '落魄书生', desc: '桥头坐着一位衣衫破旧的年轻书生，手边摆着几幅字画，却无人问津，神情落寞。', type: 'choice', options: [{ label: '驻足欣赏', result: '你认真看完了他的字画，说了几句真心话。书生眼睛一亮，道谢道："能遇知音，此生无憾。"道德+2诗才+1', skill: 'morality', jade: 2, delta: 2 }, { label: '买下一幅', result: '书生受宠若惊，将最得意的一幅赠给你，说：「这幅送你，算是我的谢礼。」画艺+2亲和+1', skill: 'painting', jade: 2, delta: 2 }] },
    { id: 'firefly_night', icon: '✨', title: '萤火虫之夜', desc: '夜幕降临，湖边的草丛里忽然亮起了点点绿光——是萤火虫。它们在芦苇间飞舞，如同散落的星子。', type: 'observe', result: '你伸出手，一只萤火虫落在指尖，发出温柔的光。那一刻，所有烦恼都消散了。灵气+3', skill: 'spirit', jade: 2, delta: 3 },
    { id: 'fisherman_wisdom', icon: '🐟', title: '渔翁的哲理', desc: '一位白发渔翁收网归来，见你发呆，笑道："姑娘在想什么？"他说起了一句话："鱼不上钩，是因为时候未到，不是因为没有鱼。"', type: 'choice', options: [{ label: '细细品味', result: '你反复咀嚼这句话，忽然想通了一些事，才学+2灵气+1', skill: 'wisdom', jade: 2, delta: 2 }, { label: '随口一笑', result: '渔翁摇摇头走了，留下一句话在风里飘：「年轻人，慢些。」灵气+1', skill: 'spirit', jade: 1, delta: 1 }] },
  ],
  general_mansion: [
    { id: 'sword_practice', icon: '⚔️', title: '观摩演武', desc: '演武场上将士们正在操练，刀光剑影，喊声震天。一位老兵见你驻足，说："凌将军的女儿，也来看看？"', type: 'observe', result: '你看出了其中一套刀法与父亲传授的有几分相似，心中有所感悟。武术+1胆识+2', skill: 'courage', jade: 2, delta: 2 },
    { id: 'strategy_study', icon: '🗺️', title: '兵法研习', desc: '书房里摆着几本兵书，其中一本封面写着「凌字营」——是父亲当年的手记。', type: 'choice', options: [{ label: '认真研读', result: '父亲的字迹工整有力，每一条注解都是血与火的经验。统帅+2才学+1', skill: 'command', jade: 2, delta: 2 }, { label: '轻轻翻阅', result: '你只翻了几页，眼眶有些发酸，但记下了一句话：「知己知彼，百战不殆。」才学+1', skill: 'wisdom', jade: 1, delta: 1 }] },
    { id: 'archery_watch', icon: '🏹', title: '射箭比武', desc: '将士们正在进行射箭比武，场面热烈。一位年轻士兵连射三箭，箭箭正中红心，引来满场喝彩。', type: 'observe', result: '你暗暗记下了他开弓时的姿势——沉肩、稳气、缓放。胆识+2武术+1', skill: 'courage', jade: 2, delta: 2 },
    { id: 'old_soldier', icon: '🪖', title: '老兵的叮嘱', desc: '一位头发花白的老兵正在擦拭一把旧刀，见你来了，停下手，说："凌将军走之前，让我们照看好他的女儿。"', type: 'choice', options: [{ label: '认真聆听', result: '老兵讲起了父亲当年的故事——那些你从未听过的战场岁月。道德+2胆识+1', skill: 'morality', jade: 2, delta: 2 }, { label: '问起父亲', result: '老兵沉默片刻，说：「将军最骄傲的，不是那些胜仗，是你。」亲和+2', skill: 'affinity', jade: 2, delta: 2 }] },
    { id: 'night_patrol', icon: '🏮', title: '夜间巡逻', desc: '夜幕降临，府中灯笼次第点亮。你跟着一队士兵走了一圈，感受到了将军府的肃穆与秩序。', type: 'observe', result: '巡逻途中，一位士兵低声说："有将军府在，京城才安稳。"你忽然理解了父亲为何一生戍守。道德+1胆识+1统帅+1', skill: 'command', jade: 1, delta: 1 },
    { id: 'war_map', icon: '🗺️', title: '沙盘推演', desc: '议事厅里摆着一张巨大的沙盘，标注着各路关隘。你站在沙盘前，忍不住推演起来。', type: 'choice', options: [{ label: '认真推演', result: '你发现了一处防守漏洞，如果是真实战场……统帅+3才学+1', skill: 'command', jade: 2, delta: 3 }, { label: '仔细观察', result: '你记下了几处关键地形的位置，才学+2', skill: 'wisdom', jade: 2, delta: 2 }] },
  ],
  mountain_monastery: [
    { id: 'morning_bell', icon: '🔔', title: '晨钟惊梦', desc: '清晨，一声悠远的钟声穿透云雾，在山谷间回荡。你从半梦半醒中惊坐起来，心里莫名地清明了几分。', type: 'observe', result: '「钟声一响，万念俱灰。」你发现脑子里一直盘旋的烦恼，此刻竟轻了许多。灵气+3', skill: 'spirit', jade: 2, delta: 3 },
    { id: 'little_monk', icon: '🧒', title: '小沙弥的困惑', desc: '一个年幼的小沙弥坐在台阶上发呆，见你来了，怯生生地问："姑娘，什么是执念？"', type: 'choice', options: [{ label: '认真回答', result: '你想了很久，说：「执念就是放不下的东西，但有时候放不下，是因为它真的重要。」小沙弥点点头，你自己也想明白了一些事。道德+2灵气+1', skill: 'morality', jade: 2, delta: 2 }, { label: '反问他', result: '你问他：「你有什么执念？」小沙弥想了想说：「我想知道云是什么味道。」你忍不住笑了，灵气+2', skill: 'spirit', jade: 2, delta: 2 }] },
    { id: 'ancient_tree', icon: '🌲', title: '古树下顿悟', desc: '禅院角落有一棵据说已有三百年的老松，树干粗壮，枝叶繁茂。你坐在树下，忽然想起了很多事。', type: 'choice', options: [{ label: '静坐冥想', result: '你闭上眼睛，听风声、听鸟鸣、听自己的心跳。不知过了多久，心里某个结松开了。灵气+2才学+1', skill: 'spirit', jade: 2, delta: 2 }, { label: '抚摸树干', result: '树皮粗糙而温暖，像是历经沧桑的老人的手。你想：能活三百年，它见过多少事？道德+1灵气+2', skill: 'spirit', jade: 2, delta: 2 }] },
    { id: 'sutra_copy', icon: '📿', title: '抄写经文', desc: '禅院备有笔墨，供香客抄写经文。一位老僧说："字不重要，重要的是抄的时候，心在哪里。"', type: 'choice', options: [{ label: '认真抄写', result: '你一笔一划，写得极慢。抄完最后一个字，发现心竟然真的静了。道德+2才学+1', skill: 'morality', jade: 2, delta: 2 }, { label: '随意练字', result: '写着写着，你开始想到很多事，笔也跟着轻了重了。画艺+1', skill: 'painting', jade: 1, delta: 1 }] },
    { id: 'cloud_watching', icon: '☁️', title: '观云悟道', desc: '山顶风大，云彩变幻万千。一朵云转眼变成另一朵，了尘禅师站在你身边，说："万物皆如此，来去无痕。"', type: 'observe', result: '你忽然想到了很多人、很多事，它们都会过去，就像这片云。灵气+2道德+1', skill: 'spirit', jade: 2, delta: 2 },
    { id: 'martial_zen', icon: '🥋', title: '禅武合一', desc: '一位僧人正在练习武术，动作舒缓，却隐含力量。他说："武不是为了伤人，是为了护心。"', type: 'choice', options: [{ label: '跟着练习', result: '你跟着比划了几个动作，感受到了一种奇特的宁静。武术+1灵气+2', skill: 'martial', jade: 1, delta: 1 }, { label: '观摩领悟', result: '你想起了父亲说过的话：「刀出鞘，是为了让刀永远不必出鞘。」胆识+1道德+1', skill: 'courage', jade: 1, delta: 1 }] },
  ],
  desert_oasis: [
    { id: 'camel_ride', icon: '🐪', title: '骑骆驼', desc: '绿洲边有人牵着骆驼，可以体验骑行。', type: 'choice', options: [{ label: '骑行体验', result: '骑骆驼穿越沙丘，体力+1野性+2', skill: 'wildness', jade: 2, delta: 2 }, { label: '欣赏风景', result: '大漠风光壮阔，胆识+1灵气+1', skill: 'courage', jade: 1, delta: 1 }] },
    { id: 'star_navigation', icon: '⭐', title: '观星辨向', desc: '沙漠中星光格外璀璨，可以学习观星定位。', type: 'observe', result: '学习了通过星星辨别方向，才学+1灵气+2', skill: 'spirit', jade: 2, delta: 2 },
    { id: 'oasis_exploration', icon: '🌴', title: '探索绿洲', desc: '绿洲深处有些不寻常的植物，引人好奇。', type: 'choice', options: [{ label: '深入探索', result: '发现了一种罕见的沙漠草药，医术+1胆识+1', skill: 'medical', jade: 1, delta: 1 }, { label: '小心观察', result: '记录了绿洲的特征，才学+1', skill: 'wisdom', jade: 1, delta: 1 }] },
  ],
};

// 获取场景随机活动（每次进入场景时随机选一个）
function getSceneRandomActivity(sceneId, seed) {
  const activities = SCENE_RANDOM_ACTIVITIES[sceneId];
  if (!activities || activities.length === 0) return null;
  const idx = seed % activities.length;
  return activities[idx];
}

// 场景随机活动卡片
function SceneActivityCard({ activity, onComplete }) {
  const [phase, setPhase] = useState('idle'); // idle | result
  const [result, setResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [earnedJade, setEarnedJade] = useState(0);

  const handleObserve = () => {
    const jade = activity.jade || 1;
    setResult(activity.result);
    setEarnedJade(jade);
    setSelectedOption(null);
    setPhase('result');
    if (onComplete && activity.skill) onComplete(activity.skill, activity.delta || 1, jade);
  };

  const handleChoice = (opt) => {
    const jade = opt.jade || 1;
    setSelectedOption(opt);
    setResult(opt.result);
    setEarnedJade(jade);
    setPhase('result');
    if (onComplete && opt.skill) onComplete(opt.skill, opt.delta || 1, jade);
  };

  return (
    <div style={{
      marginTop: '14px',
      background: 'linear-gradient(145deg, rgba(20,8,16,0.85), rgba(35,12,28,0.85))',
      border: '1px solid rgba(212,81,122,0.3)', borderRadius: '14px',
      padding: '14px 16px',
      animation: 'sceneActivityFadeIn 0.3s ease both',
    }}>
      <style>{`@keyframes sceneActivityFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{activity.icon}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#F4A0C0' }}>{activity.title}</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.45)', letterSpacing: '1px' }}>今日偶遇</div>
        </div>
      </div>

      {phase === 'idle' && (
        <>
          <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.75)', lineHeight: '1.7', marginBottom: '10px' }}>
            {activity.desc}
          </div>
          {activity.type === 'observe' ? (
            <button onClick={handleObserve} style={{
              width: '100%', padding: '8px', background: 'rgba(212,81,122,0.15)',
              border: '1px solid rgba(212,81,122,0.35)', borderRadius: '8px',
              color: '#F4A0C0', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '1px',
            }}>
              驻足观看 ▶
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activity.options.map((opt, i) => (
                <button key={i} onClick={() => handleChoice(opt)} style={{
                  padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px',
                  color: 'rgba(245,230,236,0.8)', fontSize: '12px', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', letterSpacing: '0.5px',
                }}>
                  {['Ⅰ', 'Ⅱ', 'Ⅲ'][i]} {opt.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {phase === 'result' && (
        <div>
          <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.85)', lineHeight: '1.7', fontStyle: 'italic' }}>
            「{result}」
          </div>
          {earnedJade > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#C9A84C', fontWeight: '700' }}>
              💎 +{earnedJade} 玉
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────
export default function SceneView({
  sceneData, scenes, character, wardrobe, courseResult, skillConfig,
  onAttendCourse, onTalkToNpc, onNpcChoice, onSceneChange,
  onItemGift, currentScene, fullWidth, onInteractionEnd, onNpcActivate, onNpcBubbleClose,
  onSceneActivityComplete, sceneEntryImage, sceneEntryBonus
}) {
  const { scene, npcs, courses } = sceneData;
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [courtMeetResult, setCourtMeetResult] = useState(null);
  const [courtHadMet, setCourtHadMet] = useState(false);
  // 随机活动：每次场景切换时重新选
  const [sceneActivitySeed] = useState(() => Math.floor(Math.random() * 1000));
  const randomActivity = getSceneRandomActivity(scene.id, sceneActivitySeed);

  const npcsMap = npcs.reduce((map, npc) => { map[npc.id] = npc; return map; }, {});

  const hasActiveImg = !!scene.activeImage;

  const handleCourtMeetResult = (result) => {
    setCourtHadMet(true);
    setCourtMeetResult(result);
  };

  const handleCourtSceneHint = (sceneId) => {
    onSceneChange(sceneId);
  };

  return (
    <div>
      {/* 场景大图区 */}
      {hasActiveImg ? (
        <ActiveSceneView
          scene={scene}
          npcsMap={npcsMap}
          character={character}
          wardrobe={wardrobe}
          onNpcChoice={onNpcChoice}
          onSceneChange={onSceneChange}
          onItemGift={onItemGift}
          fullWidth={fullWidth}
          onInteractionEnd={onInteractionEnd}
          onNpcActivate={onNpcActivate}
          onNpcBubbleClose={onNpcBubbleClose}
          sceneEntryImage={sceneEntryImage}
          sceneEntryBonus={sceneEntryBonus}
        />
      ) : (
        <SceneBanner scene={scene} />
      )}

      {/* 宫廷场景专属：今天要见谁呢？（见过一次后不再显示） */}
      {scene.id === 'royal_court' && !courtHadMet && !courtMeetResult && (
        <CourtDepartureBar onDepart={() => setShowCourtModal(true)} />
      )}

      {/* 宫廷场景：见面结果对话框 */}
      {scene.id === 'royal_court' && courtMeetResult && (
        <CourtMeetResultDialogue
          result={courtMeetResult}
          onClose={() => setCourtMeetResult(null)}
          onSceneHint={handleCourtSceneHint}
        />
      )}

      {/* 宫廷人物选择弹窗 */}
      {showCourtModal && (
        <CourtCharacterModal
          onClose={() => setShowCourtModal(false)}
          character={character}
          onMeetResult={handleCourtMeetResult}
        />
      )}

      {/* 修炼结果 */}
      {courseResult && (
        <CourseResultModal result={courseResult} onClose={() => {}} />
      )}

      {/* 场景提示（技能 + 故事关联）*/}
      {(() => {
        const sk = character?.skills || {};
        const sv = character?.subSceneVisits || {};
        const fav = character?.favorability || {};

        // 每个场景的提示配置：skill（技能提示）+ story（故事关联，可为函数）
        const SCENE_HINTS = {
          inn:            { skill: '亲和力、魅力' },
          royal_court:    { skill: '魅力、声望、胆识' },
          grassland:      { skill: '野性、体力、灵气' },
          etiquette_hall: { skill: '魅力、才学、亲和力' },
          medicine_hall:  { skill: '医术、才学、道德' },
          art_studio:     { skill: '画艺、诗才、才学' },
          horse_ranch:    { skill: '野性、体力、胆识' },
          kindergarten:   { skill: '才学、亲和力、灵气' },
          bedroom:        { skill: '魅力、灵气' },
          ancient_street: { skill: '亲和力、口才' },
          desert_oasis:   { skill: '胆识、灵气、野性' },
          general_mansion: {
            skill: '武术、统帅、胆识',
            story: () => {
              if ((sv.yuwentuo || 0) === 0)
                return { text: '✦ 宇文拓就在府中，点击他的头像可以结识这位将军', color: '#F87060' };
              if ((sv.yuwentuo || 0) >= 3 && (fav.yuwentuo || 0) >= 50)
                return { text: '✦ 与宇文拓的情谊日渐深厚，继续走近他，或许能解锁护国女将的命运', color: '#C9A84C' };
              if ((sk.martial || 0) >= 65 && (sk.command || 0) >= 50)
                return { text: '✦ 武艺与统帅已达到护国女将结局的要求，继续磨砺吧', color: '#34D399' };
              return { text: '✦ 此处可提升武艺、统帅与胆识，是护国女将结局的关键场景', color: 'rgba(245,230,236,0.35)' };
            },
          },
          lakeside_pavilion: {
            skill: '诗才、乐艺、灵气',
            story: () => {
              if ((sv.pavilion_poet || 0) === 0)
                return { text: '✦ 白鹭先生就在亭台，点击他的头像，听听这位隐士的故事', color: '#93C5FD' };
              if ((sk.poetry || 0) >= 70 && (sk.wisdom || 0) >= 60)
                return { text: '✦ 诗才已接近才冠京华结局的要求，在此继续精进', color: '#C9A84C' };
              if ((sk.poetry || 0) < 40)
                return { text: '✦ 此处是提升诗才的绝佳之地，多来走走', color: 'rgba(245,230,236,0.35)' };
              return { text: '✦ 月色清幽，诗心渐长，才冠京华的结局在等待着你', color: 'rgba(245,230,236,0.35)' };
            },
          },
          mountain_monastery: {
            skill: '灵气、道德、才学',
            story: () => {
              if ((sv.zen_master || 0) === 0)
                return { text: '✦ 了尘禅师在此，点击他的头像，听他问你一个问题', color: '#A78BFA' };
              if ((sk.morality || 0) >= 65 && (sk.spirit || 0) >= 55)
                return { text: '✦ 道德与灵气已达到遁入空门结局的要求，心已向佛', color: '#C9A84C' };
              if ((sk.spirit || 0) < 35)
                return { text: '✦ 此处最能滋养灵气，心浮气躁时不妨来坐坐', color: 'rgba(245,230,236,0.35)' };
              return { text: '✦ 每次来此，都会有新的感悟', color: 'rgba(245,230,236,0.35)' };
            },
          },
        };

        const cfg = SCENE_HINTS[scene.id];
        if (!cfg) return null;
        const storyHint = typeof cfg.story === 'function' ? cfg.story() : null;

        return (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(245,230,236,0.3)', letterSpacing: '1px' }}>
              此场景可提升：{cfg.skill}
            </div>
            {storyHint && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: storyHint.color, letterSpacing: '0.5px', fontStyle: 'italic' }}>
                {storyHint.text}
              </div>
            )}
          </div>
        );
      })()}

      {/* 场景随机故事情节 */}
      {randomActivity && (
        <SceneActivityCard
          activity={randomActivity}
          onComplete={onSceneActivityComplete}
        />
      )}

      {/* 快速场景切换 */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px' }}>🗺️</span>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(245,230,236,0.5)', margin: 0, letterSpacing: '1px' }}>
            快速前往
          </h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {scenes.filter(s => s.id !== currentScene).slice(0, 8).map(s => (
            <button
              key={s.id}
              onClick={() => onSceneChange(s.id)}
              style={{
                background: 'rgba(40,15,25,0.6)', border: '1px solid rgba(212,81,122,0.2)',
                borderRadius: '10px', padding: '8px 14px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '13px', color: 'rgba(245,230,236,0.7)',
                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212,81,122,0.15)';
                e.currentTarget.style.borderColor = 'rgba(212,81,122,0.4)';
                e.currentTarget.style.color = '#F4A0C0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(40,15,25,0.6)';
                e.currentTarget.style.borderColor = 'rgba(212,81,122,0.2)';
                e.currentTarget.style.color = 'rgba(245,230,236,0.7)';
              }}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

