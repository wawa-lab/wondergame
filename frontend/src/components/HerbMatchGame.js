import React, { useState, useCallback, useEffect } from 'react';
import { sfxHerbMatch } from '../utils/sfx';

// 30组中草药数据：emoji图标、名称、作用
const HERB_DATA = [
  { id: 'renshen',     emoji: '🌿', color: '#2D7A3A', name: '人参',   effect: '大补元气，生津安神' },
  { id: 'huangqi',     emoji: '🌾', color: '#8B6914', name: '黄芪',   effect: '补气固表，利水消肿' },
  { id: 'danggui',     emoji: '🌸', color: '#C2185B', name: '当归',   effect: '补血活血，调经止痛' },
  { id: 'gouqi',       emoji: '🍒', color: '#D32F2F', name: '枸杞',   effect: '滋肾润肺，补肝明目' },
  { id: 'juhua',       emoji: '🌼', color: '#F9A825', name: '菊花',   effect: '散风清热，平肝明目' },
  { id: 'bohe',        emoji: '🍃', color: '#388E3C', name: '薄荷',   effect: '疏散风热，清利头目' },
  { id: 'jinyinhua',   emoji: '🌻', color: '#F57F17', name: '金银花', effect: '清热解毒，疏散风热' },
  { id: 'gancao',      emoji: '🟫', color: '#795548', name: '甘草',   effect: '补脾益气，清热解毒，调和诸药' },
  { id: 'fuling',      emoji: '⬜', color: '#9E9E9E', name: '茯苓',   effect: '利水渗湿，健脾宁心' },
  { id: 'chuanxiong',  emoji: '🌰', color: '#6D4C41', name: '川芎',   effect: '活血行气，祛风止痛' },
  { id: 'baizhu',      emoji: '🌱', color: '#558B2F', name: '白术',   effect: '补气健脾，燥湿利水' },
  { id: 'chenpi',      emoji: '🍊', color: '#E65100', name: '陈皮',   effect: '理气健脾，燥湿化痰' },
  { id: 'banxia',      emoji: '🫙', color: '#827717', name: '半夏',   effect: '燥湿化痰，降逆止呕' },
  { id: 'maidong',     emoji: '💙', color: '#1565C0', name: '麦冬',   effect: '养阴生津，润肺清心' },
  { id: 'wuweizi',     emoji: '🍇', color: '#6A1B9A', name: '五味子', effect: '收敛固涩，益气生津，补肾宁心' },
  { id: 'guizhi',      emoji: '🟤', color: '#5D4037', name: '桂枝',   effect: '发汗解肌，温通经脉' },
  { id: 'fuzi',        emoji: '🔵', color: '#283593', name: '附子',   effect: '回阳救逆，补火助阳' },
  { id: 'dahuang',     emoji: '🟠', color: '#BF360C', name: '大黄',   effect: '泻热通便，凉血解毒' },
  { id: 'huanglian',   emoji: '💛', color: '#F9A825', name: '黄连',   effect: '清热燥湿，泻火解毒' },
  { id: 'chaihu',      emoji: '🌿', color: '#1B5E20', name: '柴胡',   effect: '疏散退热，疏肝解郁' },
  { id: 'shengdihuang',emoji: '🟣', color: '#4A148C', name: '生地黄', effect: '清热凉血，养阴生津' },
  { id: 'shudi',       emoji: '🫐', color: '#311B92', name: '熟地黄', effect: '补血滋阴，益精填髓' },
  { id: 'danshen',     emoji: '🌹', color: '#B71C1C', name: '丹参',   effect: '活血祛瘀，通经止痛，清心除烦' },
  { id: 'shanzha',     emoji: '🍎', color: '#C62828', name: '山楂',   effect: '消食健胃，行气散瘀' },
  { id: 'honghua',     emoji: '🌺', color: '#E91E63', name: '红花',   effect: '活血通经，散瘀止痛' },
  { id: 'xingren',     emoji: '🥜', color: '#795548', name: '杏仁',   effect: '止咳平喘，润肠通便' },
  { id: 'jiegeng',     emoji: '⚪', color: '#546E7A', name: '桔梗',   effect: '宣肺，利咽，祛痰排脓' },
  { id: 'fangfeng',    emoji: '🍀', color: '#2E7D32', name: '防风',   effect: '祛风解表，胜湿止痛' },
  { id: 'xixin',       emoji: '🌲', color: '#1A237E', name: '细辛',   effect: '祛风散寒，通窍止痛，温肺化饮' },
  { id: 'huoxiang',    emoji: '💚', color: '#33691E', name: '藿香',   effect: '芳香化湿，和中止呕，发表解暑' },
];

// 卡片类型
const CARD_TYPE = { IMAGE: 'image', NAME: 'name', EFFECT: 'effect' };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 单张卡片
function HerbCard({ card, isSelected, isMatched, isWrong, onClick }) {
  const [imgError, setImgError] = useState(false);
  const baseStyle = {
    width: '150px', height: '150px', borderRadius: '16px', cursor: isMatched ? 'default' : 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '8px', boxSizing: 'border-box', transition: 'all 0.2s ease',
    userSelect: 'none', position: 'relative', overflow: 'hidden',
    animation: isWrong ? 'herbShake 0.4s ease' : isMatched ? 'herbPop 0.35s ease' : 'none',
    opacity: isMatched ? 0.3 : 1,
    transform: isSelected ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
    border: isMatched
      ? '2px solid rgba(100,200,100,0.3)'
      : isSelected
      ? '2px solid rgba(255,210,100,0.9)'
      : isWrong
      ? '2px solid rgba(255,80,80,0.9)'
      : '2px solid rgba(255,255,255,0.15)',
    boxShadow: isSelected ? '0 0 16px rgba(255,210,100,0.5)' : '0 4px 12px rgba(0,0,0,0.4)',
  };

  if (card.type === CARD_TYPE.IMAGE) {
    const imgSrc = `/assets/herbs/${card.herb.id}.png`;
    return (
      <div onClick={onClick} style={{
        ...baseStyle,
        background: `linear-gradient(135deg, ${card.herb.color}cc, ${card.herb.color}88)`,
        padding: 0,
      }}>
        {!imgError ? (
          <img
            src={imgSrc}
            alt={card.herb.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
          />
        ) : (
          <>
            <span style={{ fontSize: '56px', lineHeight: 1 }}>{card.herb.emoji}</span>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', letterSpacing: '1px' }}>药材图</div>
          </>
        )}
      </div>
    );
  }
  if (card.type === CARD_TYPE.NAME) {
    return (
      <div onClick={onClick} style={{
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(40,15,30,0.95), rgba(60,25,45,0.95))',
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(212,81,122,0.7)', letterSpacing: '2px', marginBottom: '6px' }}>名称</div>
        <div style={{ fontSize: '26px', fontWeight: '700', color: '#F4A0C0', textAlign: 'center', lineHeight: 1.3 }}>{card.herb.name}</div>
      </div>
    );
  }
  // EFFECT
  return (
    <div onClick={onClick} style={{
      ...baseStyle,
      background: 'linear-gradient(135deg, rgba(10,30,50,0.95), rgba(15,45,70,0.95))',
    }}>
      <div style={{ fontSize: '11px', color: 'rgba(100,180,255,0.7)', letterSpacing: '2px', marginBottom: '6px' }}>功效</div>
      <div style={{ fontSize: '13px', color: 'rgba(180,220,255,0.9)', textAlign: 'center', lineHeight: 1.5 }}>{card.herb.effect}</div>
    </div>
  );
}

export default function HerbMatchGame({ onClose, onJadeEarned }) {
  const [gameState, setGameState] = useState('idle'); // idle | playing | result
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]); // [{cardId}]
  const [matched, setMatched] = useState(new Set()); // set of herbId
  const [wrongIds, setWrongIds] = useState(new Set()); // set of cardId
  const [score, setScore] = useState(0);

  const startGame = useCallback(() => {
    // 随机选3组药材
    const shuffledHerbs = shuffle(HERB_DATA).slice(0, 3);
    // 每组生成3张卡：图像、名称、功效
    const allCards = [];
    shuffledHerbs.forEach(herb => {
      allCards.push({ id: `${herb.id}_img`,    type: CARD_TYPE.IMAGE,  herb, herbId: herb.id });
      allCards.push({ id: `${herb.id}_name`,   type: CARD_TYPE.NAME,   herb, herbId: herb.id });
      allCards.push({ id: `${herb.id}_effect`, type: CARD_TYPE.EFFECT, herb, herbId: herb.id });
    });
    setCards(shuffle(allCards));
    setSelected([]);
    setMatched(new Set());
    setWrongIds(new Set());
    setScore(0);
    setGameState('playing');
  }, []);

  const handleCardClick = useCallback((card) => {
    if (gameState !== 'playing') return;
    if (matched.has(card.herbId)) return;
    if (wrongIds.has(card.id)) return;

    setSelected(prev => {
      // 已选中则取消
      if (prev.some(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      const next = [...prev, card];
      if (next.length === 3) {
        // 判断是否同一组
        const allSame = next.every(c => c.herbId === next[0].herbId);
        if (allSame) {
          // 消除
          const herbId = next[0].herbId;
          sfxHerbMatch();
          setTimeout(() => {
            setMatched(m => {
              const nm = new Set(m);
              nm.add(herbId);
              if (nm.size >= 3) {
                setTimeout(() => setGameState('result'), 400);
              }
              return nm;
            });
            setScore(s => s + 1);
            setSelected([]);
          }, 200);
        } else {
          // 错误：抖动后清空
          const wrongSet = new Set(next.map(c => c.id));
          setWrongIds(wrongSet);
          setTimeout(() => {
            setWrongIds(new Set());
            setSelected([]);
          }, 600);
        }
        return next;
      }
      return next;
    });
  }, [gameState, matched, wrongIds]);

  const handleCollect = useCallback(() => {
    onJadeEarned?.(3);
    onClose?.();
  }, [onJadeEarned, onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2200,
      background: 'rgba(5,2,10,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes herbShake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        @keyframes herbPop {
          0%{transform:scale(1)}
          50%{transform:scale(1.15)}
          100%{transform:scale(1)}
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(145deg, rgba(8,4,16,0.99), rgba(16,8,28,0.99))',
        border: '1.5px solid rgba(100,180,120,0.4)',
        borderRadius: '22px', width: '720px', maxWidth: '96vw',
        boxShadow: '0 0 60px rgba(100,180,120,0.15)',
        overflow: 'hidden',
      }}>
        {/* 标题栏 */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(50,120,60,0.35), rgba(50,120,60,0.08))',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🌿</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#90EE90', letterSpacing: '3px' }}>识药消消乐</div>
              <div style={{ fontSize: '10px', color: 'rgba(144,238,144,0.5)' }}>找出同组的图像·名称·功效</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '16px', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>

        <div style={{ padding: '18px 32px 24px' }}>
          {/* 空闲状态 */}
          {gameState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌿🍃🌱</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', marginBottom: '20px' }}>
                随机抽取3种草药，<br/>
                将图像、名称、功效各连成一组消除<br/>
                <span style={{ color: '#90EE90', fontWeight: '700' }}>全部消除可获得3玉</span>
              </div>
              <button onClick={startGame} style={{
                padding: '12px 32px', background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
                border: '1px solid rgba(144,238,144,0.4)', borderRadius: '12px',
                color: '#90EE90', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                letterSpacing: '3px', fontFamily: 'inherit',
              }}>开始识药</button>
            </div>
          )}

          {/* 游戏中 */}
          {gameState === 'playing' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(144,238,144,0.7)' }}>
                  已消除：<span style={{ color: '#90EE90', fontWeight: '700', fontSize: '14px' }}>{score}</span> / 3 组
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  {selected.length > 0 ? `已选 ${selected.length}/3` : '点击卡片选择'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {cards.map(card => (
                  <HerbCard
                    key={card.id}
                    card={card}
                    isSelected={selected.some(c => c.id === card.id)}
                    isMatched={matched.has(card.herbId)}
                    isWrong={wrongIds.has(card.id)}
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </div>

              <div style={{ marginTop: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                点选同一药材的三张卡消除 · 错误选择会抖动提示
              </div>
            </>
          )}

          {/* 结果 */}
          {gameState === 'result' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#90EE90', marginBottom: '8px', letterSpacing: '2px' }}>
                全部识别正确！
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                医术精进，大夫深感欣慰
              </div>
              <div style={{ fontSize: '20px', color: '#A8FFD0', fontWeight: '700', marginBottom: '20px' }}>
                💎 +3 玉
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={startGame} style={{
                  padding: '10px 22px', background: 'rgba(46,125,50,0.3)',
                  border: '1px solid rgba(144,238,144,0.4)', borderRadius: '10px',
                  color: '#90EE90', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}>再来一局</button>
                <button onClick={handleCollect} style={{
                  padding: '10px 22px', background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
                  border: '1px solid rgba(144,238,144,0.5)', borderRadius: '10px',
                  color: '#90EE90', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                }}>领取奖励</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
