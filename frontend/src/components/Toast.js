import React from 'react';

const typeConfig = {
  success: { icon: '✅', border: 'rgba(52, 211, 153, 0.5)', bg: 'rgba(52, 211, 153, 0.1)' },
  error: { icon: '❌', border: 'rgba(239, 68, 68, 0.5)', bg: 'rgba(239, 68, 68, 0.1)' },
  warning: { icon: '⚠️', border: 'rgba(251, 191, 36, 0.5)', bg: 'rgba(251, 191, 36, 0.1)' },
  dialogue: { icon: '💬', border: 'rgba(96, 165, 250, 0.5)', bg: 'rgba(96, 165, 250, 0.1)' },
  info: { icon: 'ℹ️', border: 'rgba(212, 81, 122, 0.5)', bg: 'rgba(212, 81, 122, 0.1)' },
};

export default function Toast({ message, type = 'info', onClose }) {
  const config = typeConfig[type] || typeConfig.info;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: 'rgba(20, 8, 15, 0.95)',
      border: `1px solid ${config.border}`,
      borderRadius: '12px',
      padding: '16px 20px',
      zIndex: 9999,
      animation: 'slideInRight 0.3s ease',
      maxWidth: '380px',
      backdropFilter: 'blur(20px)',
      boxShadow: `0 8px 32px ${config.border}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      cursor: 'pointer'
    }} onClick={onClose}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{config.icon}</span>
      <p style={{
        color: '#F5E6EC',
        fontSize: '14px',
        lineHeight: '1.5',
        fontFamily: 'inherit'
      }}>
        {message}
      </p>
    </div>
  );
}

