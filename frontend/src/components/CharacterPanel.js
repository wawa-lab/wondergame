import React, {useEffect, useState} from 'react';

const RARITY_COLORS = {
  common: '#9CA3AF', uncommon: '#34D399', rare: '#60A5FA',
  epic: '#A78BFA', legendary: '#FBBF24'
};
const RARITY_NAMES = {
  common: '普通', uncommon: '优良', rare: '稀有', epic: '史诗', legendary: '传说'
};

const SEASON_LABELS = {
  spring: '🌸春季', summer: '🌿夏季', autumn: '🍁秋季', winter: '❄️冬季', all: '✨四季'
};

// 年龄对应主题色
const AGE_THEME = {
  15: { color: '#FFB7C5', glow: '#FFB7C520', label: '豆蔻年华', icon: '🌸' },
  16: { color: '#E74C3C', glow: '#E74C3C20', label: '妙龄佳人', icon: '🌺' },
  17: { color: '#8E44AD', glow: '#8E44AD20', label: '芳华绽放', icon: '🌿' },
  18: { color: '#C9A84C', glow: '#C9A84C20', label: '命运终章', icon: '👑' },
};

/**
 * 角色形象展示区
 */
function CharacterDisplay({ character, gameConfig }) {
  const [swapKey, setSwapKey] = useState(0);
  const [outfitLoaded, setOutfitLoaded] = useState(true);
  const [imgError, setImgError] = useState(false);
  const prevDressRef = React.useRef(null);

  const wardrobe = gameConfig?.wardrobe;
  const currentDressId = character.currentOutfit?.dress;

  const dress = wardrobe?.dresses?.find(d => d.id === currentDressId);

  const outfitSrc = dress?.image ? `${dress.image}?v=${swapKey}` : null;

  const dressColor = dress?.color || '#D4517A';
  const theme = {
    glow: `${dressColor}70`,
    bg: `${dressColor}22`,
  };

  useEffect(() => {
    if (prevDressRef.current !== null && prevDressRef.current !== currentDressId) {
      setOutfitLoaded(false);
      setImgError(false);
      setSwapKey(k => k + 1);
    }
    prevDressRef.current = currentDressId;
  }, [currentDressId]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 12px 16px',
      background: `linear-gradient(180deg, ${theme.bg} 0%, transparent 80%)`,
      borderRadius: '16px',
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.6s ease'
    }}>
      {/* 背景光晕 */}
      <div style={{
        position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
        width: '160px', height: '160px', borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
        filter: 'blur(28px)',
        pointerEvents: 'none',
        transition: 'background 0.6s ease'
      }} />

      {/* 传说级光环 */}
      {dress?.rarity === 'legendary' && (
        <>
          <div style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '200px', borderRadius: '50%',
            border: '1px solid rgba(255,215,0,0.35)',
            animation: 'float 4s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)',
            width: '170px', height: '170px', borderRadius: '50%',
            border: '1px solid rgba(255,215,0,0.2)',
            animation: 'float 3s ease-in-out infinite reverse'
          }} />
        </>
      )}

      {/* 称号 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,81,122,0.2), rgba(201,168,76,0.15))',
        border: '1px solid rgba(212,81,122,0.35)',
        borderRadius: '20px', padding: '4px 14px', marginBottom: '14px',
        fontSize: '11px', color: '#F4A0C0', letterSpacing: '2px',
        position: 'relative', zIndex: 2
      }}>
        ✦ {character.title} ✦
      </div>

      {/* 角色图片展示区 */}
      <div style={{
        position: 'relative',
        width: '160px',
        height: '215px',
        marginBottom: '14px',
        animation: 'float 3s ease-in-out infinite'
      }}>
        {outfitSrc && !imgError ? (
          <img
            key={`${currentDressId}-${swapKey}`}
            src={outfitSrc}
            alt={dress?.name || '凌若雪'}
            onLoad={() => setOutfitLoaded(true)}
            onError={() => { setImgError(true); setOutfitLoaded(true); }}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              opacity: outfitLoaded ? 1 : 0,
              animation: outfitLoaded ? 'outfitSwap 0.55s ease forwards' : 'none',
              filter: dress?.rarity === 'legendary'
                ? 'drop-shadow(0 6px 22px rgba(255,215,0,0.45))'
                : dress?.rarity === 'epic'
                ? 'drop-shadow(0 4px 16px rgba(167,139,250,0.4))'
                : 'drop-shadow(0 3px 12px rgba(0,0,0,0.28))',
              transition: 'opacity 0.3s ease',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '72px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>
              {dress?.emoji || '👗'}
            </span>
            <div style={{
              fontSize: '11px', color: dressColor,
              background: `${dressColor}20`,
              borderRadius: '8px', padding: '3px 10px',
              border: `1px solid ${dressColor}40`
            }}>
              {dress?.name || ''}
            </div>
          </div>
        )}

        {/* 飘散装饰粒子 */}
        {['🌸', '✨', '🌺'].map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: i === 0 ? '-22px' : i === 1 ? '148px' : '-18px',
            top: i === 0 ? '20px'  : i === 1 ? '55px'  : '108px',
            fontSize: '12px',
            animation: `float ${2.2 + i * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
            opacity: 0.6, pointerEvents: 'none', zIndex: 5
          }}>
            {p}
          </div>
        ))}
      </div>

      {/* 角色名 */}
      <h2 style={{
        fontSize: '22px', fontWeight: '700', marginBottom: '3px',
        background: 'linear-gradient(135deg, #F4A0C0, #FFCCE0)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', position: 'relative', zIndex: 2
      }}>
        {character.name}
      </h2>
      <p style={{
        fontSize: '11px', color: 'rgba(245,230,236,0.45)', letterSpacing: '2px',
        position: 'relative', zIndex: 2
      }}>
        {character.description.slice(0, 14)}…
      </p>

      {/* 当前套装信息 */}
      {dress && (
        <div style={{
          marginTop: '14px', padding: '10px 12px', width: '100%',
          background: 'rgba(0,0,0,0.22)', borderRadius: '12px',
          border: `1px solid ${dressColor}38`,
          position: 'relative', zIndex: 2,
          transition: 'border-color 0.5s ease'
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)', marginBottom: '8px', letterSpacing: '2px' }}>
            当前套装
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {dress.image ? (
              <img
                src={dress.image}
                alt={dress.name}
                onError={e => { e.target.style.display = 'none'; }}
                style={{
                  width: '32px', height: '42px',
                  objectFit: 'cover', objectPosition: 'center top',
                  borderRadius: '6px', flexShrink: 0,
                  border: `1px solid ${RARITY_COLORS[dress.rarity]}40`
                }}
              />
            ) : (
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{dress.emoji}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#F4A0C0', fontWeight: '600' }}>
                {dress.name}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(245,230,236,0.35)' }}>
                {SEASON_LABELS[dress.season] || '✨四季'}
              </div>
              {dress.subtitle && (
                <div style={{ fontSize: '10px', color: '#C9A84C', marginTop: '2px' }}>
                  {dress.subtitle}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '5px', flexShrink: 0,
              color: RARITY_COLORS[dress.rarity],
              background: `${RARITY_COLORS[dress.rarity]}18`,
              border: `1px solid ${RARITY_COLORS[dress.rarity]}35`
            }}>
              {RARITY_NAMES[dress.rarity]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 年龄与时间进度区 ====================
function AgeProgressPanel({ character, ageStatus }) {
  const age = character?.age || 15;
  const ageTheme = AGE_THEME[age] || AGE_THEME[15];
  const progress = ageStatus?.ageProgress || 0;
  const totalSkill = ageStatus?.totalSkill || Object.values(character?.skills || {}).reduce((a, b) => a + b, 0);
  const requiredSkill = ageStatus?.requiredTotalSkill || 220;
  const nextAge = ageStatus?.nextAge;
  const elapsedMinutes = ageStatus?.elapsedMinutes || 0;

  // 月份信息：优先从 character.monthInfo 读取，否则从 character.gameMonth 计算
  // 游戏总时长预估（35分钟中轴）
  const TOTAL_MINUTES = 35;
  const timeProgress = Math.min(100, Math.round((elapsedMinutes / TOTAL_MINUTES) * 100));

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* 年龄徽章 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px'
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: `linear-gradient(135deg, ${ageTheme.color}30, ${ageTheme.color}15)`,
          border: `2px solid ${ageTheme.color}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
          boxShadow: `0 0 15px ${ageTheme.glow}`,
        }}>
          {ageTheme.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontSize: '26px', fontWeight: '800',
              background: `linear-gradient(135deg, ${ageTheme.color}, #FFCCE0)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              lineHeight: 1,
            }}>
              {age}
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(245,230,236,0.5)' }}>岁</span>
          </div>
          <div style={{ fontSize: '11px', color: ageTheme.color, fontWeight: '600', marginTop: '2px' }}>
            {ageTheme.label}
          </div>
        </div>
      </div>

      {/* 成长进度条 */}
      {nextAge && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '6px'
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.45)', letterSpacing: '1px' }}>
              成长进度 → {nextAge}岁
            </span>
            <span style={{ fontSize: '10px', color: ageTheme.color, fontWeight: '700' }}>
              {totalSkill}/{requiredSkill}
            </span>
          </div>
          <div style={{
            height: '8px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${ageTheme.color}, ${ageTheme.color}AA)`,
              transition: 'width 0.8s ease',
              boxShadow: `0 0 8px ${ageTheme.color}60`,
              position: 'relative',
            }}>
              {/* 进度条流光 */}
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '20px',
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4))`,
                animation: progress > 0 ? 'slideRight 2s linear infinite' : 'none',
              }} />
            </div>
          </div>
          <div style={{
            fontSize: '9px', color: 'rgba(245,230,236,0.3)',
            marginTop: '3px', textAlign: 'right'
          }}>
            {progress}%
          </div>
        </div>
      )}

      {/* 游戏时间进度（总时长 35 分钟） */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '6px'
        }}>
          <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.4)', letterSpacing: '1px' }}>
            ⏱ 游戏时长
          </span>
          <span style={{ fontSize: '10px', color: '#C9A84C' }}>
            {elapsedMinutes}分钟
          </span>
        </div>
        <div style={{
          height: '5px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${timeProgress}%`,
            background: 'linear-gradient(90deg, #C9A84C, #FBBF24)',
            transition: 'width 1s ease',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '9px', color: 'rgba(245,230,236,0.25)', marginTop: '3px'
        }}>
          <span>开始</span>
          <span>~35分钟</span>
          <span>🏆大结局</span>
        </div>
      </div>

      {/* 已解锁剧情节点 */}
      {ageStatus?.unlockedStoryNodes?.length > 0 && (
        <div style={{
          marginTop: '10px',
          fontSize: '10px', color: 'rgba(245,230,236,0.35)',
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <span>✦</span>
          <span>已解锁 {ageStatus.unlockedStoryNodes.length} 个剧情节点</span>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes slideRight {
          from { transform: translateX(-20px); }
          to   { transform: translateX(20px); }
        }
      `}</style>
    </div>
  );
}

// 核心技能迷你展示
function MiniSkills({ skills }) {
  const topSkills = [
    { key: 'charm',    name: '魅力', color: '#DB2777', icon: '💕' },
    { key: 'wisdom',   name: '才学', color: '#2563EB', icon: '📚' },
    { key: 'affinity', name: '亲和', color: '#059669', icon: '💚' },
    { key: 'spirit',   name: '灵气', color: '#7C3AED', icon: '✨' },
  ];

  return (
    <div style={{ padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(212,81,122,0.2)' }} />
        <span style={{ fontSize: '11px', color: '#C9A84C', letterSpacing: '2px' }}>核心素养</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(212,81,122,0.2)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {topSkills.map(({ key, name, color, icon }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(245,230,236,0.7)' }}>
                {icon} {name}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color }}>{skills[key] || 0}</span>
            </div>
            <div className="skill-bar">
              <div className="skill-bar-fill"
                style={{ width: `${Math.min(100, skills[key] || 0)}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 年龄/月份 + 疲惫度
function StatusPanel({ character, fatigue }) {
  const monthInfo = character?.monthInfo || {};
  const age = monthInfo.age || character?.age || 15;
  const monthInYear = monthInfo.monthInYear || 1;
  const fatigueVal = typeof fatigue === 'number' ? fatigue : (character?.fatigue || 0);

  const fatigueColor = fatigueVal >= 71 ? '#EF4444' : fatigueVal >= 41 ? '#F97316' : '#22C55E';
  const fatigueBg = fatigueVal >= 71 ? 'rgba(239,68,68,0.12)' : fatigueVal >= 41 ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.12)';

  return (
    <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 年龄/月份 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(201,168,76,0.08)', borderRadius: '10px',
        padding: '8px 12px', border: '1px solid rgba(201,168,76,0.2)'
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', letterSpacing: '1px' }}>当前时间</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#C9A84C' }}>
          {age}岁 第{monthInYear}月
        </span>
      </div>

      {/* 疲惫度 */}
      <div style={{
        background: fatigueBg, borderRadius: '10px',
        padding: '8px 12px', border: `1px solid ${fatigueColor}30`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', letterSpacing: '1px' }}>疲惫度</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: fatigueColor }}>
            {fatigueVal}/100
          </span>
        </div>
        <div style={{
          height: '6px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${Math.min(100, fatigueVal)}%`,
            background: `linear-gradient(90deg, ${fatigueColor}99, ${fatigueColor})`,
            transition: 'width 0.8s ease',
            boxShadow: `0 0 6px ${fatigueColor}60`
          }} />
        </div>
      </div>
    </div>
  );
}

export default function CharacterPanel({ character, gameConfig, currentScene, ageStatus, fatigue }) {
  const currentSceneData = gameConfig?.scenes?.find(s => s.id === currentScene);

  return (
    <div style={{
      background: 'rgba(30, 10, 20, 0.8)',
      border: '1px solid rgba(212,81,122,0.25)',
      borderRadius: '20px',
      backdropFilter: 'blur(15px)',
      overflow: 'hidden'
    }}>
      <CharacterDisplay character={character} gameConfig={gameConfig} />

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,81,122,0.3), transparent)', margin: '0 16px' }} />

      <div style={{ padding: '16px 0' }}>
        <MiniSkills skills={character.skills} />
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,81,122,0.3), transparent)', margin: '0 16px' }} />

      <div style={{ padding: '12px 0' }}>
        <StatusPanel character={character} fatigue={fatigue} />
      </div>

      {currentSceneData && (
        <>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,81,122,0.3), transparent)', margin: '0 16px' }} />
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginBottom: '6px' }}>当前位置</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{currentSceneData.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#F4A0C0' }}>{currentSceneData.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)' }}>{currentSceneData.ambience}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

