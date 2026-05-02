import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, X, CheckCircle2, AlertCircle, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { toast } from 'react-toastify';

const MyTeam = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [teamListData, setTeamListData] = useState(null);
    const [activeTab, setActiveTab] = useState('gen1');

    useEffect(() => {
        fetchTeamList();
    }, []);

    const fetchTeamList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/stats/team-list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeamListData(res.data);
        } catch (error) {
            console.error('Fetch team list error:', error);
            toast.error('Failed to load team details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'gen1', label: 'Gen 1', data: teamListData?.gen1 || [] },
        { id: 'gen2', label: 'Gen 2', data: teamListData?.gen2 || [] },
        { id: 'gen3', label: 'Gen 3', data: teamListData?.gen3 || [] },
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-24 font-sans text-gray-100">
            {/* Header */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/5 shadow-lg">
                <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-900/60 dark:text-white/60 hover:text-white relative z-10"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight uppercase">My Team</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
                {/* Team Dashboard Card */}
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Users size={120} className="text-primary" />
                    </div>
                    <div className="relative z-10 text-center">
                        <p className="text-gray-900/60 dark:text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Team Size</p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="p-3 bg-primary/20 rounded-2xl">
                                <Users size={32} className="text-primary" />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                {teamListData?.total > 0 ? teamListData.total : '0'}
                            </h2>
                        </div>
                        {/* Active (Deposited) Members Count */}
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                            <CheckCircle2 size={14} className="text-green-400" />
                            <span className="text-xs font-bold text-green-400">
                                Active Members: {teamListData?.activeCount ?? 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 💼 Team Business Overview — only shown to privileged users */}
                {teamListData?.teamBusinessEnabled && (
                    <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-3xl p-6 shadow-xl shadow-amber-500/20 relative overflow-hidden text-white mb-6">
                        {/* Background Icon */}
                        <div className="absolute -right-4 -bottom-4 opacity-20">
                            <Briefcase size={120} className="text-white" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                                    <Briefcase size={16} className="text-white" />
                                </div>
                                <p className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-sm">Team Business Overview</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Total Members */}
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users size={14} className="text-white/90" />
                                        <p className="text-white/80 text-[9px] font-black uppercase tracking-widest drop-shadow-sm">Total Members</p>
                                    </div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter drop-shadow-md">
                                        {teamListData.total}
                                    </h3>
                                    <p className="text-white/70 text-[9px] font-bold mt-1 uppercase">Gen 1 + 2 + 3</p>
                                </div>

                                {/* Total Team Deposits */}
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign size={14} className="text-white/90" />
                                        <p className="text-white/80 text-[9px] font-black uppercase tracking-widest drop-shadow-sm">Team Deposit</p>
                                    </div>
                                    <h3 className="text-2xl font-black text-white tracking-tighter drop-shadow-md">
                                        ${(teamListData.teamTotalDeposit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                    <p className="text-white/70 text-[9px] font-bold mt-1 uppercase">Approved Deposits</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs selection */}
                <div className="flex p-1.5 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/5 rounded-2xl shadow-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'text-gray-900/40 dark:text-white/40 hover:text-white'
                                }`}
                        >
                            {tab.label} ({tab.data.length})
                        </button>
                    ))}
                </div>

                {/* Member List */}
                <div className="space-y-3">
                    {currentTab.data.length > 0 ? (
                        currentTab.data.map((member, idx) => (
                            <div key={idx} className="bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/5 p-4 rounded-3xl flex items-center justify-between group hover:border-primary/30 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20">
                                        {member.fullName?.charAt(0).toUpperCase() || <Users size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-gray-900 dark:text-white font-black text-sm tracking-tight">{member.fullName || 'Anonymous User'}</h4>
                                        <p className="text-gray-900/30 dark:text-white/30 text-[10px] uppercase font-bold tracking-wider mt-0.5">{member.phone ? `+${member.phone}` : member.email || 'No contact info'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    {member.isActiveMember ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                            <CheckCircle2 size={12} className="text-green-400" />
                                            <span className="text-[9px] font-black text-green-400 uppercase tracking-tighter">Deposited</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                            <AlertCircle size={12} className="text-red-400" />
                                            <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Pending</span>
                                        </div>
                                    )}
                                    <p className="text-gray-900/20 dark:text-white/20 text-[8px] font-bold uppercase tracking-widest">
                                        Joined {new Date(member.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                            <Users size={64} className="mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest italic">No members in this tier</p>
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default MyTeam;
