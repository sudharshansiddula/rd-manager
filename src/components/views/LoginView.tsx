import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export const LoginView: React.FC = () => {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f3f4f6',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ 
            background: '#eff6ff', 
            padding: '16px', 
            borderRadius: '50%',
            color: '#4f46e5'
          }}>
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#111827' }}>
          {t('appTitle') || 'RD Manager'}
        </h1>
        <p style={{ margin: '0 0 30px 0', color: '#6b7280', fontSize: '14px' }}>
          Secure Business Application. Please login to continue.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '12px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s'
          }}
        >
          {loading ? 'Connecting...' : (
            <>
              <LogIn size={20} style={{ marginRight: '8px' }} />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};
