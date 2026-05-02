import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Briefcase, Users, DollarSign, TrendingUp } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const TeamBusiness = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/stats/team-list', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (err) {
                console.error('Team business fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-dark-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!data?.teamBusinessEnabled) {
        return (
            <div className="min-h-screen bg-white dark:bg-dark-300 flex flex-col items-center justify-center gap-4 px-6 pb-20">
                <Briefcase size={48} className="text-gray-300" />
                <p className="text-gray-400 font-bold text-center">Team Business View is not enabled for your account.</p>
                <button onClick={() => navigate('/me')} className="text-amber-500 font-black text-sm">← Go Back</button>
                <BottomNav />
            </div>
        );
    }

    // Filter: only partners with deposit > 0
    const activePartners = (data.partnerBreakdown || []).filter(p => p.teamDeposit > 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 pt-12 pb-8 px-4 relative overflow-hidden shadow-xl shadow-amber-500/20">
                <div className="absolute -right-8 -bottom-8 opacity-15">
                    <Briefcase size={140} className="text-white" />
                </div>
                <div className="max-w-md mx-auto relative z-10">
                    <button
                        onClick={() => navigate('/me')}
                        className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Back</span>
                    </button>
                    <h1 className="text-white font-black text-2xl uppercase tracking-tight drop-shadow-md">
                        Team Business
                    </h1>
                    <p className="text-white/70 text-xs font-bold mt-1 uppercase tracking-widest">Overview & Partner Breakdown</p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Total Members */}
                    <div className="bg-white dark:bg-dark-200 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 shadow-md">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                                <Users size={14} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-gray-500 dark:text-white/50 text-[9px] font-black uppercase tracking-widest">Total Members</p>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{data.total}</h3>
                        <p className="text-gray-400 dark:text-white/30 text-[9px] font-bold mt-1 uppercase">Gen 1 + 2 + 3</p>
                    </div>

                    {/* Total Deposit */}
                    <div className="bg-white dark:bg-dark-200 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 shadow-md">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                                <DollarSign size={14} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-gray-500 dark:text-white/50 text-[9px] font-black uppercase tracking-widest">Team Deposit</p>
                        </div>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">
                            ${(data.teamTotalDeposit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-gray-400 dark:text-white/30 text-[9px] font-bold mt-1 uppercase">Approved Deposits</p>
                    </div>
                </div>

                {/* Partner Breakdown */}
                {activePartners.length > 0 ? (
                    <div className="bg-white dark:bg-dark-200 rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-md">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-amber-50 dark:bg-amber-500/5">
                            <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
                            <p className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">Partner Business Breakdown</p>
                            <span className="ml-auto bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                                {activePartners.length} partners
                            </span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-50 dark:divide-white/5">
                            {activePartners.map((partner, idx) => {
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                                const initials = partner.fullName?.charAt(0).toUpperCase() || '?';
                                // Gradient intensity by rank
                                const avatarColors = [
                                    'bg-amber-400 text-white',
                                    'bg-slate-400 text-white',
                                    'bg-orange-400 text-white',
                                ];
                                const avatarColor = avatarColors[idx] || 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white';

                                return (
                                    <div key={partner._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/50 dark:hover:bg-white/2 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Rank */}
                                            <span className="text-base w-7 text-center flex-shrink-0">{medal}</span>
                                            {/* Avatar */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${avatarColor}`}>
                                                {initials}
                                            </div>
                                            {/* Name & sub count */}
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-black text-sm leading-tight">
                                                    {partner.fullName || partner.email || partner.phone}
                                                </p>
                                                <p className="text-gray-400 dark:text-white/40 text-[9px] font-bold mt-0.5">
                                                    {partner.subTeamSize} sub-member{partner.subTeamSize !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-gray-900 dark:text-white font-black text-sm">
                                                ${(partner.teamDeposit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-amber-500 text-[9px] font-black uppercase">team biz</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-dark-200 rounded-3xl p-8 text-center border border-gray-100 dark:border-white/5 shadow-md">
                        <DollarSign size={36} className="text-gray-200 dark:text-white/10 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-white/30 font-bold text-sm">No partner business yet</p>
                        <p className="text-gray-300 dark:text-white/20 text-xs mt-1">When your direct partners make deposits, they'll appear here.</p>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default TeamBusiness;
