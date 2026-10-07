import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../locales/i18n';
import { StorageService, storageEvents } from '../../engine/storage';
import type { AppSettings } from '../../types';
import { Save, AlertCircle, CheckCircle2, RotateCcw, Calculator, Eye, MessageSquare } from 'lucide-react';
import { DEFAULT_WHATSAPP_TEMPLATE_TE, DEFAULT_WHATSAPP_TEMPLATE_EN, buildWhatsAppMessage } from '../../utils';

export const SettingsView = () => {
  const { t, lang } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loaded = StorageService.getSettings();
    // If the template contains older placeholder tags, migrate to calculator formula template
    if (loaded.whatsappTemplate && (loaded.whatsappTemplate.includes('{rdCalc}') || loaded.whatsappTemplate.includes('• ఆర్డి పొదుపు బకాయిలు') || loaded.whatsappTemplate.includes('• RD Savings Due') || loaded.whatsappTemplate.includes('📋') || loaded.whatsappTemplate.includes('🔹') || loaded.whatsappTemplate.includes('\uFFFD'))) {
      loaded.whatsappTemplate = DEFAULT_WHATSAPP_TEMPLATE_TE;
      StorageService.saveSettings(loaded);
    }
    setSettings(loaded);

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

  const handleManualSave = () => {
    if (!settings) return;
    StorageService.saveSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleInsertTag = (tag: string) => {
    if (!settings) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      handleSettingsChange({
        ...settings,
        whatsappTemplate: (settings.whatsappTemplate || '') + tag
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = settings.whatsappTemplate || '';
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    
    handleSettingsChange({
      ...settings,
      whatsappTemplate: newText
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  if (!settings || !settings.lateFine || settings.lateFine.rate === undefined) {
    return <div style={{ padding: '24px' }}>{t('initializingSettings')}</div>;
  }

  const variableTags = [
    { tag: '{name}', label: lang === 'te' ? 'సభ్యుని పేరు' : 'Member Name' },
    { tag: '{totalDue}', label: lang === 'te' ? 'కట్టాల్సిన మొత్తం' : 'Total Due' },
    { tag: '{rdMonthly}', label: lang === 'te' ? 'నెలసరి పొదుపు' : 'Monthly RD' },
    { tag: '{pendingRDMonths}', label: lang === 'te' ? 'బాకీ ఆర్డీ నెలలు' : 'Pending RD Months' },
    { tag: '{rdDue}', label: lang === 'te' ? 'బాకీ ఉన్న ఆర్డీ' : 'RD Due' },
    { tag: '{loanPrincipal}', label: lang === 'te' ? 'మిగిలిన లోన్ అసలు' : 'Loan Principal' },
    { tag: '{loanInterestRate}', label: lang === 'te' ? 'వడ్డీ రేటు (%)' : 'Interest Rate %' },
    { tag: '{pendingLoanMonths}', label: lang === 'te' ? 'బాకీ వడ్డీ నెలలు' : 'Pending Loan Months' },
    { tag: '{loanInterestDue}', label: lang === 'te' ? 'బాకీ ఉన్న వడ్డీ' : 'Loan Interest Due' },
    { tag: '{lateFineRate}', label: lang === 'te' ? 'లేట్ ఫైన్ రేటు (%)' : 'Late Fine Rate %' },
    { tag: '{lateFineMonths}', label: lang === 'te' ? 'లేట్ ఫైన్ నెలలు' : 'Late Fine Months' },
    { tag: '{lateFee}', label: lang === 'te' ? 'లేట్ ఫైన్' : 'Late Fine' },
    { tag: '{totalLoanTaken}', label: lang === 'te' ? 'మొత్తం అప్పు' : 'Total Loan Taken' },
    { tag: '{loanDate}', label: lang === 'te' ? 'అప్పు తేదీ' : 'Loan Date' },
    { tag: '{rdCalc}', label: lang === 'te' ? 'ఆర్డీ ఫార్ములా' : 'RD Formula' },
    { tag: '{loanInterestCalc}', label: lang === 'te' ? 'వడ్డీ ఫార్ములా' : 'Interest Formula' },
    { tag: '{lateFeeCalc}', label: lang === 'te' ? 'లేట్ ఫైన్ ఫార్ములా' : 'Late Fine Formula' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>

      {/* Sticky Top Header with Single Save Button (Fixed at top while scrolling) */}
      <div style={{
        position: 'sticky',
        top: '-24px',
        zIndex: 50,
        backgroundColor: '#ffffff',
        padding: '16px 24px',
        margin: '-24px -24px 0 -24px',
        borderBottom: '2px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: `calc(18px * var(--text-scale, 1))`, fontWeight: 700, color: 'var(--text-main)' }}>
            {t('settings')}
          </h2>
          <span style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)' }}>
            {lang === 'te' ? 'మీ మార్పులు వెంటనే స్థానికంగా మరియు క్లౌడ్ డేటాబేస్ లో సేవ్ అవుతాయి.' : 'Changes are automatically saved to local storage and database.'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 600, fontSize: `calc(14px * var(--text-scale, 1))` }}>
              <CheckCircle2 size={18} />
              <span>{t('settingsSavedSuccess')}</span>
            </div>
          )}
          <button
            onClick={handleManualSave}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: `calc(14px * var(--text-scale, 1))`,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Save size={18} />
            <span>{t('save')}</span>
          </button>
        </div>
      </div>

      {/* App Settings Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          {t('appSettingsTitle')}
        </h3>

        {/* 1. Default Startup Screen */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 20px', background: '#fff',
                  border: `2px solid ${settings.defaultView === option.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '8px', cursor: 'pointer',
                  fontWeight: settings.defaultView === option.id ? 600 : 400,
                  boxShadow: settings.defaultView === option.id ? '0 2px 8px rgba(79, 70, 229, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
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
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: `2px solid ${settings.defaultView === option.id ? 'var(--primary)' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {settings.defaultView === option.id && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--primary)' }} />}
                </div>
                <span style={{ fontSize: `calc(14px * var(--text-scale, 1))` }}>{option.icon} {option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Screen Zoom Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  handleSettingsChange(newSettings);
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
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Text Size
          </h4>
          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            Increase or decrease the size of text and labels across the application without affecting the overall layout.
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
                  handleSettingsChange(newSettings);
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
          <div className="form-group" style={{ maxWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-compact"
                value={settings.loanInterestRate ?? 2}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleSettingsChange({
                    ...settings,
                    loanInterestRate: isNaN(val) ? 0 : val
                  });
                }}
                style={{ width: '120px' }}
              />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>% / {t('monthly')}</span>
            </div>
          </div>
        </div>

        {/* Late Fine Section */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('lateFineConfig')}
            <div title={t('lateFineTooltip')} style={{ cursor: 'help', display: 'flex' }}>
              <AlertCircle size={15} color="var(--text-muted)" />
            </div>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px' }}>{t('applyFinePeriodically')}</label>
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
              <label style={{ fontWeight: 600, marginBottom: '6px' }}>{t('monthlyDueDate')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="input-compact"
                  value={settings.lateFine.dueDate}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    handleSettingsChange({
                      ...settings,
                      lateFine: { ...settings.lateFine, dueDate: isNaN(parsed) ? 1 : Math.min(31, Math.max(1, parsed)) }
                    });
                  }}
                  style={{ width: '120px' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>({lang === 'te' ? 'ప్రతి నెల' : 'Every Month'})</span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px' }}>{t('rateOfLateFine')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input-compact"
                  value={settings.lateFine.rate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleSettingsChange({
                      ...settings,
                      lateFine: { ...settings.lateFine, rate: isNaN(val) ? 0 : val }
                    });
                  }}
                  style={{ width: '120px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Message Section with Calculator Formulas */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} color="var(--primary)" />
              {t('whatsappMessageConfig')}
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: `calc(13px * var(--text-scale, 1))`, padding: '6px 14px', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye size={14} />
                {showPreview ? (lang === 'te' ? 'ప్రివ్యూ దాచు' : 'Hide Preview') : (lang === 'te' ? 'ప్రివ్యూ చూడు' : 'Show Preview')}
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: `calc(13px * var(--text-scale, 1))`, padding: '6px 14px', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  if (window.confirm(t('resetConfirm'))) {
                    handleSettingsChange({ ...settings, whatsappTemplate: lang === 'te' ? DEFAULT_WHATSAPP_TEMPLATE_TE : DEFAULT_WHATSAPP_TEMPLATE_EN });
                  }
                }}
              >
                <RotateCcw size={14} />
                {t('resetToDefault')}
              </button>
            </div>
          </div>

          <p style={{ fontSize: `calc(13px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.6' }}>
            {lang === 'te' 
              ? 'సభ్యునికి పంపే వాట్సాప్ మెసేజ్ లో క్యాలిక్యులేటర్ లాగా స్పష్టమైన గణిత ఫార్ములాలతో (నెలవారీ x నెలలు = మొత్తం) వివరాలు చూపబడతాయి. కింది వేరియబుల్స్ క్లిక్ చేసి టెంప్లేట్ లో ఎక్కడైనా వాడుకోవచ్చు:' 
              : 'The message shows clear calculator formulas (Amount x Months = Total) to members. Click any variable below to insert into the template:'}
          </p>

          {/* Interactive Tag Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {variableTags.map(item => (
              <button
                key={item.tag}
                type="button"
                onClick={() => handleInsertTag(item.tag)}
                style={{
                  background: '#e0e7ff',
                  border: '1px solid #c7d2fe',
                  color: '#3730a3',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: `calc(12px * var(--text-scale, 1))`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s'
                }}
                title={`Click to insert ${item.tag}`}
              >
                <code>{item.tag}</code>
                <span style={{ fontSize: '11px', color: '#4338ca' }}>({item.label})</span>
              </button>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <textarea
              ref={textareaRef}
              className="input"
              rows={15}
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: `calc(13.5px * var(--text-scale, 1))`,
                lineHeight: '1.6',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              value={settings.whatsappTemplate}
              onChange={(e) => handleSettingsChange({
                ...settings,
                whatsappTemplate: e.target.value
              })}
            />
          </div>

          <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'var(--text-muted)', marginBottom: '16px' }}>
            <strong>{t('formattingTips')}</strong> {t('formattingTipsDesc')}
          </div>

          {/* WhatsApp Live Simulation Preview */}
          {showPreview && (
            <div style={{ backgroundColor: '#eae6df', borderRadius: '12px', padding: '16px', border: '1px solid #d1ccc0', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#075e54', fontWeight: 700, fontSize: `calc(13px * var(--text-scale, 1))` }}>
                  <MessageSquare size={16} />
                  <span>{lang === 'te' ? 'వాట్సాప్ సందేశం ప్రత్యక్ష ప్రివ్యూ (నమూనా సభ్యుని వివరాలు)' : 'WhatsApp Message Live Preview (Sample Member Data)'}</span>
                </div>
                <span style={{ fontSize: '11px', backgroundColor: '#128c7e', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  WhatsApp Preview
                </span>
              </div>

              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px 8px 8px 0px',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                maxWidth: '560px',
                fontSize: `calc(13px * var(--text-scale, 1))`,
                lineHeight: '1.65',
                color: '#111b21',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}>
                {buildWhatsAppMessage(settings.whatsappTemplate, {
                  name: lang === 'te' ? 'రమేష్' : 'Ramesh Kumar',
                  totalDue: 3060,
                  rdDue: 2000,
                  monthlyContribution: 1000,
                  pendingRDMonths: 2,
                  loanPrincipal: 50000,
                  totalLoanTaken: 50000,
                  loanDisbursementDate: '2026-01-10',
                  loanInterestRate: settings.loanInterestRate ?? 2,
                  pendingLoanMonths: 1,
                  loanInterestDue: 1000,
                  lateFee: 60,
                  lateFineRate: settings.lateFine?.rate ?? 2,
                  lateFineMultiplier: 2
                }).split('\n').map((line, idx) => {
                  const formatted = line
                    .replace(/\*([^*\n]+)\*/g, '<strong style="font-weight: 700; color: #111b21;">$1</strong>')
                    .replace(/_([^_\n]+)_/g, '<em style="font-style: italic; color: #3b4a54;">$1</em>');
                  return (
                    <div key={idx} style={{ minHeight: '1.25em' }} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced / Data Import Section */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginTop: '8px', border: '1px solid var(--danger)' }}>
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
                    StorageService.saveDb(dbData, true);
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
