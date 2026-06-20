import React, { useState } from 'react';
import axios from 'axios';
import { Bell, Send, CheckCircle, AlertCircle, Loader2, FileText, Type } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminNotifications = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('system');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (!title.trim()) {
            setErrorMsg('Please enter a notification title.');
            return;
        }
        if (!message.trim()) {
            setErrorMsg('Please enter a notification message.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(
                '/api/admin/broadcast-notification',
                { title: title.trim(), message: message.trim(), type },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccessMsg(res.data.message || 'Notification broadcasted successfully!');
            toast.success('Notification broadcasted to all users!');
            setTitle('');
            setMessage('');
            setType('system');
        } catch (err) {
            const msg = err.response?.data?.message || 'Broadcast failed. Please try again.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 p-4 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="text-indigo-500" size={24} /> Broadcast Notification
                </h2>
                <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
                    Send a system-wide push notification to all users. Every registered user will receive this in their notification center immediately.
                </p>
            </div>

            {/* Form Card */}
            <div className="glass-card p-6 space-y-5">
                {/* Title */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        <Type size={14} className="inline mr-1" /> Notification Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. System Upgrade Completed"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        maxLength={100}
                    />
                </div>

                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        Notification Category / Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { value: 'system', label: '📢 System' },
                            { value: 'bonus', label: '🎁 Bonus' },
                            { value: 'deposit', label: '💰 Deposit' },
                            { value: 'withdrawal', label: '💸 Withdrawal' },
                            { value: 'investment', label: '📈 Investment' },
                            { value: 'commission', label: '👥 Commission' }
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setType(opt.value)}
                                className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                                    type === opt.value
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                                        : 'border-slate-200 dark:border-white/10 text-gray-700 dark:text-white/60 hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                        <FileText size={14} className="inline mr-1" /> Message Content
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write details of the notification here. Users can read this in full."
                        rows={6}
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
                    disabled={submitting || !title.trim() || !message.trim()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <><Loader2 size={18} className="animate-spin" /> Broadcasting...</>
                    ) : (
                        <><Send size={18} /> Broadcast to All Users</>
                    )}
                </button>
            </div>

            {/* Warning Box */}
            <div className="glass-card p-4 border-l-4 border-amber-500 text-sm text-gray-600 dark:text-white/60 space-y-1 bg-amber-500/5">
                <p className="font-semibold text-amber-500 flex items-center gap-1.5">
                    <AlertCircle size={16} /> Important Notice
                </p>
                <p>• Broadcasting cannot be undone. All registered users will immediately see this message.</p>
                <p>• Please double check spelling and links before sending.</p>
                <p>• The notification will be logged under Admin Activity Logs for audit purposes.</p>
            </div>
        </div>
    );
};

export default AdminNotifications;
