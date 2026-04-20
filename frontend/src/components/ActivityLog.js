import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ActivityLog({ apiBase }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/log`);
      setLogs(res.data.data);
    } catch (err) {
      console.error('获取日志失败:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(); // eslint-disable-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const getLogIcon = (action) => {
    if (action.includes('课程') || action.includes('修炼')) return '📚';
    if (action.includes('服装') || action.includes('配饰')) return '👗';
    if (action.includes('对话')) return '💬';
    if (action.includes('购买')) return '💰';
    if (action.includes('签到') || action.includes('奖励')) return '🎁';
    if (action.includes('游戏')) return '🎮';
    return '📜';
  };

  return (
    <div>
      {/* 日记标题 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(212,81,122,0.1))',
        border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px',
        padding: '20px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <span style={{ fontSize: '48px', animation: 'float 3s ease-in-out infinite' }}>📜</span>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '22px', fontWeight: '700', margin: '0 0 4px',
            background: 'linear-gradient(135deg, #C4B5FD, #F4A0C0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            凌若雪的日记
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,230,236,0.5)', margin: 0 }}>
            记录每一段珍贵的成长时光
          </p>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            background: 'transparent', border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '8px', color: '#C4B5FD', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', padding: '6px 14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(139,92,246,0.15)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          🔄 刷新
        </button>
      </div>

      {/* 日志列表 */}
      {loading ? (
        <div style={{
          textAlign: 'center', padding: '40px',
          color: 'rgba(245,230,236,0.3)', fontSize: '14px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px', animation: 'float 1s ease-in-out infinite' }}>
            📜
          </div>
          翻阅日记中...
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          background: 'rgba(30,10,20,0.6)', border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: '16px', padding: '40px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📖</div>
          <p style={{ color: 'rgba(245,230,236,0.4)', fontSize: '14px' }}>
            日记尚空白，快去开始你的传奇之旅吧！
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* 时间轴线 */}
          <div style={{
            position: 'absolute', left: '28px', top: '20px', bottom: '20px', width: '2px',
            background: 'linear-gradient(180deg, rgba(212,81,122,0.5), rgba(139,92,246,0.2))',
            zIndex: 0
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log, index) => (
              <div key={log.id} style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                animation: `slideInLeft 0.3s ease ${index * 0.05}s both`
              }}>
                {/* 时间轴节点 */}
                <div style={{
                  width: '56px', flexShrink: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', paddingTop: '4px',
                  position: 'relative', zIndex: 1
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: index === 0
                      ? 'linear-gradient(135deg, #D4517A, #A03058)'
                      : 'rgba(30,10,20,0.9)',
                    border: `2px solid ${index === 0 ? '#D4517A' : 'rgba(212,81,122,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    boxShadow: index === 0 ? '0 4px 12px rgba(212,81,122,0.4)' : 'none'
                  }}>
                    {getLogIcon(log.action)}
                  </div>
                </div>

                {/* 内容卡片 */}
                <div style={{
                  flex: 1, background: 'rgba(30,10,20,0.7)',
                  border: `1px solid ${index === 0 ? 'rgba(212,81,122,0.3)' : 'rgba(212,81,122,0.1)'}`,
                  borderRadius: '12px', padding: '12px 16px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid rgba(212,81,122,0.3)';
                  e.currentTarget.style.background = 'rgba(40,15,25,0.8)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = `1px solid ${index === 0 ? 'rgba(212,81,122,0.3)' : 'rgba(212,81,122,0.1)'}`;
                  e.currentTarget.style.background = 'rgba(30,10,20,0.7)';
                }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '700',
                      color: index === 0 ? '#F4A0C0' : 'rgba(245,230,236,0.7)'
                    }}>
                      {log.action}
                    </span>
                    <span style={{
                      fontSize: '10px', color: 'rgba(245,230,236,0.3)',
                      whiteSpace: 'nowrap', marginLeft: '8px'
                    }}>
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px', color: 'rgba(245,230,236,0.5)',
                    lineHeight: '1.6', margin: 0,
                    fontStyle: 'italic',
                    borderLeft: '2px solid rgba(212,81,122,0.2)',
                    paddingLeft: '8px'
                  }}>
                    {log.result}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 底部装饰 */}
          {logs.length >= 20 && (
            <div style={{
              textAlign: 'center', padding: '20px',
              color: 'rgba(245,230,236,0.2)', fontSize: '12px'
            }}>
              ～ 仅显示最近20条记录 ～
            </div>
          )}
        </div>
      )}
    </div>
  );
}

