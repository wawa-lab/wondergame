import React, { useEffect, useRef, useState } from 'react';

/**
 * FloatingText — 属性飘字系统
 *
 * 用法：
 *   <FloatingTextHost ref={hostRef} />
 *   hostRef.current.emit({ text: '+3 才学', color: '#60A5FA', x: 120, y: 80 })
 *
 * 或通过全局单例：
 *   import { emitFloat } from './FloatingText';
 *   emitFloat({ text: '+2 魅力', color: '#F472B6' });   // x/y 可省略，默认居中
 */

// 全局单例 ref，供外部直接调用
let _globalEmit = null;
export function emitFloat(opts) {
  if (_globalEmit) _globalEmit(opts);
}

const SKILL_COLORS = {
  charm:      '#F472B6',
  wisdom:     '#60A5FA',
  spirit:     '#A78BFA',
  affinity:   '#34D399',
  courage:    '#FBBF24',
  vitality:   '#FB923C',
  wildness:   '#F87171',
  culinary:   '#FDE68A',
  medical:    '#6EE7B7',
  poetry:     '#C4B5FD',
  music:      '#FCA5A5',
  painting:   '#93C5FD',
  rhetoric:   '#FCD34D',
  statecraft: '#818CF8',
  arithmetic: '#67E8F9',
  crafting:   '#A3E635',
  morality:   '#86EFAC',
  reputation: '#FDE68A',
  gold:       '#C9A84C',
  jade:       '#34D399',
  exp:        '#FBBF24',
};

export function skillColor(key) {
  return SKILL_COLORS[key] || '#F4A0C0';
}

// 单条飘字
function FloatItem({ id, text, color, x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y,
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      zIndex: 9000,
      fontFamily: "'Noto Serif SC', serif",
      fontSize: '15px',
      fontWeight: '800',
      color,
      textShadow: `0 0 12px ${color}99, 0 2px 8px rgba(0,0,0,0.6)`,
      whiteSpace: 'nowrap',
      animation: 'floatTextUp 1.8s cubic-bezier(0.22,1,0.36,1) forwards',
    }}>
      {text}
    </div>
  );
}

export default function FloatingTextHost() {
  const [items, setItems] = useState([]);

  const emit = ({ text, color = '#F4A0C0', x, y }) => {
    const id = Date.now() + Math.random();
    // 默认位置：屏幕右侧角色面板区域附近，加随机抖动
    const px = x ?? (window.innerWidth * 0.16 + (Math.random() - 0.5) * 60);
    const py = y ?? (window.innerHeight * 0.45 + (Math.random() - 0.5) * 40);
    setItems(prev => [...prev, { id, text, color, x: px, y: py }]);
  };

  // 注册全局单例
  useEffect(() => {
    _globalEmit = emit;
    return () => { _globalEmit = null; };
  });

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <>
      <style>{`
        @keyframes floatTextUp {
          0%   { opacity: 0;   transform: translateX(-50%) translateY(0px)  scale(0.7); }
          15%  { opacity: 1;   transform: translateX(-50%) translateY(-8px) scale(1.15); }
          60%  { opacity: 1;   transform: translateX(-50%) translateY(-32px) scale(1); }
          100% { opacity: 0;   transform: translateX(-50%) translateY(-60px) scale(0.85); }
        }
      `}</style>
      {items.map(item => (
        <FloatItem
          key={item.id}
          {...item}
          onDone={() => remove(item.id)}
        />
      ))}
    </>
  );
}
