import React from 'react';

const typeConfig = {
  success:   { icon: '✅', border: 'rgba(52, 211, 153, 0.5)',  bg: 'rgba(52, 211, 153, 0.08)'  },
  error:     { icon: '❌', border: 'rgba(239, 68, 68, 0.5)',   bg: 'rgba(239, 68, 68, 0.08)'   },
  warning:   { icon: '⚠️', border: 'rgba(251, 191, 36, 0.5)',  bg: 'rgba(251, 191, 36, 0.08)'  },
  dialogue:  { icon: '💬', border: 'rgba(96, 165, 250, 0.5)',  bg: 'rgba(96, 165, 250, 0.08)'  },
  info:      { icon: 'ℹ️', border: 'rgba(212, 81, 122, 0.5)',  bg: 'rgba(212, 81, 122, 0.08)'  },
  narrative: { icon: '📖', border: 'rgba(201, 168, 76, 0.5)',  bg: 'rgba(201, 168, 76, 0.06)'  },
};

export default function Toast({ message, type = 'info', onClose }) {
  const config = typeConfig[type] || typeConfig.info;
  const isNarrative = type === 'narrative';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'relative',
        background: isNarrative
          ? 'linear-gradient(135deg, rgba(20,10,5,0.97), rgba(35,20,8,0.97))'
          : 'rgba(20, 8, 15, 0.95)',
        border: `1px solid ${config.border}`,
        borderLeft: `3px solid ${config.border}`,
        borderRadius: '10px',
        padding: isNarrative ? '14px 18px' : '12px 16px',
        animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1) both',
        maxWidth: isNarrative ? '420px' : '340px',
        width: isNarrative ? '420px' : 'max-content',
        backdropFilter: 'blur(20px)',
        boxShadow: isNarrative
          ? `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${config.bg}, inset 0 1px 0 rgba(201,168,76,0.1)`
          : `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${config.bg}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: isNarrative ? '18px' : '16px', flexShrink: 0, lineHeight: '1.5' }}>{config.icon}</span>
      <p style={{
        color: isNarrative ? 'rgba(245, 225, 180, 0.92)' : '#F5E6EC',
        fontSize: isNarrative ? '13px' : '13px',
        lineHeight: isNarrative ? '1.8' : '1.55',
        fontFamily: 'inherit',
        margin: 0,
        wordBreak: 'break-all',
        fontStyle: isNarrative ? 'italic' : 'normal',
        letterSpacing: isNarrative ? '0.3px' : 'normal',
      }}>
        {message}
      </p>
    </div>
  );
}
