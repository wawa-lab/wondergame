import React, {useState} from 'react';
import ITEM_HINTS from '../itemHints';

// 稀有度配置（和 ShopPanel 一致）
const rarityConfig = {
  common:    { label: '普通', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  uncommon:  { label: '精良', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  rare:      { label: '稀有', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  epic:      { label: '史诗', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  legendary: { label: '传说', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
};

const sourceLabel = {
  shop:    { label: '锦云阁购得', color: '#C9A84C' },
  gift:    { label: '赠礼收获',   color: '#F4A0C0' },
  event:   { label: '剧情获得',   color: '#A78BFA' },
};

function InventoryItem({ item, skillConfig }) {
  const rarity = rarityConfig[item.rarity] || rarityConfig.common;
  const src = sourceLabel[item.source] || { label: '背包物品', color: '#888' };
  const hints = ITEM_HINTS[item.id] || [];

  return (
    <div style={{
      background: `linear-gradient(145deg, rgba(20,8,15,0.9), rgba(30,12,20,0.9))`,
      border: `1px solid ${rarity.color}40`,
      borderRadius: '14px',
      padding: '14px',
      transition: 'all 0.25s ease',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid ${rarity.color}80`;
        e.currentTarget.style.boxShadow = `0 6px 24px ${rarity.color}25`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${rarity.color}40`;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* 稀有度角标 */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        background: rarity.color, color: '#000',
        fontSize: '9px', fontWeight: '800',
        padding: '2px 8px 2px 6px',
        borderRadius: '0 14px 0 10px',
      }}>
        {rarity.label}
      </div>

      {/* 图标 + 信息 */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
          background: rarity.bg,
          border: `1.5px solid ${rarity.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          {item.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: '700', color: '#F4E0C0',
            marginBottom: '2px', lineHeight: '1.2'
          }}>
            {item.name}
          </div>
          <div style={{
            fontSize: '10px', color: rarity.color,
            background: rarity.bg, borderRadius: '6px',
            padding: '1px 7px', display: 'inline-block',
            marginBottom: '4px'
          }}>
            {item.category}
          </div>
          <div style={{
            fontSize: '11px', color: 'rgba(245,230,236,0.55)',
            lineHeight: '1.4', overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {item.description}
          </div>
        </div>
      </div>

      {/* 属性加成 */}
      {item.effect && Object.keys(item.effect).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {Object.entries(item.effect).map(([skill, val]) => {
            const cfg = skillConfig?.[skill];
            return (
              <span key={skill} style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
                background: `${cfg?.color || '#888'}18`,
                color: cfg?.color || '#888',
                border: `1px solid ${cfg?.color || '#888'}35`,
              }}>
                {cfg?.icon || '+'} {cfg?.name || skill} +{val}
              </span>
            );
          })}
        </div>
      )}

      {/* 来源 + 时间 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '10px', color: 'rgba(245,230,236,0.3)',
        marginBottom: hints.length > 0 ? '8px' : '0',
      }}>
        <span style={{ color: src.color, fontWeight: '600' }}>
          ✦ {src.label}
        </span>
        <span>
          {item.acquiredAt ? new Date(item.acquiredAt).toLocaleDateString('zh-CN') : ''}
        </span>
      </div>

      {/* 用途提示 */}
      {hints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {hints.map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '6px',
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '8px', padding: '5px 8px',
            }}>
              <span style={{ fontSize: '13px', flexShrink: 0, lineHeight: '1.4' }}>{h.icon}</span>
              <span style={{ fontSize: '10px', color: 'rgba(245,230,236,0.6)', lineHeight: '1.5' }}>
                {h.ending ? <><span style={{ color: '#C9A84C', fontWeight: '600' }}>结局加持</span>　{h.tip}</> :
                 h.combo  ? <><span style={{ color: '#A78BFA', fontWeight: '600' }}>组合效果</span>　{h.tip}</> :
                             <><span style={{ color: '#60A5FA', fontWeight: '600' }}>去哪里用</span>　{h.tip}</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InventoryPanel({ inventory = [], skillConfig }) {
  const [activeCategory, setActiveCategory] = useState('all');

  // 收集所有分类
  const categories = ['all', ...new Set(inventory.map(i => i.category).filter(Boolean))];

  const filtered = activeCategory === 'all'
    ? inventory
    : inventory.filter(i => i.category === activeCategory);

  // 按获取时间倒序
  const sorted = [...filtered].sort((a, b) =>
    new Date(b.acquiredAt || 0) - new Date(a.acquiredAt || 0)
  );

  return (
    <div>
      {/* 标题 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎒</span>
          <div>
            <h2 style={{
              fontSize: '20px', fontWeight: '800', margin: 0,
              background: 'linear-gradient(135deg, #F4A0C0, #D4517A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              我的装备
            </h2>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginTop: '2px' }}>
              共 {inventory.length} 件物品
            </div>
          </div>
        </div>
      </div>

      {/* 分类筛选 */}
      {categories.length > 1 && (
        <div style={{
          display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px',
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat
                  ? 'linear-gradient(135deg, #D4517A, #A03058)'
                  : 'rgba(40,15,25,0.6)',
                border: `1px solid ${activeCategory === cat ? '#D4517A' : 'rgba(212,81,122,0.2)'}`,
                borderRadius: '20px', padding: '5px 14px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                color: activeCategory === cat ? 'white' : 'rgba(245,230,236,0.6)',
                transition: 'all 0.2s ease', fontWeight: activeCategory === cat ? '700' : '400',
              }}
            >
              {cat === 'all' ? '📦 全部' : cat}
            </button>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {inventory.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'rgba(245,230,236,0.3)',
        }}>
          <div style={{ fontSize: '60px', marginBottom: '16px', opacity: 0.4 }}>🎒</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>背包空空如也</div>
          <div style={{ fontSize: '13px' }}>前往游历场景购买道具，或与NPC互动获得赠礼</div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px',
          color: 'rgba(245,230,236,0.3)', fontSize: '14px'
        }}>
          该分类暂无物品
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
        }}>
          {sorted.map(item => (
            <InventoryItem
              key={item.id}
              item={item}
              skillConfig={skillConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}

