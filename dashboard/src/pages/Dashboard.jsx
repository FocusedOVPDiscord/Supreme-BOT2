import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white text-xl">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={stats?.totalMembers || 0}
          icon="👥"
          color="bg-blue-600"
        />
        <StatCard
          title="Active Tickets"
          value={stats?.activeTickets || 0}
          icon="🎫"
          color="bg-green-600"
        />
        <StatCard
          title="Total Trades"
          value={stats?.totalTrades || 0}
          icon="💱"
          color="bg-purple-600"
        />
        <StatCard
          title="Bot Uptime"
          value={stats?.uptime ? formatUptime(stats.uptime) : 'N/A'}
          icon="⏱️"
          color="bg-orange-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Tickets</h2>
          <div className="space-y-3">
            {stats?.recentTickets?.length > 0 ? (
              stats.recentTickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-700 p-3 rounded">
                  <p className="text-white font-semibold">{ticket.title}</p>
                  <p className="text-gray-400 text-sm">{ticket.status}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No recent tickets</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Server Info</h2>
          <div className="space-y-3">
            <InfoRow label="Server Name" value={stats?.serverName || 'N/A'} />
            <InfoRow label="Channels" value={stats?.channels || 0} />
            <InfoRow label="Roles" value={stats?.roles || 0} />
            <InfoRow label="Bot Status" value={stats?.botStatus || 'Offline'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`${color} rounded-lg p-6 text-white`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-200 text-sm">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}
