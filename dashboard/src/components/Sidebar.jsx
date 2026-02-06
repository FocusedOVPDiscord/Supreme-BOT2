import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar({ user, setIsAuthenticated }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await fetch('/api/dashboard/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setIsAuthenticated(false);
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/tickets', label: 'Tickets', icon: '🎫' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/giveaways', label: 'Giveaways', icon: '🎁' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {isOpen && <h1 className="text-xl font-bold">Supreme Bot</h1>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-700 rounded transition"
        >
          {isOpen ? '←' : '→'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded transition ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            title={!isOpen ? item.label : ''}
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700">
        {user && (
          <div className={`${isOpen ? 'block' : 'text-center'}`}>
            <p className="text-sm text-gray-400 truncate">{user.username}</p>
            <button
              onClick={handleLogout}
              className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition"
            >
              {isOpen ? 'Logout' : '🚪'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
