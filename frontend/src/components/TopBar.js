import React, { useState, useEffect, useRef } from 'react';

const SEASON_INFO = {
  spring: { icon: '🌸', label: '春', cls: 'season-badge-spring' },
  summer: { icon: '🌿', label: '夏', cls: 'season-badge-summer' },
  autumn: { icon: '🍁', label: '秋', cls: 'season-badge-autumn' },
  winter: { icon: '❄️', label: '冬', cls: 'season-badge-winter' },
};

// 数值变化时短暂高亮
function AnimatedValue({ value, color, format }) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  const display = format ? format(value) : value;
  return (
    <span style={{
      fontSize: '16px', fontWeight: '700',
      color: flash ? '#FFFFFF' : color,
      fontVariantNumeric: 'tabular-nums',
      transition: 'color 0.3s ease',
      textShadow: flash ? `0 0 12px ${color}` : 'none',
    }}>
      {display}
    </span>
  );
}

export default function TopBar({ character, onReset, onResetNpcVisits, onLogout, username }) {
  const [showMenu, setShowMenu] = useState(false);

  const levelProgress = () => {
    const thresholds = [0, 150, 350, 600, 900, 1300, 1800, 2500, 3400, 4500];
    const current = character.level;
    const next = current + 1;
    if (next >= thresholds.length) return 100;
    const start = thresholds[current];
    const end = thresholds[next];
    return Math.round(((character.exp - start) / (end - start)) * 100);
  };

  const season = character?.monthInfo?.season || 'spring';
  const monthInYear = character?.monthInfo?.monthInYear;
  const seasonInfo = SEASON_INFO[season] || SEASON_INFO.spring;
  const progress = levelProgress();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(16, 6, 12, 0.94)',
      borderBottom: '1px solid rgba(212,81,122,0.2)',
      backdropFilter: 'blur(24px)',
      padding: '0 24px',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* 古典纹样底边 */}
      <div className="topbar-ornament" />

      {/* 左侧：游戏标题 + 季节 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontSize: '28px',
          filter: 'drop-shadow(0 0 8px rgba(212,81,122,0.6))',
          animation: 'float 3s ease-in-out infinite',
          display: 'inline-block',
        }}>🌸</span>
        <div>
          <h1 style={{
            fontSize: '18px', fontWeight: '700', letterSpacing: '3px',
            background: 'linear-gradient(135deg, #F4A0C0, #C9A84C, #F4A0C0)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', margin: 0,
            animation: 'shimmer 4s linear infinite',
          }}>
            锦年如雪
          </h1>
          <p style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', margin: 0, letterSpacing: '2px' }}>
            ✦ 凌若雪的传奇人生 ✦
          </p>
        </div>
        {/* 季节徽章 */}
        <div className={`season-badge ${seasonInfo.cls}`}>
          <span>{seasonInfo.icon}</span>
          <span>{seasonInfo.label}{monthInYear ? `·${monthInYear}月` : ''}</span>
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
              fontSize: '12px', fontWeight: '700', color: 'white',
              boxShadow: '0 2px 8px rgba(212,81,122,0.35)',
            }}>
              Lv.{character.level}
            </span>
            <span style={{ color: '#F4A0C0', fontSize: '13px', fontWeight: '600' }}>
              {character.name}
            </span>
          </div>
          {/* 经验条 */}
          <div style={{
            width: '140px', height: '5px',
            background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #D4517A, #E8829A, #C9A84C)',
              borderRadius: '3px',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: progress > 10 ? '0 0 6px rgba(212,81,122,0.6)' : 'none',
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.35)', marginTop: '2px' }}>
            {(() => {
              const thresholds = [0, 150, 350, 600, 900, 1300, 1800, 2500, 3400, 4500];
              const next = character.level + 1;
              return next < thresholds.length
                ? `EXP: ${character.exp} / ${thresholds[next]}`
                : `EXP: ${character.exp} (满级)`;
            })()}
          </span>
        </div>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '40px', background: 'linear-gradient(180deg, transparent, rgba(212,81,122,0.3), transparent)' }} />

        {/* 金币 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.5))' }}>💰</span>
          <div>
            <AnimatedValue value={character.gold} color="#C9A84C" format={v => v.toLocaleString()} />
            <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.35)' }}>金币</div>
          </div>
        </div>

        {/* 玉 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}>💚</span>
          <div>
            <AnimatedValue value={character.jade} color="#34D399" />
            <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.35)' }}>玉</div>
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
              background: 'rgba(16,6,12,0.97)',
              border: '1px solid rgba(212,81,122,0.25)',
              borderRadius: '12px', padding: '8px',
              minWidth: '150px', zIndex: 999,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {/* 顶部装饰线 */}
              <div style={{
                height: '2px', marginBottom: '8px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
                borderRadius: '1px',
              }} />
              {username && (
                <div style={{ padding: '6px 14px 8px', color: 'rgba(244,160,192,0.5)', fontSize: '12px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>👤</span>
                  <span>{username}</span>
                </div>
              )}
              {[
                { label: '🔁 重置NPC记录', color: '#F6AD55', hoverBg: 'rgba(246,173,85,0.12)', onClick: () => { onResetNpcVisits?.(); setShowMenu(false); } },
                { label: '🔄 重置游戏', color: '#FC8181', hoverBg: 'rgba(239,68,68,0.12)', onClick: () => { onReset(); setShowMenu(false); } },
                { label: '🚪 退出登录', color: 'rgba(244,160,192,0.8)', hoverBg: 'rgba(212,81,122,0.12)', onClick: () => { onLogout(); setShowMenu(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    display: 'block', width: '100%', padding: '9px 14px',
                    background: 'transparent', border: 'none',
                    color: item.color, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '13px', textAlign: 'left', borderRadius: '8px',
                    transition: 'background 0.2s',
                    letterSpacing: '0.5px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
