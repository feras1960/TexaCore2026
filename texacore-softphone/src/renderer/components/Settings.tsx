import React, { useState } from 'react';

interface SettingsProps {
  onSave: (config: any) => void;
}

export default function Settings({ onSave }: SettingsProps) {
  const [domain, setDomain] = useState(localStorage.getItem('pbx_domain') || '');
  const [extension, setExtension] = useState(localStorage.getItem('pbx_ext') || '');
  const [password, setPassword] = useState(localStorage.getItem('pbx_pass') || '');
  
  const [waitingForSync, setWaitingForSync] = useState(false);

  const handleManualSave = () => {
    localStorage.setItem('pbx_domain', domain);
    localStorage.setItem('pbx_ext', extension);
    localStorage.setItem('pbx_pass', password);
    onSave({ domain, extension, password });
  };

  const startSync = () => {
    setWaitingForSync(true);
    // Realtime logic will go here
  };

  return (
    <div className="settings-container">
      <h2 className="title" style={{ fontSize: 18 }}>الإعدادات</h2>
      
      <div className="sync-card">
        <h3>📱 الربط التلقائي بـ ERP</h3>
        <p>افتح إعدادات السنترال في المتصفح واضغط على "نقل الإعدادات"</p>
        <button 
          className={`btn-sync ${waitingForSync ? 'waiting' : ''}`}
          onClick={startSync}
        >
          {waitingForSync ? '⏳ جاري انتظار الإعدادات...' : '🔗 ابدأ الربط التلقائي'}
        </button>
      </div>

      <div className="divider">أو الإعداد اليدوي</div>

      <div className="form-group">
        <label>رابط السنترال (Domain)</label>
        <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="مثال: pbx.texacore.ai" />
      </div>
      
      <div className="form-group">
        <label>رقم التحويلة (Extension)</label>
        <input type="text" value={extension} onChange={e => setExtension(e.target.value)} placeholder="مثال: 100" />
      </div>

      <div className="form-group">
        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <button className="btn-save" onClick={handleManualSave}>حفظ الإعدادات</button>
    </div>
  );
}
