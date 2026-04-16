import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import {
    User,
    Copy,
    LogOut,
    Shield,
    Settings,
    ChevronRight,
    Star,
    Users,
    DollarSign,
    Download,
    Camera,
    HelpCircle,
    Bell,
    Briefcase,
    History,
    UserPlus,
    Sparkles
} from 'lucide-react';
import axios from 'axios';
import { usePWA } from '../hooks/usePWA';
import { toast } from 'react-toastify';

const Me = () => {
    const navigate = useNavigate();
    const { user, logout, updateUserInfo } = useAuth();
    const { isInstallable, installApp } = usePWA();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        console.log('Current User Data in Me.jsx:', user);
    }, [user]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/profile/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            if (updateUserInfo) {
                updateUserInfo({ profileImage: res.data.user.profileImage });
            }
            toast.success('Profile updated successfully!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async () => {
        const installed = await installApp();
        if (installed) {
            console.log('App installed successfully');
        } else {
            toast.info('To install: Tap browser menu (⋮ or Share) > Add to Home Screen/Install App');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const copyInvitationCode = () => {
        const referralLink = `${window.location.origin}/register?ref=${user?.invitationCode || ''}`;
        navigator.clipboard.writeText(referralLink);
        toast.info('Referral link copied!');
    };

    const currentLevel = user?.vipLevel || 0;

    const LevelStatusCard = () => {
        const levelNum = currentLevel + 1;
        return (
            <div className="relative w-full aspect-[1.5/1] sm:aspect-[2.2/1] bg-slate-900/90 dark:bg-dark-200 rounded-[2.5rem] overflow-hidden border border-white/20 mb-6 group shadow-2xl">
                {/* 3D Animated Grid Background */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, #475569 1px, transparent 0)`,
                        backgroundSize: '24px 24px',
                    }}></div>
                </div>

                {/* Light Glows */}
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/5 blur-[60px] rounded-full"></div>
                <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-cyan-500/5 blur-[60px] rounded-full"></div>

                <div className="relative h-full flex items-center p-5 sm:p-10">
                    {/* Left Section: Level & Status */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-125"></div>
                            <img
                                src={`/images/levels/level_${levelNum}.png`}
                                alt={`Level ${levelNum}`}
                                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(164,241,58,0.4)]"
                                onError={(e) => { 
                                    e.target.src = `/images/vip/vip_level_${levelNum}.png`;
                                    e.target.onerror = () => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }
                                }}
                            />
                            <div className="hidden absolute inset-0 items-center justify-center text-primary/40">
                                <Shield size={48} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center mt-3">
                            <span className="text-white/40 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-1">Current Status</span>
                            <span className="text-white font-black text-2xl sm:text-4xl tracking-tighter italic uppercase leading-none shadow-primary/20 drop-shadow-lg scale-y-110">Level {levelNum}</span>
                        </div>
                    </div>

                    {/* Right Section: Action Tiles */}
                    <div className="flex-1 flex flex-col gap-3 sm:gap-5 pl-2">
                        {/* My Team Button */}
                        <div
                            onClick={() => navigate('/my-team')}
                            className="bg-emerald-500/20 rounded-[1.5rem] p-4 sm:p-6 border border-emerald-500/40 cursor-pointer active:scale-95 transition-all flex items-center gap-3 group/team shadow-none"
                        >
                            <div className="relative flex-shrink-0">
                                <Users size={28} className="sm:size-40 text-emerald-300" />
                                <div className="absolute inset-0 bg-emerald-400/30 blur-md rounded-full opacity-0 group-hover/team:opacity-100 transition-opacity"></div>
                            </div>
                            <span className="text-emerald-50 font-black text-[11px] sm:text-[14px] uppercase tracking-widest">My team</span>
                        </div>

                        {/* Upgrade Credit Button */}
                        <div
                            onClick={() => navigate('/level-requirements')}
                            className="bg-primary rounded-[1.5rem] p-5 sm:p-7 cursor-pointer active:scale-95 transition-all flex items-center gap-3 shadow-none filter hover:brightness-105"
                        >
                            <div className="flex-shrink-0">
                                <Star size={32} className="sm:size-44" fill="black" />
                            </div>
                            <span className="text-black font-black text-[11px] sm:text-[14px] uppercase tracking-widest">Upgrade credit</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-300 transition-colors duration-300 pb-20">
            {/* Compact Header */}
            <div className="bg-emerald-300/80 dark:bg-dark-200 backdrop-blur-xl pt-3 pb-4 border-b border-emerald-400 dark:border-white/5 shadow-[0_4px_30px_rgba(16,185,129,0.2)] transition-colors">
                <div className="max-w-md mx-auto px-4">
                    {/* Profile Info Row */}
                    <div className="flex items-center justify-between mb-3 relative">
                        <div className="flex items-center gap-3 relative z-10">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-md transition-all group-active:scale-95">
                                    {user?.profileImage ? (
                                        <img
                                            src={user.profileImage}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = '';
                                                e.target.parentElement.innerHTML = '<User class="text-gray-900 dark:text-white" size={24} />';
                                            }}
                                        />
                                    ) : (
                                        <User className="text-gray-900 dark:text-white" size={24} />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-primary p-1 rounded-full border-2 border-white shadow-sm">
                                    <Camera size={8} className="text-black" />
                                </div>
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center z-20">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-gray-900 font-black text-lg tracking-tight leading-none uppercase italic">Dove</h1>
                                <span className="text-gray-600 text-[10px] font-bold mt-1">
                                    User: {user?.fullName || 'Anonymous'}
                                </span>
                                <span className="text-gray-500 text-[9px] font-medium leading-none mt-0.5">
                                    User ID: {user?.memberId || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons & Invite */}
                        <div className="flex items-center gap-1 relative z-10 justify-end">
                            <button onClick={() => navigate('/notifications')} className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-100 dark:hover:bg-white/10 rounded-full shadow-sm bg-gray-50 dark:bg-dark-100">
                                <Bell size={18} />
                            </button>
                            <button onClick={() => navigate('/help')} className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-100 dark:hover:bg-white/10 rounded-full shadow-sm bg-gray-50 dark:bg-dark-100">
                                <HelpCircle size={18} />
                            </button>
                            <button onClick={() => navigate('/settings')} className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-100 dark:hover:bg-white/10 rounded-full shadow-sm bg-gray-50 dark:bg-dark-100">
                                <Settings size={18} />
                            </button>

                            {/* Invite Button at the end */}
                            <button
                                onClick={copyInvitationCode}
                                className="flex flex-col items-center gap-0.5 ml-1 group"
                            >
                                <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-900 transition-all group-active:scale-90 group-hover:bg-gray-50 shadow-md">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-gray-700 dark:text-white/60 text-[7px] font-black uppercase tracking-tighter">Invite</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                        <div className="glass-card p-2 bg-emerald-400/30 dark:bg-dark-100 backdrop-blur-md border border-emerald-500/30 dark:border-white/5 rounded-xl shadow-sm">
                            <div className="text-emerald-950/90 dark:text-white/40 text-[7px] uppercase mb-0.5 font-bold">Balance</div>
                            <div className="font-bold text-[10px] tracking-tight text-emerald-900 dark:text-emerald-400 drop-shadow-sm">${user?.balance?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div
                            onClick={() => navigate('/history')}
                            className="glass-card p-2 bg-emerald-400/30 dark:bg-dark-100 backdrop-blur-md cursor-pointer hover:bg-emerald-500/40 dark:hover:bg-white/5 transition-colors border border-emerald-500/30 dark:border-white/5 rounded-xl shadow-sm"
                        >
                            <div className="text-emerald-950/90 dark:text-white/40 text-[7px] uppercase mb-0.5 flex items-center gap-1 font-bold">
                                <History size={8} />
                                History
                            </div>
                            <div className="text-black dark:text-white font-bold text-[10px]">View Detail</div>
                        </div>
                        <div
                            onClick={() => navigate('/lend-funding')}
                            className="glass-card p-2 bg-emerald-400/30 dark:bg-dark-100 backdrop-blur-md cursor-pointer hover:bg-emerald-500/40 dark:hover:bg-white/5 transition-colors border border-emerald-500/30 dark:border-white/5 rounded-xl shadow-sm"
                        >
                            <div className="text-emerald-950/90 dark:text-white/40 text-[7px] uppercase mb-0.5 flex items-center gap-1 font-bold">
                                <Briefcase size={8} />
                                Profits
                            </div>
                            <div className="text-black dark:text-white font-bold text-[10px]">Record</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
                {/* Level Status Card */}
                <LevelStatusCard />

                {/* Star Reward System Entry */}
                <div
                    onClick={() => navigate('/star-rewards')}
                    className="relative overflow-hidden bg-amber-300 dark:bg-amber-900/10 backdrop-blur-md rounded-3xl p-5 border border-amber-400 dark:border-white/5 group cursor-pointer active:scale-[0.98] transition-all shadow-sm shadow-amber-500/20 dark:shadow-none"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Star size={60} className="text-yellow-500" fill="currentColor" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-500/10 shadow-inner flex items-center justify-center border border-yellow-200 dark:border-yellow-500/20">
                            <Sparkles size={24} className="text-yellow-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-gray-900 dark:text-white font-black text-sm uppercase tracking-wider italic leading-none">Star Member Rewards</h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                {[
                                    { id: 'tier1', pts: 7 },
                                    { id: 'tier2', pts: 12 },
                                    { id: 'tier3', pts: 18 }
                                ].map((tier, idx) => {
                                    const isReached = (user?.starPoints || 0) >= tier.pts || user?.claimedStarRewards?.includes(tier.id);
                                    return (
                                        <div key={tier.id} className="relative">
                                            <Star
                                                size={22}
                                                className={`transition-all duration-500 ${isReached ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-gray-200 dark:text-white/10'}`}
                                                fill={isReached ? "currentColor" : "none"}
                                            />
                                            {isReached && (
                                                <div className="absolute inset-0 bg-yellow-400 blur-md opacity-20 animate-pulse rounded-full"></div>
                                            )}
                                        </div>
                                    );
                                })}
                                <span className="text-gray-500 dark:text-white/40 text-[10px] font-bold uppercase tracking-tighter ml-1">
                                    {(user?.starPoints || 0)} pts
                                </span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 dark:text-white/20 group-hover:text-primary transition-colors" />
                    </div>
                </div>

                {/* Utility Options */}
                <div className="space-y-3 pb-6">
                    <div className="bg-emerald-300 dark:bg-emerald-900/10 backdrop-blur-md overflow-hidden border border-emerald-400 dark:border-white/5 rounded-2xl shadow-sm shadow-emerald-500/20">
                        <button
                            onClick={handleDownload}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-emerald-400/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-inner">
                                    <Download size={18} />
                                </div>
                                <span className="text-gray-800 dark:text-white text-sm font-bold uppercase tracking-tight">App Download</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 dark:text-white/20" />
                        </button>
                    </div>

                    <div className="bg-rose-300 dark:bg-rose-900/10 backdrop-blur-md overflow-hidden border border-rose-400 dark:border-white/5 rounded-2xl shadow-sm shadow-rose-500/20">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-rose-400/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-xl text-red-500 shadow-inner">
                                    <LogOut size={18} />
                                </div>
                                <span className="text-black dark:text-white text-sm font-bold uppercase tracking-tight">Logout Session</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 dark:text-white/20" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default Me;
