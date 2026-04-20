import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForgingGame from './ForgingGame';
import DanceGame from './DanceGame';
import HuntingGame from './HuntingGame';

const LABOR_TO_MODE = {
  '织布纺纱': 'weaving',
  '打铁锻造': 'forging',
  '舞蹈':     'dance',
  '狩猎':     'hunting',
};

const MODE_INFO = {
  weaving: { title: '🧵 织布纺纱', subtitle: '左右移动接线团，保持纺纱节奏' },
  forging: { title: '⚒️ 铁与烬', subtitle: 'Q鼓风升温 → Space取出 → 左键/右键锻打节点 → E凝神 · R符文共鸣 → Space淬火' },
  dance:   { title: '💃 霓裳古风舞', subtitle: '← ↓ ↑ → 方向键 · 节拍准确按下，连击加分' },
  hunting: { title: '🏹 骑射狩猎', subtitle: 'WASD移动骑手 · 鼠标瞄准 · 按住左键蓄力 · 松开射箭' },
};

const GAME_DURATION = 30;
const LONG_DURATION = 60; // 舞蹈/狩猎/锻造游戏时间

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function LaborMiniGame({ laborType, onComplete }) {
  const mode = LABOR_TO_MODE[laborType] || 'weaving';
  const info = MODE_INFO[mode];

  const initDuration = (mode === 'forging' || mode === 'dance' || mode === 'hunting') ? LONG_DURATION : GAME_DURATION;
  const [timeLeft, setTimeLeft] = useState(initDuration);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [overtimeCount, setOvertimeCount] = useState(0);

  const scoreRef = useRef(0);
  const completedRef = useRef(false);

  const addScore = useCallback((v) => {
    scoreRef.current = Math.max(0, scoreRef.current + v);
    setScore(scoreRef.current);
  }, []);

  // weaving
  const keysRef = useRef({ left: false, right: false });
  const [basketX, setBasketX] = useState(50);
  const [drops, setDrops] = useState([]);
  const [popups, setPopups] = useState([]); // 接线团得分浮动特效

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setEnded(true);
    setTimeout(() => onComplete?.(laborType, scoreRef.current), 260);
  }, [laborType, onComplete]);

  useEffect(() => {
    completedRef.current = false;
    const m = LABOR_TO_MODE[laborType];
    const dur = (m === 'forging' || m === 'dance' || m === 'hunting') ? LONG_DURATION : GAME_DURATION;
    setTimeLeft(dur);
    setScore(0);
    setEnded(false);
    setOvertimeCount(0);
    scoreRef.current = 0;
  }, [laborType]);

  // 倒计时
  useEffect(() => {
    if (ended) return undefined;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (mode === 'weaving' || mode === 'forging' || mode === 'dance' || mode === 'hunting') { finish(); return 0; }
          // pottery 补时机制（最多补时2次后结束）
          setOvertimeCount((c) => {
            if (c >= 2) { finish(); return c; }
            return c + 1;
          });
          return 6;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ended, mode, finish]);

  // weaving 键盘/线团逻辑
  useEffect(() => {
    if (mode !== 'weaving' || ended) return undefined;
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = true;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = true;
    };
    const onUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = false;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const loop = setInterval(() => {
      setBasketX((prev) => {
        let next = prev;
        if (keysRef.current.left) next -= 3.2;
        if (keysRef.current.right) next += 3.2;
        return clamp(next, 6, 94);
      });
      setDrops((prev) => {
        let next = prev.map((d) => ({ ...d, y: d.y + d.speed })).filter((d) => d.y < 97);
        next = next.filter((d) => {
          if (d.y >= 85 && Math.abs(d.x - basketX) < 9) {
            const pts = d.kind === 'gold' ? 4 : -1;
            addScore(pts);
            const pid = `${Date.now()}_${Math.random()}`;
            setPopups((p) => [...p, { id: pid, x: d.x, pts, gold: d.kind === 'gold', bad: d.kind === 'normal' }]);
            setTimeout(() => setPopups((p) => p.filter((pp) => pp.id !== pid)), 900);
            return false;
          }
          return true;
        });
        if (Math.random() < 0.42) {
          const r = Math.random();
          const kind = r < 0.35 ? 'gold' : 'normal';
          next.push({
            id: `${Date.now()}_${Math.random()}`,
            x: 18 + Math.random() * 64,
            y: 0,
            speed: 2 + Math.random() * 1.8,
            kind,
          });
        }
        return next;
      });
    }, 45);
    return () => {
      clearInterval(loop);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [mode, ended, basketX, addScore]);

  const totalDuration = (mode === 'forging' || mode === 'dance' || mode === 'hunting') ? LONG_DURATION : GAME_DURATION;
  const progressPercent = clamp(((totalDuration - timeLeft) / totalDuration) * 100, 0, 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2100,
      background: 'rgba(8,6,10,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px 16px',
      overflowY: 'auto',
    }}>
      <div style={{
        width: 'min(92vw, 900px)',
        borderRadius: 20,
        border: '2px solid rgba(201,168,76,0.5)',
        background: 'linear-gradient(145deg, rgba(18,10,18,0.98), rgba(32,18,30,0.98))',
        padding: '16px 20px',
      }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#FFD9A0' }}>{info.title}</div>
          <button onClick={finish} style={{
            background: 'rgba(212,81,122,0.25)', border: '1px solid rgba(212,81,122,0.5)',
            borderRadius: 10, color: '#F4A0C0', fontSize: 14, fontWeight: 700,
            padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit',
          }}>✕ 退出</button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,230,236,0.66)', marginBottom: 12 }}>
          {info.subtitle}
        </div>

        {/* 进度条 + 得分 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
          <div style={{ height: 8, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.12)' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #D4AF37, #F4D06F)', transition: 'width 1s linear' }} />
          </div>
          <div style={{ color: '#FDE68A', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            得分 {score} · 剩余 {timeLeft}s
          </div>
        </div>

        {/* 织布纺纱 */}
        {mode === 'weaving' && (
          <>
          <div style={{
            position: 'relative', height: 480, borderRadius: 16, overflow: 'hidden',
            background: 'linear-gradient(180deg, #3d2a3d, #2a1f30 45%, #3c2f24)',
          }}>
            {drops.map((d) => (
              <div key={d.id} style={{
                position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: d.kind === 'gold' ? 28 : 22,
              }}>
                {d.kind === 'gold' ? '🧶' : '🪡'}
              </div>
            ))}
            <div style={{
              position: 'absolute', left: `${basketX}%`, bottom: '8%',
              transform: 'translateX(-50%)', fontSize: 38,
            }}>🧺</div>
            {/* 得分浮动特效 */}
            {popups.map((p) => (
              <div key={p.id} style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: '18%',
                transform: 'translateX(-50%)',
                fontSize: p.gold ? 22 : 18,
                fontWeight: 800,
                color: p.bad ? '#FF4444' : p.gold ? '#FFD700' : '#7FFF7F',
                textShadow: p.bad
                  ? '0 0 8px rgba(255,60,60,0.9), 0 2px 4px rgba(0,0,0,0.8)'
                  : p.gold
                    ? '0 0 8px rgba(255,215,0,0.9), 0 2px 4px rgba(0,0,0,0.8)'
                    : '0 0 6px rgba(100,255,100,0.8), 0 2px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                animation: 'scorePopup 0.9s ease-out forwards',
                whiteSpace: 'nowrap',
              }}>
                {p.bad ? p.pts : `+${p.pts}`}
              </div>
            ))}
            <div style={{
              position: 'absolute', left: 12, bottom: 12,
              fontSize: 12, color: 'rgba(245,230,236,0.72)',
            }}>
              ←/→ 或 A/D 接线团（普通🪡 -1，金色🧶 +4）
            </div>
          </div>
          <style>{`
            @keyframes scorePopup {
              0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.3); }
              30%  { opacity: 1; transform: translateX(-50%) translateY(-18px) scale(1.1); }
              100% { opacity: 0; transform: translateX(-50%) translateY(-48px) scale(0.9); }
            }
          `}</style>
          </>
        )}

        {/* 打铁锻造 */}
        {mode === 'forging' && (
          <ForgingGame addScore={addScore} ended={ended} onFinish={finish} />
        )}

        {/* 霓裳舞蹈 */}
        {mode === 'dance' && (
          <DanceGame addScore={addScore} ended={ended} onFinish={finish} />
        )}

        {/* 骑射狩猎 */}
        {mode === 'hunting' && (
          <HuntingGame addScore={addScore} ended={ended} onFinish={finish} />
        )}

        {/* 补时提示 */}
        {overtimeCount > 0 && !ended && (
          <div style={{ marginTop: 8, color: '#FDE68A', fontSize: 12 }}>
            已补时 {overtimeCount} 次
          </div>
        )}

        {/* 结算 */}
        {ended && (
          <div style={{ marginTop: 10, color: '#F4A0C0', fontWeight: 700, fontSize: 14 }}>
            工坊结算中...
          </div>
        )}
      </div>
    </div>
  );
}

export default LaborMiniGame;

