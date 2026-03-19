import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, X, CheckCircle2, AlertCircle } from 'lucide-react';
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
            <div className="min-h-screen bg-dark-300 flex items-center justify-center">
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
        <div className="min-h-screen bg-dark-300 pb-24 font-sans text-gray-100">
            {/* Header */}
            <div className="bg-dark-200 border-b border-white/5 shadow-lg">
                <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white relative z-10"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-lg font-bold text-white tracking-tight uppercase">My Team</h1>
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
                        <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Team Size</p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="p-3 bg-primary/20 rounded-2xl">
                                <Users size={32} className="text-primary" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter">
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

                {/* Tabs selection */}
                <div className="flex p-1.5 bg-dark-200 border border-white/5 rounded-2xl shadow-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'text-white/40 hover:text-white'
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
                            <div key={idx} className="bg-dark-200 border border-white/5 p-4 rounded-3xl flex items-center justify-between group hover:border-primary/30 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20">
                                        {member.fullName?.charAt(0).toUpperCase() || <Users size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black text-sm tracking-tight">{member.fullName || 'Anonymous User'}</h4>
                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-wider mt-0.5">+{member.phone}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    {member.hasDeposited ? (
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
                                    <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest">
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
