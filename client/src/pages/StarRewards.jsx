import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Star, Sparkles, CheckCircle2, Info, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import BottomNav from '../components/BottomNav';

const StarRewards = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/rewards/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus(res.data);
        } catch (error) {
            console.error('Error fetching star rewards status:', error);
            toast.error('Failed to load rewards status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Timer logic
    useEffect(() => {
        if (!status?.missionEnd) return;

        const updateTimer = () => {
            const end = new Date(status.missionEnd).getTime();
            const now = new Date().getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft('EXPIRED');
                // Refresh status if just expired
                if (distance > -2000) fetchStatus();
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            } else {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(timer);
    }, [status?.missionEnd]);

    const handleClaim = async (tierId) => {
        setClaiming(tierId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/rewards/claim', { tierId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message);
            fetchStatus();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to claim reward');
        } finally {
            setClaiming(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-dark-300 transition-colors duration-300 pb-24">
            {/* Header */}
            <div className="bg-amber-300/80 dark:bg-dark-200 backdrop-blur-xl sticky top-0 z-[100] px-4 py-4 border-b border-amber-400 dark:border-white/5 shadow-[0_4px_30px_rgba(251,191,36,0.2)] transition-colors">
                <div className="max-w-md mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate('/me')}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-900/80 dark:text-white/80 active:scale-95 z-[110]"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">Star Rewards</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 mt-6">

                {/* Mission Status Bar */}
                {status?.missionStart ? (
                    <div className="bg-amber-200/50 dark:bg-primary/10 border border-amber-300 dark:border-primary/20 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-300/50 dark:bg-primary/20 p-2 rounded-xl">
                                <Clock size={16} className="text-amber-600 dark:text-primary animate-pulse" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-900 dark:text-primary uppercase tracking-widest">Mission Ends In</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white italic">{timeLeft}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-amber-900/60 dark:text-white/30 uppercase tracking-tighter">Cycle Started</p>
                            <p className="text-[10px] font-black text-gray-900/80 dark:text-white/60">{new Date(status.missionStart).toLocaleDateString()}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-300/50 dark:bg-amber-900/10 backdrop-blur-md border border-amber-400 dark:border-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-sm shadow-amber-500/10">
                        <div className="bg-amber-400/50 dark:bg-yellow-500/20 p-2 rounded-xl border border-amber-500/20 text-yellow-600 dark:text-yellow-500">
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-950 dark:text-yellow-500 uppercase tracking-widest">No Active Mission</p>
                            <p className="text-[10px] font-bold text-amber-900/80 dark:text-white/60 mt-0.5">Refer your first friend to start your 10-day mission!</p>
                        </div>
                    </div>
                )}

                {/* Points Overview Card */}
                <div className="relative overflow-hidden bg-amber-200/60 dark:bg-gradient-to-br dark:from-primary/20 dark:via-primary/5 dark:to-transparent rounded-[2.5rem] p-8 border border-amber-300 dark:border-primary/20 mb-8 shadow-sm dark:shadow-2xl backdrop-blur-md">
                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5">
                        <Star size={120} className="text-amber-500 dark:text-primary animate-pulse" fill="currentColor" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-amber-600 dark:text-primary" />
                            <span className="text-amber-700 dark:text-primary text-[10px] font-black uppercase tracking-[0.2em]">Active Points</span>
                        </div>
                        <div className="flex items-end gap-2 mb-6 text-center">
                            <span className="text-7xl font-black text-black dark:text-white tracking-tighter leading-none italic dark:drop-shadow-[0_0_20px_rgba(164,241,58,0.3)]">{status?.points || 0}</span>
                            <span className="text-amber-900/60 dark:text-white/40 font-bold mb-2 uppercase text-xs tracking-widest">Points</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                            <div className="bg-amber-300/40 dark:bg-white/5 rounded-2xl p-4 border border-amber-400/50 dark:border-white/10 text-center">
                                <div className="flex items-center justify-center gap-2 text-amber-900/60 dark:text-white/40 text-[9px] font-bold uppercase mb-1">
                                    <Users size={12} />
                                    Gen 1 (A)
                                </div>
                                <div className="text-xl font-black text-black dark:text-white leading-none">{status?.aCount || 0}</div>
                            </div>
                            <div className="bg-amber-300/40 dark:bg-white/5 rounded-2xl p-4 border border-amber-400/50 dark:border-white/10 text-center">
                                <div className="flex items-center justify-center gap-2 text-amber-900/60 dark:text-white/40 text-[9px] font-bold uppercase mb-1">
                                    <Users size={12} />
                                    Gen 2 (B)
                                </div>
                                <div className="text-xl font-black text-black dark:text-white leading-none">{status?.bCount || 0}</div>
                            </div>
                        </div>

                        <div className="w-full flex items-start gap-2 bg-amber-100/50 dark:bg-black/40 p-3 rounded-xl border border-amber-300 dark:border-white/5">
                            <Info size={14} className="text-amber-600 dark:text-primary shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] text-amber-950 dark:text-white/60 leading-relaxed font-bold dark:font-medium">
                                    * Points = (Gen 1 Active × 100) + (Gen 2 Active × 50).
                                </p>
                                <p className="text-[10px] text-amber-900/80 dark:text-white/40 leading-relaxed font-bold dark:font-medium">
                                    A mission starts on your first referral and lasts exactly 10 days. After that, it resets.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reward Tiers */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-gray-500 font-bold dark:text-white/40 text-[10px] dark:font-black uppercase tracking-[0.25em]">Available Missions</h2>
                        <div className="h-[1px] flex-1 bg-gray-200 dark:bg-white/5 ml-4"></div>
                    </div>

                    {status?.tiers.map((tier, idx) => {
                        const isClaimed = status?.claimed.includes(tier.id);
                        const progress = Math.min((status?.points / tier.points) * 100, 100);
                        const isEligible = status?.points >= tier.points && !isClaimed;
                        const starCount = idx + 1;

                        return (
                            <div key={tier.id} className="relative overflow-hidden group bg-amber-100/40 dark:bg-dark-200/50 backdrop-blur-md rounded-3xl border border-amber-300 dark:border-white/5 shadow-sm dark:shadow-none">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(starCount)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={22}
                                                            className={`transition-all duration-700 ${progress >= 100 ? 'text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] scale-110' : 'text-gray-300 dark:text-white/10'}`}
                                                            fill={progress >= 100 ? "currentColor" : "none"}
                                                        />
                                                    ))}
                                                </div>
                                                <h3 className="text-gray-900 dark:text-white font-black text-lg tracking-tight uppercase italic underline decoration-amber-400/50 dark:decoration-primary/30 underline-offset-4">
                                                    Tier {idx + 1} Mission
                                                </h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider">
                                                Reward: <span className="text-amber-700 dark:text-primary font-black ml-1">${tier.amount}</span>
                                            </p>
                                        </div>

                                        {isClaimed ? (
                                            <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-500" />
                                                <span className="text-emerald-700 dark:text-emerald-500 text-[10px] font-black uppercase tracking-tighter">Collected</span>
                                            </div>
                                        ) : (
                                            <button
                                                disabled={!isEligible || claiming === tier.id}
                                                onClick={() => handleClaim(tier.id)}
                                                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isEligible
                                                        ? 'bg-amber-400 dark:bg-primary text-black hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/20 dark:shadow-[0_0_20px_rgba(164,241,58,0.4)]'
                                                        : 'bg-gray-200/50 dark:bg-white/5 text-gray-500 dark:text-white/20 border border-gray-300 dark:border-white/10 cursor-not-allowed opacity-50'
                                                    }`}
                                            >
                                                {claiming === tier.id ? 'Claiming...' : 'Collect'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Progress Bar Container */}
                                    <div className="relative">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-widest">Progress</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-base font-black text-gray-900 dark:text-white">{status?.points}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-white/30 font-bold">/ {tier.points}</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full bg-amber-100 dark:bg-white/5 rounded-full overflow-hidden border border-amber-200 dark:border-white/5 box-inner-shadow">
                                            <div
                                                className={`h-full rounded-full transition-all duration-[1500ms] ease-out dark:shadow-[0_0_15px_rgba(164,241,58,0.4)] ${progress >= 100 ? 'bg-amber-500 dark:bg-primary' : 'bg-gradient-to-r from-amber-300 to-amber-500 dark:from-primary/40 dark:to-primary'
                                                    }`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default StarRewards;
