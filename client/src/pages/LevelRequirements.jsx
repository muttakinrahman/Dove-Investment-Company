import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft,
    Star,
    Users,
    Shield,
    DollarSign
} from 'lucide-react';
import BottomNav from '../components/BottomNav';

const LevelRequirements = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentLevel = user?.vipLevel || 0;
    const currentTeam = user?.stats?.activeTeamMembers || 0;

    const levelRequirements = [
        { from: 0, to: 1, members: null, minInvestment: 50, maxInvestment: 2000, tree: null, incomeRates: { d7: '0.90%', d30: '1.20%', d60: '1.50%', d90: '1.80%' }, teamIncome: null },
        { from: 1, to: 2, members: 7, minInvestment: 300, maxInvestment: 3000, tree: { l1: 3, l2: 4 }, incomeRates: { d7: '1.10%', d30: '1.40%', d60: '1.70%', d90: '2.00%' }, teamIncome: { first: '10%', second: '7%', third: '4%' } },
        { from: 2, to: 3, members: 18, minInvestment: 800, maxInvestment: 4000, tree: { l1: 8, l2: 10 }, incomeRates: { d7: '1.40%', d30: '1.70%', d60: '2.00%', d90: '2.40%' }, teamIncome: { first: '10%', second: '7%', third: '4%' } },
        { from: 3, to: 4, members: 50, minInvestment: 1300, maxInvestment: 5000, tree: { l1: 15, l2: 35 }, incomeRates: { d7: '1.80%', d30: '2.20%', d60: '2.70%', d90: '3.20%' }, teamIncome: { first: '10%', second: '7%', third: '4%' } },
        { from: 4, to: 5, members: 80, minInvestment: 2000, maxInvestment: 6000, tree: { l1: 30, l2: 50 }, incomeRates: { d7: '2.20%', d30: '2.60%', d60: '3.10%', d90: '3.70%' }, teamIncome: { first: '10%', second: '7%', third: '4%' } },
        { from: 5, to: 6, members: 140, minInvestment: 3000, maxInvestment: 7000, tree: { l1: 45, l2: 95 }, incomeRates: { d7: '2.70%', d30: '3.30%', d60: '4.00%', d90: '4.70%' }, teamIncome: { first: '10%', second: '7%', third: '4%' } }
    ];

    const TeamStructureTree = ({ l1, l2 }) => {
        const l1Left = Math.ceil(l1 / 2);
        const l1Right = Math.floor(l1 / 2);
        const l2Left = Math.ceil(l2 / 2);
        const l2Right = Math.floor(l2 / 2);
        return (
            <div className="flex flex-col items-center justify-center py-2 relative w-full px-2">
                <div className="z-10 mb-4">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/20 bg-indigo-500 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm shadow-md">
                        1
                    </div>
                </div>
                <div className="absolute top-[28px] h-8 border-t-2 border-l-2 border-r-2 border-slate-200 dark:border-white/10 rounded-t-xl" style={{ width: '60%' }}></div>
                <div className="flex justify-between w-full mb-4 relative z-10 px-2">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/20 bg-purple-500 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm shadow-md mb-1">
                            {l1Left}
                        </div>
                        <div className="h-4 w-[2px] bg-gray-900/10 dark:bg-white/10"></div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/20 bg-pink-500 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm shadow-md mb-1">
                            {l1Right}
                        </div>
                        <div className="h-4 w-[2px] bg-gray-900/10 dark:bg-white/10"></div>
                    </div>
                </div>
                <div className="flex justify-between w-full relative z-10 px-2">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/20 bg-rose-500 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm shadow-md">
                        {l2Left}
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/20 bg-orange-500 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm shadow-md">
                        {l2Right}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-24">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-300 border-b border-slate-200 dark:border-white/5">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/me')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/5 dark:bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="text-gray-900 dark:text-white" size={24} />
                    </button>
                    <h1 className="text-gray-900 dark:text-white font-black text-lg uppercase tracking-tight">Level Status</h1>
                    <div className="w-10"></div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-20 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <Star size={18} className="text-primary fill-primary" />
                    <h2 className="text-gray-900 dark:text-white font-bold text-lg">Level Requirements</h2>
                </div>

                <div className="space-y-6">
                    {levelRequirements.map((level) => {
                        const isCurrentLevel = currentLevel === level.from;
                        const teamProgress = isCurrentLevel ? (level.members ? Math.min((currentTeam / level.members) * 100, 100) : 100) : 0;
                        const progress = isCurrentLevel ? teamProgress : 0;
                        const teamDone = level.members ? currentTeam >= level.members : true;

                        return (
                            <div key={`${level.from}-${level.to}`} className="relative group">
                                {/* Level Banner */}
                                <div className="relative">
                                    <img
                                        src={`/images/vip/vip_level_${level.from + 1}.png`}
                                        alt={`Level ${level.from + 1}`}
                                        className={`w-full h-32 rounded-t-[2rem] border-2 border-b-0 transition-all duration-300 object-cover ${isCurrentLevel ? 'border-primary' : (currentLevel >= level.from ? 'border-slate-200 dark:border-white/30' : 'border-slate-200 dark:border-white/10')
                                            }`}
                                    />
                                    {isCurrentLevel && (
                                        <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-black px-4 py-1.5 rounded-bl-[1.5rem] shadow-lg z-40 border-b border-l border-slate-200 dark:border-white/20 uppercase">
                                            ACTIVE
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 right-4">
                                        <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md border ${currentLevel >= level.from
                                            ? 'bg-primary/20 text-primary border-primary/30'
                                            : 'bg-black/60 text-gray-900/40 dark:text-white/40 border-slate-200 dark:border-white/10'
                                            }`}>
                                            {currentLevel >= level.from ? 'Unlocked Zone' : 'Locked Zone'}
                                        </div>
                                    </div>
                                </div>

                                {/* Level Stats Panel */}
                                <div className={`bg-white dark:bg-dark-200 border-2 border-t-0 rounded-b-[2rem] p-5 relative z-0 ${isCurrentLevel ? 'border-primary shadow-[0_20px_40px_rgba(164,241,58,0.05)]' : 'border-slate-200 dark:border-white/10'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="text-gray-900 dark:text-white font-black text-xl italic uppercase tracking-tighter">Level {level.from + 1}</span>
                                        {!isCurrentLevel && <Shield size={16} className="text-gray-900/10 dark:text-white/10" />}
                                    </div>

                                    {isCurrentLevel && (
                                        <div className="mb-6 space-y-3">
                                            <div className="flex justify-between text-[11px] font-black text-gray-900/40 dark:text-white/40 mb-2 uppercase tracking-widest">
                                                <span>PROGRESS</span>
                                                <span className="text-primary">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-2.5 p-0.5 border border-slate-200 dark:border-white/5">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 shadow-[0_0_15px_rgba(164,241,58,0.3)] transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            {level.members && (
                                                <div className="w-full">
                                                    <div className={`rounded-xl p-2.5 border text-center ${teamDone ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/10'}`}>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-gray-900/40 dark:text-white/40 mb-1">Active Team Members</div>
                                                        <div className={`text-xs font-black ${teamDone ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                                                            {currentTeam} / {level.members}
                                                        </div>
                                                        <div className={`text-[8px] mt-0.5 font-bold ${teamDone ? 'text-primary' : 'text-gray-900/30 dark:text-white/30'}`}>
                                                            {teamDone ? '✓ Done' : 'Need more'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {level.tree ? (
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-900/5 dark:bg-white/5 rounded-3xl p-4 border border-slate-200 dark:border-white/5 flex flex-col items-center min-h-[160px]">
                                                <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-[9px] font-black uppercase tracking-widest mb-3 self-start">
                                                    <Users size={12} className="text-primary" /> Team Structure
                                                </div>
                                                <TeamStructureTree l1={level.tree.l1} l2={level.tree.l2} />
                                                <div className="mt-3 w-full bg-black/30 rounded-xl p-2 border border-slate-200 dark:border-white/5">
                                                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-black">
                                                        <span className="text-purple-400">A</span>
                                                        <span className="text-gray-900 dark:text-white">{level.tree.l1}</span>
                                                        <span className="text-gray-900/20 dark:text-white/20">|</span>
                                                        <span className="text-pink-400">B+C</span>
                                                        <span className="text-gray-900 dark:text-white">{level.tree.l2}</span>
                                                        <span className="text-gray-900/20 dark:text-white/20">=</span>
                                                        <span className={isCurrentLevel ? "text-primary" : "text-cyan-400"}>{level.members ? level.members : '∞'}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] text-gray-900/60 dark:text-white/60 font-bold">
                                                    Total: <span className={isCurrentLevel ? "text-primary" : "text-gray-900 dark:text-white"}>{currentTeam}</span> / {level.members ? level.members : '∞'}
                                                </div>
                                                {level.teamIncome && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 space-y-1 w-full text-[10px] font-bold text-gray-900/30 dark:text-white/30 uppercase tracking-tighter">
                                                        <div className="flex justify-between uppercase">
                                                            <span>1st Gen:</span>
                                                            <span className="text-primary">{level.teamIncome.first}</span>
                                                        </div>
                                                        <div className="flex justify-between uppercase">
                                                            <span>2nd Gen:</span>
                                                            <span className="text-primary">{level.teamIncome.second}</span>
                                                        </div>
                                                        <div className="flex justify-between uppercase">
                                                            <span>3rd Gen:</span>
                                                            <span className="text-primary">{level.teamIncome.third}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <div className="bg-gray-900/5 dark:bg-white/5 rounded-3xl p-4 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center flex-1">
                                                    <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
                                                        <DollarSign size={12} className="text-primary" /> Investment
                                                    </div>
                                                    <div className="text-primary font-black text-sm italic">
                                                        ${level.minInvestment} - ${level.maxInvestment}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-900/5 dark:bg-white/5 rounded-3xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-center flex-1">
                                                    <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-[9px] font-black uppercase tracking-widest mb-3 justify-center">
                                                        <DollarSign size={12} className="text-primary" /> Daily Income
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                            <span>7 Days:</span>
                                                            <span className="text-primary">{level.incomeRates.d7}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                            <span>30 Days:</span>
                                                            <span className="text-primary">{level.incomeRates.d30}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                            <span>60 Days:</span>
                                                            <span className="text-primary">{level.incomeRates.d60}</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                            <span>90 Days:</span>
                                                            <span className="text-primary">{level.incomeRates.d90}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Level 1: No team structure — show only Investment & Daily Income */
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-900/5 dark:bg-white/5 rounded-3xl p-4 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
                                                    <DollarSign size={12} className="text-primary" /> Investment
                                                </div>
                                                <div className="text-primary font-black text-sm italic">
                                                    ${level.minInvestment} - ${level.maxInvestment}
                                                </div>
                                            </div>
                                            <div className="bg-gray-900/5 dark:bg-white/5 rounded-3xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-center">
                                                <div className="flex items-center gap-1.5 text-gray-900/40 dark:text-white/40 text-[9px] font-black uppercase tracking-widest mb-3 justify-center">
                                                    <DollarSign size={12} className="text-primary" /> Daily Income
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                        <span>7 Days:</span>
                                                        <span className="text-primary">{level.incomeRates.d7}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                        <span>30 Days:</span>
                                                        <span className="text-primary">{level.incomeRates.d30}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                        <span>60 Days:</span>
                                                        <span className="text-primary">{level.incomeRates.d60}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-900/40 dark:text-white/40 font-black flex justify-between uppercase">
                                                        <span>90 Days:</span>
                                                        <span className="text-primary">{level.incomeRates.d90}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => (isCurrentLevel || currentLevel > level.from) && navigate('/lend', { state: { viewLevel: level.from } })}
                                        disabled={!(isCurrentLevel || currentLevel > level.from)}
                                        className={`w-full py-4 rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-lg transition-all duration-300 ${isCurrentLevel || currentLevel > level.from
                                            ? 'bg-gradient-to-r from-primary to-[#82c91e] text-black hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95'
                                            : 'bg-gray-900/5 dark:bg-white/5 text-gray-900/10 dark:text-white/10 cursor-not-allowed border border-slate-200 dark:border-white/5'
                                            }`}
                                    >
                                        {isCurrentLevel || currentLevel > level.from ? 'Upgrade & Earn' : 'Level Locked'}
                                    </button>
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

export default LevelRequirements;
