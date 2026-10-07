import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Settings, 
  ShieldCheck,
  Languages,
  LogOut,
  Menu
} from 'lucide-react';
import './App.css';
import { DashboardView } from './components/views/DashboardView';
import { MembersView } from './components/views/MembersView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { TransactionsView } from './components/views/TransactionsView';
import { GlobalSearch } from './components/views/GlobalSearch';
import { useI18n } from './locales/i18n';
import { StorageService, storageEvents } from './engine/storage';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  const [activeView, setActiveView] = useState<string>(() => {
    return StorageService.getSettings().defaultView || 'dashboard';
  });
  const hasUserInteractedView = React.useRef(false);
  const { t, lang, setLang } = useI18n();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [navParams, setNavParams] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [textSize, setTextSize] = useState<number>(100);

  useEffect(() => {
    const handleDbUpdate = () => {
      const dbSettings = StorageService.getSettings();
      setZoomLevel(dbSettings.zoomLevel || 100);
      setTextSize(dbSettings.textSize || 100);

      // On initial app open / refresh, ensure default screen opens if user has not manually switched
      if (!hasUserInteractedView.current && dbSettings.defaultView) {
        setActiveView(dbSettings.defaultView);
      }
    };
    storageEvents.addEventListener('db_updated', handleDbUpdate);
    handleDbUpdate();
    return () => storageEvents.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  useEffect(() => {
    (document.body.style as any).zoom = `${zoomLevel}%`;
  }, [zoomLevel]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', (textSize / 100).toString());
  }, [textSize]);

  const handleTextSizeIn = () => {
    const newSize = Math.min(textSize + 10, 200);
    StorageService.saveSettings({ ...StorageService.getSettings(), textSize: newSize });
    setTextSize(newSize);
  };
  
  const handleTextSizeOut = () => {
    const newSize = Math.max(textSize - 10, 80);
    StorageService.saveSettings({ ...StorageService.getSettings(), textSize: newSize });
    setTextSize(newSize);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        StorageService.initSync(currentUser.uid);
      } else {
        StorageService.clearSync();
      }
    });

    const handleNav = (e: any) => {
      hasUserInteractedView.current = true;
      if (e.detail.view) setActiveView(e.detail.view);
      setNavParams(e.detail);
    };
    window.addEventListener('app-navigate', handleNav as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener('app-navigate', handleNav as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    try {
      StorageService.clearSync();
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f3f4f6' }}>
        <div style={{ color: '#4f46e5', fontWeight: 600 }}>Loading RD Manager...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'members':
        return <MembersView navParams={navParams} clearNavParams={() => setNavParams(null)} />;
      case 'transactions':
        return <TransactionsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <ShieldCheck size={28} color="#4f46e5" />
          <span>{t('appTitle')}</span>
        </div>
        
        {/* Language Switcher (Toggle) */}
        <div style={{ padding: '0 16px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <div 
            style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '20px', 
              padding: '4px',
              width: '100%',
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => setLang(lang === 'te' ? 'en' : 'te')}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: lang === 'te' ? '4px' : '50%',
              width: 'calc(50% - 4px)',
              background: '#4f46e5',
              borderRadius: '16px',
              transition: 'all 0.3s ease'
            }} />
            <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: lang === 'te' ? '#fff' : 'rgba(255,255,255,0.6)', padding: '4px 0', transition: 'color 0.3s' }}>
              తెలుగు
            </div>
            <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: `calc(13px * var(--text-scale, 1))`, fontWeight: 600, color: lang === 'en' ? '#fff' : 'rgba(255,255,255,0.6)', padding: '4px 0', transition: 'color 0.3s' }}>
              English
            </div>
          </div>
        </div>

        {/* Text Size Controls */}
        <div style={{ padding: '0 16px', marginBottom: '24px' }}>
          <div style={{ fontSize: `calc(12px * var(--text-scale, 1))`, color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textAlign: 'center' }}>
            Text Size
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '4px 12px'
          }}>
            <button 
              onClick={handleTextSizeOut}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: `calc(18px * var(--text-scale, 1))`, fontWeight: 'bold' }}
            >
              -
            </button>
            <span style={{ color: '#fff', fontSize: `calc(14px * var(--text-scale, 1))`, fontWeight: 600 }}>{textSize}%</span>
            <button 
              onClick={handleTextSizeIn}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: `calc(18px * var(--text-scale, 1))`, fontWeight: 'bold' }}
            >
              +
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { hasUserInteractedView.current = true; setActiveView('dashboard'); setIsSidebarOpen(false); }}
          >
            <LayoutDashboard size={20} />
            <span>{t('dashboard')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'members' ? 'active' : ''}`}
            onClick={() => { hasUserInteractedView.current = true; setActiveView('members'); setIsSidebarOpen(false); }}
          >
            <Users size={20} />
            <span>{t('members')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => { hasUserInteractedView.current = true; setActiveView('transactions'); setIsSidebarOpen(false); }}
          >
            <History size={20} />
            <span>{t('transactions')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => { hasUserInteractedView.current = true; setActiveView('settings'); setIsSidebarOpen(false); }}
          >
            <Settings size={20} />
            <span>{t('settings')}</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={20} style={{ marginRight: '12px' }} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} color="#111827" />
          </button>
          
          <div style={{ fontWeight: 600, fontSize: `calc(18px * var(--text-scale, 1))`, color: '#111827', flex: 1 }}>
            {activeView === 'dashboard' && t('overview')}
            {activeView === 'members' && t('membersDir')}
            {activeView === 'transactions' && t('transactions')}
            {activeView === 'settings' && t('settings')}
          </div>
          
          <GlobalSearch />
        </header>
        <div className="content-scroll">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;
