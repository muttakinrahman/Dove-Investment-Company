import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Bell, Mail, Send, CheckCircle, AlertCircle, Loader2, FileText, Type, Users, User, Eye, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminNotifications = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('email'); // 'email' | 'inapp'

    // In-App Notification State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('system');
    const [submittingInApp, setSubmittingInApp] = useState(false);
    const [inAppSuccess, setInAppSuccess] = useState('');
    const [inAppError, setInAppError] = useState('');

    // Email Broadcast State
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [recipientType, setRecipientType] = useState('all'); // 'all' | 'single'
    const [targetEmail, setTargetEmail] = useState('');

    useEffect(() => {
        if (location.state?.email) {
            setActiveTab('email');
            setRecipientType('single');
            setTargetEmail(location.state.email);
        }
    }, [location.state]);
    const [sendInAppSync, setSendInAppSync] = useState(true);
    const [showPreview, setShowPreview] = useState(true);
    const [submittingEmail, setSubmittingEmail] = useState(false);
    const [emailResult, setEmailResult] = useState(null);
    const [emailError, setEmailError] = useState('');

    const token = localStorage.getItem('token');

    // Handle In-App Broadcast Submit
    const handleInAppSubmit = async (e) => {
        e.preventDefault();
        setInAppSuccess('');
        setInAppError('');

        if (!title.trim()) {
            setInAppError('Please enter a notification title.');
            return;
        }
        if (!message.trim()) {
            setInAppError('Please enter a notification message.');
            return;
        }

        setSubmittingInApp(true);
        try {
            const res = await axios.post(
                '/api/admin/broadcast-notification',
                { title: title.trim(), message: message.trim(), type },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setInAppSuccess(res.data.message || 'Notification broadcasted successfully!');
            toast.success('In-App Notification broadcasted to all users!');
            setTitle('');
            setMessage('');
            setType('system');
        } catch (err) {
            const msg = err.response?.data?.message || 'Broadcast failed. Please try again.';
            setInAppError(msg);
            toast.error(msg);
        } finally {
            setSubmittingInApp(false);
        }
    };

    // Handle Email Broadcast Submit
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailResult(null);
        setEmailError('');

        if (!emailSubject.trim()) {
            setEmailError('Please enter an email subject line.');
            return;
        }
        if (!emailMessage.trim()) {
            setEmailError('Please enter the custom email message body.');
            return;
        }
        if (recipientType === 'single' && !targetEmail.trim()) {
            setEmailError('Please enter a target email address.');
            return;
        }

        setSubmittingEmail(true);
        try {
            const res = await axios.post(
                '/api/admin/send-email-broadcast',
                {
                    subject: emailSubject.trim(),
                    message: emailMessage.trim(),
                    recipientType,
                    targetEmail: recipientType === 'single' ? targetEmail.trim() : '',
                    sendInApp: sendInAppSync
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setEmailResult(res.data);
            toast.success(res.data.message || 'Custom email broadcast sent successfully!');
            if (recipientType === 'single') {
                setTargetEmail('');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Email broadcast failed. Please try again.';
            setEmailError(msg);
            toast.error(msg);
        } finally {
            setSubmittingEmail(false);
        }
    };

    return (
        <div className="space-y-6 p-4 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="text-primary" size={24} /> Broadcast & Messaging Center
                </h2>
                <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
                    Send custom emails to all registered users via Gmail/SMTP or dispatch in-app push notifications.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 gap-4">
                <button
                    onClick={() => setActiveTab('email')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'email'
                            ? 'border-primary text-primary dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white'
                    }`}
                >
                    <Mail size={18} /> Gmail / Email Broadcast
                </button>
                <button
                    onClick={() => setActiveTab('inapp')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'inapp'
                            ? 'border-primary text-primary dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white'
                    }`}
                >
                    <Bell size={18} /> In-App Push Notification
                </button>
            </div>

            {/* TAB 1: GMAIL / EMAIL BROADCAST */}
            {activeTab === 'email' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Email Form */}
                    <div className={`${showPreview ? 'lg:col-span-7' : 'lg:col-span-12'} glass-card p-6 space-y-5`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Mail className="text-indigo-500" size={20} /> Send Custom Email
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center gap-1.5"
                            >
                                <Eye size={14} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                            </button>
                        </div>

                        {/* Recipient Mode */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                                Select Recipients
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRecipientType('all')}
                                    className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                                        recipientType === 'all'
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                                            : 'border-slate-200 dark:border-white/10 text-gray-700 dark:text-white/60 hover:border-indigo-500'
                                    }`}
                                >
                                    <Users size={16} /> All Project Users
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecipientType('single')}
                                    className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                                        recipientType === 'single'
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                                            : 'border-slate-200 dark:border-white/10 text-gray-700 dark:text-white/60 hover:border-indigo-500'
                                    }`}
                                >
                                    <User size={16} /> Specific User Email
                                </button>
                            </div>
                        </div>

                        {/* Single User Email Input */}
                        {recipientType === 'single' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                                    Target Email Address
                                </label>
                                <input
                                    type="email"
                                    value={targetEmail}
                                    onChange={(e) => setTargetEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                        )}

                        {/* Email Subject */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                                <Type size={14} className="inline mr-1" /> Email Subject Line
                            </label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="e.g. Important Announcement: Special Deposit Bonus Launched!"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                maxLength={120}
                            />
                        </div>

                        {/* Custom Message Body */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">
                                <FileText size={14} className="inline mr-1" /> Custom Message Content (Gmail Body)
                            </label>
                            <textarea
                                value={emailMessage}
                                onChange={(e) => setEmailMessage(e.target.value)}
                                placeholder="Type your custom email message here. Use paragraphs and clear instructions for your users..."
                                rows={7}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                            />
                        </div>

                        {/* Also Send In-App Checkbox */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                            <input
                                type="checkbox"
                                id="sendInAppSync"
                                checked={sendInAppSync}
                                onChange={(e) => setSendInAppSync(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="sendInAppSync" className="text-sm font-medium text-gray-700 dark:text-white/80 cursor-pointer select-none">
                                Also send as an In-App Push Notification to recipients
                            </label>
                        </div>

                        {/* Status Messages */}
                        {emailResult && (
                            <div className={`flex items-start gap-2 p-4 rounded-xl text-sm border ${
                                emailResult.failedCount > 0 && emailResult.sentCount === 0
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                            }`}>
                                <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">{emailResult.message}</p>
                                    {emailResult.totalTargeted > 0 && (
                                        <p className="text-xs opacity-90 mt-1">
                                            Successfully Sent: <strong>{emailResult.sentCount}</strong> | Failed: <strong>{emailResult.failedCount}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {emailError && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{emailError}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleEmailSubmit}
                            disabled={submittingEmail || !emailSubject.trim() || !emailMessage.trim()}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submittingEmail ? (
                                <><Loader2 size={18} className="animate-spin" /> Sending Emails via Gmail...</>
                            ) : (
                                <><Send size={18} /> {recipientType === 'all' ? 'Send Custom Email to All Users' : `Send Email to ${targetEmail || 'User'}`}</>
                            )}
                        </button>
                    </div>

                    {/* Email Live Preview */}
                    {showPreview && (
                        <div className="lg:col-span-5 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-white/60 flex items-center gap-1.5">
                                <Eye size={16} /> Live Inbox Email Preview
                            </h4>
                            
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 text-slate-800">
                                {/* Simulated Email Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center text-white">
                                    <h1 className="text-xl font-extrabold tracking-tight">Dove Investment Gold Mine</h1>
                                    <p className="text-xs text-white/80 mt-1">Official Announcement</p>
                                </div>

                                {/* Simulated Email Body */}
                                <div className="p-6 space-y-4 text-sm">
                                    <h3 className="text-base font-bold text-gray-900">
                                        {emailSubject.trim() || 'Subject: [Your Subject Line Here]'}
                                    </h3>
                                    
                                    <p className="text-gray-600 text-xs">
                                        Hello <strong>John User</strong>,
                                    </p>

                                    <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg text-gray-700 leading-relaxed whitespace-pre-wrap text-xs min-h-[120px]">
                                        {emailMessage.trim() || 'Your custom message content will appear here inside a formatted email box...'}
                                    </div>

                                    <p className="text-gray-500 text-xs">
                                        Thank you for being part of Dove Investment Gold Mine.
                                    </p>
                                </div>

                                {/* Simulated Email Footer */}
                                <div className="bg-slate-100 p-4 text-center border-t border-slate-200 text-[11px] text-gray-500">
                                    <p className="font-semibold text-gray-700">Dove Investment Gold Mine</p>
                                    <p className="mt-0.5">doveinvestment.cloud</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 dark:text-white/40 text-center">
                                Users will receive this nicely formatted email directly in their Gmail inbox.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: IN-APP PUSH NOTIFICATION */}
            {activeTab === 'inapp' && (
                <div className="glass-card p-6 space-y-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="text-indigo-500" size={20} /> Broadcast In-App Push Notification
                    </h3>

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
                            placeholder="Write details of the notification here. Users can read this in full inside the app."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                        />
                    </div>

                    {/* Status Messages */}
                    {inAppSuccess && (
                        <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{inAppSuccess}</span>
                        </div>
                    )}
                    {inAppError && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{inAppError}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleInAppSubmit}
                        disabled={submittingInApp || !title.trim() || !message.trim()}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submittingInApp ? (
                            <><Loader2 size={18} className="animate-spin" /> Broadcasting In-App...</>
                        ) : (
                            <><Send size={18} /> Broadcast to All Users</>
                        )}
                    </button>
                </div>
            )}

            {/* Warning Box */}
            <div className="glass-card p-4 border-l-4 border-amber-500 text-sm text-gray-600 dark:text-white/60 space-y-1 bg-amber-500/5">
                <p className="font-semibold text-amber-500 flex items-center gap-1.5">
                    <AlertCircle size={16} /> Important Notice
                </p>
                <p>• Gmail/Email messages will be sent via SMTP to all users with registered email addresses.</p>
                <p>• Make sure SMTP credentials are set in <code className="text-xs bg-gray-200 dark:bg-white/10 px-1 py-0.5 rounded">server/.env</code> file.</p>
                <p>• Every broadcast action is saved in Admin Activity Logs.</p>
            </div>
        </div>
    );
};

export default AdminNotifications;
