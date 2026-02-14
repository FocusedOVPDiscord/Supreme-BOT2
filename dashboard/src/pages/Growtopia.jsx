import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Growtopia() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch items, stats, and leaderboard
      const [itemsRes, statsRes, leaderboardRes] = await Promise.all([
        fetch('/api/growtopia/items?limit=20'),
        fetch('/api/growtopia/stats'),
        fetch('/api/growtopia/leaderboard?limit=5')
      ]);

      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      const leaderboardData = await leaderboardRes.json();

      setItems(itemsData);
      setStats(statsData);
      setLeaderboard(leaderboardData.leaderboard);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const searchItems = async (term) => {
    if (!term) {
      fetchData();
      return;
    }

    try {
      const res = await fetch(`/api/growtopia/items?search=${encodeURIComponent(term)}&limit=20`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error('Error searching items:', error);
    }
  };

  const viewItemDetails = async (itemId) => {
    try {
      const [detailsRes, analysisRes] = await Promise.all([
        fetch(`/api/growtopia/item/${itemId}`),
        fetch(`/api/growtopia/item/${itemId}/analysis`)
      ]);

      const details = await detailsRes.json();
      const analysis = await analysisRes.json();

      setItemDetails({ ...details, analysis });
      setSelectedItem(itemId);
    } catch (error) {
      console.error('Error fetching item details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">🎮 Growtopia Price Tracker</h1>
        <p className="mt-2 opacity-90">AI-powered price predictions and market analysis</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Items</div>
            <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Price Entries</div>
            <div className="text-2xl font-bold text-white">{stats.totalPrices}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Contributors</div>
            <div className="text-2xl font-bold text-white">{stats.totalContributors}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Predictions</div>
            <div className="text-2xl font-bold text-white">{stats.totalPredictions}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-gray-800 rounded-lg p-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchItems(e.target.value);
              }}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => viewItemDetails(item.id)}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white capitalize">{item.item_name}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.description || 'No description'}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded">{item.rarity || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{item.price_count} prices</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white mb-4">🏆 Top Contributors</h2>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.user_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</span>
                    <span className="text-white">{entry.username}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{entry.total_points} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commands */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white mb-4">📝 Commands</h2>
            <div className="space-y-2 text-sm">
              <div className="text-gray-300"><code className="bg-gray-700 px-2 py-1 rounded">/item-add</code> - Add new item</div>
              <div className="text-gray-300"><code className="bg-gray-700 px-2 py-1 rounded">/price-add</code> - Submit price</div>
              <div className="text-gray-300"><code className="bg-gray-700 px-2 py-1 rounded">/price-predict</code> - Get predictions</div>
              <div className="text-gray-300"><code className="bg-gray-700 px-2 py-1 rounded">/price-chart</code> - View chart</div>
              <div className="text-gray-300"><code className="bg-gray-700 px-2 py-1 rounded">/my-stats</code> - Your stats</div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Details Modal */}
      {itemDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setItemDetails(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">{itemDetails.item.item_name}</h2>
                <p className="text-gray-400 mt-1">{itemDetails.item.description}</p>
              </div>
              <button onClick={() => setItemDetails(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>

            {/* Analysis */}
            {itemDetails.analysis && itemDetails.analysis.stats && !itemDetails.analysis.stats.error && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-gray-400 text-xs">Current Price</div>
                  <div className="text-xl font-bold text-white">{itemDetails.analysis.stats.currentPrice} WL</div>
                </div>
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-gray-400 text-xs">Average</div>
                  <div className="text-xl font-bold text-white">{itemDetails.analysis.stats.avgPrice} WL</div>
                </div>
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-gray-400 text-xs">Volatility</div>
                  <div className="text-xl font-bold text-yellow-400">{itemDetails.analysis.stats.volatilityLevel}</div>
                </div>
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-gray-400 text-xs">Risk Level</div>
                  <div className={`text-xl font-bold ${itemDetails.analysis.stats.riskLevel === 'High' ? 'text-red-400' : itemDetails.analysis.stats.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                    {itemDetails.analysis.stats.riskLevel}
                  </div>
                </div>
              </div>
            )}

            {/* Predictions */}
            {itemDetails.analysis && itemDetails.analysis.predictions && !itemDetails.analysis.predictions.error && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-3">🔮 Price Predictions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">1 Month</div>
                    <div className="text-white font-semibold">
                      {itemDetails.analysis.predictions.predicted1Month.min} - {itemDetails.analysis.predictions.predicted1Month.max} WL
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">6 Months</div>
                    <div className="text-white font-semibold">
                      {itemDetails.analysis.predictions.predicted6Months.min} - {itemDetails.analysis.predictions.predicted6Months.max} WL
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">1 Year</div>
                    <div className="text-white font-semibold">
                      {itemDetails.analysis.predictions.predicted1Year.min} - {itemDetails.analysis.predictions.predicted1Year.max} WL
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-400">
                  Confidence: {itemDetails.analysis.predictions.confidence}% | Data points: {itemDetails.analysis.predictions.dataPoints}
                </div>
              </div>
            )}

            {/* Price History */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">📊 Recent Prices</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {itemDetails.priceHistory.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-white font-semibold">{entry.price} WL</span>
                    <span className="text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
