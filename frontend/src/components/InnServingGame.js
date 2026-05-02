import React, { useState, useEffect, useRef, useCallback } from 'react';

// 桌位配置（百分比坐标，用户截图标注校准）
const TABLES = [
  { id: 1, x:  9, y: 65, label: '桌一' },
  { id: 2, x: 26, y: 78, label: '桌二' },
  { id: 3, x: 45, y: 72, label: '桌三' },
  { id: 5, x: 86, y: 78, label: '桌五' },
  { id: 4, x: 18, y: 16, label: '桌四' },  // 二楼左侧
  { id: 6, x: 38, y: 24, label: '桌六' },  // 二楼中央
  { id: 7, x: 24, y: 62, label: '桌七' },  // 一楼中左小桌
];

const TASK_TYPES = ['serve', 'collect']; // 端菜 | 收钱
const GAME_DURATION = 60;
const PROXIMITY = 10; // 触发距离（百分比）

function randomTask(excludeTableId) {
  const available = TABLES.filter(t => t.id !== excludeTableId);
  const table = available[Math.floor(Math.random() * available.length)];
  const type = TASK_TYPES[Math.floor(Math.random() * 2)];
  return { tableId: table.id, type };
}

export default function InnServingGame({ onClose, onJadeEarned }) {
  const [phase, setPhase] = useState('idle'); // idle | playing | result
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [task, setTask] = useState(null);
  const [feedback, setFeedback] = useState(null); // { text, ok }
  const [playerPos, setPlayerPos] = useState({ x: 48, y: 68 }); // 百分比，对应场景中紫衣女初始位置

  // 方向键状态
  const keysRef = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  const playerPosRef = useRef({ x: 48, y: 75 });
  const taskRef = useRef(null);
  const phaseRef = useRef('idle');
  const feedbackTimerRef = useRef(null);

  phaseRef.current = phase;
  taskRef.current = task;

  const showFeedback = useCallback((text, ok) => {
    setFeedback({ text, ok });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 1200);
  }, []);

  const startGame = useCallback(() => {
    setPhase('playing');
    setTimeLeft(GAME_DURATION);
    setScore(0);
    playerPosRef.current = { x: 48, y: 68 };
    setPlayerPos({ x: 48, y: 68 });
    const initialTask = randomTask(null);
    setTask(initialTask);
    taskRef.current = initialTask;
  }, []);

  // 游戏循环
  useEffect(() => {
    if (phase !== 'playing') return;

    const SPEED = 0.4; // %/frame

    const loop = () => {
      const keys = keysRef.current;
      let { x, y } = playerPosRef.current;
      if (keys.ArrowUp)    y = Math.max(5, y - SPEED);
      if (keys.ArrowDown)  y = Math.min(90, y + SPEED);
      if (keys.ArrowLeft)  x = Math.max(2, x - SPEED);
      if (keys.ArrowRight) x = Math.min(95, x + SPEED);
      playerPosRef.current = { x, y };
      setPlayerPos({ x, y });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // 倒计时
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // 键盘事件
  useEffect(() => {
    const down = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keysRef.current[e.key] = true;
      }
      if (phaseRef.current !== 'playing') return;
      const t = taskRef.current;
      if (!t) return;

      const table = TABLES.find(tb => tb.id === t.tableId);
      if (!table) return;
      const pos = playerPosRef.current;
      const dx = Math.abs(pos.x - table.x);
      const dy = Math.abs(pos.y - table.y);
      const near = dx < PROXIMITY && dy < PROXIMITY;

      if (e.key === 'j' || e.key === 'J') {
        if (t.type === 'serve' && near) {
          setScore(s => s + 1);
          showFeedback(`🍽️ 上菜 ${table.label} ✓`, true);
          const next = randomTask(t.tableId);
          setTask(next);
          taskRef.current = next;
        } else if (t.type === 'serve' && !near) {
          showFeedback('还没到桌边', false);
        }
      }
      if (e.key === 'k' || e.key === 'K') {
        if (t.type === 'collect' && near) {
          setScore(s => s + 1);
          showFeedback(`💰 收钱 ${table.label} ✓`, true);
          const next = randomTask(t.tableId);
          setTask(next);
          taskRef.current = next;
        } else if (t.type === 'collect' && !near) {
          showFeedback('还没到桌边', false);
        }
      }
    };
    const up = (e) => {
      if (keysRef.current.hasOwnProperty(e.key)) keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [showFeedback]);

  const handleCollect = useCallback(() => {
    onJadeEarned?.(score);
  }, [score, onJadeEarned]);

  const targetTable = task ? TABLES.find(t => t.id === task.tableId) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2200,
      background: 'rgba(5,2,10,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: '680px',
        background: 'linear-gradient(145deg, rgba(8,4,16,0.99), rgba(16,8,28,0.99))',
        border: '1.5px solid rgba(201,168,76,0.4)',
        borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 0 60px rgba(201,168,76,0.1)',
      }}>
        {/* 标题栏 */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(150,90,30,0.35), rgba(150,90,30,0.08))',
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🍽️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#C9A84C', letterSpacing: '3px' }}>悦来居栈·端菜服务</div>
              <div style={{ fontSize: '10px', color: 'rgba(201,168,76,0.5)' }}>方向键移动 · J键放菜 · K键收钱</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '16px', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>

        {/* 游戏区域 */}
        <div style={{ padding: '16px' }}>
          {phase === 'idle' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍜</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.9', marginBottom: '20px' }}>
                在悦来居栈帮忙跑堂！<br/>
                <span style={{ color: '#C9A84C' }}>方向键</span>移动紫衣侍者到指定桌位<br/>
                <span style={{ color: '#90EE90' }}>J键</span>：放菜　<span style={{ color: '#FFB74D' }}>K键</span>：收钱<br/>
                60秒内每完成一个任务获得 <span style={{ color: '#A8FFD0', fontWeight: '700' }}>💎 1玉</span>
              </div>
              <button onClick={startGame} style={{
                padding: '12px 36px', background: 'linear-gradient(135deg, #8B4513, #5D2D0A)',
                border: '1px solid rgba(201,168,76,0.5)', borderRadius: '12px',
                color: '#C9A84C', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                letterSpacing: '3px', fontFamily: 'inherit',
              }}>开始跑堂</button>
            </div>
          )}

          {phase === 'playing' && (
            <>
              {/* 状态栏 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                {/* 当前任务提示 */}
                <div style={{
                  padding: '6px 14px', borderRadius: '20px',
                  background: task?.type === 'serve' ? 'rgba(144,238,144,0.15)' : 'rgba(255,183,77,0.15)',
                  border: `1px solid ${task?.type === 'serve' ? 'rgba(144,238,144,0.4)' : 'rgba(255,183,77,0.4)'}`,
                  fontSize: '13px', fontWeight: '700',
                  color: task?.type === 'serve' ? '#90EE90' : '#FFB74D',
                }}>
                  {task?.type === 'serve' ? '🍽️ 端菜' : '💰 收钱'} → {targetTable?.label || ''}
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#A8FFD0' }}>💎 {score}</div>
                  <div style={{
                    fontSize: '14px', fontWeight: '700',
                    color: timeLeft <= 10 ? '#FF6B6B' : '#C9A84C',
                  }}>⏱ {timeLeft}s</div>
                </div>
              </div>

              {/* 游戏地图 */}
              <div style={{
                position: 'relative', width: '100%', paddingTop: '60%',
                background: 'linear-gradient(145deg, #1a0a08, #2d1505)',
                borderRadius: '14px', overflow: 'hidden',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                {/* 背景图 */}
                <img
                  src="/assets/scenes/inn_game.png"
                  alt="悦来居栈"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                />

                {/* 桌位标记 */}
                {TABLES.map(table => {
                  const isTarget = task?.tableId === table.id;
                  return (
                    <div key={table.id} style={{
                      position: 'absolute',
                      left: `${table.x}%`, top: `${table.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '44px', height: '44px', borderRadius: '50%',
                      border: `2px solid ${isTarget ? (task?.type === 'serve' ? '#90EE90' : '#FFB74D') : 'rgba(255,255,255,0.3)'}`,
                      background: isTarget
                        ? (task?.type === 'serve' ? 'rgba(144,238,144,0.25)' : 'rgba(255,183,77,0.25)')
                        : 'rgba(0,0,0,0.35)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      animation: isTarget ? 'tablePulse 1s ease infinite' : 'none',
                      zIndex: 2,
                    }}>
                      <div style={{ fontSize: '16px' }}>🪑</div>
                      <div style={{ fontSize: '8px', color: isTarget ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{table.label}</div>
                    </div>
                  );
                })}

                {/* 玩家角色（凌若雪立绘） */}
                <div style={{
                  position: 'absolute',
                  left: `${playerPos.x}%`, top: `${playerPos.y}%`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 5,
                }}>
                  <img
                    src="/assets/character/outfits/age15_dress1.png"
                    alt="凌若雪"
                    style={{
                      height: '80px', width: 'auto',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))',
                      imageRendering: 'auto',
                    }}
                  />
                </div>

                {/* 反馈提示 */}
                {feedback && (
                  <div style={{
                    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                    padding: '6px 16px', borderRadius: '20px', zIndex: 10,
                    background: feedback.ok ? 'rgba(50,150,50,0.9)' : 'rgba(150,50,50,0.9)',
                    color: '#fff', fontSize: '13px', fontWeight: '700',
                    animation: 'feedbackFade 0.3s ease',
                  }}>
                    {feedback.text}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                方向键移动 · J：放菜 · K：收钱 · 靠近目标桌位才能操作
              </div>
            </>
          )}

          {phase === 'result' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {score >= 10 ? '🏆' : score >= 5 ? '🎉' : '👏'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#C9A84C', marginBottom: '8px', letterSpacing: '2px' }}>
                跑堂结束！
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                完成了 <span style={{ color: '#C9A84C', fontWeight: '700', fontSize: '20px' }}>{score}</span> 个任务
              </div>
              {score > 0 && (
                <div style={{ fontSize: '20px', color: '#A8FFD0', fontWeight: '700', marginBottom: '20px' }}>
                  💎 +{score} 玉
                </div>
              )}
              {score === 0 && (
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                  没有完成任何任务，加油！
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={startGame} style={{
                  padding: '10px 22px', background: 'rgba(100,60,20,0.4)',
                  border: '1px solid rgba(201,168,76,0.4)', borderRadius: '10px',
                  color: '#C9A84C', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}>再来一局</button>
                <button onClick={handleCollect} style={{
                  padding: '10px 22px', background: 'linear-gradient(135deg, #8B4513, #5D2D0A)',
                  border: '1px solid rgba(201,168,76,0.5)', borderRadius: '10px',
                  color: '#C9A84C', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                }}>领取奖励</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tablePulse {
          0%,100%{transform:translate(-50%,-50%) scale(1)}
          50%{transform:translate(-50%,-50%) scale(1.15)}
        }
        @keyframes feedbackFade {
          from{opacity:0;transform:translateX(-50%) translateY(-10px)}
          to{opacity:1;transform:translateX(-50%) translateY(0)}
        }
      `}</style>
    </div>
  );
}
