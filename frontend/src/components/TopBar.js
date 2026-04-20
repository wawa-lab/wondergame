import React, { useState } from 'react';

export default function TopBar({ character, onReset, onLogout, username }) {
  const [showMenu, setShowMenu] = useState(false);

  const levelProgress = () => {
    const thresholds = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];
    const current = character.level;
    const next = current + 1;
    if (next >= thresholds.length) return 100;
    const start = thresholds[current];
    const end = thresholds[next];
    return Math.round(((character.exp - start) / (end - start)) * 100);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(20, 8, 15, 0.92)',
      borderBottom: '1px solid rgba(212,81,122,0.3)',
      backdropFilter: 'blur(20px)',
      padding: '0 24px',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* 左侧：游戏标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>🌸</span>
        <div>
          <h1 style={{
            fontSize: '18px', fontWeight: '700', letterSpacing: '3px',
            background: 'linear-gradient(135deg, #F4A0C0, #C9A84C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', margin: 0
          }}>
            锦年如雪
          </h1>
          <p style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', margin: 0, letterSpacing: '2px' }}>
            ✦ 凌若雪的传奇人生 ✦
          </p>
        </div>
      </div>

      {/* 中间：角色状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* 等级 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minWidth: '140px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #D4517A, #A03058)',
              borderRadius: '6px', padding: '2px 8px',
              fontSize: '12px', fontWeight: '700', color: 'white'
            }}>
              Lv.{character.level}
            </span>
            <span style={{ color: '#F4A0C0', fontSize: '13px', fontWeight: '600' }}>
              {character.name}
            </span>
          </div>
          <div style={{
            width: '140px', height: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', width: `${levelProgress()}%`,
              background: 'linear-gradient(90deg, #D4517A, #C9A84C)',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)', marginTop: '2px' }}>
            EXP: {character.exp}
          </span>
        </div>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '40px', background: 'rgba(212,81,122,0.2)' }} />

        {/* 金币 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '20px' }}>💰</span>
          <div>
            <div style={{
              fontSize: '16px', fontWeight: '700',
              color: '#C9A84C', fontVariantNumeric: 'tabular-nums'
            }}>
              {character.gold.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>金币</div>
          </div>
        </div>

        {/* 玉 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '20px' }}>💚</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#34D399' }}>
              {character.jade}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)' }}>玉</div>
          </div>
        </div>
      </div>

      {/* 右侧：功能按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <button
            className="btn-ghost"
            onClick={() => setShowMenu(!showMenu)}
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            ⚙️
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              background: 'rgba(20,8,15,0.97)',
              border: '1px solid rgba(212,81,122,0.3)',
              borderRadius: '10px', padding: '8px',
              minWidth: '140px', zIndex: 999,
              backdropFilter: 'blur(20px)'
            }}>
              {username && (
                <div style={{ padding: '8px 14px 6px', color: 'rgba(244,160,192,0.55)', fontSize: '12px', borderBottom: '1px solid rgba(212,81,122,0.15)', marginBottom: '4px' }}>
                  👤 {username}
                </div>
              )}
              <button
                onClick={() => { onReset(); setShowMenu(false); }}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  color: '#FC8181', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', textAlign: 'left', borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.15)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                🔄 重置游戏
              </button>
              <button
                onClick={() => { onLogout(); setShowMenu(false); }}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  color: 'rgba(244,160,192,0.8)', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', textAlign: 'left', borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(212,81,122,0.15)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                🚪 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

