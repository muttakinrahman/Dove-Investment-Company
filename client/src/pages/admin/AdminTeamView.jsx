import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
    Search, Loader, User, Users, Briefcase,
    ArrowDownLeft, ArrowUpRight, TrendingUp,
    ChevronDown, ChevronUp, X, DollarSign
} from 'lucide-react';

const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminTeamView = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [teamLoading, setTeamLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const searchTimeout = useRef(null);

    const getToken = () => localStorage.getItem('token');

    // ── Search users ──
    const handleSearch = (val) => {
        setQuery(val);
        setSelectedUser(null);
        setTeamData(null);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (val.trim().length < 2) { setSearchResults([]); return; }
        setSearchLoading(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/support/admin/search-users?q=${encodeURIComponent(val.trim())}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setSearchResults(res.data);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 400);
    };

    // ── Select user → load their team data ──
    const handleSelectUser = async (u) => {
        setSelectedUser(u);
        setSearchResults([]);
        setQuery(u.fullName || u.phone || u.email || '');
        setTeamData(null);
        setExpandedId(null);
        setTeamLoading(true);
        try {
            const res = await axios.get(`/api/stats/team-list?asUserId=${u._id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setTeamData(res.data);
        } catch (err) {
            console.error('Team data error:', err);
        } finally {
            setTeamLoading(false);
        }
    };

    const clearSelection = () => {
        setSelectedUser(null);
        setTeamData(null);
        setQuery('');
        setSearchResults([]);
        setExpandedId(null);
    };

    // ── Filter active partners ──
    const activePartners = (teamData?.partnerBreakdown || []).filter(p => p.teamDeposit > 0);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Business Viewer</h2>
                <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
                    Search any member to view their Team Business exactly as they see it
                </p>
            </div>

            {/* Search Box */}
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" size={18} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search member by name, phone or email..."
                        className="w-full bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-sm transition-all"
                    />
                    {searchLoading && (
                        <Loader size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                    )}
                    {selectedUser && !searchLoading && (
                        <button onClick={clearSelection} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                            <X size={16} className="text-red-400" />
                        </button>
                    )}
                </div>

                {/* Dropdown results */}
                {searchResults.length > 0 && !selectedUser && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                        {searchResults.map(u => (
                            <button
                                key={u._id}
                                onClick={() => handleSelectUser(u)}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                    {u.profileImage
                                        ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                                        : <User size={20} />
                                    }
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{u.fullName || '—'}</p>
                                    <p className="text-xs text-primary font-semibold">{u.phone || u.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected User Badge */}
            {selectedUser && (
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3.5">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                        {selectedUser.profileImage
                            ? <img src={selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                            : <User size={20} />
                        }
                    </div>
                    <div>
                        <p className="font-black text-gray-900 dark:text-white text-sm">{selectedUser.fullName || '—'}</p>
                        <p className="text-xs text-primary font-bold">{selectedUser.phone || selectedUser.email}</p>
                    </div>
                    <div className="ml-auto text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
                        Viewing as Member
                    </div>
                </div>
            )}

            {/* Loading */}
            {teamLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader size={32} className="animate-spin text-primary" />
                </div>
            )}

            {/* No team business */}
            {!teamLoading && teamData && !teamData.teamBusinessEnabled && (
                <div className="bg-white dark:bg-dark-200 rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 shadow-sm">
                    <Briefcase size={48} className="mx-auto mb-4 text-gray-300 dark:text-white/10" />
                    <p className="font-bold text-gray-500 dark:text-white/40">Team Business not enabled for this user</p>
                </div>
            )}

            {/* Team Business Data */}
            {!teamLoading && teamData && teamData.teamBusinessEnabled && (
                <div className="space-y-5">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Total Members */}
                        <div className="bg-white dark:bg-dark-200 rounded-2xl p-5 border border-slate-200 dark:border-amber-500/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-xl">
                                    <Users size={16} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-gray-500 dark:text-white/40 text-[10px] font-black uppercase tracking-widest">Total Members</p>
                            </div>
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{teamData.total}</h3>
                            <p className="text-gray-400 dark:text-white/30 text-[9px] font-bold mt-1.5 uppercase">Gen 1 + 2 + 3</p>
                        </div>

                        {/* Team Deposit */}
                        <div className="bg-white dark:bg-dark-200 rounded-2xl p-5 border border-slate-200 dark:border-green-500/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-xl">
                                    <ArrowDownLeft size={16} className="text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-gray-500 dark:text-white/40 text-[10px] font-black uppercase tracking-widest">Team Deposit</p>
                            </div>
                            <h3 className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tighter">{fmt(teamData.teamTotalDeposit)}</h3>
                            <p className="text-gray-400 dark:text-white/30 text-[9px] font-bold mt-1.5 uppercase">Approved Deposits</p>
                        </div>

                        {/* Team Withdrawal */}
                        <div className="bg-white dark:bg-dark-200 rounded-2xl p-5 border border-slate-200 dark:border-rose-500/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-500/10 rounded-xl">
                                    <ArrowUpRight size={16} className="text-rose-600 dark:text-rose-400" />
                                </div>
                                <p className="text-gray-500 dark:text-white/40 text-[10px] font-black uppercase tracking-widest">Team Withdrawal</p>
                            </div>
                            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">{fmt(teamData.teamTotalWithdraw)}</h3>
                            <p className="text-gray-400 dark:text-white/30 text-[9px] font-bold mt-1.5 uppercase">Approved (All Team)</p>
                        </div>
                    </div>

                    {/* Partner Breakdown */}
                    {activePartners.length > 0 ? (
                        <div className="bg-white dark:bg-dark-200 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-amber-50 dark:bg-amber-500/5">
                                <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
                                <p className="text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">Direct Partner Business</p>
                                <span className="ml-auto bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {activePartners.length} partners
                                </span>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {activePartners.map((partner, idx) => {
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                                    const initials = partner.fullName?.charAt(0).toUpperCase() || '?';
                                    const avatarColors = ['bg-amber-400 text-white', 'bg-slate-400 text-white', 'bg-orange-400 text-white'];
                                    const avatarColor = avatarColors[idx] || 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white';
                                    const isExpanded = expandedId === partner._id;

                                    return (
                                        <div key={partner._id}>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : partner._id)}
                                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-50/50 dark:hover:bg-white/2 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base w-7 text-center flex-shrink-0">{medal}</span>
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${avatarColor}`}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-900 dark:text-white font-black text-sm leading-tight">
                                                            {partner.fullName || partner.email || partner.phone}
                                                        </p>
                                                        <p className="text-gray-400 dark:text-white/40 text-[9px] font-bold mt-0.5">
                                                            {partner.subTeamSize} sub-member{partner.subTeamSize !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-green-600 dark:text-green-400 font-black text-sm">{fmt(partner.teamDeposit)}</p>
                                                        <p className="text-rose-500 dark:text-rose-400 font-bold text-[11px]">-{fmt(partner.teamWithdraw)}</p>
                                                    </div>
                                                    {isExpanded
                                                        ? <ChevronUp size={15} className="text-gray-400 dark:text-white/30" />
                                                        : <ChevronDown size={15} className="text-gray-400 dark:text-white/30" />
                                                    }
                                                </div>
                                            </button>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="bg-gray-50 dark:bg-dark-300/50 border-t border-slate-100 dark:border-white/5 px-6 py-5 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white dark:bg-dark-200 rounded-xl p-4 border border-green-100 dark:border-green-500/10">
                                                            <p className="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase mb-1.5">Sub-tree Deposit</p>
                                                            <p className="text-green-600 dark:text-green-400 font-black text-base">{fmt(partner.teamDeposit)}</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-dark-200 rounded-xl p-4 border border-rose-100 dark:border-rose-500/10">
                                                            <p className="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase mb-1.5">Own Withdrawal</p>
                                                            <p className="text-rose-500 dark:text-rose-400 font-black text-base">{fmt(partner.partnerOwnWithdraw)}</p>
                                                        </div>
                                                    </div>

                                                    {partner.gen2WithdrawDetails?.length > 0 && (
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                                                                👥 Sub-member Withdrawals
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                {partner.gen2WithdrawDetails.map(member => (
                                                                    <div key={member._id} className="flex items-center justify-between bg-white dark:bg-dark-200 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-white/5">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-[11px] font-black text-rose-600 dark:text-rose-400">
                                                                                {(member.fullName || member.email || '?').charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <p className="text-gray-800 dark:text-white/80 font-bold text-xs">{member.fullName || member.email || member.phone}</p>
                                                                        </div>
                                                                        <p className="text-rose-500 dark:text-rose-400 font-black text-sm">{fmt(member.withdraw)}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 px-5 py-3.5">
                                                        <p className="text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest">Net Business</p>
                                                        <p className="text-amber-700 dark:text-amber-400 font-black text-sm">{fmt(partner.teamDeposit - (partner.teamWithdraw || 0))}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-200 rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 shadow-sm">
                            <DollarSign size={40} className="mx-auto mb-3 text-gray-200 dark:text-white/10" />
                            <p className="font-bold text-gray-400 dark:text-white/30 text-sm">No partner business found for this user</p>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!selectedUser && !teamLoading && (
                <div className="bg-white dark:bg-dark-200 rounded-3xl p-16 text-center border border-slate-200 dark:border-white/5 shadow-sm">
                    <Briefcase size={56} className="mx-auto mb-5 text-gray-200 dark:text-white/10" />
                    <p className="font-black text-gray-400 dark:text-white/30 text-base">Search a member above</p>
                    <p className="text-gray-300 dark:text-white/20 text-sm mt-1">Select a member to view their full Team Business data</p>
                </div>
            )}
        </div>
    );
};

export default AdminTeamView;
