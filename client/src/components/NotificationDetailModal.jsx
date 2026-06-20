import React from 'react';
import { X, Bell, Info, TrendingUp, DollarSign, CheckCircle2, Users, Gift, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationDetailModal = ({ isOpen, onClose, notification }) => {
    if (!isOpen || !notification) return null;

    const { title, message, type, amount, createdAt } = notification;

    // Helper to get type configuration (icon, colors, gradients)
    const getTypeConfig = (notifType) => {
        switch (notifType) {
            case 'deposit':
                return {
                    icon: TrendingUp,
                    gradient: 'from-emerald-500 to-teal-500',
                    bgGlow: 'bg-emerald-500/20',
                    textColor: 'text-emerald-400',
                    label: 'Deposit'
                };
            case 'withdrawal':
                return {
                    icon: DollarSign,
                    gradient: 'from-rose-500 to-red-500',
                    bgGlow: 'bg-rose-500/20',
                    textColor: 'text-rose-400',
                    label: 'Withdrawal'
                };
            case 'investment':
                return {
                    icon: CheckCircle2,
                    gradient: 'from-cyan-500 to-blue-500',
                    bgGlow: 'bg-cyan-500/20',
                    textColor: 'text-cyan-400',
                    label: 'Investment'
                };
            case 'commission':
                return {
                    icon: Users,
                    gradient: 'from-amber-500 to-orange-500',
                    bgGlow: 'bg-amber-500/20',
                    textColor: 'text-amber-400',
                    label: 'Team Commission'
                };
            case 'bonus':
                return {
                    icon: Gift,
                    gradient: 'from-fuchsia-500 to-purple-500',
                    bgGlow: 'bg-fuchsia-500/20',
                    textColor: 'text-fuchsia-400',
                    label: 'Reward / Bonus'
                };
            case 'system':
            default:
                return {
                    icon: Bell,
                    gradient: 'from-indigo-500 to-purple-500',
                    bgGlow: 'bg-indigo-500/20',
                    textColor: 'text-indigo-400',
                    label: 'System Notification'
                };
        }
    };

    const config = getTypeConfig(type);
    const IconComponent = config.icon;

    // Format date safely
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const formatTimeDistance = (dateStr) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            {/* Modal Container */}
            <div className="glass-card w-full max-w-md p-6 relative overflow-hidden flex flex-col gap-5 animate-modal-in border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-200 text-gray-900 dark:text-white shadow-2xl rounded-3xl">
                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-40 h-40 ${config.bgGlow} rounded-full blur-3xl -mr-16 -mt-16`}></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-full transition-all active:scale-95 z-10"
                >
                    <X size={18} />
                </button>

                {/* Top Header - Icon & Category Badge */}
                <div className="flex items-center gap-4 mt-2">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-lg`}>
                        <IconComponent size={28} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-primary-dark dark:text-primary">
                            {config.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            <Clock size={12} />
                            <span>{formatTimeDistance(createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <h3 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white leading-tight">
                        {title}
                    </h3>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-slate-200 dark:bg-white/10"></div>

                {/* Detailed Message content */}
                <div className="max-h-60 overflow-y-auto pr-1">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Amount display card if amount is present */}
                {amount && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 mt-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <Calendar size={14} />
                            <span>Transaction Amount</span>
                        </div>
                        <div className={`text-lg font-black ${
                            type === 'withdrawal' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-[#a4f13a]'
                        }`}>
                            {type === 'withdrawal' ? '-' : '+'}{amount.toFixed(2)} USDT
                        </div>
                    </div>
                )}

                {/* Time Created display */}
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{formatDate(createdAt)}</span>
                </div>

                {/* Action button */}
                <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-gradient-primary hover:scale-[1.02] active:scale-[0.98] rounded-2xl text-gray-900 font-bold shadow-glow hover:shadow-glow-lg transition-all text-sm mt-2"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

export default NotificationDetailModal;
