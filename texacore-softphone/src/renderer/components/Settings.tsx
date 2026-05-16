import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  onSave: (config: any) => void;
}

export default function Settings({ onSave }: SettingsProps) {
  const { t, i18n } = useTranslation();
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

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="settings-container">
      <h2 className="title" style={{ fontSize: 18 }}>{t('settings.title')}</h2>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label>{t('settings.language')}</label>
        <select value={i18n.language} onChange={changeLanguage} style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#1f2937', color: 'white', border: '1px solid #374151' }}>
          <option value="ar">العربية (Arabic)</option>
          <option value="en">English</option>
          <option value="uk">Українська (Ukrainian)</option>
          <option value="ru">Русский (Russian)</option>
        </select>
      </div>
      
      <div className="sync-card">
        <h3>{t('settings.autoSync')}</h3>
        <p>{t('settings.autoSyncDesc')}</p>
        <button 
          className={`btn-sync ${waitingForSync ? 'waiting' : ''}`}
          onClick={startSync}
        >
          {waitingForSync ? t('settings.waitingSync') : t('settings.startSync')}
        </button>
      </div>

      <div className="divider">{t('settings.manual')}</div>

      <div className="form-group">
        <label>{t('settings.domain')}</label>
        <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="pbx.texacore.ai" dir="ltr" />
      </div>
      
      <div className="form-group">
        <label>{t('settings.extension')}</label>
        <input type="text" value={extension} onChange={e => setExtension(e.target.value)} placeholder="100" dir="ltr" />
      </div>

      <div className="form-group">
        <label>{t('settings.password')}</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
      </div>

      <button className="btn-save" onClick={handleManualSave}>{t('settings.save')}</button>
    </div>
  );
}
