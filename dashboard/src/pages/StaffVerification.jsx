import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Toast from '../components/Toast';

export default function StaffVerification() {
    const { guildId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const [editingMember, setEditingMember] = useState(null);
    const [editForm, setEditForm] = useState({ mainEpic: '', additionalMM: '', customNotes: '' });
    const [saving, setSaving] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchStaffData();
    }, [guildId]);

    const fetchStaffData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/staff/verification/${guildId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to fetch staff data');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };



    const openEditModal = (member) => {
        setEditingMember(member);
        setEditForm({
            mainEpic: member.mainEpic || '',
            additionalMM: member.additionalMM || '',
            customNotes: member.customNotes || ''
        });
    };

    const closeEditModal = () => {
        setEditingMember(null);
        setEditForm({ mainEpic: '', additionalMM: '', customNotes: '' });
    };

    const saveStaffInfo = async () => {
        if (!editingMember) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/staff/info/${guildId}/${editingMember.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) {
                throw new Error('Failed to save staff info');
            }

            // Refresh data
            await fetchStaffData();
            closeEditModal();
            
            // Show success message
            setToast({ message: 'Staff info saved successfully!', type: 'success' });

        } catch (err) {
            setToast({ message: 'Error: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const updateAllEmbeds = async () => {
        if (!confirm('This will update all Discord verification embeds for this server. Continue?')) {
            return;
        }

        try {
            setUpdating(true);
            const response = await fetch(`/api/staff/embed/${guildId}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to update embeds');
            }

            const result = await response.json();
            setToast({ message: result.message, type: 'success' });

        } catch (err) {
            setToast({ message: 'Error: ' + err.message, type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const filteredStaff = data?.staffByRole || [];

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
        <>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
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
                        <button
                            onClick={updateAllEmbeds}
                            disabled={updating}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
                        >
                            {updating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    🔄 Update Discord Embeds
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Info Notice */}
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-bold mb-2 text-blue-400">ℹ️ Auto-Filtered Staff Roles</h2>
                    <p className="text-gray-300 text-sm">
                        This page automatically shows only verified staff roles: <strong>Founder, Moderator, Senior Middleman, Trainee Middleman, and Trusted</strong>.
                    </p>
                </div>

                {/* Staff List */}
                <div className="space-y-6">
                    {filteredStaff.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700">
                            <p className="text-gray-400 text-lg">
                                No staff members found with verified roles.
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
                                                <div className="flex-1 space-y-1 text-center md:text-left">
                                                    <div>
                                                        <span className="text-white font-bold">Name:</span>
                                                        <span className="ml-1">@{member.username}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white font-bold">User ID:</span>
                                                        <span className="ml-1">{member.id}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white font-bold">Account created:</span>
                                                        <span className="ml-1">
                                                            {new Date(member.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white font-bold">Role:</span>
                                                        <span
                                                            className="ml-1"
                                                            style={{ color: role.color !== '#000000' ? role.color : '#ffffff' }}
                                                        >
                                                            {role.name}
                                                        </span>
                                                    </div>
                                                    {member.mainEpic && (
                                                        <div>
                                                            <span className="text-white font-bold">Main Epic:</span>
                                                            <span className="ml-1">{member.mainEpic}</span>
                                                        </div>
                                                    )}
                                                    {member.additionalMM && (
                                                        <div>
                                                            <span className="text-white font-bold">Additional MM:</span>
                                                            <span className="ml-1">{member.additionalMM}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => openEditModal(member)}
                                                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition h-fit"
                                                >
                                                    ✏️ Edit
                                                </button>
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

            {/* Edit Modal */}
            {editingMember && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full border border-purple-500">
                        <h2 className="text-2xl font-bold mb-4">Edit Staff Info</h2>
                        <p className="text-gray-400 mb-6">
                            Editing: <span className="text-white font-bold">@{editingMember.username}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Main Epic (Game Username)</label>
                                <input
                                    type="text"
                                    value={editForm.mainEpic}
                                    onChange={(e) => setEditForm({ ...editForm, mainEpic: e.target.value })}
                                    placeholder="e.g., Pipi clappy"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Additional MM (Alternate Accounts)</label>
                                <input
                                    type="text"
                                    value={editForm.additionalMM}
                                    onChange={(e) => setEditForm({ ...editForm, additionalMM: e.target.value })}
                                    placeholder="e.g., clappyStorage8"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Custom Notes (Optional)</label>
                                <textarea
                                    value={editForm.customNotes}
                                    onChange={(e) => setEditForm({ ...editForm, customNotes: e.target.value })}
                                    placeholder="Any additional information..."
                                    rows="3"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={saveStaffInfo}
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                            >
                                {saving ? 'Saving...' : '💾 Save'}
                            </button>
                            <button
                                onClick={closeEditModal}
                                disabled={saving}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}
