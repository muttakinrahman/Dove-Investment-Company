import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Users, CheckCircle2, Info, Lock, Crown } from 'lucide-react';
import { toast } from 'react-toastify';
import BottomNav from '../components/BottomNav';

/* ─── Diamond image component with glow animation ─── */
const DiamondIcon = ({ size = 40, filled = false, glow = false }) => (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {filled && glow && (
            <div className="absolute inset-0 rounded-full animate-ping" style={{
                background: 'radial-gradient(circle, rgba(204,255,0,0.35) 0%, transparent 70%)',
                animationDuration: '2.5s',
            }}></div>
        )}
        {filled && (
            <div className="absolute inset-[-4px] rounded-full" style={{
                background: 'radial-gradient(circle, rgba(204,255,0,0.25) 0%, transparent 70%)',
                filter: 'blur(6px)',
            }}></div>
        )}
        <img
            src="/images/diamond.png"
            alt="Diamond"
            className={`relative z-10 object-contain transition-all duration-500 ${filled ? 'drop-shadow-[0_0_8px_rgba(204,255,0,0.6)]' : 'opacity-25 grayscale'}`}
            style={{
                width: size, height: size,
                animation: filled && glow ? 'diamondPulse 3s ease-in-out infinite' : 'none',
            }}
        />
    </div>
);

/* ─── Gift images ─── */
const GIFT_IMAGES = {
    phone: 'https://images.unsplash.com/photo-1598327105666-5b89351cb315?w=200&h=200&fit=crop&q=80',
    laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=120&h=120&fit=crop&q=80',
    iphone: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=120&h=120&fit=crop&q=80',
    bike: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&h=120&fit=crop&q=80',
    car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=120&h=120&fit=crop&q=80',
};
const GIFT_EMOJI = { phone: '📱', laptop: '💻', iphone: '📱', scooty: '🛵', bike: '🏍️', car: '🚗' };
const GIFT_COLORS = { phone: 'from-sky-400 to-sky-600', laptop: 'from-gray-500 to-gray-700', iphone: 'from-violet-400 to-violet-600', scooty: 'from-orange-400 to-orange-600', bike: 'from-red-400 to-red-600', car: 'from-emerald-400 to-emerald-600' };

/* ─── Scooty SVG ─── */
const ScootySVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="55" cy="52" rx="22" ry="8" fill="#f97316" opacity="0.9"/>
        <rect x="38" y="44" width="30" height="12" rx="6" fill="#fb923c"/>
        <line x1="68" y1="44" x2="74" y2="28" stroke="#78716c" strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="28" x2="80" y2="26" stroke="#78716c" strokeWidth="3" strokeLinecap="round"/>
        <path d="M75 56 Q82 48 80 58" fill="none" stroke="#ea580c" strokeWidth="2.5"/>
        <rect x="40" y="40" width="18" height="5" rx="2.5" fill="#44403c"/>
        <circle cx="78" cy="62" r="10" fill="none" stroke="#44403c" strokeWidth="3"/>
        <circle cx="78" cy="62" r="3" fill="#78716c"/>
        <circle cx="34" cy="62" r="10" fill="none" stroke="#44403c" strokeWidth="3"/>
        <circle cx="34" cy="62" r="3" fill="#78716c"/>
        <line x1="42" y1="58" x2="60" y2="58" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="82" cy="42" r="3" fill="#fde047"/>
        <circle cx="82" cy="42" r="5" fill="#fde047" opacity="0.3"/>
    </svg>
);

const DiamondSalary = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/rewards/salary-status', { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data);
        } catch (error) {
            toast.error('Failed to load salary status');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchStatus(); }, []);

    const handleClaim = async (levelId) => {
        setClaiming(levelId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/rewards/claim-salary', { levelId }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.message);
            fetchStatus();
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to claim'); }
        finally { setClaiming(null); }
    };

    if (loading) return (
        <div className="min-h-screen bg-white dark:bg-dark-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    const achieved = data?.achievedLevel || 0;
    const claimed = data?.claimedSalaryLevels || [];

    return (
        <div className="min-h-screen bg-white dark:bg-dark-300 transition-colors duration-300 pb-24">
            {/* Diamond animation CSS */}
            <style>{`
                @keyframes diamondPulse {
                    0% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(204,255,0,0.5)); }
                    25% { transform: scale(1.08) rotate(3deg); filter: drop-shadow(0 0 14px rgba(204,255,0,0.8)); }
                    50% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(204,255,0,0.5)); }
                    75% { transform: scale(1.08) rotate(-3deg); filter: drop-shadow(0 0 14px rgba(204,255,0,0.8)); }
                    100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 6px rgba(204,255,0,0.5)); }
                }
            `}</style>

            {/* Header */}
            <div className="bg-emerald-300/80 dark:bg-dark-200 backdrop-blur-xl sticky top-0 z-[100] px-4 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.05)] border-b border-white/20 dark:border-white/5">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => navigate('/me')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-emerald-950 dark:text-white/80 active:scale-95">
                        <ChevronLeft size={24} />
                    </button>
                    <DiamondIcon size={40} filled={true} />
                    <h1 className="text-xl font-black text-emerald-950 dark:text-white italic uppercase tracking-tighter">Monthly Salary</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 mt-6">
                {/* ── Diamond Status Overview ── */}
                <div className="relative overflow-hidden rounded-3xl p-6 mb-6 border border-gray-200 dark:border-white/10 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 shadow-xl">
                    <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, #ccff00 1px, transparent 0)', backgroundSize: '24px 24px'}}></div>
                    <div className="absolute top-0 left-1/3 w-40 h-40 rounded-full blur-[80px]" style={{background: 'rgba(204,255,0,0.08)'}}></div>

                    {/* 6 Diamonds Row */}
                    <div className="relative z-10 flex justify-center gap-1 sm:gap-3 mb-5">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="flex flex-col items-center">
                                <DiamondIcon size={56} filled={achieved >= i} glow={achieved >= i} />
                                <span className={`text-[10px] font-black mt-1 ${achieved >= i ? 'text-[#ccff00]' : 'text-white/20'}`}>{i}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center relative z-10 mb-5">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] mb-1">Your Salary Level</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">
                            {achieved > 0 ? `Diamond ${achieved}` : 'Not Qualified'}
                        </p>
                        {achieved > 0 && <p className="font-bold text-sm mt-1" style={{color: '#ccff00'}}>${data.levels[achieved - 1].monthlyUSD}/Month</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-2 relative z-10">
                        {[{label:'A (Gen 1)', val: data?.aCount},{label:'B (Gen 2)', val: data?.bCount},{label:'C (Gen 3)', val: data?.cCount}].map(s=>(
                            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-black text-white">{s.val || 0}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rules */}
                <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-sm">
                    <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 dark:text-amber-200/70 leading-relaxed font-medium">
                        To receive 2nd and more salary after first, maintain a monthly working ratio of <span className="text-amber-600 dark:text-amber-400 font-black">28% - 30%</span>. All members must have active deposits.
                    </p>
                </div>

                <div className="flex items-center gap-3 mb-4 px-1">
                    <Crown size={14} className="text-primary" />
                    <h2 className="text-gray-400 dark:text-white/40 text-[10px] font-black uppercase tracking-[0.25em]">Salary Levels</h2>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
                </div>

                {/* ── Salary Level Cards ── */}
                <div className="space-y-4 pb-4">
                    {data?.levels?.map((lvl) => {
                        const isAchieved = achieved >= lvl.level;
                        const isClaimed = claimed.includes(lvl.id);
                        const isNext = lvl.level === achieved + 1;
                        const aP = Math.min((data.aCount / lvl.aRequired) * 100, 100);
                        const bcP = Math.min((data.bcCount / lvl.bcRequired) * 100, 100);
                        const giftColor = GIFT_COLORS[lvl.giftType] || 'from-gray-400 to-gray-500';
                        const giftImg = GIFT_IMAGES[lvl.giftType];
                        const isScooty = lvl.giftType === 'scooty';

                        const cardCls = isAchieved
                            ? 'border-[#ccff00]/40 dark:border-[#ccff00]/20 shadow-lg shadow-[#ccff00]/10'
                            : isNext ? 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 shadow-md'
                            : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 shadow-sm';

                        return (
                            <div key={lvl.id} className={`relative overflow-hidden rounded-3xl border ${cardCls} transition-all duration-500`}
                                style={isAchieved ? {background: 'linear-gradient(135deg, #f7ffe0 0%, #edffc8 50%, #f0ffe0 100%)'} : {}}>
                                {isAchieved && <div className="absolute top-0 right-0 w-40 h-40 blur-[60px] rounded-full" style={{background: 'rgba(204,255,0,0.15)'}}></div>}
                                <div className="p-5 relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-0.5 mb-2">
                                                {[...Array(lvl.level)].map((_, i) => (
                                                    <img key={i} src="/images/diamond.png" alt="" className={`w-7 h-7 object-contain ${isAchieved ? 'drop-shadow-[0_0_4px_rgba(204,255,0,0.5)]' : 'opacity-20 grayscale'}`} />
                                                ))}
                                            </div>
                                            <h3 className="text-gray-900 dark:text-white font-black text-lg uppercase tracking-tight italic">Diamond {lvl.level}</h3>
                                            <p className="text-gray-400 dark:text-white/30 text-[10px] font-bold mt-0.5">A: {lvl.aRequired} • B+C: {lvl.bcRequired} members</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-gray-400 dark:text-white/30 font-bold uppercase tracking-wider">Monthly</p>
                                            <p className="text-2xl font-black" style={{color: '#ccff00', textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}>${lvl.monthlyUSD}</p>
                                        </div>
                                    </div>

                                    {/* Gift */}
                                    <div className={`flex items-center gap-3 rounded-2xl p-3 mb-4 ${isAchieved ? 'bg-white/60 dark:bg-white/10 border border-[#ccff00]/30' : 'bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5'}`}>
                                        <div className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br ${giftColor} shadow-md flex items-center justify-center`}>
                                            {isScooty ? <ScootySVG /> : giftImg ? (
                                                <img src={giftImg} alt={lvl.gift} className="w-full h-full object-cover" onError={(e) => { e.target.outerHTML = `<span class="text-2xl">${GIFT_EMOJI[lvl.giftType] || '🎁'}</span>`; }} />
                                            ) : <span className="text-2xl">{GIFT_EMOJI[lvl.giftType] || '🎁'}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-gray-400 dark:text-white/30 font-bold uppercase tracking-wider">One Time Gift</p>
                                            <p className={`font-black text-sm ${isAchieved ? 'text-gray-800' : 'text-gray-600 dark:text-white/60'}`}>{lvl.gift}</p>
                                        </div>
                                        {isClaimed ? (
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded-full">
                                                <CheckCircle2 size={12} className="text-emerald-600" />
                                                <span className="text-emerald-700 text-[9px] font-black uppercase">Claimed</span>
                                            </div>
                                        ) : isAchieved ? (
                                            <button onClick={() => handleClaim(lvl.id)} disabled={claiming === lvl.id}
                                                className="px-4 py-2 text-black text-[9px] font-black uppercase tracking-wider rounded-full active:scale-95 transition-all shadow-lg border border-[#b8e600]"
                                                style={{background: 'linear-gradient(135deg, #ccff00, #a8e600)'}}>
                                                {claiming === lvl.id ? '...' : 'Claim'}
                                            </button>
                                        ) : <Lock size={14} className="text-gray-300 dark:text-white/15" />}
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-2.5">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[9px] text-gray-400 dark:text-white/30 font-bold">A Members</span>
                                                <span className="text-[9px] font-black text-gray-500 dark:text-white/50">{data.aCount}/{lvl.aRequired}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000" style={{width: `${aP}%`, background: aP >= 100 ? '#ccff00' : 'linear-gradient(90deg, #d4ff33, #ccff00)', boxShadow: aP >= 100 ? '0 0 10px rgba(204,255,0,0.5)' : 'none'}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[9px] text-gray-400 dark:text-white/30 font-bold">B+C Members</span>
                                                <span className="text-[9px] font-black text-gray-500 dark:text-white/50">{data.bcCount}/{lvl.bcRequired}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-purple-300 to-purple-500" style={{width: `${bcP}%`, boxShadow: bcP >= 100 ? '0 0 10px rgba(168,85,247,0.4)' : 'none'}}></div>
                                            </div>
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

export default DiamondSalary;
