import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    image: '/assets/intro/start1.jpeg',
    text: '万历十五年，苏州府。你生于杏花微雨时节，父亲凌明堂是致仕归隐的翰林编修，母亲陆氏出身吴中望族。凌家诗礼传家，五岁随姆教学《女诫》，七岁习女红，九岁背《列女传》，每日晨昏定省、习字描红、理账管家、琴棋书画。十三岁那年秋天，父亲说去京城访友，这一去，再无音讯。',
  },
  {
    image: '/assets/intro/start2.jpeg',
    text: '起初家中尚能维持体面，三个月后书信全无，半年后京中传来消息说父亲并未到京。母亲变卖田产托人寻找，如石沉大海。及笄礼那天，没有宾客，没有宴席。仆从散了，园子荒了，唯有母亲亲手将那支旧玉簪别上你的发髻，说："从今日起，你是凌家的脊梁。"你还不懂这话的重量，只是发现母亲的手，比从前粗糙了许多。',
  },
  {
    image: '/assets/intro/start3.jpeg',
    text: '天不亮便跟周婶学刺绣，绣品换了铜钱，一枚一枚数得仔细。午后去王伯的豆腐铺帮忙，南来北往的客商端着热豆浆，聊着你从未听过的地名与人情。傍晚柳婆婆教你认草药、辨药性，她年轻时曾是药铺的伙计，满手老茧却能准确捻起最细的根须。夜里，你点着油灯读父亲留下的书——不是《女诫》，而是《水经注》《本草纲目》《天工开物》。母亲有时坐在一旁，看你写字，忽然说一句："你爹从前也爱这样熬夜。"你不抬头，笔尖不停，心里却暖暖的。',
  },
  {
    image: '/assets/intro/start4.jpeg',
    text: '日子清苦，但不孤单。街坊四邻各有各的难处，也各有各的热心肠。你渐渐学会了对米铺老板多笑一下能多赊三文，学会了哪座桥头的绣样最好卖，学会了用草药给隔壁发烧的阿婆煮一碗汤。父亲的书越读越厚，你的手越来越稳，苏州城的巷陌在你眼里不再是闺阁窗外的风景，而是一张活的地图。你知道，这只是开始——杏花还会再开，而你会用自己的方式，活出自己的人生。',
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
