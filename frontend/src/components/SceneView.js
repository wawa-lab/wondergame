import React, {useCallback, useEffect, useRef, useState, useMemo, memo} from 'react';

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

function NpcBubble({ npc, position, onClose, onChoice, containerRef, onSceneChange, onItemGift, onDialogueImage, currentSceneId }) {
  const [phase, setPhase] = useState('dialogues'); // 'dialogues' | 'choice' | 'consequence'
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [avatarErr, setAvatarErr] = useState(false);
  const [consequenceData, setConsequenceData] = useState(null); // 选择后的结果
  const [choosingId, setChoosingId] = useState(null); // 正在处理的选项

  const hasDialogues = npc.dialogues && npc.dialogues.length > 0;
  const hasChoice = !!npc.dialogueWithChoice;

  // 安全定位
  const safeStyle = useSafePosition(position, containerRef);

  // 点击下一句 / 进入选项
  const handleNext = useCallback(() => {
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
  }, [phase, dialogueIdx, npc.dialogues, hasChoice, onClose, onDialogueImage]);

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
        setConsequenceData({ choice, consequence: result.consequence });
        setPhase('consequence');
      } else {
        setPhase('consequence');
        setConsequenceData({ choice, consequence: choice.consequence });
      }
    } catch (err) {
      setConsequenceData({ choice, consequence: choice.consequence });
      setPhase('consequence');
    } finally {
      setChoosingId(null);
    }
  }, [choosingId, onChoice, npc.id, onItemGift]);

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
          style={{
            background: 'linear-gradient(145deg, rgba(254,248,228,0.98), rgba(250,236,196,0.98))',
            borderRadius: '16px 16px 16px 4px',
            padding: '12px 14px 10px 14px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(201,168,76,0.7)',
            border: '1.5px solid rgba(201,168,76,0.85)',
            cursor: 'pointer',
            position: 'relative',
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
                <img src={`${npc.avatar}?v=2`} alt={npc.name} onError={() => setAvatarErr(true)}
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

          <div style={{ fontSize: '13px', color: '#2D1500', lineHeight: '1.7', fontWeight: '500', letterSpacing: '0.02em' }}>
            「{getDialogueText(npc.dialogues[dialogueIdx])}」
          </div>

          <div style={{
            fontSize: '10px', marginTop: '8px',
            textAlign: 'right', opacity: 0.65,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
            color: (dialogueIdx < npc.dialogues.length - 1 || hasChoice) ? '#8B5E20' : '#B04030',
          }}>
            {dialogueIdx < npc.dialogues.length - 1
              ? <><span>点击继续</span><span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>▶</span></>
              : hasChoice
              ? <><span style={{ color: '#D4517A', fontWeight: '700' }}>💬 有对话选项</span><span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>▶</span></>
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
    const { text, choices } = npc.dialogueWithChoice;
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
                <img src={`${npc.avatar}?v=2`} alt={npc.name} onError={() => setAvatarErr(true)}
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

          {/* NPC 问题 */}
          <div style={{
            fontSize: '12px', color: 'rgba(245,230,236,0.85)', lineHeight: '1.65',
            marginBottom: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px', padding: '10px 12px',
            border: '1px solid rgba(212,81,122,0.2)',
            fontStyle: 'italic',
          }}>
            「{text}」
          </div>

          {/* 选项按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {choices.map((choice, idx) => {
              const isChoosing = choosingId === choice.id;
              const isDecline = choice.id.startsWith('decline') || choice.id.startsWith('politely');
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
const NpcHotspot = memo(function NpcHotspot({ npc, position, onActivate }) {
  const [hovered, setHovered] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);
  const [ripples, setRipples] = useState([]);
  const hasAvatar = npc.avatar && !avatarErr;

  const handleClick = useCallback(() => {
    const id = Date.now();
    setRipples(r => [...r, id]);
    setTimeout(() => setRipples(r => r.filter(x => x !== id)), 600);
    onActivate(npc.id);
  }, [onActivate, npc.id]);

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
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        animation: 'hotspotFloat 2.8s ease-in-out infinite',
        willChange: 'transform',
      }}
    >
      {/* 悬停时显示名字标签 */}
      {hovered && (
        <div style={{
          background: 'rgba(15,5,10,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: '10px', padding: '3px 10px',
          fontSize: '11px', color: '#FFD9A0', fontWeight: '700', whiteSpace: 'nowrap',
          border: '1px solid rgba(201,168,76,0.5)',
          boxShadow: '0 3px 12px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.15s ease',
          marginBottom: '2px',
        }}>
          {npc.name} · {npc.role}
          {npc.dialogueWithChoice && (
            <span style={{
              marginLeft: '6px', fontSize: '10px',
              color: '#F4A0C0', background: 'rgba(212,81,122,0.2)',
              borderRadius: '4px', padding: '0 4px',
            }}>
              💬选项
            </span>
          )}
        </div>
      )}

      {/* 外层脉冲光环容器 */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 脉冲光环（始终显示，悬停时加强） */}
        <div style={{
          position: 'absolute',
          width: hovered ? '68px' : '56px',
          height: hovered ? '68px' : '56px',
          borderRadius: '50%',
          border: `2px solid ${hovered ? 'rgba(255,210,100,0.7)' : 'rgba(255,210,100,0.35)'}`,
          animation: 'npcPulseRing 2s ease-in-out infinite',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
        }} />
        {/* 第二层光环（错开相位） */}
        <div style={{
          position: 'absolute',
          width: hovered ? '80px' : '66px',
          height: hovered ? '80px' : '66px',
          borderRadius: '50%',
          border: `1px solid ${hovered ? 'rgba(255,210,100,0.4)' : 'rgba(255,210,100,0.15)'}`,
          animation: 'npcPulseRing 2s ease-in-out infinite 0.7s',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
        }} />

        {/* 点击涟漪 */}
        {ripples.map(id => (
          <div key={id} style={{
            position: 'absolute',
            width: '90px', height: '90px',
            borderRadius: '50%',
            border: '2px solid rgba(255,210,100,0.8)',
            animation: 'npcRipple 0.6s ease-out forwards',
            pointerEvents: 'none',
          }} />
        ))}

        {/* 人物头像圆圈 */}
        <div style={{
          width: hovered ? '52px' : '44px',
          height: hovered ? '52px' : '44px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${hovered ? 'rgba(255,210,100,0.95)' : 'rgba(255,210,100,0.65)'}`,
          boxShadow: hovered
            ? '0 0 0 3px rgba(255,180,50,0.3), 0 0 20px rgba(255,180,50,0.6), 0 4px 16px rgba(0,0,0,0.6)'
            : '0 0 0 2px rgba(255,180,50,0.2), 0 0 10px rgba(255,180,50,0.3), 0 3px 10px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
          background: 'rgba(30,15,20,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          outline: npc.dialogueWithChoice ? '2px solid rgba(212,81,122,0.5)' : 'none',
          outlineOffset: '2px',
          willChange: 'transform',
        }}>
          {npc.sceneAvatar ? (
            <SceneAvatarCircle sceneAvatar={npc.sceneAvatar} size={hovered ? 52 : 44} />
          ) : hasAvatar ? (
            <img
              src={`${npc.avatar}?v=2`}
              alt={npc.name}
              onError={() => setAvatarErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: hovered ? '26px' : '22px' }}>{npc.emoji}</span>
          )}
        </div>
      </div>

      {/* 底部对话指示箭头 */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `6px solid ${hovered ? 'rgba(255,210,100,0.9)' : 'rgba(255,210,100,0.55)'}`,
        transition: 'border-color 0.2s ease',
        animation: 'pulse 1.8s ease-in-out infinite',
        marginTop: '2px',
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
              {choicesData.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleChoiceClick(opt)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(40,20,30,0.9), rgba(60,30,45,0.9))',
                    border: '2px solid rgba(255,210,100,0.5)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: 'rgba(255,230,200,0.9)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    lineHeight: '1.6',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,210,100,0.95)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(60,30,45,0.95), rgba(80,40,60,0.95))';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,210,100,0.5)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(40,20,30,0.9), rgba(60,30,45,0.9))';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#FFD9A0', marginRight: '8px' }}>
                    {opt.label}:
                  </span>
                  {opt.text}
                </button>
              ))}
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
function ActiveSceneView({ scene, npcsMap, character, wardrobe, onNpcChoice, onSceneChange, onItemGift, fullWidth, onInteractionEnd, onNpcActivate, onNpcBubbleClose }) {
  const [activeBubble, setActiveBubble] = useState(null); // npc.id
  const [activeNpcData, setActiveNpcData] = useState(null); // 随机选取后的 npc 数据
  const [bgError, setBgError] = useState(false);
  const [absentNotice, setAbsentNotice] = useState(null); // NPC 不在时的提示文字
  // 子场景数据：{ image, cells } — 直接替换底图，不叠加
  const [subScene, setSubScene] = useState(null);
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

  // 当父场景切换时，重置子场景
  useEffect(() => {
    setSubScene(null);
    setActiveBubble(null);
  }, [scene.id]);

  // 预加载相邻场景图片
  useEffect(() => {
    if (!scene.activeImage) return;
    const img = new Image();
    img.src = scene.activeImage;
  }, [scene.activeImage]);

  // 底图：气泡对话时可被对话图片覆盖
  const currentImg = bubbleOverrideImg || scene.activeImage;
  const hasImg = currentImg && !bgError;
  const positions = scene.npcPositions || {};

  const handleActivate = (npcId) => {
    // 允许父组件拦截（返回 true 表示已处理，不展示气泡）
    if (onNpcActivate && onNpcActivate(npcId)) return;
    if (activeBubble === npcId) {
      setActiveBubble(null);
      setActiveNpcData(null);
      return;
    }
    // 若 NPC 有 dialogueSets，每次激活随机选一套对话（支持 condition 按故事进度筛选）
    const npc = npcsMap?.[npcId];
    if (npc && npc.dialogueSets && npc.dialogueSets.length > 0) {
      const fav = character?.favorability || {};
      const visits = character?.subSceneVisits || {};
      // 筛选满足 condition 的 set；无 condition 的 set 始终可选
      const eligible = npc.dialogueSets.filter(s => {
        if (!s.condition) return true;
        const c = s.condition;
        if (c.minFav && Object.entries(c.minFav).some(([k, v]) => (fav[k] || 0) < v)) return false;
        if (c.maxFav && Object.entries(c.maxFav).some(([k, v]) => (fav[k] || 0) > v)) return false;
        if (c.minVisits && Object.entries(c.minVisits).some(([k, v]) => (visits[k] || 0) < v)) return false;
        return true;
      });
      const pool = eligible.length > 0 ? eligible : npc.dialogueSets;
      const set = pool[Math.floor(Math.random() * pool.length)];
      setActiveNpcData({
        ...npc,
        dialogues: set.dialogues || npc.dialogues,
        dialogueWithChoice: set.dialogueWithChoice || null,
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

    if (result?.consequence?.type === 'scene_character' && result.consequence.characterImage) {
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
      setSubScene({
        image: charImg,
        avatar: avatarImg,
        cells: result.consequence.characterCells || result.consequence.characterCell || [26, 27, 36, 37],
        npcName: result.consequence.npcName || '',
        npcId: result.consequence.npcId || null,
        nextDialogue: baseDialogue,
        subSceneDialogues: allDialogues,
        subSceneChoices: result.consequence.subSceneChoices || null,
        visitCount: result.consequence.visitCount || 0,
        storyStage: result.consequence.storyStage || 1,
        sourceNpcId: npcId,
      });
      setActiveBubble(null);
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
        {/* ── 底图（始终显示父场景图） ── */}
        {hasImg ? (
          <img
            key={currentImg}
            src={currentImg}
            alt={scene.name}
            onError={() => setBgError(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              animation: 'overlayFadeIn 0.4s ease both',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '80px', opacity: 0.1
          }}>
            {scene.bgEmoji}
          </div>
        )}

        {/* ── 子场景：NPC 立绘叠加（透明PNG叠在父场景图上） ── */}
        {subScene && subScene.image && (() => {
          const displayImg = subSceneOverrideImg || subScene.image;
          return (
            <img
              key={displayImg}
              src={displayImg}
              alt={subScene.npcName || 'NPC'}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'fill',
                animation: 'overlayFadeIn 0.4s ease both',
                pointerEvents: 'none',
              }}
            />
          );
        })()}

        {/* ── 粒子系统 Canvas ── */}
        {containerSize.w > 0 && !subScene && (
          <ParticleCanvas
            sceneId={scene.id}
            width={containerSize.w}
            height={containerSize.h || Math.round(containerSize.w * 0.5625)}
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
          return (
            <NpcHotspot key={npcId} npc={npc} position={pos} onActivate={handleActivate} />
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
            onClick={() => { setSubScene(null); setSubSceneOverrideImg(null); onInteractionEnd?.(); }}
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
            onClose={() => { onNpcBubbleClose?.(activeBubble); setActiveBubble(null); setActiveNpcData(null); setBubbleOverrideImg(null); }}
            onChoice={handleNpcChoiceResult}
            containerRef={sceneImgRef}
            onSceneChange={onSceneChange}
            onItemGift={onItemGift}
            onDialogueImage={img => setBubbleOverrideImg(img)}
            currentSceneId={scene.id}
          />
        );
      })()}

      {/* ── 子场景对话框：移出 overflow:hidden 容器，放在图片区正下方 ── */}
      {subScene && (
        <SubSceneDialogueBox
          subScene={subScene}
          onClose={() => { if (subScene.sourceNpcId) onNpcBubbleClose?.(subScene.sourceNpcId); setSubScene(null); setSubSceneOverrideImg(null); onInteractionEnd?.(); }}
          onChoiceSelect={(optionId, opt) => {
            if (!subScene.npcId) return;
            import('axios').then(({ default: axios }) => {
              // 记录本次选择，供下次见面衔接
              axios.post('/api/game/event', {
                eventType: 'npc_last_choice',
                payload: { npcId: subScene.npcId, optionId, text: opt?.text || '' }
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
                axios.post('/api/game/event', {
                  eventType: 'npc_affection',
                  payload: { npcId: subScene.npcId, value: gain }
                }).catch(() => {});
              } else if (isNeg) {
                const loss = subScene.storyStage >= 3 ? -8 : subScene.storyStage === 2 ? -5 : -3;
                axios.post('/api/game/event', {
                  eventType: 'npc_affection',
                  payload: { npcId: subScene.npcId, value: loss }
                }).catch(() => {});
              }
            });
          }}
          onItemGift={onItemGift}
          onDialogueImage={img => setSubSceneOverrideImg(img)}
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
      3:  { type: 'hint',    text: '小姐若有空，不妨去古街逛逛，听说那儿的布庄最近来了新花样！', scene: 'ancient_street', event: 'fabric_shop_new' },
      4:  { type: 'chat',    text: '春日里百花盛开，小姐气色越来越好了，真是羡煞旁人！' },
      5:  { type: 'gossip',  text: '奴婢偷听到，芳华郡主和四皇子最近闹了矛盾，具体原因不知道……' },
      6:  { type: 'hint',    text: '奴婢听人说，草原上这个季节有一种珍贵的药草，懂医术的人去了定有收获！', scene: 'grassland', event: 'rare_herb' },
      7:  { type: 'chat',    text: '七夕将至，宫里的姐妹们都在偷偷绣手帕，小姐有心上人了吗？' },
      8:  { type: 'gossip',  text: '听说翰林院最近来了位新学士，才华横溢，宫里的小姐们都在议论呢！' },
      9:  { type: 'hint',    text: '重阳节快到了，小姐不如去药堂走走，说不定能学到什么养生秘方！', scene: 'medicine_hall', event: 'autumn_remedy' },
      10: { type: 'chat',    text: '秋风送爽，奴婢最近学了一道点心，改天给小姐尝尝！' },
      11: { type: 'gossip',  text: '宫里传言说，皇上最近在物色新的宫廷乐师，不知是真是假……' },
      12: { type: 'hint',    text: '年关将近，客栈里总有各地来的商旅，说不定能听到有趣的消息！', scene: 'inn', event: 'merchant_news' },
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
      3:  { type: 'hint',    text: '春日里，画室的学子们正在切磋画技，若小姐有兴趣，不妨去看看，或许能遇见知音！', scene: 'art_studio', event: 'spring_art_gathering' },
      4:  { type: 'chat',    text: '小姐今日气色极好，在下有感而发，想为小姐谱一首新曲，不知小姐可有雅兴？' },
      5:  { type: 'gossip',  text: '听说宫廷女师最近在教皇子们学琴，四皇子天赋不错，皇后娘娘很高兴呢。' },
      6:  { type: 'hint',    text: '夏日夜晚，草原上会有牧民围火歌唱，那里的民间曲调别有风味，小姐若去定会喜欢！', scene: 'grassland', event: 'folk_music_night' },
      7:  { type: 'chat',    text: '七夕月圆，在下新谱了一曲《鹊桥仙》，愿天下有情人终成眷属。' },
      8:  { type: 'gossip',  text: '翰林院来的那位新学士，据说也精通音律，在下想与他切磋切磋。' },
      9:  { type: 'hint',    text: '礼仪堂最近在排练宫廷大典的乐曲，小姐若去旁听，说不定能学到不少！', scene: 'etiquette_hall', event: 'ceremony_rehearsal' },
      10: { type: 'chat',    text: '秋高气爽，在下最爱在这时节弹琴，万物萧瑟之中，音符显得格外清澈。' },
      11: { type: 'gossip',  text: '宫里要举办冬日音乐会，皇上亲自点了几首曲目，在下正在苦练呢！' },
      12: { type: 'hint',    text: '年末了，客栈里有位来自江南的说书人，据说会唱一种失传的古调，小姐有兴趣吗？', scene: 'inn', event: 'ancient_melody' },
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
      3:  { type: 'hint',    text: '春天的草原上有新鲜的野菜，小人最爱用来做汤，小姐若去草原，帮小人带些回来？', scene: 'grassland', event: 'wild_vegetables' },
      4:  { type: 'chat',    text: '小姐，小人最近研究出一道"桃花酥"，用的是新鲜桃花，香甜可口，请小姐品鉴！' },
      5:  { type: 'gossip',  text: '听说古街新开了一家香料铺子，进了不少西域来的稀罕玩意儿，小人想去瞧瞧！' },
      6:  { type: 'hint',    text: '夏日里，药堂的大夫会来宫里送消暑药材，小人顺便问问有没有新鲜食材，小姐也可以去看看！', scene: 'medicine_hall', event: 'summer_herbs' },
      7:  { type: 'chat',    text: '七夕佳节，小人特制了一道"鹊桥饼"，愿小姐早遇良缘！' },
      8:  { type: 'gossip',  text: '宫里来了位新御厨，据说是从江南请来的，手艺了得，小人要好好向他学习！' },
      9:  { type: 'hint',    text: '秋天是螃蟹最肥的时候，古街的市集上有新鲜的大闸蟹，小姐若去，记得多买些！', scene: 'ancient_street', event: 'crab_season' },
      10: { type: 'chat',    text: '深秋了，小人炖了一锅羊肉汤，暖身暖心，小姐要不要来一碗？' },
      11: { type: 'gossip',  text: '年末宫廷大宴，皇上钦点了十二道菜，小人正忙得不可开交，头发都快掉光了！' },
      12: { type: 'hint',    text: '年关了，客栈里的掌柜每年这时候都会做一道"团圆饭"，味道据说一绝，小姐不去尝尝？', scene: 'inn', event: 'reunion_feast' },
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
      3:  { type: 'hint',    text: '春猎即将开始，马场那边正在备马，小姐若有兴趣，不妨去马场练练骑术！', scene: 'horse_ranch', event: 'spring_hunt_prep' },
      4:  { type: 'chat',    text: '凌小姐的胆识令末将刮目相看，将门之后，果然与众不同！' },
      5:  { type: 'gossip',  text: '听说边关最近有些动荡，将军大人已奉命前往视察，宫里气氛有些紧张。' },
      6:  { type: 'hint',    text: '草原上有一处演武场，每年夏天会有比武大会，小姐若去，说不定能见识到真正的武艺！', scene: 'grassland', event: 'martial_contest' },
      7:  { type: 'chat',    text: '七夕夜，末将奉命加强宫廷守卫，凌小姐若在宫中，末将定护您周全。' },
      8:  { type: 'gossip',  text: '宫里新来了几位武艺高强的侍卫，据说是皇上从各地选拔来的，末将压力不小啊！' },
      9:  { type: 'hint',    text: '秋日马场会有骑射比赛，小姐若去参观，说不定能结识不少豪杰！', scene: 'horse_ranch', event: 'autumn_archery' },
      10: { type: 'chat',    text: '深秋了，末将最近在练一套新的剑法，凌小姐若有兴趣，可以来观摩！' },
      11: { type: 'gossip',  text: '听说有人在暗中打探宫廷的守卫规律，末将已上报皇上，正在彻查。' },
      12: { type: 'hint',    text: '年末了，客栈里有不少江湖人士聚集，小姐若去，或许能听到一些有趣的消息！', scene: 'inn', event: 'jianghu_gathering' },
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
      3:  { type: 'hint',    text: '礼仪堂近日新开了一门"宫廷礼仪精修课"，凌小姐若去学习，定能在宫中如鱼得水！', scene: 'etiquette_hall', event: 'etiquette_masterclass' },
      4:  { type: 'chat',    text: '春日里，老夫在花园中见到一株罕见的兰花，想到凌小姐，便折了一枝带来。' },
      5:  { type: 'gossip',  text: '听说皇上有意在今年秋天举行一场诗会，届时朝野才俊云集，凌小姐或可一展才华！' },
      6:  { type: 'hint',    text: '翰林院今夏会开放藏书楼，难得的机会，凌小姐若去，定能找到不少珍贵典籍！', scene: 'art_studio', event: 'library_open' },
      7:  { type: 'chat',    text: '七夕佳节，老夫的孙女也在宫中，凌小姐若有空，不妨与她相聚。' },
      8:  { type: 'gossip',  text: '翰林院新来的那位学士，据说是前朝遗老的后人，来历颇为神秘……' },
      9:  { type: 'hint',    text: '皇上将于重阳节在宫中举行诗会，凌小姐若提前在书院苦练诗才，届时定能出彩！', scene: 'art_studio', event: 'poetry_contest_prep' },
      10: { type: 'chat',    text: '凌小姐的才学让老夫刮目相看，若有机会，老夫愿向皇上举荐！' },
      11: { type: 'gossip',  text: '宫廷年末大典将至，老夫正忙于礼仪筹备，着实繁琐，但也是老夫的职责所在。' },
      12: { type: 'hint',    text: '年关了，古街的书市每年这时候最热闹，各地书商云集，小姐若去，定有收获！', scene: 'ancient_street', event: 'year_end_book_fair' },
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
      3:  { type: 'hint',    text: '春日里，马场会有一批从北方运来的良马，小姐若去，或许能挑到一匹好马！', scene: 'horse_ranch', event: 'northern_horses' },
      4:  { type: 'chat',    text: '凌小姐的胆识不输男儿，你父亲若知道，定会感到骄傲！' },
      5:  { type: 'gossip',  text: '宫中有人向皇上进谗言，说本将拥兵自重，本将问心无愧，但仍需谨慎行事。' },
      6:  { type: 'hint',    text: '草原上有一支神秘的游商队伍，每年夏天经过，据说带有珍贵的异域宝物，小姐若去或许能遇见！', scene: 'grassland', event: 'exotic_merchants' },
      7:  { type: 'chat',    text: '七夕夜，本将想起了远在边关的将士们，不知他们今夜是否也在思念家人……' },
      8:  { type: 'gossip',  text: '兵部尚书与本将政见不合，最近在朝堂上多有摩擦，皇上也有些不悦。' },
      9:  { type: 'hint',    text: '秋猎将至，皇上会在草原上设立行营，小姐若有机会随行，定能见识到皇家猎场的壮观！', scene: 'grassland', event: 'imperial_hunt' },
      10: { type: 'chat',    text: '深秋了，本将最近在整理父亲留下的兵书，有些地方颇有感悟，改日与你分享。' },
      11: { type: 'gossip',  text: '听说皇上有意在明年春天御驾亲征，朝堂上议论纷纷，本将已做好随时出发的准备。' },
      12: { type: 'hint',    text: '年末了，京城里有不少从边关归来的老兵，在客栈里聚会，他们的故事值得一听！', scene: 'inn', event: 'veterans_gathering' },
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
      3:  { type: 'hint',    text: '本宫最近迷上了画画！听说画室的先生技艺超群，小姐若去，我们可以一起学！', scene: 'art_studio', event: 'princess_painting' },
      4:  { type: 'chat',    text: '春天真好！本宫想和你去御花园放风筝，你愿意吗？' },
      5:  { type: 'gossip',  text: '母后最近在为本宫物色驸马，本宫才不要嫁人呢，烦死了！' },
      6:  { type: 'hint',    text: '本宫听说草原上的牧民有一种神奇的草药，据说能让皮肤变好，小姐去草原时帮本宫问问？', scene: 'grassland', event: 'beauty_herb' },
      7:  { type: 'chat',    text: '七夕节本宫想做一个荷包送给……咳咳，总之，凌姐姐你会绣花吗？' },
      8:  { type: 'gossip',  text: '那个翰林院的新学士，本宫觉得他看本宫的眼神有些奇怪，你觉得呢？' },
      9:  { type: 'hint',    text: '礼仪堂最近在教新式宫廷舞蹈，本宫偷偷去学了，可好看了！小姐也去看看吧！', scene: 'etiquette_hall', event: 'new_court_dance' },
      10: { type: 'chat',    text: '秋天来了，本宫最爱赏菊花！改天我们一起去御花园，好不好？' },
      11: { type: 'gossip',  text: '本宫听说皇兄最近在研究什么秘密，连本宫都不告诉，哼！' },
      12: { type: 'hint',    text: '年末了，古街的灯会最热闹，本宫想偷溜出去玩，小姐要不要陪本宫？', scene: 'ancient_street', event: 'lantern_festival' },
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
      3:  { type: 'hint',    text: '本皇子近日在研读一部古籍，其中提到了一种失传的医术，据说药堂的老大夫知道一些线索！', scene: 'medicine_hall', event: 'ancient_medical_text' },
      4:  { type: 'chat',    text: '春日里，本皇子在御花园写了一首诗，自觉尚可，不知凌小姐可否指教？' },
      5:  { type: 'gossip',  text: '宫中传言，父皇有意在几位皇子中选一位监国，本皇子压力颇大……' },
      6:  { type: 'hint',    text: '本皇子听说草原上有一位隐居的高人，学问渊博，若能拜访，定有所得，小姐可有兴趣同往？', scene: 'grassland', event: 'hermit_scholar' },
      7:  { type: 'chat',    text: '七夕佳节，本皇子谱了一首词，却苦于无人赏析，凌小姐才学出众，可否赐教？' },
      8:  { type: 'gossip',  text: '翰林院来的那位新学士，本皇子与他深谈过，此人学问深厚，来历却颇为神秘……' },
      9:  { type: 'hint',    text: '重阳诗会将至，本皇子在苦练诗才，书院的先生说，若能在诗会上夺魁，父皇会刮目相看！', scene: 'art_studio', event: 'poetry_contest' },
      10: { type: 'chat',    text: '秋风送爽，本皇子最近在临摹王羲之的字帖，进步不大，凌小姐可有什么心得？' },
      11: { type: 'gossip',  text: '宫中有传言，父皇已有意立太子，几位皇兄蠢蠢欲动，本皇子只想置身事外……' },
      12: { type: 'hint',    text: '年末了，本皇子听说礼仪堂会举行一场特别的年终典礼，小姐若去观摩，定有所得！', scene: 'etiquette_hall', event: 'year_end_ceremony' },
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
      3:  { type: 'hint',    text: '本宫听闻礼仪堂近日来了一位德高望重的老嬷嬷，专门教授宫廷礼仪，凌小姐若去，本宫会让人关照你。', scene: 'etiquette_hall', event: 'empress_recommendation' },
      4:  { type: 'chat',    text: '春日里，本宫在御花园设了茶宴，凌小姐的才情令满座宾客赞叹，本宫甚感欣慰。' },
      5:  { type: 'gossip',  text: '皇上近日龙体微恙，本宫忧心忡忡，已命太医院日夜守候，望皇上早日康复。' },
      6:  { type: 'hint',    text: '本宫听说药堂有一位医术精湛的大夫，擅长调理女子体质，凌小姐若有需要，本宫可为你引荐。', scene: 'medicine_hall', event: 'empress_doctor_referral' },
      7:  { type: 'chat',    text: '七夕佳节，本宫为宫中嫔妃设了宴，凌小姐的礼仪举止令本宫十分满意。' },
      8:  { type: 'gossip',  text: '宫中有人向皇上进言，欲动摇本宫的地位，本宫心中有数，凌小姐，宫中行事须谨慎。' },
      9:  { type: 'hint',    text: '本宫打算在重阳节后在宫中举办一场书画展，凌小姐若能呈上佳作，本宫定会为你美言！', scene: 'art_studio', event: 'empress_art_exhibition' },
      10: { type: 'chat',    text: '秋意渐浓，本宫见你一路走来，成长颇多，本宫心中甚慰，望你继续努力。' },
      11: { type: 'gossip',  text: '宫中关于立太子的传言越来越多，本宫须小心应对，凌小姐，近日宫中敏感，你行事须更加谨慎。' },
      12: { type: 'hint',    text: '年末了，本宫听说古街有一家老字号的绸缎庄，专门为宫廷供货，凌小姐若去，可提本宫的名号，定有优待！', scene: 'ancient_street', event: 'empress_silk_shop' },
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
      3:  { type: 'hint',    text: '朕听闻礼仪堂的教习说你礼仪精进，甚为欣慰。朕有意在春祭上让你随行，你须提前去礼仪堂好好准备！', scene: 'etiquette_hall', event: 'imperial_ceremony_prep' },
      4:  { type: 'chat',    text: '春日里，朕在御花园中遇见你，你的才情与气度令朕印象深刻。' },
      5:  { type: 'gossip',  text: '朕最近在考虑一件大事，关乎江山社稷，暂不便透露，但你的未来，朕自有安排。' },
      6:  { type: 'hint',    text: '朕听说草原上有一支神秘的部落，掌握着一种古老的医术，朕有意派人前往，你若有兴趣，可前往草原一探！', scene: 'grassland', event: 'imperial_mission' },
      7:  { type: 'chat',    text: '七夕之夜，朕在御花园赏月，见你独自一人，朕颇有感慨，你可有心中所念之人？' },
      8:  { type: 'gossip',  text: '朝中有人结党营私，朕已心中有数，只是时机未到，凌若雪，你须记住，宫中行事，忠心为本。' },
      9:  { type: 'hint',    text: '朕将于重阳节举办诗会，届时朝野才俊云集，你若能在诗会上一展才华，朕定会另眼相看！', scene: 'art_studio', event: 'imperial_poetry_contest' },
      10: { type: 'chat',    text: '秋风萧瑟，朕见你一路走来，成长颇多，朕心甚慰，望你不忘初心，继续精进。' },
      11: { type: 'gossip',  text: '朕近日在考虑立太子一事，此乃国之大事，朕须慎重，凌若雪，你觉得，何为明君之道？' },
      12: { type: 'hint',    text: '年末了，朕有意在明年春天举行一场大典，你须在礼仪堂好好准备，届时朕会亲自考核！', scene: 'etiquette_hall', event: 'imperial_grand_ceremony' },
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

// 判断某个NPC是否已解锁（前一个人已见满3次）
function isNpcUnlocked(npcIndex, meetCounts) {
  if (npcIndex === 0) return true;
  const prevNpc = COURT_NPCS[npcIndex - 1];
  return (meetCounts[prevNpc.id] || 0) >= 3;
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

      // 更新见面次数
      const newCounts = { ...meetCounts };
      newCounts[npc.id] = Math.min((newCounts[npc.id] || 0) + 1, 3);
      setMeetCounts(newCounts);
      saveCourtMeetCounts(newCounts);
    }

    // 记录本月已见（无论成功失败都记录，避免反复骚扰）
    const newLastMet = { ...lastMetMonth, [npc.id]: gameMonth };
    setLastMetMonth(newLastMet);
    saveCourtLastMetMonth(newLastMet);

    onMeetResult({
      npc,
      success,
      alreadyMet: false,
      dialogue,
      gift: success ? npc.gift : null,
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
  const { npc, success, alreadyMet, dialogue, gift } = result;

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
              {dialogue?.type === 'hint' && (
                <div style={{
                  marginTop: '10px', fontSize: '12px',
                  color: 'rgba(201,168,76,0.75)',
                  background: 'rgba(201,168,76,0.08)', borderRadius: '8px',
                  padding: '7px 12px', letterSpacing: '0.5px',
                }}>
                  💡 提示：前往{dialogue.scene === 'grassland' ? '草原' : dialogue.scene === 'inn' ? '客栈' : dialogue.scene === 'ancient_street' ? '古街' : dialogue.scene === 'medicine_hall' ? '药堂' : dialogue.scene === 'art_studio' ? '画室' : dialogue.scene === 'etiquette_hall' ? '礼仪堂' : dialogue.scene === 'horse_ranch' ? '马场' : dialogue.scene}，可能触发特殊事件！
                </div>
              )}
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
  return (
    <div style={{
      background: 'rgba(20,8,15,0.95)', border: '1px solid rgba(52,211,153,0.4)',
      borderRadius: '16px', padding: '20px', marginBottom: '16px',
      animation: 'slideInLeft 0.4s ease', boxShadow: '0 8px 32px rgba(52,211,153,0.15)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', color: '#34D399', margin: 0 }}>✅ 修炼完成！</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'rgba(245,230,236,0.4)',
          cursor: 'pointer', fontSize: '18px'
        }}>×</button>
      </div>
      <p style={{
        fontSize: '14px', color: 'rgba(245,230,236,0.7)', lineHeight: '1.7', marginBottom: '14px',
        fontStyle: 'italic', borderLeft: '2px solid rgba(52,211,153,0.4)', paddingLeft: '12px'
      }}>
        {result.storyText}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(result.skillChanges || {}).map(([skill, change]) => (
          <div key={skill} style={{
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: '8px', padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(245,230,236,0.6)' }}>{skill}</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#34D399' }}>
              {change.before} → {change.after}
            </span>
            <span style={{ fontSize: '11px', color: '#34D399' }}>(+{change.gain})</span>
          </div>
        ))}
      </div>
      {result.leveledUp && (
        <div style={{
          marginTop: '12px', padding: '10px',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(212,81,122,0.15))',
          borderRadius: '10px', textAlign: 'center',
          border: '1px solid rgba(251,191,36,0.3)'
        }}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#FBBF24', marginLeft: '8px' }}>
            升级了！
          </span>
        </div>
      )}
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
// 主组件
// ─────────────────────────────────────────
export default function SceneView({
  sceneData, scenes, character, wardrobe, courseResult, skillConfig,
  onAttendCourse, onTalkToNpc, onNpcChoice, onSceneChange,
  onItemGift, currentScene, fullWidth, onInteractionEnd, onNpcActivate, onNpcBubbleClose
}) {
  const { scene, npcs, courses } = sceneData;
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [courtMeetResult, setCourtMeetResult] = useState(null);
  const [courtHadMet, setCourtHadMet] = useState(false);

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

      {/* 场景技能提示 */}
      {(() => {
        const SCENE_SKILL_HINTS = {
          inn:            '亲和力、魅力',
          royal_court:    '魅力、礼仪、胆识',
          grassland:      '野性、体力、灵气',
          etiquette_hall: '魅力、才学、亲和力',
          medicine_hall:  '医术、才学、灵气',
          art_studio:     '画艺、诗才、才学',
          horse_ranch:    '野性、体力、胆识',
          kindergarten:   '才学、亲和力、灵气',
          bedroom:        '魅力、灵气',
          ancient_street: '亲和力、厨艺',
        };
        const hint = SCENE_SKILL_HINTS[scene.id];
        if (!hint) return null;
        return (
          <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'rgba(245,230,236,0.35)', letterSpacing: '1px' }}>
            此场景可能提升：{hint}
          </div>
        );
      })()}

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

