import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Search, LogIn, ShieldBan, ShieldCheck, KeyRound, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ balance: '', vipLevel: '' });

    useEffect(() => {
        fetchUsers();
    }, [searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const trimmedSearch = searchTerm.trim();
            const url = trimmedSearch
                ? `/api/admin/users?search=${encodeURIComponent(trimmedSearch)}`
                : '/api/admin/users';

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setEditForm({ balance: user.balance ?? 0, vipLevel: user.vipLevel ?? 0 });
        setShowModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/admin/user/${editingUser._id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
            toast.success('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        }
    };

    const handleLoginAsUser = async (user) => {
        if (!window.confirm(`Login as ${user.fullName || user.email || user.phone}?`)) return;
        try {
            const adminToken = localStorage.getItem('token');
            const response = await axios.post(`/api/admin/impersonate/${user._id}`, {}, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });

            // Save admin token so we can return later
            localStorage.setItem('adminToken', adminToken);
            // Replace with user's token
            localStorage.setItem('token', response.data.token);

            toast.success(`Logged in as ${user.fullName || user.email}`);
            // Redirect to home page as the user
            window.location.href = '/';
        } catch (error) {
            console.error('Error logging in as user:', error);
            toast.error('Failed to login as user');
        }
    };

    const handleDisable2FA = async (user) => {
        if (!window.confirm(`Disable Google Authenticator for "${user.fullName || user.phone || user.email}"?\n\nThey will be able to log in without 2FA and can set it up again from Security Settings.`)) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/admin/user/${user._id}/disable-2fa`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message || '2FA disabled successfully');
            fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to disable 2FA';
            toast.error(msg);
        }
    };

    const handleToggleBlock = async (user) => {
        const action = user.isBlocked ? 'unblock' : 'block';
        if (!window.confirm(`Are you sure you want to ${action} ${user.fullName || user.email || user.phone}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/admin/user/${user._id}/toggle-block`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            fetchUsers();
        } catch (error) {
            console.error('Error toggling block:', error);
            toast.error('Failed to update user status');
        }
    };

    const handleToggleTeamBusiness = async (user) => {
        const action = user.canViewTeamBusiness ? 'disable' : 'enable';
        if (!window.confirm(`${action === 'enable' ? 'Enable' : 'Disable'} Team Business View for "${user.fullName || user.phone || user.email}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`/api/admin/user/${user._id}/toggle-team-business`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            fetchUsers();
        } catch (error) {
            console.error('Error toggling team business view:', error);
            toast.error('Failed to update Team Business View');
        }
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Registered Users</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900/40 dark:text-white/40" size={18} />
                    <input
                        type="search"
                        placeholder="Search users..."
                        className="bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-white/10 bg-gray-900/5 dark:bg-white/5">
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">User</th>
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">Invite Code</th>
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">Balance</th>
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">Level</th>
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">Joined</th>
                                <th className="p-4 text-xs font-bold text-gray-900/60 dark:text-white/60 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-900/40 dark:text-white/40 text-sm">Loading users...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-900/40 dark:text-white/40 text-sm">No users found.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-gray-900 dark:text-white font-medium text-sm">{user.fullName || 'No Name'}</span>
                                                {user.isBlocked && (
                                                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Blocked</span>
                                                )}
                                                {user.canViewTeamBusiness && (
                                                    <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded uppercase">💼 Biz View</span>
                                                )}
                                            </div>
                                            <div className="text-gray-900/60 dark:text-white/60 text-xs">{user.email || user.phone || 'No Contact'}</div>
                                        </td>
                                        <td className="p-4 text-gray-900/60 dark:text-white/60 text-xs font-mono">{user.invitationCode || 'N/A'}</td>
                                        <td className="p-4 text-green-400 font-bold text-sm">${(user.balance || 0).toFixed(2)}</td>
                                        <td className="p-4 text-yellow-400 text-sm font-bold">Level {(user.vipLevel ?? 0) + 1}</td>
                                        <td className="p-4 text-gray-900/60 dark:text-white/60 text-xs text-nowrap">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleLoginAsUser(user)}
                                                    className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                                                    title="Login as this user"
                                                >
                                                    <LogIn size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleBlock(user)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        user.isBlocked
                                                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                                                    }`}
                                                    title={user.isBlocked ? 'Unblock User' : 'Block User'}
                                                >
                                                    {user.isBlocked ? <ShieldCheck size={16} /> : <ShieldBan size={16} />}
                                                </button>
                                                {user.twoFactorEnabled && (
                                                    <button
                                                        onClick={() => handleDisable2FA(user)}
                                                        className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
                                                        title="Disable Google Authenticator (2FA)"
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleToggleTeamBusiness(user)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        user.canViewTeamBusiness
                                                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white'
                                                            : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                    title={user.canViewTeamBusiness ? 'Disable Team Business View' : 'Enable Team Business View'}
                                                >
                                                    <Briefcase size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-dark-200 rounded-xl p-6 w-full max-w-sm border border-slate-200 dark:border-white/10">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit User</h3>
                        <p className="text-gray-900/60 dark:text-white/60 text-sm mb-4">Editing info for {editingUser?.fullName || editingUser?.phone || editingUser?.email}</p>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Balance ($)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={editForm.balance}
                                    onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Level</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={editForm.vipLevel}
                                    onChange={(e) => setEditForm({ ...editForm, vipLevel: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-gray-900 dark:text-white hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
