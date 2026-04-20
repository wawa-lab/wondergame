import React, { useEffect, useState } from 'react';

const phrases = [
  '凤凰涅槃，浴火重生...',
  '花开花落，似水流年...',
  '琴瑟和鸣，雅韵悠扬...',
  '月下佳人，翩若惊鸿...',
  '才学渐长，芳华正好...',
];

export default function LoadingScreen() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex(i => (i + 1) % phrases.length);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + 2, 90));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0d0508 0%, #1a0a0f 40%, #2a1018 60%, #0d0508 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* 粒子效果 */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: '50%',
          background: Math.random() > 0.5 ? 'rgba(212,81,122,0.6)' : 'rgba(201,168,76,0.6)',
          animation: `sparkle ${p.duration}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none'
        }} />
      ))}

      {/* 装饰圆圈 */}
      <div style={{
        position: 'absolute',
        width: '400px', height: '400px',
        borderRadius: '50%',
        border: '1px solid rgba(212,81,122,0.15)',
        animation: 'float 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '300px', height: '300px',
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.2)',
        animation: 'float 3s ease-in-out infinite reverse'
      }} />

      {/* 主角色图标 */}
      <div style={{
        fontSize: '100px',
        animation: 'float 2s ease-in-out infinite',
        marginBottom: '24px',
        textShadow: '0 0 40px rgba(212,81,122,0.8)',
        filter: 'drop-shadow(0 0 20px rgba(212,81,122,0.6))'
      }}>
        🌸
      </div>

      {/* 游戏标题 */}
      <h1 style={{
        fontSize: '42px',
        fontWeight: '700',
        letterSpacing: '8px',
        marginBottom: '8px',
        background: 'linear-gradient(135deg, #F4A0C0, #C9A84C, #F4A0C0)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer 3s linear infinite'
      }}>
        锦年如雪
      </h1>
      <p style={{
        color: 'rgba(244,160,192,0.7)',
        fontSize: '16px',
        letterSpacing: '4px',
        marginBottom: '40px'
      }}>
        ✦ 古装养成游戏 ✦
      </p>

      {/* 加载条 */}
      <div style={{
        width: '280px', marginBottom: '20px'
      }}>
        <div style={{
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #D4517A, #C9A84C)',
            borderRadius: '2px',
            transition: 'width 0.1s ease',
            boxShadow: '0 0 10px rgba(212,81,122,0.6)'
          }} />
        </div>
      </div>

      {/* 加载提示 */}
      <p style={{
        color: 'rgba(244,160,192,0.6)',
        fontSize: '14px',
        letterSpacing: '2px',
        animation: 'fadeIn 0.5s ease',
        minHeight: '20px'
      }}>
        {phrases[phraseIndex]}
      </p>
    </div>
  );
}

