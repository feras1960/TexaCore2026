import React, { useState } from 'react';

interface UserStatusBarProps {
  extension: string;
  isRegistered: boolean;
  onSettingsClick: () => void;
}

export default function UserStatusBar({ extension, isRegistered, onSettingsClick }: UserStatusBarProps) {
  const [status, setStatus] = useState<'available' | 'away' | 'busy' | 'dnd'>('available');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getStatusColor = () => {
    if (!isRegistered) return '#9ca3af'; // gray
    switch (status) {
      case 'available': return '#10b981'; // green
      case 'away': return '#f59e0b'; // yellow
      case 'busy': return '#ef4444'; // red
      case 'dnd': return '#ef4444'; // red
      default: return '#10b981';
    }
  };

  const getStatusText = () => {
    if (!isRegistered) return 'غير متصل';
    switch (status) {
      case 'available': return 'متاح';
      case 'away': return 'غائب';
      case 'busy': return 'مشغول';
      case 'dnd': return 'عدم الإزعاج';
      default: return 'متاح';
    }
  };

  return (
    <div className="user-status-bar">
      <div className="status-left" onClick={() => setDropdownOpen(!dropdownOpen)}>
        <span className="status-dot" style={{ backgroundColor: getStatusColor() }}></span>
        <span className="status-extension">Ext. {extension || '---'}</span>
        <span className="status-text">| {getStatusText()}</span>
        <span className="status-arrow">▼</span>
      </div>
      
      {dropdownOpen && (
        <div className="status-dropdown">
          <div onClick={() => { setStatus('available'); setDropdownOpen(false); }}>
            <span className="dot" style={{ backgroundColor: '#10b981' }}></span> متاح
          </div>
          <div onClick={() => { setStatus('away'); setDropdownOpen(false); }}>
            <span className="dot" style={{ backgroundColor: '#f59e0b' }}></span> غائب
          </div>
          <div onClick={() => { setStatus('busy'); setDropdownOpen(false); }}>
            <span className="dot" style={{ backgroundColor: '#ef4444' }}></span> مشغول
          </div>
        </div>
      )}

      <div className="status-right" onClick={onSettingsClick}>
        ⚙️
      </div>
    </div>
  );
}
