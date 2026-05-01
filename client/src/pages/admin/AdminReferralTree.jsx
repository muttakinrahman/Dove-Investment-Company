import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Search, ChevronRight, User, Users, ArrowUp, ArrowDown,
    Phone, Mail, Code2, DollarSign, Star, X, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminReferralTree = () => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [chainData, setChainData] = useState(null);
    const [loadingChain, setLoadingChain] = useState(false);
    const debounceRef = useRef(null);

    // Debounced search suggestions
    useEffect(() => {
        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/admin/referral-search?q=${encodeURIComponent(query.trim())}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuggestions(res.data || []);
            } catch {
                setSuggestions([]);
            } finally {
                setLoadingSuggestions(false);
            }
        }, 400);
    }, [query]);

    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setSuggestions([]);
        setQuery(user.fullName || user.phone || user.email || '');
        setLoadingChain(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admin/referral-chain/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChainData(res.data);
        } catch (err) {
            toast.error('Failed to load referral chain');
        } finally {
            setLoadingChain(false);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setSuggestions([]);
        setSelectedUser(null);
        setChainData(null);
    };

    const getUserLabel = (u) => u?.fullName || u?.phone || u?.email || 'Unknown';
    const getUserSub = (u) => {
        if (u?.fullName && (u?.phone || u?.email)) return u.phone || u.email;
        return u?.invitationCode || '';
    };

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Referral Chain Explorer</h2>
                <p className="text-gray-500 dark:text-white/40 text-sm mt-1">
                    Search any member to see who referred them and who they referred
                </p>
            </div>

            {/* Search Box */}
            <div className="relative">
                <div className="flex items-center gap-3 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-sm">
                    <Search size={20} className="text-gray-400 dark:text-white/40 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, email, or invite code..."
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 text-sm focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {loadingSuggestions && <Loader2 size={16} className="text-primary animate-spin shrink-0" />}
                    {query && !loadingSuggestions && (
                        <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Dropdown suggestions */}
                {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        {suggestions.map((u) => (
                            <button
                                key={u._id}
                                onClick={() => handleSelectUser(u)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(u.fullName || u.phone || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-gray-900 dark:text-white text-sm font-medium">{getUserLabel(u)}</div>
                                    <div className="text-gray-500 dark:text-white/40 text-xs">{getUserSub(u)} • Code: {u.invitationCode}</div>
                                </div>
                                {u.referredBy ? (
                                    <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Has Referrer</span>
                                ) : (
                                    <span className="ml-auto text-xs text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded-full">No Referrer</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loadingChain && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-3">
                        <Loader2 size={36} className="text-primary animate-spin mx-auto" />
                        <p className="text-gray-500 dark:text-white/40 text-sm">Loading referral chain...</p>
                    </div>
                </div>
            )}

            {/* Referral Chain Result */}
            {chainData && !loadingChain && (
                <div className="space-y-6">

                    {/* ===== UPLINE CHAIN ===== */}
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-2 bg-purple-500/15 rounded-lg">
                                <ArrowUp size={18} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-gray-900 dark:text-white font-bold text-base">Upline Chain</h3>
                                <p className="text-gray-500 dark:text-white/40 text-xs">যারা এই সদস্যের উপরে আছেন (কে তাকে রেফার করেছে)</p>
                            </div>
                        </div>

                        {chainData.uplineChain.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 dark:text-white/30 text-sm">
                                এই সদস্যের কোনো referrer নেই (সরাসরি যোগ দিয়েছেন)
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {/* Root label */}
                                <div className="flex items-center gap-2 mb-2 px-2">
                                    <span className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-wider">Top Level</span>
                                    <div className="flex-1 border-t border-dashed border-gray-200 dark:border-white/10"></div>
                                </div>

                                {/* Upline members (reversed so top is at top) */}
                                {[...chainData.uplineChain].reverse().map((member, idx, arr) => (
                                    <div key={member._id} className="relative">
                                        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5 
                                            ${idx === arr.length - 1 ? 'border-2 border-purple-500/40 bg-purple-500/5' : ''}`}
                                            style={{ marginLeft: `${(arr.length - 1 - idx) * 16}px` }}
                                        >
                                            {/* Level badge */}
                                            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                                                ${idx === arr.length - 1 ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/60'}`}>
                                                L{arr.length - idx}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {(member.fullName || member.phone || '?')[0].toUpperCase()}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-gray-900 dark:text-white font-semibold text-sm">
                                                        {getUserLabel(member)}
                                                    </span>
                                                    {member.isBlocked && (
                                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Blocked</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    {(member.phone || member.email) && (
                                                        <span className="text-xs text-gray-500 dark:text-white/40 flex items-center gap-1">
                                                            {member.phone ? <Phone size={10} /> : <Mail size={10} />}
                                                            {member.phone || member.email}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-blue-400 flex items-center gap-1 font-mono">
                                                        <Code2 size={10} />
                                                        {member.invitationCode}
                                                    </span>
                                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                        <DollarSign size={10} />
                                                        {(member.balance || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Direct Referrer badge */}
                                            {idx === arr.length - 1 && (
                                                <span className="shrink-0 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-medium">
                                                    Direct Referrer
                                                </span>
                                            )}
                                        </div>

                                        {/* Arrow connector */}
                                        {idx < arr.length - 1 && (
                                            <div className="flex items-center" style={{ marginLeft: `${(arr.length - 2 - idx) * 16 + 26}px` }}>
                                                <ChevronRight size={14} className="text-gray-300 dark:text-white/20 rotate-90 my-0.5" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Arrow down to target */}
                                <div className="flex items-center" style={{ marginLeft: '26px' }}>
                                    <ChevronRight size={14} className="text-purple-400 rotate-90 my-0.5" />
                                </div>
                            </div>
                        )}

                        {/* Target User Card */}
                        <div className="mt-3 p-4 rounded-xl border-2 border-blue-500/50 bg-blue-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
                                    {(getUserLabel(chainData.user))[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-gray-900 dark:text-white font-bold text-base">{getUserLabel(chainData.user)}</span>
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">🎯 Selected Member</span>
                                        {chainData.user.isBlocked && (
                                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Blocked</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {(chainData.user.phone || chainData.user.email) && (
                                            <span className="text-xs text-gray-500 dark:text-white/40 flex items-center gap-1">
                                                {chainData.user.phone ? <Phone size={10} /> : <Mail size={10} />}
                                                {chainData.user.phone || chainData.user.email}
                                            </span>
                                        )}
                                        <span className="text-xs text-blue-400 flex items-center gap-1 font-mono">
                                            <Code2 size={10} />
                                            {chainData.user.invitationCode}
                                        </span>
                                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                                            <DollarSign size={10} />
                                            {(chainData.user.balance || 0).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                                            <Star size={10} />
                                            Level {(chainData.user.vipLevel ?? 0) + 1}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== DIRECT REFERRALS (Downline) ===== */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-500/15 rounded-lg">
                                    <ArrowDown size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 dark:text-white font-bold text-base">Direct Referrals (Downline)</h3>
                                    <p className="text-gray-500 dark:text-white/40 text-xs">এই সদস্য যাদেরকে রেফার করেছেন (Level 1)</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-sm font-bold rounded-full">
                                {chainData.directReferrals.length} জন
                            </span>
                        </div>

                        {chainData.directReferrals.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 dark:text-white/30 text-sm">
                                এই সদস্য এখনো কাউকে রেফার করেননি
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {chainData.directReferrals.map((member) => (
                                    <button
                                        key={member._id}
                                        onClick={() => handleSelectUser(member)}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                            {(getUserLabel(member))[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-gray-900 dark:text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                                                    {getUserLabel(member)}
                                                </span>
                                                {member.isBlocked && (
                                                    <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded uppercase">Blocked</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {(member.phone || member.email) && (
                                                    <span className="text-xs text-gray-500 dark:text-white/40 truncate">{member.phone || member.email}</span>
                                                )}
                                                <span className="text-xs text-emerald-400 font-mono">{member.invitationCode}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-emerald-400">${(member.balance || 0).toFixed(2)}</span>
                                                <span className="text-xs text-gray-400 dark:text-white/30">
                                                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString('bn-BD') : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 dark:text-white/20 group-hover:text-emerald-400 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!chainData && !loadingChain && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
                        <Users size={28} className="text-blue-400" />
                    </div>
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-2">কোনো সদস্য সার্চ করুন</h3>
                    <p className="text-gray-400 dark:text-white/30 text-sm max-w-xs mx-auto">
                        উপরের সার্চ বক্সে নাম, ফোন, ইমেইল অথবা Invite Code লিখে যেকোনো সদস্যের referral chain দেখুন
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminReferralTree;
