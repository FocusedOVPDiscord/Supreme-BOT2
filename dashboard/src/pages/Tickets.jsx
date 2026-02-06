import { useEffect, useState } from 'react';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/dashboard/tickets', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTickets(data);
        }
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Tickets</h1>

      {loading ? (
        <div className="text-white">Loading tickets...</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-white">Ticket ID</th>
                <th className="px-6 py-3 text-left text-white">User</th>
                <th className="px-6 py-3 text-left text-white">Status</th>
                <th className="px-6 py-3 text-left text-white">Created</th>
                <th className="px-6 py-3 text-left text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-gray-600 hover:bg-gray-700">
                    <td className="px-6 py-3 text-white">{ticket.id}</td>
                    <td className="px-6 py-3 text-gray-300">{ticket.user}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded text-sm ${
                        ticket.status === 'open' ? 'bg-green-600' : 'bg-red-600'
                      } text-white`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-300">{ticket.created}</td>
                    <td className="px-6 py-3">
                      <button className="text-blue-400 hover:text-blue-300">View</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-3 text-gray-400 text-center">
                    No tickets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
