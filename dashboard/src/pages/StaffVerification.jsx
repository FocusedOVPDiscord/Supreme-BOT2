import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function StaffVerification() {
    const { guildId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [excludedRoles, setExcludedRoles] = useState(['member', 'verified', 'everyone']);
    const [customExclude, setCustomExclude] = useState('');

    useEffect(() => {
        fetchStaffData();
    }, [guildId]);

    const fetchStaffData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/staff/verification/${guildId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch staff data');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addExcludedRole = () => {
        if (customExclude.trim() && !excludedRoles.includes(customExclude.toLowerCase().trim())) {
            setExcludedRoles([...excludedRoles, customExclude.toLowerCase().trim()]);
            setCustomExclude('');
        }
    };

    const removeExcludedRole = (role) => {
        setExcludedRoles(excludedRoles.filter(r => r !== role));
    };

    const isRoleExcluded = (roleName) => {
        const lowerName = roleName.toLowerCase();
        return excludedRoles.some(excluded => lowerName.includes(excluded));
    };

    const filteredStaff = data?.staffByRole.filter(item => !isRoleExcluded(item.role.name)) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading staff verification data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
                    <h2 className="text-red-500 text-xl font-bold mb-2">Error</h2>
                    <p className="text-gray-300">{error}</p>
                    <button
                        onClick={fetchStaffData}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 md:p-8 mb-8 border border-purple-500/30">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {data?.guild.icon && (
                            <img
                                src={data.guild.icon}
                                alt={data.guild.name}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-purple-500"
                            />
                        )}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                ✅ {data?.guild.name} Officials
                            </h1>
                            <p className="text-gray-300 mb-4">
                                Welcome to the <strong>only official verification hub</strong> of {data?.guild.name}.
                                <br />
                                Before you trust any server, account, or tag, always check this page first.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                                <div className="bg-gray-800/50 px-4 py-2 rounded-lg">
                                    <span className="text-gray-400">Server ID:</span>
                                    <span className="ml-2 font-mono text-purple-400">{data?.guild.id}</span>
                                </div>
                                <div className="bg-gray-800/50 px-4 py-2 rounded-lg">
                                    <span className="text-gray-400">Members:</span>
                                    <span className="ml-2 font-bold text-green-400">{data?.guild.memberCount}</span>
                                </div>
                                <div className="bg-gray-800/50 px-4 py-2 rounded-lg">
                                    <span className="text-gray-400">Created:</span>
                                    <span className="ml-2 text-blue-400">
                                        {data?.guild.createdAt && new Date(data.guild.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role Filter */}
                <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">🔧 Role Filter</h2>
                    <p className="text-gray-400 mb-4 text-sm">
                        Exclude low-level roles like "Member" or "Verified" from the staff list.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {excludedRoles.map(role => (
                            <span
                                key={role}
                                className="bg-red-900/30 border border-red-500 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                            >
                                {role}
                                <button
                                    onClick={() => removeExcludedRole(role)}
                                    className="text-red-400 hover:text-red-300 font-bold"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customExclude}
                            onChange={(e) => setCustomExclude(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addExcludedRole()}
                            placeholder="Add role keyword to exclude..."
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={addExcludedRole}
                            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Staff List */}
                <div className="space-y-6">
                    {filteredStaff.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700">
                            <p className="text-gray-400 text-lg">
                                No staff roles to display. Adjust the role filter to show more roles.
                            </p>
                        </div>
                    ) : (
                        filteredStaff.map(({ role, members }) => (
                            <div
                                key={role.id}
                                className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
                            >
                                {/* Role Header */}
                                <div
                                    className="p-4 md:p-6 border-b border-gray-700"
                                    style={{
                                        background: `linear-gradient(135deg, ${role.color}20, transparent)`
                                    }}
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <span className="text-3xl">{role.emoji}</span>
                                        <span style={{ color: role.color !== '#000000' ? role.color : '#ffffff' }}>
                                            {role.name}
                                        </span>
                                        <span className="text-gray-400 text-lg">– {members.length}</span>
                                    </h2>
                                </div>

                                {/* Members */}
                                <div className="p-4 md:p-6 space-y-6">
                                    {members.map(member => (
                                        <div
                                            key={member.id}
                                            className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition"
                                        >
                                            <div className="flex flex-col md:flex-row gap-4">
                                                {/* Avatar */}
                                                <img
                                                    src={member.avatar}
                                                    alt={member.username}
                                                    className="w-16 h-16 rounded-full border-2 border-purple-500 mx-auto md:mx-0"
                                                />

                                                {/* Member Info */}
                                                <div className="flex-1 space-y-2 text-center md:text-left">
                                                    <div>
                                                        <span className="text-gray-400 text-sm">Name:</span>
                                                        <span className="ml-2 font-bold text-lg">{member.tag}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-sm">User ID:</span>
                                                        <span className="ml-2 font-mono text-purple-400">{member.id}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-sm">Account created:</span>
                                                        <span className="ml-2 text-blue-400">
                                                            {new Date(member.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-sm">Role:</span>
                                                        <span
                                                            className="ml-2 font-semibold"
                                                            style={{ color: role.color !== '#000000' ? role.color : '#ffffff' }}
                                                        >
                                                            {role.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>Last updated: {new Date().toLocaleString()}</p>
                    <p className="mt-2">Only what is listed on this page is considered official.</p>
                </div>
            </div>
        </div>
    );
}
