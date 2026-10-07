import React, { useState, useEffect } from 'react';
import { useI18n } from '../../locales/i18n';
import { StorageService, storageEvents } from '../../engine/storage';
import type { AppSettings } from '../../types';
import { Save, AlertCircle, Shield } from 'lucide-react';

export const SettingsView = () => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());

    const handleDbUpdate = () => {
      setSettings(StorageService.getSettings());
    };
    storageEvents.addEventListener('db_updated', handleDbUpdate);
    
    return () => {
      storageEvents.removeEventListener('db_updated', handleDbUpdate);
    };
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  if (!settings || !settings.lateFine || settings.lateFine.rate === undefined) {
    // If settings are corrupted or partially loaded, reset them to default structure safely.
    return <div>{t('initializingSettings')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

      {/* App Settings Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          {t('appSettingsTitle')}
        </h3>

        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('defaultStartupScreen')}
          </h4>
          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px' }}>
            {t('chooseStartupScreen')}
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: t('dashboard'), icon: '📊' },
              { id: 'members', label: t('members'), icon: '👥' },
              { id: 'transactions', label: t('transactions'), icon: '📝' }
            ].map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', background: '#fff',
                  border: `2px solid ${settings.defaultView === option.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  opacity: settings.defaultView === option.id ? 1 : 0.7
                }}
              >
                <input
                  type="radio"
                  name="defaultView"
                  value={option.id}
                  checked={settings.defaultView === option.id}
                  onChange={(e) => handleSettingsChange({
                    ...settings,
                    defaultView: e.target.value as any
                  })}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  border: `2px solid ${settings.defaultView === option.id ? 'var(--primary)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {settings.defaultView === option.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
                </div>
                <span>{option.icon} {option.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Screen Zoom Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Screen Zoom
          </h4>
          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px' }}>
            Adjust the application zoom level to make elements larger or smaller.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)' }}>A</span>
              <input 
                type="range" 
                min="50" 
                max="200" 
                step="10"
                value={settings.zoomLevel || 100}
                onChange={(e) => {
                  const newSettings = { ...settings, zoomLevel: Number(e.target.value) };
                  setSettings(newSettings);
                  StorageService.saveSettings(newSettings);
                }}
                onKeyDown={(e) => {
                  let newZoom = settings.zoomLevel || 100;
                  if (e.key === 'ArrowRight') newZoom = Math.min(200, newZoom + 10);
                  if (e.key === 'ArrowLeft') newZoom = Math.max(50, newZoom - 10);
                  if (newZoom !== settings.zoomLevel) {
                    const newSettings = { ...settings, zoomLevel: newZoom };
                    setSettings(newSettings);
                    StorageService.saveSettings(newSettings);
                  }
                }}
                style={{ width: '150px', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: `calc(18px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-main)' }}>A</span>
            </div>
            
            <div style={{ fontWeight: 600, color: 'var(--primary)', width: '40px' }}>
              {settings.zoomLevel || 100}%
            </div>
            
            <button 
              className="btn"
              style={{ background: '#fff', border: '1px solid var(--border)', fontSize: `calc(12px * var(--text-scale, 1))`, padding: '6px 12px' }}
              onClick={() => {
                const newSettings = { ...settings, zoomLevel: 100 };
                handleSettingsChange(newSettings);
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Text Size Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Text Size
          </h4>
          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            Increase or decrease the size of text and labels across the application without affecting the overall layout. This works like a percentage zoom specifically for text (e.g. 110%, 120%).
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: `calc(12px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-muted)' }}>A</span>
              <input 
                type="range" 
                min="80" 
                max="200" 
                step="10"
                value={settings.textSize || 100}
                onChange={(e) => {
                  const newSettings = { ...settings, textSize: Number(e.target.value) };
                  setSettings(newSettings); // Local UI update immediately
                  // We also save to storage immediately. For range inputs, React 18 handles this fine if we don't drop updates.
                  StorageService.saveSettings(newSettings);
                }}
                onKeyDown={(e) => {
                  // Explicit keyboard support for left/right arrows if native fails
                  let newSize = settings.textSize || 100;
                  if (e.key === 'ArrowRight') newSize = Math.min(200, newSize + 10);
                  if (e.key === 'ArrowLeft') newSize = Math.max(80, newSize - 10);
                  if (newSize !== settings.textSize) {
                    const newSettings = { ...settings, textSize: newSize };
                    setSettings(newSettings);
                    StorageService.saveSettings(newSettings);
                  }
                }}
                style={{ width: '150px', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: `calc(18px * var(--text-scale, 1))`, fontWeight: 600, color: 'var(--text-main)' }}>A</span>
            </div>
            
            <div style={{ fontWeight: 600, color: 'var(--primary)', width: '40px' }}>
              {settings.textSize || 100}%
            </div>
            
            <button 
              className="btn"
              style={{ background: '#fff', border: '1px solid var(--border)', fontSize: `calc(12px * var(--text-scale, 1))`, padding: '6px 12px' }}
              onClick={() => {
                const newSettings = { ...settings, textSize: 100 };
                handleSettingsChange(newSettings);
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Members Settings Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          {t('membersSettingsTitle')}
        </h3>

        {/* Loan Settings Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('loanInterestRateConfig')}
          </h4>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                className="input-compact"
                value={settings.loanInterestRate ?? 2}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  loanInterestRate: Number(e.target.value)
                })}
                style={{ width: '100px' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>
        </div>

        {/* Late Fine Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('lateFineConfig')}
            <div title={t('lateFineTooltip')} style={{ cursor: 'help', display: 'flex' }}>
              <AlertCircle size={14} color="var(--text-muted)" />
            </div>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>{t('applyFinePeriodically')}</label>
              <select
                className="input-compact"
                value={settings.lateFine.period}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  lateFine: { ...settings.lateFine, period: e.target.value as any }
                })}
              >
                <option value="DAILY">{t('daily')}</option>
                <option value="MONTHLY">{t('monthly')}</option>
                <option value="YEARLY">{t('yearly')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('monthlyDueDate')}</label>
              <input
                type="number"
                className="input-compact"
                value={settings.lateFine.dueDate}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  lateFine: { ...settings.lateFine, dueDate: Number(e.target.value) }
                })}
              />
            </div>
            <div className="form-group">
              <label>{t('rateOfLateFine')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="input-compact"
                  value={settings.lateFine.rate}
                  onChange={(e) => handleSettingsChange({
                    ...settings,
                    lateFine: { ...settings.lateFine, rate: Number(e.target.value) }
                  })}
                  style={{ width: '100px' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Message Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('whatsappMessageConfig')}
            </h4>
            <button
              className="btn btn-secondary"
              style={{ fontSize: `calc(12px * var(--text-scale, 1))`, padding: '4px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}
              onClick={() => {
                if (window.confirm(t('resetConfirm'))) {
                  const defaultTemplate = t('whatsappDueMessage');
                  handleSettingsChange({ ...settings, whatsappTemplate: defaultTemplate });
                }
              }}
            >
              {t('resetToDefault')}
            </button>
          </div>
          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            {t('whatsappMsgCustomize')}<br />
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{name}`}</code>
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{totalDue}`}</code>
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{rdDue}`}</code>
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{loanInterestDue}`}</code>
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{lateFee}`}</code>
            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>{`{loanPrincipal}`}</code>
            <br /><br />
            <strong>{t('formattingTips')}</strong> {t('formattingTipsDesc')}
          </p>
          <div className="form-group">
            <textarea
              className="input"
              rows={10}
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: `calc(14px * var(--text-scale, 1))`, resize: 'vertical' }}
              value={settings.whatsappTemplate}
              onChange={(e) => handleSettingsChange({
                ...settings,
                whatsappTemplate: e.target.value
              })}
            />
          </div>
        </div>
      </div>

      {/* Advanced / Data Import Section */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginTop: '24px', border: '1px solid var(--danger)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--danger)', fontSize: `calc(16px * var(--text-scale, 1))`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Advanced (Data Import)
        </h3>
        <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          Upload a <strong>JSON backup file</strong> to replace your entire database. 
          <br /><strong>WARNING:</strong> This action will overwrite all existing data in Firebase and cannot be undone!
        </p>
        <div>
          <input 
            type="file" 
            accept=".json"
            id="import-json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const jsonStr = event.target?.result as string;
                  const dbData = JSON.parse(jsonStr);
                  if (window.confirm("WARNING: This will overwrite your existing Firebase database with the data from this file! Are you absolutely sure?")) {
                    StorageService.saveDb(dbData);
                    alert("Data successfully imported! The app will now sync with Firebase.");
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  }
                } catch (err) {
                  alert("Error parsing JSON file. Make sure it's valid.");
                  console.error(err);
                }
              };
              reader.readAsText(file);
              // Reset the input
              e.target.value = '';
            }}
          />
          <button 
            className="btn btn-primary" 
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => document.getElementById('import-json')?.click()}
          >
            Import JSON Data
          </button>
        </div>
      </div>
    </div>
  );
};
