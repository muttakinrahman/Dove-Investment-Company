import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, CheckCircle, XCircle, Clock, Search, Hash, X, AlertTriangle, ShieldAlert, Edit } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminWithdrawals = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDuration = (start, end) => {
        const diff = Math.floor((new Date(end || now) - new Date(start)) / 1000);
        if (diff < 0) return '0s';

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;

        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const [approveModal, setApproveModal] = useState({
        isOpen: false,
        withdrawalId: null,
        amount: 0,
        transactionHash: ''
    });

    // New Reject Modal State
    const [rejectModal, setRejectModal] = useState({
        isOpen: false,
        withdrawalId: null,
        amount: 0,
        userName: '',
        reason: '',
        blockMessage: '',
        isBlocking: false
    });

    // New Edit Modal State
    const [editModal, setEditModal] = useState({
        isOpen: false,
        withdrawalId: null,
        bankName: '',
        accountNumber: '',
        accountName: ''
    });

    useEffect(() => {
        fetchWithdrawals();
    }, [filter]);

    const fetchWithdrawals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/withdrawal/admin/all?status=${filter}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWithdrawals(res.data);
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
        } finally {
            setLoading(false);
        }
    };

    const openApproveModal = (id, amount) => {
        setApproveModal({
            isOpen: true,
            withdrawalId: id,
            amount,
            transactionHash: ''
        });
    };

    const closeApproveModal = () => {
        setApproveModal({
            isOpen: false,
            withdrawalId: null,
            amount: 0,
            transactionHash: ''
        });
    };

    const openRejectModal = (withdrawal) => {
        setRejectModal({
            isOpen: true,
            withdrawalId: withdrawal._id,
            amount: withdrawal.amount,
            userName: withdrawal.userId?.fullName || withdrawal.userId?.phone,
            reason: '',
            blockMessage: '',
            isBlocking: false
        });
    };

    const closeRejectModal = () => {
        setRejectModal({
            isOpen: false,
            withdrawalId: null,
            amount: 0,
            userName: '',
            reason: '',
            blockMessage: '',
            isBlocking: false
        });
    };

    const openEditModal = (item) => {
        setEditModal({
            isOpen: true,
            withdrawalId: item._id,
            bankName: item.bankDetails?.bankName || '',
            accountNumber: item.bankDetails?.accountNumber || '',
            accountName: item.bankDetails?.accountName || ''
        });
    };

    const closeEditModal = () => {
        setEditModal({
            isOpen: false,
            withdrawalId: null,
            bankName: '',
            accountNumber: '',
            accountName: ''
        });
    };

    const handleSaveEdit = async () => {
        const { withdrawalId, bankName, accountNumber, accountName } = editModal;

        if (!bankName || bankName.trim().length === 0) {
            toast.error('Bank/Wallet name is required');
            return;
        }
        if (!accountNumber || accountNumber.trim().length === 0) {
            toast.error('Account number/Wallet address is required');
            return;
        }
        if (!accountName || accountName.trim().length === 0) {
            toast.error('Account holder name is required');
            return;
        }

        setProcessingId(withdrawalId);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/withdrawal/admin/${withdrawalId}/update-details`,
                {
                    bankName: bankName.trim(),
                    accountNumber: accountNumber.trim(),
                    accountName: accountName.trim()
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            fetchWithdrawals();
            toast.success('Withdrawal details updated successfully');
            closeEditModal();
        } catch (error) {
            console.error('Error updating withdrawal details:', error);
            toast.error(error.response?.data?.message || 'Failed to update details');
        } finally {
            setProcessingId(null);
        }
    };

    const handleApprove = async () => {
        const { withdrawalId, transactionHash } = approveModal;

        if (!transactionHash || transactionHash.trim().length === 0) {
            toast.error('Please enter transaction hash');
            return;
        }

        setProcessingId(withdrawalId);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/withdrawal/admin/${withdrawalId}/approve`,
                { transactionId: transactionHash.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            fetchWithdrawals();
            toast.success('Withdrawal approved successfully');
            closeApproveModal();
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            toast.error(error.response?.data?.message || 'Failed to approve');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        const { withdrawalId, reason, blockMessage, isBlocking } = rejectModal;

        if (!reason || reason.trim().length === 0) {
            toast.error('Please enter a rejection reason');
            return;
        }

        setProcessingId(withdrawalId);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/withdrawal/admin/${withdrawalId}/reject`,
                {
                    rejectionReason: reason,
                    blockMessage: isBlocking ? blockMessage : null
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            fetchWithdrawals();
            toast.success('Withdrawal rejected successfully');
            closeRejectModal();
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            toast.error('Failed to reject');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="p-2 md:p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Download className="text-blue-500" />
                Withdrawal Requests
            </h2>

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {/* Search Box */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="search"
                        placeholder="Search by ID#, name, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-sm w-full sm:w-56"
                    />
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg capitalize transition-colors ${filter === status
                                ? 'bg-blue-600 text-gray-900 dark:text-white'
                                : 'bg-white dark:bg-dark-200 text-gray-900/60 dark:text-white/60 hover:text-white'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {withdrawals.filter(item => {
                    if (!searchTerm.trim()) return true;
                    const s = searchTerm.trim().toLowerCase();
                    const memberId = item.userId?.memberId ? String(item.userId.memberId) : '';
                    return (
                        memberId.includes(s) ||
                        (item.userId?.fullName || '').toLowerCase().includes(s) ||
                        (item.userId?.phone || '').includes(s) ||
                        (item.userId?.email || '').toLowerCase().includes(s) ||
                        (item.userId?.invitationCode || '').toLowerCase().includes(s)
                    );
                }).length === 0 ? (
                    <div className="text-center py-10 text-gray-900/40 dark:text-white/40">No withdrawals found</div>
                ) : (
                    withdrawals
                    .filter(item => {
                        if (!searchTerm.trim()) return true;
                        const s = searchTerm.trim().toLowerCase();
                        const memberId = item.userId?.memberId ? String(item.userId.memberId) : '';
                        return (
                            memberId.includes(s) ||
                            (item.userId?.fullName || '').toLowerCase().includes(s) ||
                            (item.userId?.phone || '').includes(s) ||
                            (item.userId?.email || '').toLowerCase().includes(s) ||
                            (item.userId?.invitationCode || '').toLowerCase().includes(s)
                        );
                    })
                    .map((item) => (
                        <div key={item._id} className="glass-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-xs">
                                        <Clock size={12} />
                                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        item.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/10 text-yellow-400 animate-pulse'
                                        }`}>
                                        {item.status === 'pending' ? (
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
                                                Pending: {formatDuration(item.createdAt)}
                                            </span>
                                        ) : item.status}
                                    </span>
                                    {item.status !== 'pending' && (
                                        <span className="text-[10px] text-gray-900/40 dark:text-white/40 bg-gray-900/5 dark:bg-white/5 px-2 py-0.5 rounded">
                                            Processed in: {formatDuration(item.createdAt, item.processedAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">${item.amount}</span>
                                    <span className="text-sm text-gray-900/60 dark:text-white/60">• {item.paymentMethod}</span>
                                </div>
                                <div className="text-sm text-gray-900/80 dark:text-white/80 space-y-1">
                                    <div>User: <span className="text-primary font-bold">{item.userId?.fullName || item.userId?.phone}</span>{item.userId?.memberId ? <span className="ml-2 text-blue-400 font-mono text-xs">ID #{item.userId.memberId}</span> : null}</div>
                                    <div className="flex gap-2 text-xs flex-wrap">
                                        <span className="bg-gray-900/5 dark:bg-white/5 px-2 py-1 rounded">Total Deposit: ${item.totalDeposits || 0}</span>
                                        <span className="bg-gray-900/5 dark:bg-white/5 px-2 py-1 rounded text-yellow-400">Total Withdraw: ${item.totalWithdrawals || 0}</span>
                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded">Active Members: {item.activeReferrals || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2 items-start">
                                    <div className="flex-1 p-3 bg-gray-50 dark:bg-dark-300 rounded border border-slate-200 dark:border-white/5 text-xs font-mono text-gray-900/70 dark:text-white/70 break-all">
                                        <span className="font-bold text-gray-900 dark:text-white uppercase">{item.bankDetails.bankName}</span> - {item.bankDetails.accountNumber} <span className="text-gray-900/40 dark:text-white/40">({item.bankDetails.accountName})</span>
                                    </div>
                                    {item.status === 'pending' && (
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-dark-300 dark:hover:bg-dark-200 text-gray-900/60 dark:text-white/60 hover:text-blue-500 rounded border border-slate-200 dark:border-white/5 transition-colors"
                                            title="Edit Wallet/Bank Details"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {item.status === 'pending' && (
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => openApproveModal(item._id, item.amount)}
                                        disabled={processingId === item._id}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => openRejectModal(item)}
                                        disabled={processingId === item._id}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Transaction Hash Modal (Approve) */}
            {approveModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 relative">
                        <button
                            onClick={closeApproveModal}
                            className="absolute top-4 right-4 p-1 text-gray-900/40 dark:text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Hash className="text-green-500" />
                            Enter Transaction Hash
                        </h3>

                        <div className="mb-6">
                            <p className="text-gray-900/60 dark:text-white/60 text-sm mb-4">
                                Approving withdrawal of <span className="text-gray-900 dark:text-white font-bold">${approveModal.amount}</span>
                            </p>

                            <label className="block text-sm text-gray-900/80 dark:text-white/80 mb-2">
                                Transaction Hash / ID *
                            </label>
                            <input
                                type="text"
                                value={approveModal.transactionHash}
                                onChange={(e) => setApproveModal({ ...approveModal, transactionHash: e.target.value })}
                                placeholder="e.g., 0xabc123... or TXN123456"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
                                autoFocus
                            />
                            <p className="text-xs text-gray-900/40 dark:text-white/40 mt-2">
                                Enter the blockchain transaction hash or payment reference ID
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeApproveModal}
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-300 hover:bg-dark-200 text-gray-900 dark:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingId === approveModal.withdrawalId}
                                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 font-bold"
                            >
                                {processingId === approveModal.withdrawalId ? 'Processing...' : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal (Reject & Block) */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 relative bg-white dark:bg-dark-200 border border-red-500/20">
                        <button
                            onClick={closeRejectModal}
                            className="absolute top-4 right-4 p-1 text-gray-900/40 dark:text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-red-400">
                            <AlertTriangle size={20} />
                            Reject Withdrawal
                        </h3>

                        <div className="mb-6 space-y-4">
                            <p className="text-gray-900/60 dark:text-white/60 text-sm">
                                Rejecting withdrawal of <span className="text-gray-900 dark:text-white font-bold">${rejectModal.amount}</span> for <span className="text-primary">{rejectModal.userName}</span>
                            </p>

                            {/* Rejection Reason */}
                            <div>
                                <label className="block text-sm text-gray-900/80 dark:text-white/80 mb-2">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    value={rejectModal.reason}
                                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                    placeholder="e.g., Incorrect wallet address"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 resize-none h-24"
                                    autoFocus
                                />
                            </div>

                            {/* Block User Checkbox */}
                            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rejectModal.isBlocking}
                                        onChange={(e) => setRejectModal({ ...rejectModal, isBlocking: e.target.checked })}
                                        className="w-4 h-4 rounded text-red-500 focus:ring-red-500/20 bg-gray-50 dark:bg-dark-300 border-slate-200 dark:border-white/10"
                                    />
                                    <span className="text-sm font-bold text-red-300 flex items-center gap-1">
                                        <ShieldAlert size={14} />
                                        Block Future Withdrawals
                                    </span>
                                </label>

                                {rejectModal.isBlocking && (
                                    <div className="mt-3 animate-fade-in">
                                        <label className="block text-xs text-red-300/80 mb-1.5 uppercase font-bold tracking-wider">
                                            Custom Block Message
                                        </label>
                                        <textarea
                                            value={rejectModal.blockMessage}
                                            onChange={(e) => setRejectModal({ ...rejectModal, blockMessage: e.target.value })}
                                            placeholder="e.g., You need 5 active referrals to withdraw."
                                            className="w-full px-3 py-2 bg-black/20 border border-red-500/20 rounded-lg text-gray-900 dark:text-white text-sm placeholder:text-red-500/20 focus:outline-none focus:border-red-500/50 resize-none h-20"
                                        />
                                        <p className="text-[10px] text-red-400/60 mt-1">
                                            This message will be shown to the user every time they try to withdraw until you unblock them.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeRejectModal}
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-300 hover:bg-dark-200 text-gray-900 dark:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === rejectModal.withdrawalId}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 font-bold"
                            >
                                {processingId === rejectModal.withdrawalId ? 'Processing...' : 'Reject & Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Details Modal */}
            {editModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 relative bg-white dark:bg-dark-200 border border-blue-500/20">
                        <button
                            onClick={closeEditModal}
                            className="absolute top-4 right-4 p-1 text-gray-900/40 dark:text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-blue-500">
                            <Edit size={20} />
                            Edit Withdrawal Details
                        </h3>

                        <div className="mb-6 space-y-4">
                            {/* Bank Name */}
                            <div>
                                <label className="block text-sm text-gray-900/80 dark:text-white/80 mb-2">
                                    Method / Bank / Network Name *
                                </label>
                                <input
                                    type="text"
                                    value={editModal.bankName}
                                    onChange={(e) => setEditModal({ ...editModal, bankName: e.target.value })}
                                    placeholder="e.g. bsc, trc20, bkash"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Account Number / Wallet Address */}
                            <div>
                                <label className="block text-sm text-gray-900/80 dark:text-white/80 mb-2">
                                    Wallet Address / Account Number *
                                </label>
                                <input
                                    type="text"
                                    value={editModal.accountNumber}
                                    onChange={(e) => setEditModal({ ...editModal, accountNumber: e.target.value })}
                                    placeholder="Enter address or account number"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Account Name */}
                            <div>
                                <label className="block text-sm text-gray-900/80 dark:text-white/80 mb-2">
                                    User / Account Holder Name *
                                </label>
                                <input
                                    type="text"
                                    value={editModal.accountName}
                                    onChange={(e) => setEditModal({ ...editModal, accountName: e.target.value })}
                                    placeholder="Enter user name or phone"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeEditModal}
                                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-300 hover:bg-dark-200 text-gray-900 dark:text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={processingId === editModal.withdrawalId}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 font-bold"
                            >
                                {processingId === editModal.withdrawalId ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWithdrawals;
