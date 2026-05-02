import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Clock, DollarSign, Zap } from 'lucide-react';

const BalanceWarningPopup = ({ warningInfo, onClose }) => {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!warningInfo?.deadline) return;

        const deadline = new Date(warningInfo.deadline);

        const update = () => {
            const now = new Date();
            const diff = deadline - now;
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [warningInfo]);

    const handleDeposit = () => {
        handleClose();
        navigate('/deposit');
    };

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300);
    };

    if (!warningInfo?.hasWarning) return null;

    const totalBalance = (warningInfo.totalBalance || 0).toFixed(2);
    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 12;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
            <div
                className={`w-full max-w-sm transition-all duration-300 ${visible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}
            >
                {/* Card */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 ${isUrgent
                        ? 'bg-gradient-to-br from-red-600 via-red-500 to-rose-600'
                        : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500'
                    }`} />

                    {/* Glow effect */}
                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 ${isUrgent ? 'bg-red-300' : 'bg-yellow-300'}`} />
                    <div className={`absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${isUrgent ? 'bg-rose-400' : 'bg-orange-300'}`} />

                    {/* Animated border */}
                    <div className="absolute inset-0 rounded-3xl" style={{
                        background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                        backgroundSize: '200% 200%',
                    }} />

                    <div className="relative z-10 p-6">
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X size={16} className="text-white" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                                    <AlertTriangle size={32} className="text-white" />
                                </div>
                                {/* Pulse ring */}
                                <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" style={{ animationDuration: '2s' }} />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-white font-black text-xl text-center mb-1 drop-shadow-md">
                            ⚠️ Balance Warning!
                        </h2>
                        <p className="text-white/80 text-xs text-center font-medium mb-5">
                            Your account is at risk of being deactivated
                        </p>

                        {/* Balance Info */}
                        <div className="bg-white/15 rounded-2xl p-4 mb-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <DollarSign size={16} className="text-white/80" />
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Current Total Balance</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-1">
                                <span className="text-white font-black text-3xl">${totalBalance}</span>
                                <span className="text-white/60 text-sm mb-1">/ $50.00 required</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (warningInfo.totalBalance / 50) * 100)}%` }}
                                />
                            </div>
                            <p className="text-white/60 text-[10px] mt-1 text-right">
                                ${Math.max(0, 50 - warningInfo.totalBalance).toFixed(2)} more needed
                            </p>
                        </div>

                        {/* Countdown Timer */}
                        <div className="mb-5">
                            <div className="flex items-center gap-1 justify-center mb-3">
                                <Clock size={12} className="text-white/70" />
                                <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Time Remaining</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { value: timeLeft.days, label: 'Days' },
                                    { value: timeLeft.hours, label: 'Hours' },
                                    { value: timeLeft.minutes, label: 'Mins' },
                                    { value: timeLeft.seconds, label: 'Secs' },
                                ].map(({ value, label }) => (
                                    <div key={label} className="bg-white/20 rounded-xl p-2 text-center backdrop-blur-sm">
                                        <div className="text-white font-black text-2xl leading-none">
                                            {String(value).padStart(2, '0')}
                                        </div>
                                        <div className="text-white/60 text-[9px] font-bold mt-1 uppercase">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Warning Message */}
                        <div className="bg-black/20 rounded-2xl p-3 mb-5 backdrop-blur-sm">
                            <p className="text-white/90 text-xs text-center leading-relaxed">
                                <strong>If you do not maintain a $50 balance</strong> within the time limit, your account will become{' '}
                                <span className="text-white font-black">inactive</span> and
                                you will be removed from your referrer's active member list.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-all"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleDeposit}
                                className="flex-[2] py-3 rounded-2xl bg-white hover:bg-white/90 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                                style={{ color: isUrgent ? '#dc2626' : '#d97706' }}
                            >
                                <Zap size={16} />
                                Deposit Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceWarningPopup;
