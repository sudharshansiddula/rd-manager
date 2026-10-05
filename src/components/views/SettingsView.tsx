import React, { useState, useEffect } from 'react';
import { useI18n } from '../../locales/i18n';
import { StorageService } from '../../engine/storage';
import type { AppSettings } from '../../types';
import { Save, AlertCircle } from 'lucide-react';

export const SettingsView = () => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    console.log("StorageService keys:", Object.keys(StorageService));
    setSettings(StorageService.getSettings());
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
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
              style={{ fontSize: '12px', padding: '4px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
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
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
              value={settings.whatsappTemplate}
              onChange={(e) => handleSettingsChange({
                ...settings,
                whatsappTemplate: e.target.value
              })}
            />
          </div>
        </div>
      </div>


    </div>
  );
};
