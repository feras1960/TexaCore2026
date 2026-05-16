import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCallHistory, CallRecord } from '../hooks/useCallHistory';

export default function CallHistory({ onCall }: { onCall: (number: string) => void }) {
  const { t } = useTranslation();
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

    if (diffMins < 1) return t('history.justNow');
    if (diffMins < 60) return t('history.minsAgo', { count: diffMins });
    if (diffHours < 24) return t('history.hoursAgo', { count: diffHours });
    if (diffDays === 1) return t('history.yesterday');
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}${t('history.min')} ${s}${t('history.sec')}`;
    return `${s}${t('history.sec')}`;
  };

  const formatActiveNumber = (num: string) => {
    if (num && num.startsWith('WEB|')) {
      const parts = num.split('|');
      const dev = parts[1] === 'mobile' ? t('app.mobile') : t('app.pc');
      const countryCode = parts[2];
      const ip = parts[3];
      const shortId = parts[4] || parts[2] || 'مجهول';

      let flag = '🌍';
      if (countryCode && countryCode.length === 2 && countryCode !== 'XX') {
        flag = String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
      }

      if (ip && ip.length > 5 && ip !== '0.0.0.0') {
         return `${flag} ${t('app.webVisitor')} (${dev}) - ${ip}`;
      } else {
         return `${flag} ${t('app.webVisitor')} (${dev}) - ${shortId}`;
      }
    }
    return num;
  };

  return (
    <div className="history-container">
      <div className="history-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('history.all')}</button>
        <button className={filter === 'missed' ? 'active' : ''} onClick={() => setFilter('missed')}>{t('history.missed')}</button>
        <button className={filter === 'inbound' ? 'active' : ''} onClick={() => setFilter('inbound')}>{t('history.inbound')}</button>
        <button className={filter === 'outbound' ? 'active' : ''} onClick={() => setFilter('outbound')}>{t('history.outbound')}</button>
      </div>

      <div className="history-list">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">{t('history.empty')}</div>
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
          {t('history.clearAll')}
        </button>
      )}
    </div>
  );
}
