import React, {useState} from 'react';

const RARITY_CONFIG = {
  common:    { label: '普通', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', glow: 'rgba(156,163,175,0.2)' },
  uncommon:  { label: '优良', color: '#34D399', bg: 'rgba(52,211,153,0.15)',  glow: 'rgba(52,211,153,0.25)' },
  rare:      { label: '稀有', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',  glow: 'rgba(96,165,250,0.25)' },
  epic:      { label: '史诗', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', glow: 'rgba(167,139,250,0.25)' },
  legendary: { label: '传说', color: '#FBBF24', bg: 'rgba(251,191,36,0.18)',  glow: 'rgba(251,191,36,0.35)' },
};

const PRICE_MAP = { common: 50, uncommon: 100, rare: 200, epic: 400, legendary: 800 };

const SEASON_CONFIG = {
  spring: { label: '春', color: '#F472B6', icon: '🌸' },
  summer: { label: '夏', color: '#34D399', icon: '🌿' },
  autumn: { label: '秋', color: '#F59E0B', icon: '🍁' },
  winter: { label: '冬', color: '#93C5FD', icon: '❄️' },
  all:    { label: '四季', color: '#C9A84C', icon: '✨' },
};

const SKILL_NAMES = {
  charm: '魅力', spirit: '灵气', wisdom: '才学', wildness: '野性',
  vitality: '体力', courage: '胆识', poetry: '诗才', painting: '画艺',
  affinity: '亲和', music: '乐艺', culinary: '厨艺', medical: '医术'
};

// 年龄主题色
const AGE_COLORS = {
  15: '#FFB7C5', 16: '#E74C3C', 17: '#8E44AD', 18: '#C9A84C'
};

// ===== 套装卡片（大图展示人物+服装） =====
function OutfitCard({ dress, isWearing, onWear, onUnlock, gold, characterAge }) {
  const rarity    = RARITY_CONFIG[dress.rarity] || RARITY_CONFIG.common;
  const season    = SEASON_CONFIG[dress.season] || SEASON_CONFIG.all;
  const price     = dress.purchasePrice || PRICE_MAP[dress.rarity] || 100;
  const canAfford = gold >= price;
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const currentAge = characterAge || 15;
  // 年龄未到：无论是否需要购买，都先年龄锁
  const ageLocked = !!dress.ageRequired && dress.ageRequired > currentAge;
  // 年龄已到，需要购买解锁
  const needsPurchase = !!dress.purchasePrice && !dress.unlocked && !ageLocked;
  const ageColor = dress.ageRequired ? AGE_COLORS[dress.ageRequired] : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isWearing
          ? `linear-gradient(135deg, ${rarity.bg.replace('0.15','0.3')}, rgba(212,81,122,0.1))`
          : 'rgba(28,10,20,0.78)',
        border: `1.5px solid ${isWearing ? rarity.color : hovered ? rarity.color + '80' : rarity.color + '35'}`,
        borderRadius: '20px',
        padding: '0',
        transition: 'all 0.3s ease',
        opacity: dress.unlocked ? 1 : 0.85,
        position: 'relative', overflow: 'hidden',
        boxShadow: isWearing
          ? `0 8px 28px ${rarity.glow}, 0 0 0 1px ${rarity.color}40`
          : hovered ? `0 5px 18px ${rarity.glow}` : 'none',
        transform: hovered && !isWearing ? 'translateY(-3px)' : 'none',
        cursor: dress.unlocked ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'row',
      }}
      onClick={() => dress.unlocked && !isWearing && onWear(dress.id)}
    >
      {/* 传说光效 */}
      {dress.rarity === 'legendary' && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '20px', pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(212,81,122,0.04))',
          animation: 'glow 2.5s ease-in-out infinite'
        }} />
      )}

      {/* 穿戴中标记 */}
      {isWearing && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 5,
          background: `linear-gradient(135deg, ${rarity.color}, ${rarity.color}BB)`,
          borderRadius: '10px', padding: '4px 10px',
          fontSize: '11px', color: '#fff', fontWeight: '700', letterSpacing: '1px',
          boxShadow: `0 3px 10px ${rarity.glow}`
        }}>
          ✦ 穿戴中
        </div>
      )}

      {/* 未解锁遮罩 */}
      {!dress.unlocked && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '20px',
          background: 'rgba(10,4,8,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10, gap: '10px'
        }}>
          {ageLocked && !dress.purchasePrice ? (
            // 年龄自动解锁
            <>
              <div style={{ fontSize: '32px', filter: `drop-shadow(0 0 12px ${ageColor}80)` }}>🎂</div>
              <div style={{
                fontSize: '13px', fontWeight: '700',
                color: ageColor || '#C9A84C',
                background: `${ageColor || '#C9A84C'}20`,
                borderRadius: '10px', padding: '6px 14px',
                border: `1px solid ${ageColor || '#C9A84C'}40`,
                textAlign: 'center',
              }}>
                {dress.ageRequired}岁自动解锁
              </div>
            </>
          ) : ageLocked && dress.purchasePrice ? (
            // 年龄未到 + 需要购买
            <>
              <div style={{ fontSize: '32px', filter: `drop-shadow(0 0 12px ${ageColor}80)` }}>🔒</div>
              <div style={{
                fontSize: '13px', fontWeight: '700',
                color: ageColor || '#C9A84C',
                background: `${ageColor || '#C9A84C'}20`,
                borderRadius: '10px', padding: '6px 14px',
                border: `1px solid ${ageColor || '#C9A84C'}40`,
                textAlign: 'center', lineHeight: '1.6',
              }}>
                {dress.ageRequired}岁后可购买<br />
                <span style={{ fontSize: '12px', color: '#FDE68A' }}>{price} 金币</span>
              </div>
            </>
          ) : (
            // 年龄已到，金币购买
            <>
              <span style={{ fontSize: '36px' }}>🔒</span>
              <span style={{ fontSize: '14px', color: '#C9A84C', fontWeight: '600' }}>
                {price} 金币解锁
              </span>
              <button
                onClick={e => { e.stopPropagation(); onUnlock(dress.id, 'dress'); }}
                disabled={!canAfford}
                style={{
                  background: canAfford ? 'linear-gradient(135deg, #C9A84C, #A07020)' : 'rgba(80,60,30,0.4)',
                  border: 'none', borderRadius: '10px',
                  color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontSize: '14px',
                  padding: '8px 22px', fontWeight: '700',
                }}
              >
                {canAfford ? '💰 立即购买' : '金币不足'}
              </button>
            </>
          )}
        </div>
      )}

      {/* 左侧：套装整体图（人物透明PNG，直接展示） */}
      <div style={{
        width: '110px', flexShrink: 0,
        background: dress.image && !imgError
          ? `linear-gradient(160deg, ${dress.color}40, rgba(20,8,15,0.85))`
          : `linear-gradient(160deg, ${dress.color}18, rgba(0,0,0,0.4))`,
        borderRight: `1px solid ${rarity.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {dress.image && !imgError ? (
          <img
            src={dress.image}
            alt={dress.name}
            onError={() => setImgError(true)}
            style={{
              width: '96%',
              height: '96%',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              position: 'absolute',
              bottom: 0, left: '2%',
              transition: 'transform 0.35s ease',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))'
            }}
          />
        ) : (
          <span style={{ fontSize: '48px' }}>{dress.emoji}</span>
        )}
        {/* 季节角标 */}
        <div style={{
          position: 'absolute', top: '7px', left: '7px',
          background: 'rgba(10,4,8,0.82)', backdropFilter: 'blur(4px)',
          borderRadius: '8px', padding: '3px 7px',
          fontSize: '11px', color: season.color, fontWeight: '600'
        }}>
          {season.icon} {season.label}
        </div>
      </div>

      {/* 右侧：套装信息 */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* 套装名 + 稀有度 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h4 style={{
            fontSize: '16px', fontWeight: '700', margin: 0,
            color: isWearing ? '#FFCCE0' : '#F5E6EC'
          }}>
            {dress.name}
          </h4>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
            background: rarity.bg, color: rarity.color,
            border: `1px solid ${rarity.color}40`
          }}>
            {rarity.label}
          </span>
        </div>

        {/* 搭配说明 */}
        {dress.subtitle && (
          <div style={{
            fontSize: '11px', color: '#C9A84C',
            background: 'rgba(201,168,76,0.1)',
            borderRadius: '6px', padding: '3px 8px',
            border: '1px solid rgba(201,168,76,0.25)',
            display: 'inline-block', width: 'fit-content'
          }}>
            {dress.subtitle}
          </div>
        )}

        {/* 描述 */}
        <p style={{
          fontSize: '12px', color: 'rgba(245,230,236,0.52)',
          lineHeight: '1.6', margin: 0, flex: 1
        }}>
          {dress.description}
        </p>

        {/* 技能加成 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {Object.entries(dress.bonus).map(([skill, val]) => (
            <span key={skill} style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
              background: 'rgba(212,81,122,0.13)', color: '#F4A0C0',
              border: '1px solid rgba(212,81,122,0.25)'
            }}>
              +{val} {SKILL_NAMES[skill] || skill}
            </span>
          ))}
        </div>

        {/* 换装按钮 */}
        {dress.unlocked && !isWearing && (
          <button
            onClick={e => { e.stopPropagation(); onWear(dress.id); }}
            style={{
              background: `linear-gradient(135deg, ${rarity.color}, ${rarity.color}AA)`,
              border: 'none', borderRadius: '10px', color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
              padding: '8px 18px', fontWeight: '700',
              transition: 'all 0.2s ease',
              boxShadow: `0 3px 12px ${rarity.glow}`,
              alignSelf: 'flex-start'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            👗 换上此装
          </button>
        )}
        {isWearing && (
          <div style={{
            fontSize: '12px', color: rarity.color, fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}>
            <span style={{ fontSize: '15px' }}>✦</span> 正在穿戴
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 当前套装预览头部 =====
function WardrobeHeader({ character, wardrobe }) {
  const currentDressId = character.currentOutfit?.dress;
  const currentDress = wardrobe.dresses.find(d => d.id === currentDressId);
  const previewSrc = currentDress?.image || null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,81,122,0.18), rgba(201,168,76,0.1))',
      border: '1px solid rgba(212,81,122,0.3)', borderRadius: '20px',
      padding: '16px 20px', marginBottom: '18px',
      display: 'flex', alignItems: 'center', gap: '16px'
    }}>
      {/* 当前套装预览图（人物） */}
      <div style={{
        width: '76px', height: '100px', flexShrink: 0,
        borderRadius: '14px', overflow: 'hidden',
        background: 'rgba(0,0,0,0.35)',
        border: '1.5px solid rgba(212,81,122,0.5)',
        position: 'relative'
      }}>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="当前套装"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top'
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', fontSize: '32px'
          }}>
            {currentDress?.emoji || '👗'}
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
          padding: '4px', fontSize: '9px',
          color: 'rgba(255,255,255,0.75)', textAlign: 'center'
        }}>
          当前
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h2 style={{
          fontSize: '20px', fontWeight: '700', margin: '0 0 4px',
          background: 'linear-gradient(135deg, #F4A0C0, #C9A84C)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
        }}>
          {character.name}的衣橱
        </h2>
        <div style={{ fontSize: '13px', color: '#C9A84C', fontWeight: '600', marginBottom: '4px' }}>
          {currentDress ? currentDress.name : '未穿装'}
          {currentDress?.subtitle && (
            <span style={{ fontSize: '11px', color: 'rgba(245,230,236,0.5)', marginLeft: '6px' }}>
              {currentDress.subtitle}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#C9A84C', fontWeight: '600' }}>
            💰 {character.gold} 金币
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(245,230,236,0.35)' }}>
            {wardrobe.dresses.filter(d => d.unlocked).length}/{wardrobe.dresses.length} 套装已解锁
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== 主组件 =====
export default function WardrobePanel({ wardrobe, character, onChangeDress, onChangeAccessory, onUnlockItem }) {
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all'); // 'all' | 'age' | 'normal'

  const characterAge = character?.age || 15;

  // 先按年龄分类筛选，再按季节筛选
  const filteredDresses = wardrobe.dresses.filter(d => {
    const ageOk = ageFilter === 'all'
      || (ageFilter === 'age' && d.ageRequired)
      || (ageFilter === 'normal' && !d.ageRequired);
    const seasonOk = seasonFilter === 'all' || d.season === seasonFilter || d.season === 'all';
    return ageOk && seasonOk;
  });

  return (
    <div>
      {/* 标题预览区 */}
      <WardrobeHeader character={character} wardrobe={wardrobe} />

      {/* 年龄分类筛选 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { id: 'all',    icon: '✨', label: '全部', color: '#C9A84C' },
          { id: 'age',    icon: '🎂', label: '年龄专属', color: '#F4A0C0' },
          { id: 'normal', icon: '👗', label: '普通服装', color: '#9CA3AF' },
        ].map(({ id, icon, label, color }) => {
          const active = ageFilter === id;
          return (
            <button
              key={id}
              onClick={() => setAgeFilter(id)}
              style={{
                padding: '5px 12px', borderRadius: '20px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                background: active ? `${color}25` : 'rgba(40,15,25,0.5)',
                color: active ? color : 'rgba(245,230,236,0.4)',
                border: `1px solid ${active ? color + '55' : 'rgba(212,81,122,0.08)'}`,
                transition: 'all 0.2s ease', fontWeight: active ? '700' : '400'
              }}
            >
              {icon} {label}
            </button>
          );
        })}
        {/* 当前年龄提示 */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center',
          fontSize: '11px', color: '#C9A84C',
          background: 'rgba(201,168,76,0.12)', borderRadius: '10px',
          padding: '4px 10px', border: '1px solid rgba(201,168,76,0.2)',
        }}>
          当前年龄：{characterAge}岁
        </div>
      </div>

      {/* 季节筛选 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { id: 'all',    icon: '✨', label: '全部' },
          { id: 'spring', icon: '🌸', label: '春' },
          { id: 'summer', icon: '🌿', label: '夏' },
          { id: 'autumn', icon: '🍁', label: '秋' },
          { id: 'winter', icon: '❄️', label: '冬' },
        ].map(({ id, icon, label }) => {
          const cfg = SEASON_CONFIG[id] || SEASON_CONFIG.all;
          const active = seasonFilter === id;
          return (
            <button
              key={id}
              onClick={() => setSeasonFilter(id)}
              style={{
                padding: '6px 14px', borderRadius: '20px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                background: active ? `${cfg.color}28` : 'rgba(40,15,25,0.6)',
                color: active ? cfg.color : 'rgba(245,230,236,0.5)',
                border: `1px solid ${active ? cfg.color + '60' : 'rgba(212,81,122,0.1)'}`,
                transition: 'all 0.2s ease', fontWeight: active ? '700' : '400'
              }}
            >
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* 套装列表（大图卡片） */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredDresses.map(dress => (
          <OutfitCard
            key={dress.id}
            dress={dress}
            isWearing={character.currentOutfit?.dress === dress.id}
            onWear={onChangeDress}
            onUnlock={onUnlockItem}
            gold={character.gold}
            characterAge={characterAge}
          />
        ))}
      </div>
    </div>
  );
}

