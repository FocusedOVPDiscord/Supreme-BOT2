import { useState, useEffect } from 'react';

export default function AccountSettings() {
    const [email, setEmail] = useState('');
    const [verified, setVerified] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showAddEmail, setShowAddEmail] = useState(false);
    const [showVerifyCode, setShowVerifyCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchEmailInfo();
    }, []);

    const fetchEmailInfo = async () => {
        try {
            const response = await fetch('/api/email-auth/my-email', {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.email) {
                setEmail(data.email);
                setVerified(data.verified);
            }
        } catch (err) {
            console.error('Failed to fetch email info:', err);
        }
    };

    const handleAddEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/email-auth/add-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: newEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add email');
            }

            setMessage('Verification code sent to your email!');
            setShowVerifyCode(true);
            setShowAddEmail(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/email-auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: verificationCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify email');
            }

            setMessage('Email verified successfully!');
            setShowVerifyCode(false);
            setVerificationCode('');
            setNewEmail('');
            fetchEmailInfo();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveEmail = async () => {
        if (!confirm('Are you sure you want to remove your email?')) return;

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/email-auth/remove-email', {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to remove email');
            }

            setMessage('Email removed successfully!');
            setEmail('');
            setVerified(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Account Settings</h1>

            {/* Email Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-1">Email Address</h2>
                        <p className="text-sm text-gray-400">
                            Add an email to enable email-based login
                        </p>
                    </div>
                    {email && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            verified 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/50' 
                                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/50'
                        }`}>
                            {verified ? '✓ Verified' : '⚠ Unverified'}
                        </span>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                        {message}
                    </div>
                )}

                {email ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-white">{email}</span>
                            </div>
                            <button
                                onClick={handleRemoveEmail}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>

                        {!verified && showVerifyCode && (
                            <form onSubmit={handleVerifyEmail} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        maxLength="6"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Verifying...' : 'Verify Email'}
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div>
                        {!showAddEmail ? (
                            <button
                                onClick={() => setShowAddEmail(true)}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                            >
                                + Add Email Address
                            </button>
                        ) : (
                            <form onSubmit={handleAddEmail} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="your-email@example.com"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Sending...' : 'Send Verification Code'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddEmail(false);
                                            setNewEmail('');
                                            setError('');
                                        }}
                                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        {showVerifyCode && (
                            <form onSubmit={handleVerifyEmail} className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        maxLength="6"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Verifying...' : 'Verify Email'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">Email Login Benefits</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-400">
                            <li>Login without Discord OAuth</li>
                            <li>Backup access method</li>
                            <li>Receive verification codes via email</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
