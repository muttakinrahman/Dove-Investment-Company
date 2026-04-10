import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, TrendingUp, Calendar, DollarSign, Bell, HelpCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SuccessModal from '../components/SuccessModal';

const PackageTimer = ({ endDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(endDate).getTime();
            const distance = end - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft('EXPIRED');
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};

const Lend = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, login } = useAuth(); // Refresh user data after investment
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [investing, setInvesting] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showInvestModal, setShowInvestModal] = useState(null);
    const [investAmount, setInvestAmount] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [autoCancelInfo, setAutoCancelInfo] = useState(null); // { cancelled: [], refunded: balance }

    // Determine which level to show: active state or current user level
    const targetLevel = location.state?.viewLevel !== undefined ? location.state.viewLevel : (user?.vipLevel || 0);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/invest/packages', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { vipLevel: targetLevel }
                });

                const data = response.data;

                // Handle new response format with Level 1 auto-cancel info
                if (data.packages !== undefined) {
                    setPackages(data.packages);

                    // If Level 1 auto-cancel happened, show alert and refresh user
                    if (data.level1AutoCancelled && data.cancelledPackages?.length > 0) {
                        setAutoCancelInfo({
                            cancelled: data.cancelledPackages,
                            newBalance: data.newBalance
                        });

                        // Refresh user session so balance updates in UI
                        try {
                            const userRes = await axios.get('/api/auth/me', {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (userRes.data) login(token, userRes.data);
                        } catch (_) { /* silent */ }
                    }
                } else {
                    // Fallback for old format
                    setPackages(data);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error fetching packages:', err);
                setError('Failed to load investment plans');
                setLoading(false);
            }
        };

        if (user) {
            fetchPackages();
        }
    }, [user, targetLevel]);

    const handleInvestSubmit = async () => {
        if (!showInvestModal) return;

        const pkg = showInvestModal;
        const numAmount = parseFloat(investAmount);

        setError('');
        setSuccess('');

        if (isNaN(numAmount) || numAmount < pkg.minAmount || numAmount > pkg.maxAmount) {
            setError(`Amount must be between $${pkg.minAmount} and $${pkg.maxAmount}`);
            return;
        }

        // Check balance using rounded values to avoid precision issues (compare as cents)
        const roundedBalance = Math.round((user?.balance || 0) * 100);
        const roundedAmount = Math.round(numAmount * 100);

        if (roundedBalance < roundedAmount) {
            setError(`Insufficient balance. Your balance: $${(user?.balance || 0).toFixed(2)}`);
            return;
        }

        setInvesting(pkg._id);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                '/api/invest/create',
                { packageId: pkg._id, amount: numAmount },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setShowSuccess(true);
            setShowInvestModal(null);
            setInvestAmount('');

        } catch (err) {
            setError(err.response?.data?.message || 'Investment failed');
        } finally {
            setInvesting(null);
        }
    };

    const levelImages = [
        '/images/lend_7.png',
        '/images/lend_15.png',
        '/images/lend_30.png',
        '/images/lend_45.png',
        '/images/lend_60.png',
        '/images/lend_90.png',
        '/images/lend_90.png'
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-20">
            {/* Header - Matching Home.jsx but simplified */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/10 sticky top-0 z-20">
                <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between relative">
                    <div className="w-10"></div>
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg">Lend</h1>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <button
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                        >
                            <Bell size={20} />
                            {/* Unread count dot could be dynamic later */}
                        </button>
                        <button
                            onClick={() => navigate('/help')}
                            className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto px-4 py-4 space-y-4">

                {/* Level 1 Auto-Cancel Alert — shown when packages were cancelled due to low balance */}
                {autoCancelInfo && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-start gap-3">
                        <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-400" />
                        <div>
                            <p className="font-bold text-xs mb-1 text-red-400">⚠️ Investment Cancelled – Low Balance</p>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                Your lend package(s) <strong>({autoCancelInfo.cancelled.join(', ')})</strong> have been automatically cancelled because your total balance dropped below <strong>$50.00</strong>. Your invested amount has been returned to your available balance (<strong>${(autoCancelInfo.newBalance || 0).toFixed(2)}</strong>).
                            </p>
                            <p className="text-[10px] mt-1.5 opacity-70">Please deposit more funds to restart lending.</p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => navigate('/recharge')}
                                    className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[11px] font-bold hover:bg-red-500/30 transition-all active:scale-[0.97]"
                                >
                                    Deposit Now →
                                </button>
                                <button
                                    onClick={() => setAutoCancelInfo(null)}
                                    className="px-4 py-2 text-red-400/60 text-[11px] font-medium hover:text-red-400 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Level 1 Low Balance Warning (ongoing) */}
                {user?.vipLevel === 0 && (user?.balance || 0) < 50 && targetLevel === 0 && !autoCancelInfo && (
                    <div className="p-4 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl text-white shadow-lg shadow-orange-500/20 flex items-start gap-3 animate-pulse-slow">
                        <DollarSign size={22} className="mt-0.5 shrink-0 opacity-90" />
                        <div>
                            <p className="font-bold text-xs mb-1">⚠️ Insufficient Balance for Lending</p>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                Your available balance is <strong>${(user?.balance || 0).toFixed(2)}</strong>, which is below the required <strong>$50.00</strong> minimum for Level 1 investments. Please deposit more funds to start lending.
                            </p>
                            <button
                                onClick={() => navigate('/recharge')}
                                className="mt-3 px-5 py-2 bg-white text-orange-600 rounded-full text-[11px] font-bold hover:bg-orange-50 transition-all shadow-sm active:scale-[0.97]"
                            >
                                Deposit Now →
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3 animate-shake">
                        <Info size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm flex items-start gap-3">
                        <TrendingUp size={18} className="mt-0.5 shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                {loading ? (
                    <div className="text-gray-900/60 dark:text-white/60 text-center py-20 animate-pulse">
                        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm">Loading your exclusive plans...</p>
                    </div>
                ) : (
                    /* Packages List - Targeted for Single Level View */
                    <div className="space-y-6">
                        {packages.map((pkg, index) => {
                            // Use targetLevel for display consistency
                            const currentLevel = targetLevel;
                            const dispayName = pkg.name.replace(/Plan/i, '').replace(/\(L\d+\)/gi, '').trim();

                            // Check if user has active investments for this package
                            const activeInvestments = user?.investments?.filter(inv =>
                                inv.package.name === pkg.name && inv.status === 'active'
                            ) || [];

                            const activeCount = activeInvestments.length;
                            const earliestEnding = activeCount > 0
                                ? [...activeInvestments].sort((a, b) => new Date(a.endDate) - new Date(b.endDate))[0]
                                : null;

                            return (
                                <div
                                    key={pkg._id}
                                    className={`bg-white dark:bg-dark-200 rounded-3xl p-5 shadow-xl border relative overflow-hidden group ${activeCount > 0 ? 'border-primary/50' : 'border-slate-200 dark:border-white/5'}`}
                                >
                                    {/* Active Badge if applicable */}
                                    {activeCount > 0 && (
                                        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
                                            <div className="bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/20 flex items-center gap-1">
                                                <div className="w-1 h-1 bg-black rounded-full animate-pulse"></div>
                                                {activeCount} ACTIVE
                                            </div>
                                        </div>
                                    )}

                                    {/* Ambient Glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>

                                    {/* Level Header */}
                                    <div className="relative z-10 flex justify-between items-center mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-900/40 dark:text-white/40 text-[10px] uppercase tracking-wider font-bold mb-0.5">Current Level</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Level {currentLevel + 1}</span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-gray-900/5 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-bold text-gray-900/80 dark:text-white/80">
                                            {pkg.duration} Days Cycle
                                        </div>
                                    </div>

                                    {/* Hero Image - Full Width Banner Style */}
                                    <div className="relative z-10 w-[calc(100%+2.5rem)] mb-6 -mx-5 mt-4">
                                        <div className="w-full relative h-80 bg-gray-900/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                                            {(() => {
                                                const duration = pkg.duration;
                                                const isShort = duration <= 15;
                                                let fallbackSrc;

                                                if (currentLevel === 1) {
                                                    fallbackSrc = isShort ? '/images/vip_lv1_short.png' : '/images/vip_lv1_medium.png';
                                                } else if (currentLevel === 2) {
                                                    fallbackSrc = isShort ? '/images/vip_lv2_short.png' : '/images/vip_lv2_medium.png';
                                                } else if (currentLevel === 3) {
                                                    fallbackSrc = isShort ? '/images/vip_lv3_short.png' : '/images/vip_lv3_medium.png';
                                                } else if (currentLevel === 4) {
                                                    fallbackSrc = isShort ? '/images/vip_lv4_short.png' : '/images/vip_lv4_medium.png';
                                                } else if (currentLevel === 5) {
                                                    fallbackSrc = duration === 7 ? '/images/vip_lv5_7d.png' :
                                                        duration === 30 ? '/images/vip_lv5_30d.png' :
                                                            duration === 60 ? '/images/vip_lv5_60d.png' :
                                                                duration === 90 ? '/images/vip_lv5_90d.png' : '/images/vip_lv5_medium.png';
                                                } else {
                                                    fallbackSrc = levelImages[
                                                        duration === 7 ? 0 :
                                                            duration === 15 ? 1 :
                                                                duration === 30 ? 2 :
                                                                    duration === 45 ? 3 :
                                                                        duration === 60 ? 4 :
                                                                            duration === 90 ? 5 :
                                                                                duration > 90 ? 6 : 0
                                                    ];
                                                }

                                                return (
                                                    <img
                                                        src={pkg.image || fallbackSrc}
                                                        alt={pkg.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            if (e.target.src !== window.location.origin + fallbackSrc) {
                                                                e.target.src = fallbackSrc;
                                                            }
                                                        }}
                                                    />
                                                );
                                            })()}
                                            {/* Gradient overlay to help blend */}
                                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 dark:from-dark-200 to-transparent"></div>
                                        </div>
                                    </div>

                                    {/* Package Name */}
                                    <div className="relative z-10 text-center mb-6">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">{dispayName}</h2>
                                        <div className="h-1 w-8 bg-gradient-primary rounded-full mx-auto"></div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="relative z-10 grid gap-3 mb-6">
                                        {/* Amount */}
                                        <div className="bg-gray-50 dark:bg-dark-300/50 rounded-xl p-3 border border-slate-200 dark:border-white/5 flex items-center justify-between transition-colors">
                                            <span className="text-gray-900/60 dark:text-white/60 font-medium text-xs">Limit</span>
                                            <div className="flex items-center gap-1 text-primary text-base font-bold">
                                                <div className="w-4 h-4 rounded-full bg-primary text-black flex items-center justify-center text-[8px] shadow-glow">T</div>
                                                {pkg.minAmount} - {pkg.maxAmount.toLocaleString()} USDT
                                            </div>
                                        </div>

                                        {/* Returns */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 dark:bg-dark-300/50 rounded-xl p-3 border border-slate-200 dark:border-white/5 transition-colors">
                                                <div className="text-gray-900/40 dark:text-white/40 text-[10px] mb-0.5">Daily Income</div>
                                                <div className="text-green-400 font-bold text-base">+{pkg.dailyRate}%</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-dark-300/50 rounded-xl p-3 border border-slate-200 dark:border-white/5 transition-colors">
                                                <div className="text-gray-900/40 dark:text-white/40 text-[10px] mb-0.5">Service Fee</div>
                                                <div className="text-gray-900 dark:text-white font-bold text-base">0%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="space-y-3">
                                        {activeCount > 0 && (
                                            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                                                <span className="text-gray-900/40 dark:text-white/40">Next Maturity</span>
                                                <div className="text-green-400 font-mono">
                                                    <PackageTimer endDate={earliestEnding.endDate} />
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (activeCount > 0) return;
                                                // Block Level 1 users with balance < $50
                                                if (user?.vipLevel === 0 && (user?.balance || 0) < 50) {
                                                    navigate('/recharge');
                                                    return;
                                                }
                                                setShowInvestModal(pkg);
                                                setInvestAmount(pkg.minAmount.toString());
                                            }}
                                            disabled={activeCount > 0}
                                            className={`relative z-10 w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${activeCount > 0
                                                ? 'bg-gray-900/5 dark:bg-white/5 text-gray-900/20 dark:text-white/20 cursor-not-allowed border border-slate-200 dark:border-white/5'
                                                : (user?.vipLevel === 0 && (user?.balance || 0) < 50)
                                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-pointer'
                                                    : 'text-black bg-gradient-to-r from-primary to-secondary hover:shadow-glow-lg'
                                                }`}
                                        >
                                            {activeCount > 0 ? 'Active Plan' : (user?.vipLevel === 0 && (user?.balance || 0) < 50) ? '⚠ Deposit Required' : 'Details'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Empty State if no package for level */}
                        {packages.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-900/40 dark:text-white/40">No investment plans available for your current level.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Investment Modal */}
            {showInvestModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10 sm:items-center sm:p-0">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInvestModal(null)}></div>
                    <div className="relative bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all animate-slide-up">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Investment</h3>
                                <button onClick={() => setShowInvestModal(null)} className="text-gray-900/40 dark:text-white/40 hover:text-white">
                                    <ChevronLeft className="rotate-[-90deg]" size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-dark-300 rounded-2xl p-4 border border-slate-200 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-900/40 dark:text-white/40 text-xs">Available Balance</span>
                                        <span className="text-primary font-bold">{user?.balance?.toFixed(2)} USDT</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-900/40 dark:text-white/40 text-xs">Plan Range</span>
                                        <span className="text-gray-900 dark:text-white font-medium text-xs">{showInvestModal.minAmount} - {showInvestModal.maxAmount} USDT</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-900/60 dark:text-white/60 text-xs font-medium mb-2 ml-1">Investment Amount (USDT)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={investAmount}
                                            onChange={(e) => setInvestAmount(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-xl py-4 px-4 text-gray-900 dark:text-white font-bold focus:border-primary outline-none transition-all"
                                            placeholder="Enter amount"
                                        />
                                        <button
                                            onClick={() => {
                                                const balance = user?.balance || 0;
                                                const min = showInvestModal.minAmount;
                                                const max = showInvestModal.maxAmount;
                                                if (balance < min) return;
                                                // Handle floating point precision and respect limits
                                                const amount = Math.min(balance, max);
                                                setInvestAmount(amount.toFixed(2));
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/10 px-2 py-1 rounded-lg transition-all"
                                        >
                                            Max
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                    <div className="flex items-center gap-3 text-primary">
                                        <TrendingUp size={20} />
                                        <div>
                                            <p className="text-[10px] text-primary/60 uppercase font-bold">Estimated Daily Income</p>
                                            <p className="text-lg font-black tracking-tight">
                                                + {((parseFloat(investAmount) || 0) * (showInvestModal.dailyRate / 100)).toFixed(2)} USDT
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleInvestSubmit}
                                    disabled={investing}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-black font-black text-base shadow-glow hover:shadow-glow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {investing ? 'Processing...' : 'CONFIRM INVESTMENT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <BottomNav />

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    window.location.reload();
                }}
                title="Investment Successful!"
                message="Your investment plan has been activated successfully. You can track your earnings in the Assets section."
            />
        </div>
    );
};

export default Lend;
