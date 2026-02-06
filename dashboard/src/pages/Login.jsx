import { useEffect } from 'react';

export default function Login({ setIsAuthenticated, setUser }) {
  useEffect(() => {
    // Check if we're returning from Discord OAuth
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Exchange code for token
      fetch('/api/dashboard/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
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
          alert('Login failed: ' + error.message);
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
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Supreme Bot</h1>
          <p className="text-gray-400 text-lg">Dashboard</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-lg max-w-md">
          <p className="text-gray-300 mb-6">Sign in with your Discord account to access the dashboard</p>

          <button
            onClick={handleDiscordLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.975 14.975 0 0 0 1.293-2.1a.07.07 0 0 0-.038-.098a13.11 13.11 0 0 1-1.872-.892a.072.072 0 0 1-.007-.12a10.15 10.15 0 0 0 .372-.294a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .076.01c.12.098.246.198.373.294a.072.072 0 0 1-.006.12a12.3 12.3 0 0 1-1.873.892a.077.077 0 0 0-.037.098a14.997 14.997 0 0 0 1.293 2.1a.078.078 0 0 0 .084.028a19.963 19.963 0 0 0 6.002-3.03a.079.079 0 0 0 .033-.057c.5-4.761-.838-8.888-3.553-12.548a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.93 2.155-2.157 2.155zm7.975 0c-1.183 0-2.157-.965-2.157-2.156c0-1.193.93-2.157 2.157-2.157c1.226 0 2.157.964 2.157 2.157c0 1.19-.931 2.155-2.157 2.155z" />
            </svg>
            Sign in with Discord
          </button>

          <p className="text-gray-500 text-sm mt-6">
            Only server staff members can access this dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
