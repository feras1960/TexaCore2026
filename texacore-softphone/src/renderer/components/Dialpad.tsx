import React from 'react';

interface DialpadProps {
  onDigit: (digit: string) => void;
  onCall: () => void;
  onBackspace: () => void;
}

const keys = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export default function Dialpad({ onDigit, onCall, onBackspace }: DialpadProps) {
  return (
    <div className="dialpad-grid">
      <div className="dialpad-keys">
        {keys.map((k) => (
          <button key={k.digit} className="dialpad-key" onClick={() => onDigit(k.digit)}>
            <span className="key-digit">{k.digit}</span>
            {k.sub && <span className="key-sub">{k.sub}</span>}
          </button>
        ))}
      </div>
      <div className="dialpad-actions">
        <button className="action-circle backspace-btn" onClick={onBackspace} title="حذف">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
        <button className="action-circle call-btn" onClick={onCall} title="اتصال">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
        </button>
        <div className="action-circle spacer"></div>
      </div>
    </div>
  );
}
