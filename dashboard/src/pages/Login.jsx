import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Toast from '../components/Toast';

export default function Login({ setIsAuthenticated, setUser }) {
  const { t } = useTranslation();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load Cloudflare Turnstile script
  useEffect(() => {
    // Define callback function for Turnstile
    window.onTurnstileSuccess = (token) => {
      setTurnstileToken(token);
    };

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
      delete window.onTurnstileSuccess;
    };
  }, []);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/dashboard/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          navigate('/dashboard/servers');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    // Check for OAuth code in URL
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
      return;
    }

    // Check for error in URL
    const error = searchParams.get('error');
    if (error) {
      if (error === 'no_code') {
        setToast({ message: 'Authorization failed: No code received', type: 'error' });
      } else if (error === 'auth_failed') {
        setToast({ message: 'Authentication failed. Please try again.', type: 'error' });
      } else if (error === 'access_denied') {
        setToast({ message: 'You denied the authorization request', type: 'error' });
      }
    }

    checkAuth();
  }, [setIsAuthenticated, setUser, navigate, searchParams]);

  const handleOAuthCallback = async (code) => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        // Remove code from URL
        window.history.replaceState({}, document.title, '/dashboard/login');
        navigate('/dashboard/servers');
      } else {
        const error = await response.json();
        setToast({ 
          message: error.error || 'Authentication failed. Please try again.', 
          type: 'error' 
        });
        // Remove code from URL
        window.history.replaceState({}, document.title, '/dashboard/login');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setToast({ message: 'Authentication failed. Please try again.', type: 'error' });
      // Remove code from URL
      window.history.replaceState({}, document.title, '/dashboard/login');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    // Check if Turnstile token exists
    if (!turnstileToken) {
      setToast({ message: 'Please complete the security check', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Get OAuth URL from backend with Turnstile token
      const response = await fetch('/api/dashboard/auth/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ turnstileToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        setToast({ message: error.error || 'Failed to initiate login', type: 'error' });
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setToast({ message: 'Failed to initiate login', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="relative flex items-center justify-center h-screen bg-[#0f172a] overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-black shadow-2xl shadow-green-500/40 mb-6 overflow-hidden">
              <img src="/logo.webp" alt="SM Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Supreme <span className="gradient-text">Bot</span>
            </h1>
            <p className="text-slate-400 font-medium">Multi-Server Management Dashboard</p>
          </div>

          <div className="glass rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-white/10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{t('auth.welcomeBack')}</h2>
              <p className="text-slate-400 text-sm">Login to manage your Discord servers</p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm">Authenticating with Discord...</p>
              </div>
            ) : (
              <>
                {/* Cloudflare Turnstile */}
                <div className="mb-6 flex justify-center">
                  <div
                    className="cf-turnstile"
                    data-sitekey="0x4AAAAAACe1Ltn5pW6ar64p"
                    data-callback="onTurnstileSuccess"
                    data-theme="dark"
                  ></div>
                </div>

                <button
                  onClick={handleDiscordLogin}
                  disabled={loading || !turnstileToken}
                  className="group relative w-full gradient-bg hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/25 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <svg className="relative z-10 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.975 14.975 0 0 0 1.293-2.1a.07.07 0 0 0-.038-.098a13.11 13.11 0 0 1-1.872-.892a.072.072 0 0 1-.007-.12a10.15 10.15 0 0 0 .372-.294a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .076.01c.12.098.246.198.373.294a.072.072 0 0 1-.006.12a12.3 12.3 0 0 1-1.873.892a.077.077 0 0 0-.037.098a14.997 14.997 0 0 0 1.293 2.1a.078.078 0 0 0 .084.028a19.963 19.963 0 0 0 6.002-3.03a.079.079 0 0 0 .033-.057c.5-4.761-.838-8.888-3.553-12.548a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.93 2.155-2.157 2.155zm7.975 0c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.931 2.155-2.157 2.155z" />
                  </svg>
                  <span className="relative z-10">{t('auth.loginWithDiscord')}</span>
                </button>

                <div className="mt-6 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-xs text-indigo-300 font-medium mb-2">✨ What you can do:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Manage multiple Discord servers</li>
                    <li>• View server statistics & analytics</li>
                    <li>• Configure bot settings per server</li>
                    <li>• Track invites, tickets & more</li>
                  </ul>
                </div>
              </>
            )}
          </div>
          
          <p className="text-center mt-8 text-slate-600 text-xs font-medium tracking-widest uppercase">
            &copy; 2026 Supreme Bot &bull; All Rights Reserved
          </p>
        </div>
      </div>
    </>
  );
}
