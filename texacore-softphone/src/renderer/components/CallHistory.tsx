import React, { useState } from 'react';
import { useCallHistory, CallRecord } from '../hooks/useCallHistory';

export default function CallHistory({ onCall }: { onCall: (number: string) => void }) {
  const { history, clearHistory, deleteRecord } = useCallHistory();
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all');

  const filteredHistory = history.filter(record => {
    if (filter === 'all') return true;
    return record.direction === filter;
  });

  const getIcon = (direction: string) => {
    switch (direction) {
      case 'inbound': return <span style={{ color: '#10b981' }}>↙️</span>;
      case 'outbound': return <span style={{ color: '#3b82f6' }}>↗️</span>;
      case 'missed': return <span style={{ color: '#ef4444' }}>❌</span>;
      default: return '📞';
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    return date.toLocaleDateString('ar-SA');
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}د ${s}ث`;
    return `${s}ث`;
  };

  const formatActiveNumber = (num: string) => {
    if (num && num.startsWith('WEB|')) {
      const parts = num.split('|');
      const dev = parts[1] === 'mobile' ? 'جوال' : 'كمبيوتر';
      const countryCode = parts[2];
      const ip = parts[3];
      const shortId = parts[4] || parts[2] || 'مجهول';

      let flag = '🌍';
      if (countryCode && countryCode.length === 2 && countryCode !== 'XX') {
        flag = String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
      }

      if (ip && ip.length > 5 && ip !== '0.0.0.0') {
         return `${flag} زائر موقع (${dev}) - ${ip}`;
      } else {
         return `${flag} زائر موقع (${dev}) - ${shortId}`;
      }
    }
    return num;
  };

  return (
    <div className="history-container">
      <div className="history-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>الكل</button>
        <button className={filter === 'missed' ? 'active' : ''} onClick={() => setFilter('missed')}>فائتة</button>
        <button className={filter === 'inbound' ? 'active' : ''} onClick={() => setFilter('inbound')}>واردة</button>
        <button className={filter === 'outbound' ? 'active' : ''} onClick={() => setFilter('outbound')}>صادرة</button>
      </div>

      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">لا توجد مكالمات</div>
        ) : (
          filteredHistory.map(record => (
            <div key={record.id} className="history-item">
              <div className="history-icon">{getIcon(record.direction)}</div>
              <div className="history-details" onClick={() => onCall(record.number)}>
                <div className={`history-number ${record.direction === 'missed' ? 'missed' : ''}`}>
                  {record.name || formatActiveNumber(record.number)}
                </div>
                <div className="history-meta">
                  {formatTimeAgo(record.timestamp)} {record.duration > 0 && `• ${formatDuration(record.duration)}`}
                </div>
              </div>
              <button className="btn-delete-record" onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }}>
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <button className="btn-clear-history" onClick={clearHistory}>
          مسح السجل بالكامل
        </button>
      )}
    </div>
  );
}
