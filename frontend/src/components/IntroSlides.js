import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    image: '/assets/intro/start1.jpeg',
    text: '万历十五年，苏州府。你生于杏花微雨时节，父亲凌明堂是致仕归隐的翰林编修，母亲陆氏出身吴中望族。凌家诗礼传家，书香满室，父亲每日在书房研读经史，母亲操持家务，将园子打理得井井有条。五岁随母学《女诫》，七岁习女红，九岁背《列女传》，每日晨昏定省、习字描红、理账管家、琴棋书画，日子虽平淡，却有滋有味。',
  },
  {
    image: '/assets/intro/start2.jpeg',
    text: '父亲虽已归隐，却从未放下学问。他常在廊下与母亲对坐，一人读书，一人刺绣，说起世间万象，总有说不完的话。你在旁听着，将那些地名、典故、人情世故，一一记在心里。及笄那日，父亲亲手将一支旧玉簪别上你的发髻，说："从今日起，你是大姑娘了，凌家的事，也该学着担了。"母亲在一旁笑着，眼里满是欣慰。',
  },
  {
    image: '/assets/intro/start3.jpeg',
    text: '父亲带你走遍苏州的街巷，跟周婶学刺绣，跟王伯的豆腐铺算账，跟柳婆婆辨认草药。南来北往的客商，各色人等，父亲总说："读万卷书，不如行万里路；行万里路，不如阅人无数。"母亲则教你持家之道，米价几何，布料如何挑，哪家的大夫医术可信。你将这些一一记下，觉得世界比书里写的，要宽阔得多。',
  },
  {
    image: '/assets/intro/start4.jpeg',
    text: '夜里，父亲点着油灯读书，你便坐在一旁，翻他书架上那些不寻常的册子——《水经注》《本草纲目》《天工开物》。母亲有时抬头看你，轻声说："你和你爹一个样，都爱熬夜。"父亲不抬头，只是笑。你知道，这样的日子不会永远，但此刻的温暖，会成为你往后走遍天下的底气。十五岁的你，正站在一段崭新旅程的起点。',
  },
  {
    image: null,
    text: '这是一段从十五岁到十八岁的成长旅程。游历八方场景，结交形形色色的人，修炼琴棋书画、武艺医术、谋略口才。每月选三门课程，完成小游戏赚取金币，探索隐藏剧情。你的每一个选择，都将影响最终的命运走向——是母仪天下的皇后，还是纵横江湖的侠女，是悬壶济世的名医，还是平淡是真的寻常人家？共十余种结局，等你亲手书写。',
  },
];

const SHOWCASE_NPCS = [
  { src: '/assets/npc_avatars/npc_wangwenyu_avatar.png', name: '王文玉' },
  { src: '/assets/npc_avatars/npc_mufeng_avatar.png', name: '幕风公子' },
  { src: '/assets/npc_avatars/npc_sitouqian_avatar.png', name: '司徒仟' },
  { src: '/assets/npc_avatars/emperor.png', name: '皇上' },
  { src: '/assets/npc_avatars/royal_lady.png', name: '映月' },
  { src: '/assets/npc_avatars/desert_friend_avatar.jpg', name: '沐风' },
];

const SHOWCASE_SCENES = [
  { src: '/assets/scenes/desert_oasis.jpg', name: '呜沙沟' },
  { src: '/assets/scenes/street_new.jpg', name: '琳琅繁街' },
  { src: '/assets/scenes/royal_court.jpg', name: '宫廷' },
  { src: '/assets/scenes/deep_forest.jpg', name: '深林' },
  { src: '/assets/scenes/art_studio_new.jpg', name: '书画院' },
  { src: '/assets/scenes/medicine_hall_new.jpg', name: '医馆' },
];

const SHOWCASE_ENDINGS = [
  { src: '/assets/endings/empress.jpeg', name: '母仪天下' },
  { src: '/assets/endings/female_chancellor.jpeg', name: '一代女相' },
  { src: '/assets/endings/war_general.jpeg', name: '护国女将' },
  { src: '/assets/endings/hermit.jpeg', name: '逍遥散人' },
  { src: '/assets/endings/divine_doctor.jpeg', name: '悬壶济世' },
  { src: '/assets/endings/ordinary.jpeg', name: '平淡是真' },
];

function ShowcaseRow({ items, label, round }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,210,100,0.6)', letterSpacing: '3px', marginBottom: '10px', textAlign: 'center' }}>
        ── {label} ──
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: round ? '72px' : '88px',
              height: round ? '72px' : '56px',
              borderRadius: round ? '50%' : '8px',
              overflow: 'hidden',
              border: '2px solid rgba(255,210,100,0.45)',
              background: 'rgba(20,8,15,0.8)',
              flexShrink: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}>
              <img src={item.src} alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(245,220,230,0.75)', whiteSpace: 'nowrap' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntroSlides({ onFinish }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const isLast = idx === SLIDES.length - 1;
  const slide = SLIDES[idx];

  const go = (next) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(next);
      setVisible(true);
    }, 300);
  };

  const handleNext = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onFinish, 350);
    } else {
      go(idx + 1);
    }
  };

  const handlePrev = () => {
    if (idx > 0) go(idx - 1);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0408',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: '860px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 20px', boxSizing: 'border-box',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>

        {/* 图片区 */}
        <div style={{
          width: '100%',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(255,210,100,0.25)',
          boxShadow: '0 12px 50px rgba(0,0,0,0.75)',
          background: 'rgba(15,6,12,0.95)',
        }}>
          {slide.image ? (
            <img
              src={slide.image}
              alt={`第${idx + 1}幕`}
              style={{ width: '100%', maxHeight: '65vh', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              padding: '22px 20px 18px',
              background: 'linear-gradient(160deg, rgba(20,8,15,0.98), rgba(35,12,28,0.98))',
            }}>
              <div style={{
                fontSize: '16px', fontWeight: '800', color: 'rgba(255,210,100,0.9)',
                textAlign: 'center', letterSpacing: '5px', marginBottom: '18px',
              }}>
                ✦ 凌若雪的世界 ✦
              </div>
              <ShowcaseRow items={SHOWCASE_NPCS} label="相遇之人" round={true} />
              <ShowcaseRow items={SHOWCASE_SCENES} label="踏足之地" round={false} />
              <ShowcaseRow items={SHOWCASE_ENDINGS} label="可能的命运" round={false} />
            </div>
          )}
        </div>

        {/* 文字区 */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(145deg, rgba(15,6,12,0.97), rgba(28,10,22,0.97))',
          borderLeft: '1px solid rgba(255,210,100,0.2)',
          borderRight: '1px solid rgba(255,210,100,0.2)',
          borderBottom: '1px solid rgba(255,210,100,0.25)',
          borderRadius: '0 0 14px 14px',
          padding: '18px 24px 16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: '2',
            color: 'rgba(245,225,235,0.92)',
            textAlign: 'justify',
            maxHeight: '16vh',
            overflowY: 'auto',
          }}>
            {slide.text}
          </p>
        </div>

        {/* 底部导航 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginTop: '16px',
          padding: '0 4px',
        }}>
          <button
            onClick={handlePrev}
            disabled={idx === 0}
            style={{
              background: 'none', border: '1px solid rgba(255,210,100,0.3)',
              borderRadius: '8px', color: idx === 0 ? 'rgba(255,210,100,0.2)' : 'rgba(255,210,100,0.7)',
              fontSize: '14px', padding: '8px 20px', cursor: idx === 0 ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ← 上一页
          </button>

          <div style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
            {SLIDES.map((_, i) => (
              <div
                key={i}
                onClick={() => go(i)}
                style={{
                  width: i === idx ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === idx ? 'rgba(255,210,100,0.9)' : 'rgba(255,210,100,0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            style={{
              background: isLast
                ? 'linear-gradient(135deg, rgba(180,100,50,0.85), rgba(220,140,60,0.85))'
                : 'none',
              border: `1px solid ${isLast ? 'rgba(255,180,80,0.7)' : 'rgba(255,210,100,0.3)'}`,
              borderRadius: '8px',
              color: 'rgba(255,210,100,0.95)',
              fontSize: '14px', padding: '8px 20px', cursor: 'pointer',
              fontWeight: isLast ? '700' : '400',
              transition: 'all 0.2s',
            }}
          >
            {isLast ? '开始游戏 →' : '下一页 →'}
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,210,100,0.3)', letterSpacing: '1px' }}>
          {idx + 1} / {SLIDES.length}
        </div>
      </div>
    </div>
  );
}
