import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, PlusCircle, CheckCircle, AlertCircle, Loader2, User, DollarSign, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminManualDeposit = () => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (q = '') => {
        setLoadingUsers(true);
        try {
            const res = await axios.get('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` },
                params: { search: q, limit: 200 }
            });
            setUsers(res.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        fetchUsers(val);
        setSelectedUser(null);
        setSuccessMsg('');
        setErrorMsg('');
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearch(user.phone || user.email || user.fullName || '');
        setUsers([]);
        setSuccessMsg('');
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (!selectedUser) {
            setErrorMsg('Please select a user first.');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            setErrorMsg('Please enter a valid amount greater than 0.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(
                '/api/admin/manual-deposit',
                { userId: selectedUser._id, amount: parsedAmount, note },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccessMsg(`✅ $${parsedAmount.toFixed(2)} successfully deposited to ${selectedUser.fullName || selectedUser.phone || selectedUser.email}'s account.`);
            toast.success('Manual deposit successful!');
            setAmount('');
            setNote('');
        } catch (err) {
            const msg = err.response?.data?.message || 'Deposit failed. Please try again.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = search.length >= 1
        ? users.filter(u => {
            const s = search.trim();
            const isNumeric = /^\d+$/.test(s);
            if (isNumeric) {
                return u.memberId && String(u.memberId) === s;
            }
            return (
                (u.phone && u.phone.includes(s)) ||
                (u.email && u.email.toLowerCase().includes(s.toLowerCase())) ||
                (u.fullName && u.fullName.toLowerCase().includes(s.toLowerCase())) ||
                (u.invitationCode && u.invitationCode.toLowerCase().includes(s.toLowerCase()))
            );
        })
        : [];

    return (
        <div className="space-y-6 p-4 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Deposit</h2>
                <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
                    Add a deposit directly to a user's account. It will appear in their deposit history and trigger notifications.
                </p>
            </div>

            {/* Form Card */}
            <div className="glass-card p-6 space-y-5">
                {/* User Search */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        <User size={14} className="inline mr-1" /> Search User
                    </label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder="Search by ID#, phone, email, name or invite code..."
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>

                    {/* Dropdown Results */}
                    {search.length >= 1 && filteredUsers.length > 0 && !selectedUser && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                            {filteredUsers.map((u) => (
                                <button
                                    key={u._id}
                                    onClick={() => handleSelectUser(u)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {(u.fullName || u.phone || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                            {u.fullName || 'No Name'}
                                        </div>
                                        <div className="text-gray-500 dark:text-white/50 text-xs truncate">
                                            {u.memberId ? <span className="text-blue-400 font-mono">ID #{u.memberId} · </span> : null}{u.phone || u.email} · Balance: ${(u.balance || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <span className="ml-auto text-xs text-primary font-mono">{u.invitationCode}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {search.length >= 2 && !loadingUsers && filteredUsers.length === 0 && !selectedUser && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl px-4 py-3 text-sm text-gray-500 dark:text-white/40">
                            No users found
                        </div>
                    )}
                </div>

                {/* Selected User Preview */}
                {selectedUser && (
                    <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {(selectedUser.fullName || selectedUser.phone || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">{selectedUser.fullName || 'No Name'}</div>
                            <div className="text-xs text-gray-500 dark:text-white/50">{selectedUser.phone || selectedUser.email} · Current Balance: <span className="text-green-400 font-semibold">${(selectedUser.balance || 0).toFixed(2)}</span></div>
                        </div>
                        <button
                            onClick={() => { setSelectedUser(null); setSearch(''); fetchUsers(); }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Change
                        </button>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        <DollarSign size={14} className="inline mr-1" /> Deposit Amount (USD)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="1"
                            step="0.01"
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2">
                    {[10, 50, 100, 200, 500, 1000].map((val) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(String(val))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                amount === String(val)
                                    ? 'bg-primary text-white border-primary shadow-md'
                                    : 'border-slate-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-primary hover:text-primary'
                            }`}
                        >
                            ${val}
                        </button>
                    ))}
                </div>

                {/* Optional Note */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        <FileText size={14} className="inline mr-1" /> Admin Note (optional)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Manual USDT deposit confirmed offline"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                    />
                </div>

                {/* Messages */}
                {successMsg && (
                    <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                        <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}
                {errorMsg && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedUser || !amount}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <><Loader2 size={18} className="animate-spin" /> Processing...</>
                    ) : (
                        <><PlusCircle size={18} /> Add Deposit</>
                    )}
                </button>
            </div>

            {/* Info Box */}
            <div className="glass-card p-4 border-l-4 border-indigo-500 text-sm text-gray-600 dark:text-white/60 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">How it works</p>
                <p>• The deposit will be recorded as <strong>approved</strong> in the user's deposit history.</p>
                <p>• The amount will be added directly to the user's wallet balance.</p>
                <p>• A push notification will be sent to the user.</p>
                <p>• Team commissions will be distributed automatically.</p>
            </div>
        </div>
    );
};

export default AdminManualDeposit;
