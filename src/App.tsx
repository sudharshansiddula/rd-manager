import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Settings, 
  ShieldCheck,
  Languages,
  LogOut
} from 'lucide-react';
import './App.css';
import { DashboardView } from './components/views/DashboardView';
import { MembersView } from './components/views/MembersView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { TransactionsView } from './components/views/TransactionsView';
import { GlobalSearch } from './components/views/GlobalSearch';
import { useI18n } from './locales/i18n';
import { StorageService } from './engine/storage';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  const [activeView, setActiveView] = useState<string>(() => {
    return StorageService.getSettings().defaultView || 'dashboard';
  });
  const { t, lang, setLang } = useI18n();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [navParams, setNavParams] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        StorageService.initSync();
      }
    });

    const handleNav = (e: any) => {
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
      {/* Sidebar */}
      <aside className="sidebar">
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
            <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: '13px', fontWeight: 600, color: lang === 'te' ? '#fff' : 'rgba(255,255,255,0.6)', padding: '4px 0', transition: 'color 0.3s' }}>
              తెలుగు
            </div>
            <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: '13px', fontWeight: 600, color: lang === 'en' ? '#fff' : 'rgba(255,255,255,0.6)', padding: '4px 0', transition: 'color 0.3s' }}>
              English
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>{t('dashboard')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'members' ? 'active' : ''}`}
            onClick={() => setActiveView('members')}
          >
            <Users size={20} />
            <span>{t('members')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveView('transactions')}
          >
            <History size={20} />
            <span>{t('transactions')}</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
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
        <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '18px', color: '#111827' }}>
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
