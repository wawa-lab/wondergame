import React from 'react';

function SkillCard({ skillKey, config, value }) {
  const percentage = Math.min(100, value);
  const level = percentage >= 90 ? '登峰造极' :
    percentage >= 70 ? '炉火纯青' :
    percentage >= 50 ? '小有所成' :
    percentage >= 30 ? '初窥门径' :
    percentage >= 10 ? '略知一二' : '尚未启蒙';

  const levelColor = percentage >= 90 ? '#FBBF24' :
    percentage >= 70 ? '#F472B6' :
    percentage >= 50 ? '#60A5FA' :
    percentage >= 30 ? '#34D399' :
    '#9CA3AF';

  return (
    <div style={{
      background: 'rgba(30, 10, 20, 0.7)',
      border: `1px solid ${config.color}30`,
      borderRadius: '14px', padding: '14px',
      transition: 'all 0.3s ease',
      position: 'relative', overflow: 'hidden'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.border = `1px solid ${config.color}60`;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 8px 24px ${config.color}20`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.border = `1px solid ${config.color}30`;
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* 背景光晕 */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: `radial-gradient(circle, ${config.color}10 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {/* 技能图标 */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: `${config.color}20`, border: `1px solid ${config.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', boxShadow: `0 4px 12px ${config.color}20`
        }}>
          {config.icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#F5E6EC' }}>
              {config.name}
            </span>
            <span style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
              background: `${levelColor}20`, color: levelColor, border: `1px solid ${levelColor}40`
            }}>
              {level}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', margin: 0 }}>
            {config.description}
          </p>
        </div>

        {/* 数值 */}
        <div style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: '24px', fontWeight: '700',
          color: config.color,
          textShadow: `0 0 12px ${config.color}40`,
          minWidth: '40px', textAlign: 'right'
        }}>
          {value}
        </div>
      </div>

      {/* 进度条 */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          height: '8px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '4px', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: `${percentage}%`,
            background: `linear-gradient(90deg, ${config.color}80, ${config.color})`,
            borderRadius: '4px',
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 8px ${config.color}60`
          }} />
        </div>
      </div>

      {/* 进度文字 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.3)' }}>0</span>
        <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.3)' }}>100</span>
      </div>
    </div>
  );
}

const EXP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export default function SkillsPanel({ character, skillConfig }) {
  const level = character.level || 1;
  const exp = character.exp || 0;
  const nextLevelExp = EXP_THRESHOLDS[level + 1] || EXP_THRESHOLDS[EXP_THRESHOLDS.length - 1];
  const currentLevelExp = EXP_THRESHOLDS[level] || 0;
  const expProgress = nextLevelExp > currentLevelExp
    ? Math.min(100, Math.round(((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100))
    : 100;
  const isMaxLevel = level >= EXP_THRESHOLDS.length - 1;

  return (
    <div>
      {/* 技能标题卡 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(120,70,200,0.15), rgba(212,81,122,0.1))',
        border: '1px solid rgba(167,139,250,0.3)', borderRadius: '16px',
        padding: '20px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <span style={{ fontSize: '48px', animation: 'float 3s ease-in-out infinite' }}>✨</span>
        <div>
          <h2 style={{
            fontSize: '22px', fontWeight: '700', margin: '0 0 4px',
            background: 'linear-gradient(135deg, #C4B5FD, #C9A84C)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            才艺素养
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,230,236,0.5)', margin: 0 }}>
            琴棋书画 · 文武双全 · 一展芳华
          </p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', minWidth: '120px' }}>
          <div style={{ fontSize: '13px', color: '#A78BFA', fontWeight: '700', marginBottom: '4px' }}>
            🏆 Lv.{level}{isMaxLevel ? ' (满级)' : ''}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginBottom: '4px' }}>
            EXP: {exp}{!isMaxLevel ? ` / ${nextLevelExp}` : ''}
          </div>
          {!isMaxLevel && (
            <>
              <div style={{ height: '4px', background: 'rgba(167,139,250,0.15)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                <div style={{ height: '100%', width: `${expProgress}%`, background: 'linear-gradient(90deg, #A78BFA, #C4B5FD)', borderRadius: '2px', transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(167,139,250,0.5)' }}>
                完成课程可获得经验值
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {Object.entries(skillConfig).map(([key, config]) => (
          <SkillCard
            key={key}
            skillKey={key}
            config={config}
            value={character.skills[key] || 0}
          />
        ))}
      </div>
    </div>
  );
}

