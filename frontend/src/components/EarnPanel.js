import React, {useCallback, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import riddleBg from './pic/猜灯谜.jpg';
import culinaryBg from './pic/厨艺大赛.jpg';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

// ─────────────────────────────────────────
// 基础积分小游戏 —— 点击金币积分
// ─────────────────────────────────────────
function ClickGame({ onEarn, character }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [coins, setCoins] = useState([]);
  const [claimed, setClaimed] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const GAME_DURATION = 30; // 秒
  const REWARD_PER_POINT = 0.5; // 每分兑换金币

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setRunning(true);
    setClaimed(false);
    setCoins([]);
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const spawnCoin = useCallback((e) => {
    if (!running) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = Date.now() + Math.random();
    setCoins(prev => [...prev, { id, x, y }]);
    setScore(prev => prev + 1);
    setTimeout(() => setCoins(prev => prev.filter(c => c.id !== id)), 600);
  }, [running]);

  const claimReward = async () => {
    const reward = Math.floor(score * REWARD_PER_POINT);
    if (reward > 0) {
      await onEarn(reward, `积分小游戏得${score}分，兑换${reward}金币`);
    }
    setClaimed(true);
  };

  const pct = (timeLeft / GAME_DURATION) * 100;
  const expectedReward = Math.floor(score * REWARD_PER_POINT);

  return (
    <div style={{
      background: 'rgba(20,8,15,0.8)', borderRadius: '16px',
      border: '1px solid rgba(201,168,76,0.3)', overflow: 'hidden',
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💰</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#C9A84C' }}>
              铸币积分坊
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>
              在{GAME_DURATION}秒内尽情点击积攒金币！
            </div>
          </div>
        </div>
        <div style={{
          fontSize: '22px', fontWeight: '900', color: '#FFD060',
          textShadow: '0 0 10px rgba(201,168,76,0.6)',
        }}>
          {score} 分
        </div>
      </div>

      {/* 游戏区 */}
      <div
        ref={containerRef}
        onClick={spawnCoin}
        style={{
          position: 'relative', height: '200px',
          background: running
            ? 'linear-gradient(135deg, rgba(30,12,8,0.9), rgba(60,30,10,0.7))'
            : 'linear-gradient(135deg, rgba(15,8,12,0.95), rgba(25,10,15,0.95))',
          cursor: running ? 'pointer' : 'default',
          userSelect: 'none', overflow: 'hidden',
          transition: 'background 0.3s',
        }}
      >
        {/* 时间进度条 */}
        {running && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: 'rgba(255,255,255,0.1)',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: pct > 50 ? '#C9A84C' : pct > 25 ? '#F87040' : '#EF4444',
              transition: 'width 1s linear, background 0.3s',
            }} />
          </div>
        )}

        {/* 倒计时 */}
        {running && (
          <div style={{
            position: 'absolute', top: '12px', right: '14px',
            fontSize: '28px', fontWeight: '900',
            color: timeLeft <= 5 ? '#EF4444' : '#C9A84C',
            textShadow: '0 0 12px currentColor',
            animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none',
          }}>
            {timeLeft}s
          </div>
        )}

        {/* 飘动的金币特效 */}
        {coins.map(coin => (
          <div key={coin.id} style={{
            position: 'absolute',
            left: `${coin.x}%`, top: `${coin.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: '22px', pointerEvents: 'none',
            animation: 'floatUp 0.6s ease forwards',
            zIndex: 10,
          }}>
            💰
          </div>
        ))}

        {/* 中心提示 */}
        {!running && timeLeft === 0 && score === 0 && !claimed && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '40px', opacity: 0.3 }}>💰</span>
            <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.4)' }}>
              点击下方按钮开始游戏
            </div>
          </div>
        )}

        {/* 游戏中提示 */}
        {running && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: '13px', color: 'rgba(201,168,76,0.3)',
              textAlign: 'center', lineHeight: '1.8',
            }}>
              👆 点击此处积分！
            </div>
          </div>
        )}

        {/* 结算界面 */}
        {!running && timeLeft === 0 && (score > 0 || claimed) && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '32px' }}>🎊</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFD060' }}>
              本轮得分：{score} 分
            </div>
            <div style={{ fontSize: '13px', color: '#C9A84C' }}>
              可兑换 💰 {expectedReward} 金币
            </div>
          </div>
        )}
      </div>

      {/* 操作区 */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(201,168,76,0.15)',
      }}>
        <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)' }}>
          每2分 = 1金币 · {GAME_DURATION}秒限时
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!running && !claimed && score > 0 && (
            <button
              onClick={claimReward}
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #A07828)',
                border: 'none', borderRadius: '10px', color: 'white',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '13px', fontWeight: '600', padding: '8px 18px',
              }}
            >
              💰 领取 {expectedReward} 金币
            </button>
          )}
          <button
            onClick={startGame}
            disabled={running}
            style={{
              background: running
                ? 'rgba(100,100,100,0.3)'
                : 'linear-gradient(135deg, #D4517A, #A03058)',
              border: 'none', borderRadius: '10px', color: running ? 'rgba(255,255,255,0.3)' : 'white',
              cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              fontSize: '13px', fontWeight: '600', padding: '8px 18px',
            }}
          >
            {running ? `⏳ 游戏中...` : claimed ? '🔄 再来一局' : '▶ 开始游戏'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          to   { opacity: 0; transform: translate(-50%, calc(-50% - 40px)) scale(0.7); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────
// 猜谜活动
// ─────────────────────────────────────────
// 生成随机洗牌顺序（Fisher-Yates shuffle）
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND_SIZE = 10;      // 每轮题目数
const RIDDLE_REWARD = 3;    // 每题答对固定金币

function RiddleGame({ questions = [], character, onEarnGold, showToast }) {
  // shuffledOrder: 洗牌后的题目索引序列（100个）
  const [shuffledOrder, setShuffledOrder] = useState([]);
  // roundStart: 本轮第一题在 shuffledOrder 中的起始位置
  const [roundStart, setRoundStart] = useState(0);
  // inRound: 本轮已做题数（0-based，0~ROUND_SIZE-1 做题中，ROUND_SIZE 表示结算）
  const [inRound, setInRound] = useState(0);
  // roundCorrect: 本轮答对题数
  const [roundCorrect, setRoundCorrect] = useState(0);
  // roundResults: 本轮每题对错记录（true/false/null）
  const [roundResults, setRoundResults] = useState([]);

  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // 初始化洗牌顺序
  useEffect(() => {
    if (questions.length > 0 && shuffledOrder.length === 0) {
      setShuffledOrder(shuffleArray(questions.map((_, i) => i)));
    }
  }, [questions]);

  // 是否处于结算状态
  const isSettlement = inRound >= ROUND_SIZE;

  // 当前题目在 shuffledOrder 中的位置，超出时循环
  const orderPos = shuffledOrder.length > 0
    ? (roundStart + inRound) % shuffledOrder.length
    : 0;
  const currentIdx = shuffledOrder.length > 0 ? shuffledOrder[orderPos] : 0;
  const question = questions[currentIdx];

  const handleAnswer = async (idx) => {
    if (selected !== null || submitting || !question || isSettlement) return;
    setSelected(idx);
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/earn/riddle`, {
        questionId: question.id,
        answerIdx: idx,
      });
      const data = res.data.data;
      setResult(data);
      if (data.correct) {
        onEarnGold(data.reward, data.character);
        setRoundCorrect(prev => prev + 1);
        setRoundResults(prev => [...prev, true]);
        showToast(`🎉 回答正确！+${RIDDLE_REWARD}💰`, 'success');
      } else {
        setRoundResults(prev => [...prev, false]);
        showToast(res.data.message, 'error');
      }
    } catch (err) {
      showToast('答题失败', 'error');
    }
    setSubmitting(false);
  };

  const nextQuestion = () => {
    const next = inRound + 1;
    setInRound(next);   // 达到 ROUND_SIZE 时自动进入结算
    setSelected(null);
    setResult(null);
    setShowHint(false);
  };

  // 再来一轮：推进 roundStart，重置本轮进度
  const startNewRound = () => {
    const newStart = (roundStart + ROUND_SIZE) % shuffledOrder.length;
    // 如果下一轮起点超出了剩余题目，重新洗牌
    if (newStart + ROUND_SIZE > shuffledOrder.length) {
      setShuffledOrder(shuffleArray(questions.map((_, i) => i)));
      setRoundStart(0);
    } else {
      setRoundStart(newStart);
    }
    setInRound(0);
    setRoundCorrect(0);
    setRoundResults([]);
    setSelected(null);
    setResult(null);
    setShowHint(false);
  };

  if (!question || shuffledOrder.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(245,230,236,0.4)' }}>
        题库加载中...
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(212,81,122,0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minHeight: '520px',
      backgroundImage: `url(${riddleBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* 全屏暗色遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,2,8,0.62)', zIndex: 1 }} />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 2, padding: '18px' }}>

        {/* ══════════ 结算页面 ══════════ */}
        {isSettlement ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', paddingTop: '30px' }}>
            <span style={{ fontSize: '52px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))' }}>
              {roundCorrect >= 8 ? '🏆' : roundCorrect >= 5 ? '🎉' : '🌸'}
            </span>
            <div style={{
              fontSize: '22px', fontWeight: '900',
              background: 'linear-gradient(135deg, #FFD9A0, #FFFFFF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))',
            }}>
              本轮结束！
            </div>

            {/* 成绩卡片 */}
            <div style={{
              background: 'rgba(10,3,8,0.80)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: '16px', padding: '20px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              width: '100%', maxWidth: '280px',
            }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,220,150,0.7)' }}>答题情况</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#FFD060' }}>
                {roundCorrect} <span style={{ fontSize: '18px', color: 'rgba(255,208,96,0.6)' }}>/ {ROUND_SIZE}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(245,230,236,0.6)' }}>题答对</div>
              <div style={{
                marginTop: '6px', padding: '8px 20px',
                background: 'rgba(201,168,76,0.15)',
                borderRadius: '10px', border: '1px solid rgba(201,168,76,0.3)',
                fontSize: '15px', fontWeight: '700', color: '#C9A84C',
              }}>
                💰 本轮获得 {roundCorrect * RIDDLE_REWARD} 金币
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.35)', marginTop: '2px' }}>
                当前持有：{character?.gold || 0} 金币
              </div>
            </div>

            {/* 评语 */}
            <div style={{
              fontSize: '13px', color: 'rgba(255,220,150,0.8)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              textAlign: 'center',
            }}>
              {roundCorrect === ROUND_SIZE ? '🌟 全对！才华横溢，令人叹服！' :
               roundCorrect >= 8 ? '✨ 答对8题以上，学识渊博！' :
               roundCorrect >= 5 ? '👍 过半答对，继续努力！' :
               '💪 再接再厉，下轮再战！'}
            </div>

            <button
              onClick={startNewRound}
              style={{
                background: 'linear-gradient(135deg, #D4517A, #A03058)',
                border: 'none', borderRadius: '12px', color: 'white',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '15px', fontWeight: '700', padding: '12px 36px',
                boxShadow: '0 4px 18px rgba(212,81,122,0.6)',
                marginTop: '4px',
              }}
            >
              🔄 再来一轮
            </button>
          </div>
        ) : (
          <>
            {/* ══════════ 答题页面 ══════════ */}
            {/* 顶栏 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '26px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }}>🏮</span>
                <div>
                  <div style={{
                    fontSize: '17px', fontWeight: '800',
                    background: 'linear-gradient(135deg, #FFD9A0, #FFFFFF)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
                  }}>
                    猜谜活动
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,220,150,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                    答对得 {RIDDLE_REWARD} 金币 · 第 {inRound + 1}/{ROUND_SIZE} 题
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 本轮进度小圆点 */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {Array.from({ length: ROUND_SIZE }).map((_, i) => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: i < inRound
                        ? (roundResults[i] === true ? '#34D399' : '#F87171')  // 已答：绿=对，红=错
                        : i === inRound
                          ? '#FFD060'   // 当前题：黄色
                          : 'rgba(255,255,255,0.2)',  // 未答
                    }} />
                  ))}
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                  borderRadius: '10px', padding: '4px 12px',
                  fontSize: '12px', color: '#C9A84C',
                  border: '1px solid rgba(201,168,76,0.4)',
                  fontWeight: '700',
                }}>
                  💰 {character?.gold || 0}
                </div>
              </div>
            </div>

            {/* 题目卡片 */}
            <div style={{
              background: 'rgba(10,3,8,0.75)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(212,81,122,0.35)',
              borderRadius: '14px', padding: '16px 18px', marginBottom: '14px',
              fontSize: '15px', lineHeight: '1.8', color: '#F4E0C0', fontWeight: '500',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              <span style={{ color: '#FF7AAA', fontWeight: '800', marginRight: '6px', fontSize: '16px' }}>题：</span>
              {question.question}
            </div>

            {/* 选项 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {question.options.map((opt, idx) => {
                const correctIdx = result?.correctAnswer ?? question.answer;
                let bg = 'rgba(10,3,8,0.65)';
                let border = 'rgba(212,81,122,0.3)';
                let color = 'rgba(245,230,236,0.9)';
                const icon = String.fromCharCode(65 + idx);

                if (selected !== null) {
                  if (idx === correctIdx) {
                    bg = 'rgba(52,211,153,0.2)'; border = 'rgba(52,211,153,0.7)'; color = '#34D399';
                  } else if (idx === selected && !result?.correct) {
                    bg = 'rgba(239,68,68,0.2)'; border = 'rgba(239,68,68,0.7)'; color = '#F87171';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={selected !== null || submitting}
                    style={{
                      background: bg, border: `1.5px solid ${border}`,
                      backdropFilter: 'blur(8px)',
                      borderRadius: '10px', padding: '11px 13px',
                      cursor: selected !== null ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', color,
                      textAlign: 'left', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    }}
                    onMouseEnter={e => selected === null && (e.currentTarget.style.background = 'rgba(212,81,122,0.25)')}
                    onMouseLeave={e => selected === null && (e.currentTarget.style.background = bg)}
                  >
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                      background: selected !== null && idx === correctIdx
                        ? 'rgba(52,211,153,0.35)'
                        : 'rgba(212,81,122,0.2)',
                      border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '800',
                    }}>
                      {icon}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* 底部：提示 / 结果 / 下一题 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selected === null && !showHint && (
                  <button
                    onClick={() => setShowHint(true)}
                    style={{
                      background: 'rgba(201,168,76,0.15)', backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(201,168,76,0.4)',
                      borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '11px', color: '#FFD060',
                    }}
                  >
                    💡 提示
                  </button>
                )}
                {showHint && (
                  <div style={{
                    fontSize: '11px', color: '#FFD060',
                    background: 'rgba(201,168,76,0.15)', backdropFilter: 'blur(6px)',
                    borderRadius: '8px', padding: '6px 12px',
                    border: '1px solid rgba(201,168,76,0.4)',
                  }}>
                    💡 {question.hint}
                  </div>
                )}
                {result !== null && (
                  <div style={{
                    fontSize: '13px', fontWeight: '800',
                    color: result.correct ? '#34D399' : '#F87171',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  }}>
                    {result.correct ? `🎉 正确！+${RIDDLE_REWARD}💰` : `😔 答错了`}
                  </div>
                )}
              </div>

              {selected !== null && (
                <button
                  onClick={nextQuestion}
                  style={{
                    background: 'linear-gradient(135deg, #D4517A, #A03058)',
                    border: 'none', borderRadius: '10px', color: 'white',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '13px', fontWeight: '600', padding: '9px 20px',
                    boxShadow: '0 4px 14px rgba(212,81,122,0.5)',
                  }}
                >
                  {inRound + 1 >= ROUND_SIZE ? '查看结果 🏆' : '下一题 ▶'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 厨艺大赛小游戏 —— 依序点击食材
// ─────────────────────────────────────────
const DISHES = [
  {
    id: 'mapo_tofu', name: '麻婆豆腐',
    steps: ['豆腐切块', '热锅下油', '炒豆瓣酱', '加入豆腐', '加水炖煮', '撒葱花出锅'],
    emoji: '🍲',
  },
  {
    id: 'sweet_pork', name: '东坡肉',
    steps: ['猪肉焯水', '冷水洗净', '热锅炒糖色', '加入猪肉', '加料酒酱油', '文火慢炖'],
    emoji: '🥩',
  },
  {
    id: 'steamed_fish', name: '清蒸鱼',
    steps: ['鲜鱼处理', '鱼身打花刀', '腌制入味', '上锅蒸制', '倒掉蒸鱼水', '浇热油'],
    emoji: '🐟',
  },
];

function CulinaryGame({ character, onEarnGold, showToast }) {
  const [phase, setPhase] = useState('select'); // select | play | result
  const [selectedDish, setSelectedDish] = useState(null);
  const [stepResults, setStepResults] = useState([]);  // 每步是否正确
  const [currentStep, setCurrentStep] = useState(0);
  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canPlay = (character?.skills?.culinary || 0) >= 15;

  const startDish = (dish) => {
    // 打乱步骤顺序
    const indices = dish.steps.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setSelectedDish(dish);
    setShuffledSteps(indices);
    setStepResults([]);
    setCurrentStep(0);
    setPhase('play');
  };

  const handleStepClick = (shuffledIdx) => {
    if (stepResults[shuffledIdx] !== undefined) return; // 已选
    const realStepIdx = shuffledSteps[shuffledIdx];
    const isCorrect = realStepIdx === currentStep;
    const newResults = [...stepResults];
    newResults[shuffledIdx] = isCorrect;
    setStepResults(newResults);
    if (isCorrect) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep >= selectedDish.steps.length) {
        // 全部完成，提交
        setTimeout(() => submitResult(newResults), 500);
      }
    }
  };

  const submitResult = async (results) => {
    if (submitting) return;
    setSubmitting(true);
    const correctCount = results.filter(Boolean).length;
    const totalSteps = selectedDish.steps.length;
    try {
      const res = await axios.post(`${API_BASE}/earn/culinary`, {
        dish: selectedDish.id,
        steps: selectedDish.steps.map((_, i) => results[shuffledSteps.indexOf(i)] === true),
      });
      setResult(res.data.data);
      onEarnGold(res.data.data.reward, res.data.data.character);
      showToast(res.data.message, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || '提交失败', 'error');
    }
    setPhase('result');
    setSubmitting(false);
  };

  const giveUp = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/earn/culinary`, {
        dish: selectedDish.id,
        steps: selectedDish.steps.map((_, i) => stepResults[shuffledSteps.indexOf(i)] === true),
      });
      setResult(res.data.data);
      onEarnGold(res.data.data.reward, res.data.data.character);
    } catch (err) {}
    setPhase('result');
    setSubmitting(false);
  };

  const bgImg = culinaryBg;

  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(201,168,76,0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* 背景图区域 */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#1a0a0f' }}>
        <img
          src={bgImg}
          alt="厨艺大赛"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(10,4,8,0.85) 100%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '14px', left: '18px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>🍳</span>
          <div>
            <div style={{
              fontSize: '18px', fontWeight: '800',
              background: 'linear-gradient(135deg, #FFD9A0, #FFFFFF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              厨艺大赛
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,220,150,0.7)' }}>
              {canPlay ? '按正确顺序点击烹饪步骤！' : `厨艺值需达到15（当前：${character?.skills?.culinary || 0}）`}
            </div>
          </div>
        </div>
        {/* 需求锁 */}
        {!canPlay && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'rgba(15,5,10,0.9)', borderRadius: '14px', padding: '16px 24px',
              border: '1px solid rgba(239,68,68,0.4)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div>
              <div style={{ fontSize: '13px', color: '#F87171', fontWeight: '700' }}>
                需要厨艺值达到 15
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginTop: '4px' }}>
                当前：{character?.skills?.culinary || 0} · 去百草堂学习岐黄之道提升吧！
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 游戏内容区 */}
      <div style={{ background: 'rgba(15,5,10,0.95)', padding: '18px' }}>
        {/* 选菜阶段 */}
        {phase === 'select' && canPlay && (
          <div>
            <div style={{
              fontSize: '13px', color: 'rgba(245,230,236,0.6)', marginBottom: '12px', textAlign: 'center',
            }}>
              选择一道菜，按正确顺序完成烹饪步骤，步骤越准确奖金越高！
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {DISHES.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => startDish(dish)}
                  style={{
                    background: 'rgba(40,15,25,0.8)',
                    border: '1.5px solid rgba(201,168,76,0.3)',
                    borderRadius: '12px', padding: '14px 10px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = '1.5px solid rgba(201,168,76,0.7)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = '1.5px solid rgba(201,168,76,0.3)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{dish.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#F4E0C0' }}>
                    {dish.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>
                    {dish.steps.length}步
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 烹饪阶段 */}
        {phase === 'play' && selectedDish && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#C9A84C' }}>
                {selectedDish.emoji} {selectedDish.name} · 步骤 {currentStep}/{selectedDish.steps.length}
              </div>
              <button
                onClick={giveUp}
                disabled={submitting}
                style={{
                  background: 'rgba(100,100,100,0.3)', border: 'none', borderRadius: '8px',
                  color: 'rgba(245,230,236,0.5)', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '11px', padding: '5px 10px',
                }}
              >
                提前结束
              </button>
            </div>

            {/* 步骤进度条 */}
            <div style={{
              height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '14px',
            }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                width: `${(currentStep / selectedDish.steps.length) * 100}%`,
                background: 'linear-gradient(90deg, #C9A84C, #FFD060)',
                transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{ fontSize: '12px', color: 'rgba(245,230,236,0.5)', marginBottom: '10px' }}>
              按正确顺序点击步骤（错误点击不扣分，但会标记）：
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {shuffledSteps.map((realIdx, shuffledIdx) => {
                const stepText = selectedDish.steps[realIdx];
                const res = stepResults[shuffledIdx];
                let bg = 'rgba(40,15,25,0.8)';
                let border = 'rgba(212,81,122,0.2)';
                let color = 'rgba(245,230,236,0.8)';
                let icon = `${shuffledIdx + 1}`;

                if (res === true) { bg = 'rgba(52,211,153,0.15)'; border = 'rgba(52,211,153,0.5)'; color = '#34D399'; icon = '✓'; }
                if (res === false) { bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.4)'; color = '#F87171'; icon = '✗'; }

                return (
                  <button
                    key={shuffledIdx}
                    onClick={() => handleStepClick(shuffledIdx)}
                    disabled={res !== undefined}
                    style={{
                      background: bg, border: `1.5px solid ${border}`,
                      borderRadius: '10px', padding: '10px 12px',
                      cursor: res !== undefined ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', color,
                      textAlign: 'left', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <span style={{
                      width: '22px', height: '22px', flexShrink: 0,
                      borderRadius: '50%', border: `1px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '800',
                      background: res === true ? 'rgba(52,211,153,0.2)' : res === false ? 'rgba(239,68,68,0.2)' : 'transparent',
                    }}>
                      {icon}
                    </span>
                    {stepText}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 结果阶段 */}
        {phase === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>
              {result.rank === '状元' ? '🏆' : result.rank === '榜眼' ? '🥈' : result.rank === '探花' ? '🥉' : '🎖️'}
            </div>
            <div style={{
              fontSize: '22px', fontWeight: '900',
              background: 'linear-gradient(135deg, #FFD060, #C9A84C)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '6px',
            }}>
              {result.rank}！
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(245,230,236,0.7)', marginBottom: '6px' }}>
              得分：{result.score} 分
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#C9A84C', marginBottom: '16px' }}>
              💰 获得 {result.reward} 金币！
            </div>
            <button
              onClick={() => { setPhase('select'); setResult(null); setSelectedDish(null); }}
              style={{
                background: 'linear-gradient(135deg, #D4517A, #A03058)',
                border: 'none', borderRadius: '10px', color: 'white',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '14px', fontWeight: '600', padding: '10px 24px',
              }}
            >
              🔄 再来一道
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 愤怒的小鸟 —— 简单版弹弓射击
// ─────────────────────────────────────────
function AngryBirdsGame({ onEarn, showToast }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null); // 用 ref 存游戏状态避免闭包问题

  const [phase, setPhase] = useState('ready'); // ready | aiming | flying | result
  const [score, setScore] = useState(0);
  const [birdsLeft, setBirdsLeft] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const W = 360, H = 280;
  const SLING_X = 70, SLING_Y = 200;
  const GRAVITY = 0.25;
  const BIRD_R = 14;
  const PIG_R = 16;

  // 初始化Canvas高清像素（Retina支持）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // 物理像素 = 逻辑尺寸 × DPR，CSS显示尺寸保持逻辑尺寸（由CSS控制）
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }, []);

  // 初始化/重置游戏状态
  const initState = useCallback(() => {
    const pigs = [
      { x: 270, y: 205, r: PIG_R, hp: 1, id: 1 },
      { x: 310, y: 205, r: PIG_R, hp: 1, id: 2 },
      { x: 290, y: 172, r: PIG_R, hp: 1, id: 3 },
      { x: 330, y: 172, r: PIG_R, hp: 1, id: 4 },
    ];
    const blocks = [
      { x: 255, y: 215, w: 80, h: 14 }, // 底层横板
      { x: 275, y: 182, w: 70, h: 10 }, // 上层横板
    ];
    stateRef.current = {
      bird: null,       // 当前飞行中的小鸟 { x,y,vx,vy,trail }
      dragPos: null,    // 拖拽位置 { x, y }
      pigs,
      blocks,
      particles: [],
    };
    return { pigs, blocks };
  }, []);

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    // 高清支持：重置变换后按DPR缩放
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 背景
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#87CEEB');
    bgGrad.addColorStop(0.7, '#98D8A8');
    bgGrad.addColorStop(1, '#6BA86A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 地面
    ctx.fillStyle = '#5A9A58';
    ctx.fillRect(0, H - 38, W, 38);
    ctx.fillStyle = '#4A8A48';
    ctx.fillRect(0, H - 40, W, 4);

    // 云朵
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    [[80,40,28],[200,25,20],[310,50,18]].forEach(([cx,cy,r]) => {
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-15,cy+5,r*0.7,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+15,cy+5,r*0.7,0,Math.PI*2); ctx.fill();
    });

    // 弹弓
    ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(SLING_X-10, SLING_Y); ctx.lineTo(SLING_X-5, SLING_Y-38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SLING_X+10, SLING_Y); ctx.lineTo(SLING_X+5, SLING_Y-38); ctx.stroke();
    // 弹弓顶端小叉
    ctx.strokeStyle = '#6B3E1C'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(SLING_X-10,SLING_Y-36); ctx.lineTo(SLING_X-5,SLING_Y-42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SLING_X+10,SLING_Y-36); ctx.lineTo(SLING_X+5,SLING_Y-42); ctx.stroke();

    // 木块
    s.blocks.forEach(b => {
      ctx.fillStyle = '#C8A46A';
      ctx.strokeStyle = '#9B7040'; ctx.lineWidth = 2;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // 木纹
      ctx.strokeStyle = 'rgba(139,90,43,0.3)'; ctx.lineWidth = 1;
      for(let i=b.x+6; i<b.x+b.w; i+=8){
        ctx.beginPath(); ctx.moveTo(i,b.y); ctx.lineTo(i,b.y+b.h); ctx.stroke();
      }
    });

    // 猪猪
    s.pigs.forEach(p => {
      // 身体
      const grad = ctx.createRadialGradient(p.x-3,p.y-3,2,p.x,p.y,p.r);
      grad.addColorStop(0,'#90EE58'); grad.addColorStop(1,'#4CAF20');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#3A9010'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.stroke();
      // 眼睛
      ctx.fillStyle='white';
      ctx.beginPath(); ctx.arc(p.x-5,p.y-4,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x+5,p.y-4,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#222';
      ctx.beginPath(); ctx.arc(p.x-4,p.y-4,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x+6,p.y-4,2,0,Math.PI*2); ctx.fill();
      // 鼻子
      ctx.fillStyle='#70C030';
      ctx.beginPath(); ctx.ellipse(p.x,p.y+2,5,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#2A6010'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(p.x-2,p.y+2,1.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x+2,p.y+2,1.2,0,Math.PI*2); ctx.fill();
    });

    // 弹弓橡皮筋
    const birdPos = s.bird ? { x: s.bird.x, y: s.bird.y } :
                    s.dragPos ? s.dragPos : { x: SLING_X, y: SLING_Y-38 };
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2.5;
    if (s.dragPos || (s.bird && s.bird.fromSling)) {
      ctx.beginPath(); ctx.moveTo(SLING_X-5,SLING_Y-40); ctx.lineTo(birdPos.x,birdPos.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(SLING_X+5,SLING_Y-40); ctx.lineTo(birdPos.x,birdPos.y); ctx.stroke();
    }

    // 轨迹点
    if (s.bird && s.bird.trail) {
      s.bird.trail.forEach((t,i) => {
        ctx.fillStyle = `rgba(255,200,50,${(i/s.bird.trail.length)*0.5})`;
        ctx.beginPath(); ctx.arc(t.x,t.y,3*(i/s.bird.trail.length),0,Math.PI*2); ctx.fill();
      });
    }

    // 瞄准线（拖拽时）
    if (s.dragPos) {
      const dx = SLING_X - s.dragPos.x, dy = (SLING_Y-38) - s.dragPos.y;
      const spd = Math.sqrt(dx*dx+dy*dy) * 0.18;
      const vx = dx * 0.18, vy = dy * 0.18;
      ctx.setLineDash([4,6]); ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      let px = SLING_X, py = SLING_Y-38, pvx = vx, pvy = vy;
      ctx.moveTo(px, py);
      for(let i=0;i<25;i++){
        px+=pvx; py+=pvy; pvy+=GRAVITY;
        if(px>W||py>H) break;
        ctx.lineTo(px,py);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // 待发小鸟（在弹弓上）
    if (!s.bird) {
      const bx = s.dragPos ? s.dragPos.x : SLING_X;
      const by = s.dragPos ? s.dragPos.y : SLING_Y-38;
      drawBird(ctx, bx, by);
    }

    // 飞行中的小鸟
    if (s.bird) { drawBird(ctx, s.bird.x, s.bird.y); }

    // 粒子爆炸
    s.particles.forEach(p => {
      ctx.fillStyle = `rgba(${p.color},${p.life})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
    });

    // 备用小鸟排列
    // (已在组件state里管理)
  }, []);

  function drawBird(ctx, bx, by) {
    const grad = ctx.createRadialGradient(bx-4,by-4,2,bx,by,BIRD_R);
    grad.addColorStop(0,'#FF8C60'); grad.addColorStop(1,'#CC2200');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(bx,by,BIRD_R,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#990000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(bx,by,BIRD_R,0,Math.PI*2); ctx.stroke();
    // 眼睛
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(bx+4,by-4,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(bx+5,by-4,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(bx+5,by-3,0.8,0,Math.PI*2); ctx.fill();
    // 眉毛
    ctx.strokeStyle='#660000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(bx+1,by-7); ctx.lineTo(bx+7,by-9); ctx.stroke();
    // 嘴巴
    ctx.fillStyle='#FF6600';
    ctx.beginPath(); ctx.moveTo(bx+6,by); ctx.lineTo(bx+14,by-2); ctx.lineTo(bx+6,by+2); ctx.fill();
    // 头毛
    ctx.strokeStyle='#990000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(bx-4,by-BIRD_R); ctx.lineTo(bx-2,by-BIRD_R-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx,by-BIRD_R); ctx.lineTo(bx+1,by-BIRD_R-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+4,by-BIRD_R); ctx.lineTo(bx+5,by-BIRD_R-5); ctx.stroke();
  }

  // 游戏循环
  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s || !s.bird) { draw(); return; }
    const bird = s.bird;
    bird.trail = bird.trail || [];
    bird.trail.push({ x: bird.x, y: bird.y });
    if (bird.trail.length > 18) bird.trail.shift();
    bird.vx *= 0.998;
    bird.vy += GRAVITY;
    bird.x += bird.vx;
    bird.y += bird.vy;
    bird.fromSling = false;

    // 碰猪
    s.pigs = s.pigs.filter(pig => {
      const dx = bird.x - pig.x, dy = bird.y - pig.y;
      if (Math.sqrt(dx*dx+dy*dy) < BIRD_R + pig.r - 2) {
        // 爆炸粒子
        for(let i=0;i<12;i++){
          const a = (i/12)*Math.PI*2, spd = 2+Math.random()*3;
          s.particles.push({
            x: pig.x, y: pig.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
            r: 5+Math.random()*4, life: 1, color: '100,200,50',
          });
        }
        setScore(prev => {
          const ns = prev + 10;
          return ns;
        });
        return false;
      }
      return true;
    });

    // 碰木块 —— 弹射（简单反弹）
    s.blocks.forEach(b => {
      if (bird.x+BIRD_R > b.x && bird.x-BIRD_R < b.x+b.w &&
          bird.y+BIRD_R > b.y && bird.y-BIRD_R < b.y+b.h) {
        bird.vy = -Math.abs(bird.vy)*0.4;
        bird.vx *= 0.5;
      }
    });

    // 更新粒子
    s.particles = s.particles.filter(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=0.04;
      return p.life > 0;
    });

    // 出界或落地
    if (bird.y > H - 36 || bird.x > W + 20) {
      s.bird = null;
      const remaining = s.pigs.length;
      setBirdsLeft(prev => {
        const next = prev - 1;
        if (next <= 0 || remaining === 0) {
          // 游戏结束
          setGameOver(true);
          const finalScore = score + (remaining === 0 ? 30 : 0); // 全歼加分
          const reward = Math.floor(finalScore / 5);
          setResultMsg(`得分 ${finalScore}，可获得 ${reward} 金币`);
          setPhase('result');
        } else {
          setPhase('ready');
        }
        return next;
      });
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, score]);

  // 全歼检查
  useEffect(() => {
    if (!stateRef.current) return;
    if (stateRef.current.pigs.length === 0 && phase === 'flying') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      stateRef.current.bird = null;
      const reward = Math.floor((score + 30) / 5);
      setResultMsg(`全歼小猪！得分 ${score + 30}，获得 ${reward} 金币`);
      setPhase('result');
      setGameOver(true);
      draw();
    }
  }, [phase, score, draw]);

  const startNewGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    initState();
    setScore(0);
    setBirdsLeft(5);
    setGameOver(false);
    setClaimed(false);
    setResultMsg('');
    setPhase('ready');
    draw();
  }, [initState, draw]);

  // 初始化
  useEffect(() => {
    initState();
    const t = setTimeout(() => draw(), 50);
    return () => {
      clearTimeout(t);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initState, draw]);

  // 鼠标/触摸事件
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onMouseDown = useCallback((e) => {
    if (phase !== 'ready' || gameOver) return;
    const pos = getPos(e, canvasRef.current);
    const dx = pos.x - SLING_X, dy = pos.y - (SLING_Y - 38);
    if (Math.sqrt(dx*dx+dy*dy) < 35) {
      setIsDragging(true);
      stateRef.current.dragPos = { x: pos.x, y: pos.y };
      setPhase('aiming');
      draw();
    }
  }, [phase, gameOver, draw]);

  const onMouseMove = useCallback((e) => {
    if (!isDragging || !stateRef.current) return;
    e.preventDefault();
    const pos = getPos(e, canvasRef.current);
    // 限制拉弓范围
    const dx = pos.x - SLING_X, dy = pos.y - (SLING_Y - 38);
    const dist = Math.sqrt(dx*dx+dy*dy);
    const maxDist = 65;
    if (dist > maxDist) {
      stateRef.current.dragPos = {
        x: SLING_X + dx/dist*maxDist,
        y: (SLING_Y-38) + dy/dist*maxDist,
      };
    } else {
      stateRef.current.dragPos = { x: pos.x, y: pos.y };
    }
    draw();
  }, [isDragging, draw]);

  const onMouseUp = useCallback(() => {
    if (!isDragging || !stateRef.current || !stateRef.current.dragPos) return;
    setIsDragging(false);
    const dp = stateRef.current.dragPos;
    const dx = SLING_X - dp.x, dy = (SLING_Y-38) - dp.y;
    const speed = Math.sqrt(dx*dx+dy*dy);
    if (speed < 8) { stateRef.current.dragPos = null; setPhase('ready'); draw(); return; }
    stateRef.current.bird = {
      x: dp.x, y: dp.y,
      vx: dx * 0.18, vy: dy * 0.18,
      trail: [], fromSling: true,
    };
    stateRef.current.dragPos = null;
    setPhase('flying');
    animRef.current = requestAnimationFrame(gameLoop);
  }, [isDragging, draw, gameLoop]);

  const claimReward = async () => {
    const finalScore = score + (stateRef.current?.pigs?.length === 0 ? 30 : 0);
    const reward = Math.floor(finalScore / 5);
    if (reward > 0) {
      await onEarn(reward, `愤怒的小鸟得${finalScore}分，获得${reward}金币`);
    }
    setClaimed(true);
    showToast(`🐦 小鸟大作战！+${reward}金币`, 'success');
  };

  return (
    <div style={{
      background: 'rgba(20,8,15,0.85)', borderRadius: '16px',
      border: '1px solid rgba(100,180,100,0.35)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: '12px 18px',
        background: 'linear-gradient(135deg, rgba(80,180,80,0.15), rgba(50,120,50,0.08))',
        borderBottom: '1px solid rgba(100,180,100,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🐦</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#80D860' }}>弹弓小鸟</div>
            <div style={{ fontSize: '10px', color: 'rgba(200,240,180,0.55)' }}>拖拽小鸟瞄准射击 · 击中猪猪得金币</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFD060', textShadow: '0 0 8px rgba(255,200,50,0.6)' }}>{score}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,220,100,0.5)' }}>得分</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#FF7070' }}>{birdsLeft}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,120,100,0.5)' }}>小鸟</div>
          </div>
        </div>
      </div>

      {/* 画布区 */}
      <div style={{ position: 'relative', background: '#1A3A20' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', width: '100%', height: 'auto' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
          />
        {/* 结算蒙层 */}
        {gameOver && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{ fontSize: '40px' }}>{stateRef.current?.pigs?.length === 0 ? '🏆' : '🎯'}</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFD060' }}>游戏结束！</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,240,200,0.85)' }}>{resultMsg}</div>
          </div>
        )}
        {/* 瞄准提示 */}
        {phase === 'ready' && !gameOver && (
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '11px', color: 'rgba(255,255,255,0.6)',
            background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '3px 10px',
            pointerEvents: 'none',
          }}>
            👆 拖拽小鸟蓄力发射
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div style={{
        padding: '12px 18px', borderTop: '1px solid rgba(100,180,100,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)' }}>
          击中猪猪+10分 · 全歼奖励+30 · 每5分=1金币
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {gameOver && !claimed && (
            <button onClick={claimReward} style={{
              background: 'linear-gradient(135deg, #80D860, #4A9A30)',
              border: 'none', borderRadius: '10px', color: 'white',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', padding: '8px 16px',
            }}>
              💰 领取 {Math.floor((score + (stateRef.current?.pigs?.length === 0 ? 30 : 0)) / 5)} 金币
            </button>
          )}
          <button onClick={startNewGame} style={{
            background: 'linear-gradient(135deg, #D4517A, #A03058)',
            border: 'none', borderRadius: '10px', color: 'white',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', padding: '8px 16px',
          }}>
            {gameOver ? '🔄 再玩一局' : '↺ 重置'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 切水果 —— 简单版鼠标划线切水果
// ─────────────────────────────────────────
function FruitSlashGame({ onEarn, showToast }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const gsRef = useRef(null); // game state ref

  const [phase, setPhase] = useState('idle'); // idle | playing | result
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayTime, setDisplayTime] = useState(30);
  const [claimed, setClaimed] = useState(false);
  const [domFruits, setDomFruits] = useState([]); // DOM层水果，用于清晰emoji渲染

  const W = 760, H = 560;
  const GAME_TIME = 30;

  const FRUITS = [
    { emoji: '🍉', color: '#FF4466', pts: 3, size: 60 },
    { emoji: '🍊', color: '#FF8C00', pts: 2, size: 52 },
    { emoji: '🍎', color: '#FF2244', pts: 2, size: 48 },
    { emoji: '🍇', color: '#9B30FF', pts: 4, size: 56 },
    { emoji: '🍋', color: '#FFE030', pts: 1, size: 44 },
    { emoji: '🍓', color: '#FF3355', pts: 2, size: 44 },
    { emoji: '🥝', color: '#88CC44', pts: 3, size: 48 },
    { emoji: '💣', color: '#444', pts: -1, size: 52, bomb: true },
  ];

  const initGameState = useCallback(() => {
    gsRef.current = {
      fruits: [],
      sliceTrail: [],         // 切割轨迹
      sliceParticles: [],     // 切割粒子
      explosions: [],
      score: 0,
      lives: 3,
      timeLeft: GAME_TIME,
      lastSpawn: 0,
      spawnInterval: 550,
      gameOver: false,
      startTime: null,
      lastFrameTime: null,
      slicing: false,
    };
  }, []);

  // 生成水果
  const spawnFruit = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    const ft = FRUITS[Math.floor(Math.random() * (FRUITS.length - 1 + (gs.timeLeft < 8 ? 1 : 0)))];
    const x = 40 + Math.random() * (W - 80);
    const targetX = W/2 + (Math.random()-0.5)*160;
    const vx = (targetX - x) / 50;
    gs.fruits.push({
      id: Date.now() + Math.random(),
      x, y: H + 20,
      vx,
      vy: -(9 + Math.random() * 3),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random()-0.5) * 0.12,
      ...ft,
      halfA: null, halfB: null, sliced: false,
    });
  }, []);

  // 绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gs = gsRef.current;
    if (!gs) return;

    // 背景渐变
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0A0A18'); bg.addColorStop(1,'#1A0A28');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    // 星星背景
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    [[30,20],[90,60],[150,15],[230,45],[310,25],[400,70],[460,30],[550,50],[650,20],[720,80],[60,130],[200,100],[280,150],[380,200],[480,120],[580,160],[700,110],[120,280],[340,300],[500,250],[620,300],[740,240],[80,400],[250,420],[430,380],[600,440],[720,390],[150,500],[380,480],[560,520],[700,470]].forEach(([sx,sy])=>{
      ctx.beginPath(); ctx.arc(sx,sy,1,0,Math.PI*2); ctx.fill();
    });

    // 爆炸效果
    gs.explosions = gs.explosions.filter(e => {
      e.life -= 0.06;
      if(e.life<=0) return false;
      ctx.save();
      for(let i=0;i<8;i++){
        const a = (i/8)*Math.PI*2 + e.angle;
        const r = (1-e.life)*e.maxR;
        ctx.fillStyle = `rgba(255,120,30,${e.life*0.8})`;
        ctx.beginPath(); ctx.arc(e.x+Math.cos(a)*r, e.y+Math.sin(a)*r, 4*e.life,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
      return true;
    });

    // 水果由DOM层渲染（emoji清晰），canvas只画切面粒子
    gs.fruits.forEach(f => {
      if (f.sliced) {
        [f.halfA, f.halfB].forEach((h, hi) => {
          if (!h) return;
          ctx.save();
          ctx.globalAlpha = h.life * 0.7;
          ctx.fillStyle = hi===0 ? `${f.color}BB` : `${f.color}66`;
          ctx.beginPath();
          ctx.arc(h.x, h.y, f.size * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }
    });

    // 切割粒子
    gs.sliceParticles = gs.sliceParticles.filter(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=0.04; p.r*=0.95;
      ctx.fillStyle = `rgba(${p.color},${p.life})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      return p.life > 0;
    });

    // 切割轨迹
    if (gs.sliceTrail.length > 1) {
      ctx.shadowBlur = 0;
      for(let i=1;i<gs.sliceTrail.length;i++){
        const alpha = i/gs.sliceTrail.length;
        ctx.strokeStyle = `rgba(255,255,255,${alpha*0.9})`;
        ctx.lineWidth = 3*alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(gs.sliceTrail[i-1].x, gs.sliceTrail[i-1].y);
        ctx.lineTo(gs.sliceTrail[i].x, gs.sliceTrail[i].y);
        ctx.stroke();
      }
    }

    // UI：生命值
    for(let i=0;i<3;i++){
      ctx.font='18px serif';
      ctx.fillStyle = i<gs.lives ? '#FF4466' : 'rgba(255,255,255,0.2)';
      ctx.textAlign='left';
      ctx.fillText('❤️', 10+i*24, 22);
    }
    // UI：分数
    ctx.fillStyle='#FFD060'; ctx.font='bold 18px sans-serif'; ctx.textAlign='right';
    ctx.fillText(`${gs.score}分`, W-10, 22);
    // UI：时间条
    const timePct = gs.timeLeft / GAME_TIME;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(10, 30, W-20, 6);
    const barColor = timePct > 0.5 ? '#4AE88A' : timePct > 0.25 ? '#FFD060' : '#FF4466';
    ctx.fillStyle = barColor;
    ctx.fillRect(10, 30, (W-20)*timePct, 6);
    // 时间数字
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(`${Math.ceil(gs.timeLeft)}s`, W/2, 28);
  }, []);

  // 游戏主循环
  const gameLoop = useCallback((timestamp) => {
    const gs = gsRef.current;
    if (!gs || gs.gameOver) return;
    const dt = gs.lastFrameTime ? (timestamp - gs.lastFrameTime)/1000 : 0.016;
    gs.lastFrameTime = timestamp;
    if (!gs.startTime) gs.startTime = timestamp;

    // 时间
    gs.timeLeft = Math.max(0, GAME_TIME - (timestamp - gs.startTime)/1000);
    setDisplayTime(Math.ceil(gs.timeLeft));

    // 生成水果
    if (timestamp - gs.lastSpawn > gs.spawnInterval) {
      spawnFruit();
      gs.lastSpawn = timestamp;
      gs.spawnInterval = Math.max(280, gs.spawnInterval - 20);
    }

    // 更新水果位置
    gs.fruits = gs.fruits.filter(f => {
      if (f.sliced) {
        if (f.halfA) { f.halfA.x+=f.halfA.vx; f.halfA.y+=f.halfA.vy; f.halfA.vy+=0.3; f.halfA.rotation+=f.halfA.rotSpeed; f.halfA.life-=0.025; }
        if (f.halfB) { f.halfB.x+=f.halfB.vx; f.halfB.y+=f.halfB.vy; f.halfB.vy+=0.3; f.halfB.rotation+=f.halfB.rotSpeed; f.halfB.life-=0.025; }
        return (f.halfA?.life||0) > 0 || (f.halfB?.life||0) > 0;
      }
      f.vy += 0.14; f.x += f.vx; f.y += f.vy;
      f.rotation += f.rotSpeed;
      // 掉出屏幕
      if (f.y > H + 30) {
        return false; // 水果掉落不扣命，只计时结束
      }
      return true;
    });

    // 切割检测
    if (gs.slicing && gs.sliceTrail.length > 1) {
      const t1 = gs.sliceTrail[gs.sliceTrail.length-2];
      const t2 = gs.sliceTrail[gs.sliceTrail.length-1];
      gs.fruits.forEach(f => {
        if (f.sliced) return;
        const dx = f.x-t1.x, dy = f.y-t1.y;
        const lx = t2.x-t1.x, ly = t2.y-t1.y;
        const ll = lx*lx+ly*ly;
        const t = ll>0 ? Math.max(0,Math.min(1,(dx*lx+dy*ly)/ll)) : 0;
        const nearX = t1.x+t*lx, nearY = t1.y+t*ly;
        const dist = Math.sqrt((f.x-nearX)**2+(f.y-nearY)**2);
        if (dist < f.size*0.6) {
          f.sliced = true;
          const angle = Math.atan2(ly, lx);
          f.halfA = { x:f.x, y:f.y, vx:-2*Math.sin(angle)+f.vx*0.5, vy:2*Math.cos(angle)+f.vy*0.5, rotation:f.rotation, rotSpeed:-0.12, life:1 };
          f.halfB = { x:f.x, y:f.y, vx:2*Math.sin(angle)+f.vx*0.5,  vy:-2*Math.cos(angle)+f.vy*0.5, rotation:f.rotation, rotSpeed:0.12, life:1 };
          // 粒子
          for(let i=0;i<10;i++){
            const a=Math.random()*Math.PI*2, sp=2+Math.random()*4;
            const cStr = f.bomb ? '255,100,30' : f.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',');
            gs.sliceParticles.push({x:f.x,y:f.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5+Math.random()*4,life:1,color:cStr});
          }
          if (f.bomb) {
            gs.explosions.push({x:f.x,y:f.y,life:1,angle:Math.random()*Math.PI,maxR:50});
            gs.lives = Math.max(0, gs.lives - 1);
            setDisplayLives(gs.lives);
            if (gs.lives <= 0) { gs.gameOver=true; setPhase('result'); }
          } else {
            gs.score += f.pts;
            setDisplayScore(gs.score);
          }
        }
      });
    }

    // 时间到
    if (gs.timeLeft <= 0) { gs.gameOver = true; setPhase('result'); }

    // 切割轨迹淡出
    if (!gs.slicing) gs.sliceTrail = gs.sliceTrail.slice(-3);

    // 同步DOM水果层
    setDomFruits(gs.fruits.map(f => ({
      id: f.id,
      x: f.x, y: f.y,
      emoji: f.emoji,
      size: f.size,
      rotation: f.rotation,
      sliced: f.sliced,
      halfA: f.halfA ? { x: f.halfA.x, y: f.halfA.y, rotation: f.halfA.rotation, life: f.halfA.life } : null,
      halfB: f.halfB ? { x: f.halfB.x, y: f.halfB.y, rotation: f.halfB.rotation, life: f.halfB.life } : null,
    })));

    draw();
    if (!gs.gameOver) animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, spawnFruit]);

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    initGameState();
    setDisplayScore(0); setDisplayLives(3); setDisplayTime(GAME_TIME);
    setClaimed(false);
    setPhase('playing');
    animRef.current = requestAnimationFrame(gameLoop);
  }, [initGameState, gameLoop]);

  useEffect(() => {
    initGameState();
    const t = setTimeout(() => draw(), 50);
    return () => { clearTimeout(t); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [initGameState, draw]);

  // 鼠标事件
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W/rect.width, scaleY = H/rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x:(cx-rect.left)*scaleX, y:(cy-rect.top)*scaleY };
  };

  const onSliceStart = useCallback((e) => {
    if (!gsRef.current || gsRef.current.gameOver || phase!=='playing') return;
    e.preventDefault();
    gsRef.current.slicing = true;
    gsRef.current.sliceTrail = [getPos(e, canvasRef.current)];
  }, [phase]);

  const onSliceMove = useCallback((e) => {
    if (!gsRef.current?.slicing) return;
    e.preventDefault();
    gsRef.current.sliceTrail.push(getPos(e, canvasRef.current));
    if (gsRef.current.sliceTrail.length > 20) gsRef.current.sliceTrail.shift();
  }, []);

  const onSliceEnd = useCallback(() => {
    if (!gsRef.current) return;
    gsRef.current.slicing = false;
    gsRef.current.sliceTrail = [];
  }, []);

  const claimReward = async () => {
    const reward = Math.floor(displayScore / 3);
    if (reward > 0) await onEarn(reward, `切水果得${displayScore}分，获得${reward}金币`);
    setClaimed(true);
    showToast(`🍉 切水果达人！+${reward}金币`, 'success');
  };

  return (
    <div style={{
      background: 'rgba(10,5,20,0.9)', borderRadius: '16px',
      border: '1px solid rgba(180,100,255,0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: '12px 18px',
        background: 'linear-gradient(135deg, rgba(150,50,255,0.15), rgba(80,20,160,0.1))',
        borderBottom: '1px solid rgba(180,100,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🍉</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#CC88FF' }}>水果忍者</div>
            <div style={{ fontSize: '10px', color: 'rgba(200,150,255,0.55)' }}>划动鼠标切水果 · 别切到炸弹！</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'18px', fontWeight:'900', color:'#FFD060', textShadow:'0 0 8px rgba(255,200,50,0.6)' }}>{displayScore}</div>
            <div style={{ fontSize:'9px', color:'rgba(255,220,100,0.5)' }}>得分</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'16px' }}>{'❤️'.repeat(displayLives)}{'🖤'.repeat(Math.max(0,3-displayLives))}</div>
            <div style={{ fontSize:'9px', color:'rgba(255,120,100,0.5)' }}>生命</div>
          </div>
        </div>
      </div>

      {/* 画布 */}
      <div style={{ position:'relative' }}
        onMouseDown={onSliceStart} onMouseMove={onSliceMove} onMouseUp={onSliceEnd} onMouseLeave={onSliceEnd}
        onTouchStart={onSliceStart} onTouchMove={onSliceMove} onTouchEnd={onSliceEnd}
      >
        <canvas
          ref={canvasRef} width={W} height={H}
          style={{ width:'100%', display:'block', cursor: phase==='playing' ? 'crosshair' : 'default', touchAction:'none', userSelect:'none', pointerEvents:'none' }}
        />
        {/* DOM emoji层 —— 保证水果清晰显示 */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden',
        }}>
          {domFruits.map(f => {
            const scaleX = 100 / W; // canvas显示宽度百分比换算
            if (!f.sliced) {
              return (
                <div key={f.id} style={{
                  position:'absolute',
                  left: `${(f.x / W) * 100}%`,
                  top:  `${(f.y / H) * 100}%`,
                  transform: `translate(-50%,-50%) rotate(${f.rotation}rad)`,
                  fontSize: `${f.size * 1.4}px`,
                  lineHeight: 1,
                  userSelect:'none',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
                }}>
                  {f.emoji}
                </div>
              );
            }
            // 切开状态：两半各自用DOM显示
            return [
              f.halfA && f.halfA.life > 0 && (
                <div key={`${f.id}-a`} style={{
                  position:'absolute',
                  left: `${(f.halfA.x / W) * 100}%`,
                  top:  `${(f.halfA.y / H) * 100}%`,
                  transform: `translate(-50%,-50%) rotate(${f.halfA.rotation}rad) scaleY(-1)`,
                  fontSize: `${f.size * 1.1}px`,
                  lineHeight: 1,
                  opacity: f.halfA.life,
                  userSelect:'none',
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                }}>
                  {f.emoji}
                </div>
              ),
              f.halfB && f.halfB.life > 0 && (
                <div key={`${f.id}-b`} style={{
                  position:'absolute',
                  left: `${(f.halfB.x / W) * 100}%`,
                  top:  `${(f.halfB.y / H) * 100}%`,
                  transform: `translate(-50%,-50%) rotate(${f.halfB.rotation}rad)`,
                  fontSize: `${f.size * 1.1}px`,
                  lineHeight: 1,
                  opacity: f.halfB.life,
                  userSelect:'none',
                  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
                }}>
                  {f.emoji}
                </div>
              ),
            ];
          })}
        </div>
        {/* 开始遮罩 */}
        {phase === 'idle' && (
          <div style={{
            position:'absolute', inset:0, background:'rgba(5,2,15,0.75)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px',
          }}>
            <div style={{ fontSize:'48px' }}>🍉🍊🍎</div>
            <div style={{ fontSize:'18px', fontWeight:'900', color:'#CC88FF' }}>水果忍者</div>
            <div style={{ fontSize:'12px', color:'rgba(200,180,255,0.7)', textAlign:'center', lineHeight:'1.8' }}>
              划过水果即可切开<br/>切到💣炸弹会扣命<br/>30秒内得分越高，金币越多
            </div>
          </div>
        )}
        {/* 结算遮罩 */}
        {phase === 'result' && (
          <div style={{
            position:'absolute', inset:0, background:'rgba(5,2,15,0.8)', backdropFilter:'blur(4px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px',
          }}>
            <div style={{ fontSize:'40px' }}>{displayScore >= 30 ? '🏆' : displayScore >= 15 ? '🥈' : '🎯'}</div>
            <div style={{ fontSize:'20px', fontWeight:'900', color:'#CC88FF' }}>游戏结束！</div>
            <div style={{ fontSize:'22px', fontWeight:'900', color:'#FFD060' }}>{displayScore} 分</div>
            <div style={{ fontSize:'13px', color:'rgba(200,180,255,0.8)' }}>
              可获得 💰 {Math.floor(displayScore / 3)} 金币
            </div>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div style={{
        padding:'12px 18px', borderTop:'1px solid rgba(180,100,255,0.15)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ fontSize:'11px', color:'rgba(245,230,236,0.5)' }}>
          🍉+3 🍇+4 🍊🍎+2 🍋+1 · 每3分=1金币
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {phase === 'result' && !claimed && (
            <button onClick={claimReward} style={{
              background:'linear-gradient(135deg, #A040E0, #7020B0)',
              border:'none', borderRadius:'10px', color:'white',
              cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', padding:'8px 16px',
            }}>
              💰 领取 {Math.floor(displayScore/3)} 金币
            </button>
          )}
          <button onClick={startGame} style={{
            background:'linear-gradient(135deg, #D4517A, #A03058)',
            border:'none', borderRadius:'10px', color:'white',
            cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', padding:'8px 16px',
          }}>
            {phase === 'idle' ? '▶ 开始游戏' : '🔄 再玩一局'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 黄金矿工小游戏
// ─────────────────────────────────────────
function GoldMinerGame({ onEarn, showToast }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const gsRef     = useRef(null);

  const W = 360, H = 320;
  // 钩爪初始位置（顶部中央）
  const HOOK_X = W / 2;
  const HOOK_Y = 50;
  // 每关限时（秒）
  const LEVEL_TIME = 30;

  const [phase, setPhase]       = useState('idle');   // idle | playing | result
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime,  setDisplayTime]  = useState(LEVEL_TIME);
  const [claimed, setClaimed]   = useState(false);

  // ── 物品种类 ──
  const ITEM_TYPES = [
    { type: 'gold_big',    emoji: '🪙', color: '#FFD700', r: 26, value: 80,  weight: 3.0, label: '大金块' },
    { type: 'gold_small',  emoji: '🪙', color: '#FFD060', r: 16, value: 30,  weight: 1.5, label: '小金块' },
    { type: 'diamond',     emoji: '💎', color: '#88EEFF', r: 18, value: 120, weight: 2.0, label: '钻石'   },
    { type: 'stone_big',   emoji: '🪨', color: '#888',    r: 28, value: 5,   weight: 5.0, label: '大石头' },
    { type: 'stone_small', emoji: '🪨', color: '#AAA',    r: 16, value: 3,   weight: 2.5, label: '小石头' },
    { type: 'bag',         emoji: '💰', color: '#C9A84C', r: 20, value: 60,  weight: 2.2, label: '钱袋'   },
  ];

  // ── 初始化关卡物品 ──
  const initItems = useCallback(() => {
    const items = [];
    const rows = [
      { y: 140, count: 4 },
      { y: 200, count: 5 },
      { y: 260, count: 4 },
    ];
    let id = 0;
    rows.forEach(row => {
      const xStep = W / (row.count + 1);
      for (let i = 0; i < row.count; i++) {
        const tIdx = Math.floor(Math.random() * ITEM_TYPES.length);
        const tmpl = ITEM_TYPES[tIdx];
        items.push({
          id: id++,
          x: xStep * (i + 1) + (Math.random() - 0.5) * 30,
          y: row.y + (Math.random() - 0.5) * 20,
          ...tmpl,
          grabbed: false,
        });
      }
    });
    return items;
  }, []);

  // ── 初始化游戏状态 ──
  const initState = useCallback(() => {
    gsRef.current = {
      hook: {
        x: HOOK_X,
        y: HOOK_Y,
        angle: 0,           // 当前摆动角度（弧度）
        angleDir: 1,        // 摆动方向
        ropeLen: 0,         // 绳子伸出长度（0 = 收回）
        state: 'swing',     // swing | extend | retract
        speed: 0.022,       // 摆速
        extSpeed: 3.5,      // 伸出速度
        item: null,         // 抓到的物品
      },
      items: initItems(),
      score: 0,
      timeLeft: LEVEL_TIME,
      startTime: null,
      gameOver: false,
      particles: [],
      floatTexts: [],       // 飘字 +80 之类
    };
  }, [initItems]);

  // ── 绘制 ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gs = gsRef.current;
    if (!gs) return;
    const { hook, items } = gs;

    // 天空到地面渐变
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#1A0D3A');
    bg.addColorStop(0.3, '#2A1A50');
    bg.addColorStop(1,   '#4A2A10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 地层横线（装饰）
    [130, 185, 245].forEach((ly, i) => {
      ctx.strokeStyle = `rgba(160,120,60,${0.2 + i * 0.05})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    });
    ctx.setLineDash([]);

    // 顶部矿车平台
    ctx.fillStyle = '#4A3018';
    ctx.fillRect(0, 0, W, HOOK_Y + 10);
    ctx.fillStyle = '#6A4A28';
    ctx.fillRect(0, HOOK_Y + 8, W, 4);
    // 平台星星点缀
    ctx.fillStyle = 'rgba(255,220,100,0.6)';
    [[30,20],[100,15],[260,25],[330,18]].forEach(([sx,sy])=>{
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill();
    });

    // 钩爪滑轮
    ctx.fillStyle = '#8B6030';
    ctx.strokeStyle = '#FFD060'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(HOOK_X, HOOK_Y, 10, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFD060';
    ctx.beginPath(); ctx.arc(HOOK_X, HOOK_Y, 4, 0, Math.PI*2); ctx.fill();

    // 绳子终点（钩爪头部）
    const ropeEndX = HOOK_X + Math.sin(hook.angle) * (HOOK_Y + hook.ropeLen);
    const ropeEndY = HOOK_Y + Math.cos(hook.angle) * (HOOK_Y + hook.ropeLen);

    // 绳子
    ctx.strokeStyle = '#D4A860';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(HOOK_X, HOOK_Y);
    ctx.lineTo(ropeEndX, ropeEndY);
    ctx.stroke();

    // 物品
    items.forEach(item => {
      if (item.grabbed) return;
      ctx.save();
      ctx.translate(item.x, item.y);
      // 光晕
      const glow = ctx.createRadialGradient(0, 0, item.r * 0.3, 0, 0, item.r * 1.6);
      glow.addColorStop(0, item.color + '55');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, item.r * 1.6, 0, Math.PI*2); ctx.fill();
      // 主体
      const grad = ctx.createRadialGradient(-item.r*0.3, -item.r*0.3, 1, 0, 0, item.r);
      grad.addColorStop(0, item.color + 'FF');
      grad.addColorStop(1, item.color + '88');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, item.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = item.color; ctx.lineWidth = 1.5;
      ctx.stroke();
      // emoji
      ctx.font = `${item.r * 1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(item.emoji, 0, 1);
      ctx.restore();
    });

    // 抓到的物品（随钩爪移动）
    if (hook.item) {
      const it = hook.item;
      ctx.save();
      ctx.translate(ropeEndX, ropeEndY + it.r + 4);
      const grad = ctx.createRadialGradient(-it.r*0.3, -it.r*0.3, 1, 0, 0, it.r);
      grad.addColorStop(0, it.color + 'FF');
      grad.addColorStop(1, it.color + '88');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = it.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `${it.r * 1.1}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white'; ctx.fillText(it.emoji, 0, 1);
      ctx.restore();
    }

    // 钩爪头
    ctx.save();
    ctx.translate(ropeEndX, ropeEndY);
    ctx.rotate(hook.angle);
    ctx.strokeStyle = '#FFD060'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    // 两个钩齿
    [[-5, 0], [5, 0]].forEach(([ox]) => {
      ctx.beginPath();
      ctx.moveTo(ox, 0);
      ctx.lineTo(ox - 4, 10);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.restore();

    // 粒子
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.035;
      ctx.fillStyle = `rgba(${p.color},${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2); ctx.fill();
      return p.life > 0;
    });

    // 飘字
    gs.floatTexts = gs.floatTexts.filter(ft => {
      ft.y -= 1.2; ft.life -= 0.025;
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      return ft.life > 0;
    });

    // 时间进度条
    const timePct = gs.timeLeft / LEVEL_TIME;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(10, H - 16, W - 20, 8);
    ctx.fillStyle = timePct > 0.5 ? '#4AE88A' : timePct > 0.25 ? '#FFD060' : '#FF4466';
    ctx.fillRect(10, H - 16, (W - 20) * timePct, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(10, H - 16, W - 20, 8);
    // 时间文字
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(gs.timeLeft)}s`, W / 2, H - 20);
  }, []);

  // ── 游戏主循环 ──
  const gameLoop = useCallback((timestamp) => {
    const gs = gsRef.current;
    if (!gs || gs.gameOver) return;
    if (!gs.startTime) gs.startTime = timestamp;

    gs.timeLeft = Math.max(0, LEVEL_TIME - (timestamp - gs.startTime) / 1000);
    setDisplayTime(Math.ceil(gs.timeLeft));

    const hook = gs.hook;

    if (hook.state === 'swing') {
      // 摆动
      hook.angle += hook.speed * hook.angleDir;
      const MAX_ANGLE = Math.PI * 0.55;
      if (hook.angle > MAX_ANGLE)  { hook.angle = MAX_ANGLE;  hook.angleDir = -1; }
      if (hook.angle < -MAX_ANGLE) { hook.angle = -MAX_ANGLE; hook.angleDir = 1; }
    } else if (hook.state === 'extend') {
      // 伸出
      const speed = hook.item ? Math.max(0.8, hook.extSpeed / (hook.item.weight || 1)) : hook.extSpeed;
      hook.ropeLen += speed;

      const ropeEndX = HOOK_X + Math.sin(hook.angle) * (HOOK_Y + hook.ropeLen);
      const ropeEndY = HOOK_Y + Math.cos(hook.angle) * (HOOK_Y + hook.ropeLen);

      // 检测碰撞（只在未抓东西时）
      if (!hook.item) {
        for (const item of gs.items) {
          if (item.grabbed) continue;
          const dx = ropeEndX - item.x, dy = ropeEndY - item.y;
          if (Math.sqrt(dx*dx + dy*dy) < item.r + 8) {
            hook.item = item;
            item.grabbed = true;
            hook.state = 'retract';
            // 抓中粒子
            for (let i = 0; i < 10; i++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 3;
              const rgb = item.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',');
              gs.particles.push({ x: item.x, y: item.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, r: 5+Math.random()*4, life: 1, color: rgb });
            }
            break;
          }
        }
      }

      // 碰到底部 → 回收
      if (ropeEndY > H - 20 || ropeEndX < 0 || ropeEndX > W) {
        hook.state = 'retract';
      }
    } else if (hook.state === 'retract') {
      // 回收
      const speed = hook.item ? Math.max(1.0, hook.extSpeed * 0.7 / (hook.item.weight || 1)) : hook.extSpeed * 1.5;
      hook.ropeLen -= speed;
      if (hook.ropeLen <= 0) {
        hook.ropeLen = 0;
        // 收回时结算得分
        if (hook.item) {
          const earned = hook.item.value;
          gs.score += earned;
          setDisplayScore(gs.score);
          // 飘字
          gs.floatTexts.push({ x: HOOK_X, y: HOOK_Y + 20, text: `+${earned}`, color: '#FFD060', life: 1 });
          hook.item = null;
        }
        hook.state = 'swing';
      }
    }

    // 时间到
    if (gs.timeLeft <= 0) {
      gs.gameOver = true;
      setPhase('result');
    }

    draw();
    if (!gs.gameOver) animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  // ── 发射钩爪（空格 / 点击） ──
  const fireHook = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || gs.gameOver) return;
    if (gs.hook.state === 'swing') {
      gs.hook.state = 'extend';
    }
  }, []);

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    initState();
    setDisplayScore(0);
    setDisplayTime(LEVEL_TIME);
    setClaimed(false);
    setPhase('playing');
    animRef.current = requestAnimationFrame(gameLoop);
  }, [initState, gameLoop]);

  // 键盘监听（空格发射）
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && phase === 'playing') {
        e.preventDefault();
        fireHook();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, fireHook]);

  useEffect(() => {
    initState();
    const t = setTimeout(() => draw(), 50);
    return () => {
      clearTimeout(t);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initState, draw]);

  const claimReward = async () => {
    if (claimed) return;
    const reward = Math.floor(displayScore / 4);
    if (reward > 0) {
      await onEarn(reward, `黄金矿工挖矿得${displayScore}分，兑换${reward}金币`);
    }
    setClaimed(true);
    showToast(`⛏️ 矿工大丰收！+${reward}金币`, 'success');
  };

  // 积分转金币换算
  const rewardPreview = Math.floor(displayScore / 4);

  return (
    <div style={{
      background: 'rgba(15,8,20,0.9)', borderRadius: '16px',
      border: '1px solid rgba(201,168,76,0.35)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: '12px 18px',
        background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(120,80,20,0.1))',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>⛏️</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFD060' }}>黄金矿工</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,220,100,0.5)' }}>
              点击画面 / 按空格发射钩爪 · 抓取金矿兑换金币！
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFD060', textShadow: '0 0 8px rgba(255,200,50,0.5)' }}>
              {displayScore}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,220,100,0.5)' }}>积分</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#34D399' }}>{displayTime}s</div>
            <div style={{ fontSize: '9px', color: 'rgba(100,220,180,0.5)' }}>剩余</div>
          </div>
        </div>
      </div>

      {/* 画布区 */}
      <div style={{ position: 'relative' }} onClick={phase === 'playing' ? fireHook : undefined}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{
            display: 'block', width: '100%',
            cursor: phase === 'playing' ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        />

        {/* 开始遮罩 */}
        {phase === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(5,2,15,0.78)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <div style={{ fontSize: '44px', filter: 'drop-shadow(0 4px 12px rgba(255,200,50,0.6))' }}>⛏️</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#FFD060' }}>黄金矿工</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,220,150,0.7)', textAlign: 'center', lineHeight: '1.8' }}>
              点击画面或按空格发射钩爪<br/>
              💎 钻石 +120 &nbsp;🪙 大金块 +80<br/>
              💰 钱袋 +60 &nbsp;🪙 小金块 +30<br/>
              每4积分=1金币
            </div>
          </div>
        )}

        {/* 结算遮罩 */}
        {phase === 'result' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(5,2,15,0.82)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{ fontSize: '40px' }}>
              {displayScore >= 300 ? '🏆' : displayScore >= 150 ? '🥈' : '⛏️'}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFD060' }}>矿工收工！</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#FFD060' }}>
              {displayScore} <span style={{ fontSize: '14px', color: 'rgba(255,208,96,0.6)' }}>积分</span>
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,220,150,0.8)' }}>
              可兑换 💰 {rewardPreview} 金币
            </div>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div style={{
        padding: '12px 18px', borderTop: '1px solid rgba(201,168,76,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.45)', lineHeight: '1.6' }}>
          💎+120 &nbsp;🪙大+80 &nbsp;💰+60 &nbsp;🪙小+30<br/>
          🪨重物减速 · 每4分=1金币
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {phase === 'result' && !claimed && (
            <button
              onClick={claimReward}
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #A07828)',
                border: 'none', borderRadius: '10px', color: 'white',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', padding: '8px 16px',
                boxShadow: '0 4px 12px rgba(201,168,76,0.4)',
              }}
            >
              💰 领取 {rewardPreview} 金币
            </button>
          )}
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(135deg, #D4517A, #A03058)',
              border: 'none', borderRadius: '10px', color: 'white',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', padding: '8px 16px',
              boxShadow: '0 4px 12px rgba(212,81,122,0.4)',
            }}
          >
            {phase === 'idle' ? '▶ 开始挖矿' : '🔄 再挖一次'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 主组件：赚钱面板
// ─────────────────────────────────────────
export default function EarnPanel({ character, earnActivities = [], onCharacterUpdate, showToast, fruitNinjaOnly = false, onFruitNinjaClose }) {
  const [activeGame, setActiveGame] = useState('click'); // click | riddle | culinary
  const [riddleQuestions, setRiddleQuestions] = useState([]);

  // 加载猜谜题目
  useEffect(() => {
    axios.get(`${API_BASE}/earn`).then(res => {
      setRiddleQuestions(res.data.data?.riddleQuestions || []);
    }).catch(() => {});
  }, []);

  const handleEarnGold = useCallback(async (amount, charData) => {
    if (charData) {
      onCharacterUpdate(charData);
    } else {
      // 直接调 API 更新
      try {
        const charRes = await axios.get(`${API_BASE}/character`);
        onCharacterUpdate(charRes.data.data);
      } catch {}
    }
  }, [onCharacterUpdate]);

  const NPC_OBSERVER_LINES = React.useMemo(() => ({
    miner: [
      '王文玉路过，瞥了一眼你的操作，轻笑道：「手挺稳的，做生意不错。」',
      '司徒仟停下脚步，若有所思地说：「这种专注的眼神……值得入画。」',
    ],
    birds: [
      '幕风公子探头看了看，点头道：「准头不错，比我草原上的弓箭手差不了多少。」',
      '宇文拓从旁经过，淡淡说：「臂力和判断力都有，可以练练真功夫。」',
    ],
    fruit: [
      '沐风靠在门边，悠悠道：「这反应速度，在沙漠里活得下去。」',
      '幕风公子鼓了鼓掌：「爽快！」',
    ],
    riddle: [
      '司徒仟微微颔首：「博闻强识，不愧是将军府的千金。」',
      '王文玉含笑：「这道题我也答对了——看来咱们想法相近。」',
    ],
    culinary: [
      '沐风凑过来闻了闻：「香，比驿站的饭好多了。」',
      '客栈老板探头：「姑娘这手艺，来我店里掌勺，月钱翻倍！」',
    ],
    click: [
      '路过的小贩好奇地看着你：「姑娘，你这手气真好！」',
    ],
  }), []);

  const handleClickEarn = React.useCallback(async (reward, logText) => {
    // NPC 观看台词（20%概率）
    if (Math.random() < 0.2) {
      const gameKey = activeGame in NPC_OBSERVER_LINES ? activeGame : 'click';
      const lines = NPC_OBSERVER_LINES[gameKey];
      const line = lines[Math.floor(Math.random() * lines.length)];
      setTimeout(() => showToast(`💬 ${line}`, 'info'), 800);
    }
    try {
      const res = await axios.post(`${API_BASE}/earn/claim`, { amount: reward, source: logText });
      onCharacterUpdate(res.data.data.character);
      showToast(`💰 积分兑换成功！+${reward}金币`, 'success');
    } catch (err) {
      onCharacterUpdate(prev => ({ ...prev, gold: (prev?.gold || 0) + reward }));
      showToast(`💰 积分兑换成功！+${reward}金币`, 'success');
    }
  }, [activeGame, NPC_OBSERVER_LINES, onCharacterUpdate, showToast]);

  // 水果忍者独立模式（街道场景触发）
  if (fruitNinjaOnly) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <button
          onClick={onFruitNinjaClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px 16px', color: 'white', fontSize: '14px', cursor: 'pointer', zIndex: 10 }}
        >
          关闭
        </button>
        <FruitSlashGame onEarn={handleClickEarn} showToast={showToast} />
      </div>
    );
  }

  const tabs = [
    { id: 'click',    label: '积分坊',   emoji: '💰' },
    { id: 'miner',    label: '黄金矿工', emoji: '⛏️' },
    { id: 'birds',    label: '弹弓小鸟', emoji: '🐦' },
    { id: 'fruit',    label: '水果忍者', emoji: '🍉' },
    { id: 'riddle',   label: '猜谜',     emoji: '🏮' },
    { id: 'culinary', label: '厨艺赛',   emoji: '🍳' },
  ];

  return (
    <div>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🪙</span>
        <div>
          <h2 style={{
            fontSize: '20px', fontWeight: '800', margin: 0,
            background: 'linear-gradient(135deg, #FFD060, #C9A84C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            赚钱
          </h2>
          <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginTop: '2px' }}>
            通过各类活动赢取金币 · 当前：{character?.gold || 0} 💰
          </div>
        </div>
      </div>

      {/* 子 Tab */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'rgba(40,15,25,0.6)', borderRadius: '12px', padding: '4px',
        border: '1px solid rgba(201,168,76,0.2)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveGame(tab.id)}
            style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
              fontWeight: '600', letterSpacing: '0.5px', transition: 'all 0.3s ease',
              background: activeGame === tab.id
                ? 'linear-gradient(135deg, #C9A84C, #A07828)'
                : 'transparent',
              color: activeGame === tab.id ? 'white' : 'rgba(245,230,236,0.55)',
              boxShadow: activeGame === tab.id ? '0 4px 12px rgba(201,168,76,0.3)' : 'none',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      {activeGame === 'click' && (
        <ClickGame onEarn={handleClickEarn} character={character} />
      )}
      {activeGame === 'miner' && (
        <GoldMinerGame onEarn={handleClickEarn} showToast={showToast} />
      )}
      {activeGame === 'birds' && (
        <AngryBirdsGame onEarn={handleClickEarn} showToast={showToast} />
      )}
      {activeGame === 'fruit' && (
        <FruitSlashGame onEarn={handleClickEarn} showToast={showToast} />
      )}
      {activeGame === 'riddle' && (
        <RiddleGame
          questions={riddleQuestions}
          character={character}
          onEarnGold={handleEarnGold}
          showToast={showToast}
        />
      )}
      {activeGame === 'culinary' && (
        <CulinaryGame
          character={character}
          onEarnGold={handleEarnGold}
          showToast={showToast}
        />
      )}
    </div>
  );
}

