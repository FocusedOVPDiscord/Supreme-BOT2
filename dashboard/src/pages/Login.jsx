import { useEffect, useState } from 'react';

export default function Login({ setIsAuthenticated, setUser }) {
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check if already authenticated and redirect to dashboard
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/dashboard/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          // Redirect to dashboard
          window.location.href = '/dashboard';
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, [setIsAuthenticated, setUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      fetch('/api/dashboard/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, rememberMe }),
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setIsAuthenticated(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (data.error) {
            alert('Login failed: ' + data.error);
          }
        })
        .catch((error) => {
          console.error('OAuth callback failed:', error);
        });
    }
  }, [setIsAuthenticated, setUser]);

  const handleDiscordLogin = () => {
    const clientId = '1459183931005075701';
    const redirectUri = `${window.location.origin}/dashboard/login`;
    const scope = 'identify guilds';
    const responseType = 'code';

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-[#0f172a] overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-bg shadow-2xl shadow-indigo-500/40 mb-6">
            <span className="text-4xl font-black text-white">S</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Supreme <span className="gradient-text">Bot</span></h1>
          <p className="text-slate-400 font-medium">Management Dashboard v2.4</p>
        </div>

        <div className="glass rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-white/10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm">Please sign in with your Discord account to access the staff panel.</p>
          </div>

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900/50 border-white/10 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-slate-300">
                Remember me for 30 days
              </span>
            </label>
          </div>

          <button
            onClick={handleDiscordLogin}
            className="group relative w-full gradient-bg hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/25 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <svg className="relative z-10 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.975 14.975 0 0 0 1.293-2.1a.07.07 0 0 0-.038-.098a13.11 13.11 0 0 1-1.872-.892a.072.072 0 0 1-.007-.12a10.15 10.15 0 0 0 .372-.294a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .076.01c.12.098.246.198.373.294a.072.072 0 0 1-.006.12a12.3 12.3 0 0 1-1.873.892a.077.077 0 0 0-.037.098a14.997 14.997 0 0 0 1.293 2.1a.078.078 0 0 0 .084.028a19.963 19.963 0 0 0 6.002-3.03a.079.079 0 0 0 .033-.057c.5-4.761-.838-8.888-3.553-12.548a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.93 2.155-2.157 2.155zm7.975 0c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.931 2.155-2.157 2.155z" />
            </svg>
            <span className="relative z-10">Continue with Discord</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800/50 text-slate-400">or</span>
            </div>
          </div>

          <a
            href="/dashboard/email-login"
            className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-2xl transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Login with Email</span>
          </a>

          <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {i}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium">Trusted by the Supreme Staff Team</p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-600 text-xs font-medium tracking-widest uppercase">
          &copy; 2026 Supreme Bot &bull; All Rights Reserved
        </p>
      </div>
    </div>
  );
}
