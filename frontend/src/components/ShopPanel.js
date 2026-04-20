import React, {useState} from 'react';

// 稀有度配置
const rarityConfig = {
  common:    { label: '普通', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  uncommon:  { label: '精良', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  rare:      { label: '稀有', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  epic:      { label: '史诗', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  legendary: { label: '传说', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
};

// 分类配置
const categoryConfig = {
  all: { label: '全部', emoji: '🏪' },
  草药: { label: '草药', emoji: '🌿' },
  食物: { label: '食物', emoji: '🍮' },
  乐器: { label: '乐器', emoji: '🎵' },
  妆饰: { label: '妆饰', emoji: '💄' },
  典籍: { label: '典籍', emoji: '📖' },
  书画: { label: '书画', emoji: '🖌️' },
  女红: { label: '女红', emoji: '🧵' },
  舞艺: { label: '舞艺', emoji: '👟' },
  马具: { label: '马具', emoji: '🐎' },
  武器: { label: '武器', emoji: '🏹' },
  熏香: { label: '熏香', emoji: '🕯️' },
};

function ShopItem({ item, character, skillConfig, onBuy }) {
  const [buying, setBuying] = useState(false);
  const rarity = rarityConfig[item.rarity] || rarityConfig.common;
  const canAfford = character.gold >= item.price;

  const handleBuy = async () => {
    if (!canAfford || buying) return;
    setBuying(true);
    await onBuy(item.id);
    setTimeout(() => setBuying(false), 800);
  };

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

      {/* 价格 + 购买按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '16px', fontWeight: '800',
          color: canAfford ? '#C9A84C' : '#F87171',
        }}>
          <span style={{ fontSize: '14px' }}>💰</span>
          {item.price}
        </div>
        <button
          onClick={handleBuy}
          disabled={!canAfford || buying}
          style={{
            background: !canAfford ? 'rgba(100,100,100,0.3)'
              : buying ? 'rgba(201,168,76,0.4)'
              : 'linear-gradient(135deg, #C9A84C, #A07828)',
            border: 'none', borderRadius: '10px',
            color: !canAfford ? 'rgba(255,255,255,0.3)' : 'white',
            cursor: !canAfford ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontSize: '12px', fontWeight: '600',
            padding: '7px 16px', transition: 'all 0.25s ease',
            letterSpacing: '0.5px',
          }}
        >
          {buying ? '购买中...' : canAfford ? '✨ 购买' : '金币不足'}
        </button>
      </div>
    </div>
  );
}

export default function ShopPanel({ shopItems = [], character, skillConfig, onBuyItem }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default'); // default | price_asc | price_desc | rarity

  const categories = ['all', ...new Set(shopItems.map(i => i.category))];

  const filtered = shopItems
    .filter(item => activeCategory === 'all' || item.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rarity') {
        const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        return (order[a.rarity] || 4) - (order[b.rarity] || 4);
      }
      return 0;
    });

  return (
    <div>
      {/* 标题 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🏪</span>
          <div>
            <h2 style={{
              fontSize: '20px', fontWeight: '800', margin: 0,
              background: 'linear-gradient(135deg, #C9A84C, #F4D080)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              锦云阁
            </h2>
            <div style={{ fontSize: '11px', color: 'rgba(245,230,236,0.4)', marginTop: '2px' }}>
              共 {shopItems.length} 种道具 · 当前金币：{character?.gold || 0} 💰
            </div>
          </div>
        </div>

        {/* 排序 */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            background: 'rgba(40,15,25,0.8)', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '8px', color: '#C9A84C', padding: '6px 10px',
            fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="default">默认排序</option>
          <option value="price_asc">价格从低到高</option>
          <option value="price_desc">价格从高到低</option>
          <option value="rarity">按稀有度</option>
        </select>
      </div>

      {/* 分类筛选 */}
      <div style={{
        display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px',
      }}>
        {categories.map(cat => {
          const cfg = categoryConfig[cat] || { label: cat, emoji: '📦' };
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat
                  ? 'linear-gradient(135deg, #C9A84C, #A07828)'
                  : 'rgba(40,15,25,0.6)',
                border: `1px solid ${activeCategory === cat ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`,
                borderRadius: '20px', padding: '5px 14px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                color: activeCategory === cat ? 'white' : 'rgba(245,230,236,0.6)',
                transition: 'all 0.2s ease', fontWeight: activeCategory === cat ? '700' : '400',
              }}
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* 商品网格 */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px',
          color: 'rgba(245,230,236,0.3)', fontSize: '14px'
        }}>
          该分类暂无商品
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px',
        }}>
          {filtered.map(item => (
            <ShopItem
              key={item.id}
              item={item}
              character={character}
              skillConfig={skillConfig}
              onBuy={onBuyItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

