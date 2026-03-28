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
            <div className="relative w-full aspect-[1.8/1] sm:aspect-[2.2/1] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-white/5 mb-6 group shadow-2xl">
                {/* 3D Animated Grid Background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`,
                        backgroundSize: '24px 24px',
                    }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-[80px] rounded-full animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/10 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

                <div className="relative h-full px-4 sm:px-8 flex items-center justify-between">
                    {/* Level Identity Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150"></div>
                            <img
                                src={`/images/levels/level_${levelNum}.png`}
                                alt={`Level ${levelNum}`}
                                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_30px_rgba(164,241,58,0.3)] transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 mix-blend-lighten"
                                onError={(e) => { e.target.src = `/images/vip/vip_level_${levelNum}.png` }}
                            />
                        </div>
                        <div className="mt-0 flex sm:mt-1 flex-col items-center text-center">
                            <span className="text-white/40 text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5 sm:mb-1">Current Status</span>
                            <span className="text-white font-black text-xl sm:text-2xl tracking-tighter italic uppercase leading-none shadow-primary/20 drop-shadow-lg scale-y-110">Level {levelNum}</span>
                        </div>
                    </div>

                    {/* Action Hub Section */}
                    <div className="flex flex-col gap-2 sm:gap-3 items-end">
                        <button
                            onClick={() => navigate('/my-team')}
                            className="group/btn relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 text-white font-black text-[9px] sm:text-[10px] px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-widest"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Users size={12} className="sm:size-14 text-primary" />
                                My team
                            </span>
                        </button>
                        <button
                            onClick={() => navigate('/level-requirements')}
                            className="group/btn relative overflow-hidden bg-primary text-black font-black text-[9px] sm:text-[10px] px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-2xl hover:shadow-[0_0_30px_rgba(164,241,58,0.6)] active:scale-95 transition-all uppercase tracking-widest"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                <Star size={12} className="sm:size-14" fill="black" />
                                Upgrade credit
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 pb-20">
            {/* Compact Header */}
            <div className="bg-white/60 backdrop-blur-xl pt-3 pb-4 border-b border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
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
                                                e.target.parentElement.innerHTML = '<User class="text-white" size={24} />';
                                            }}
                                        />
                                    ) : (
                                        <User className="text-white" size={24} />
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
                            <button onClick={() => navigate('/notifications')} className="p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-white rounded-full shadow-sm bg-white/50">
                                <Bell size={18} />
                            </button>
                            <button onClick={() => navigate('/help')} className="p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-white rounded-full shadow-sm bg-white/50">
                                <HelpCircle size={18} />
                            </button>
                            <button onClick={() => navigate('/settings')} className="p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-white rounded-full shadow-sm bg-white/50">
                                <Settings size={18} />
                            </button>

                            {/* Invite Button at the end */}
                            <button
                                onClick={copyInvitationCode}
                                className="flex flex-col items-center gap-0.5 ml-1 group"
                            >
                                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-all group-active:scale-90 group-hover:bg-primary/30 shadow-md">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-gray-700 text-[7px] font-black uppercase tracking-tighter">Invite</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                        <div className="glass-card p-2 bg-white/80 backdrop-blur-md border border-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <div className="text-gray-500 text-[7px] uppercase mb-0.5">Balance</div>
                            <div className="font-bold text-[10px] tracking-tight text-primary drop-shadow-sm">${user?.balance?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div
                            onClick={() => navigate('/history')}
                            className="glass-card p-2 bg-white/80 backdrop-blur-md cursor-pointer hover:bg-white transition-colors border border-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                        >
                            <div className="text-gray-500 text-[7px] uppercase mb-0.5 flex items-center gap-1">
                                <History size={8} />
                                History
                            </div>
                            <div className="text-gray-800 font-bold text-[10px]">View Detail</div>
                        </div>
                        <div
                            onClick={() => navigate('/lend-funding')}
                            className="glass-card p-2 bg-white/80 backdrop-blur-md cursor-pointer hover:bg-white transition-colors border border-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                        >
                            <div className="text-gray-500 text-[7px] uppercase mb-0.5 flex items-center gap-1">
                                <Briefcase size={8} />
                                Profits
                            </div>
                            <div className="text-gray-800 font-bold text-[10px]">Record</div>
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
                    className="relative overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-white group cursor-pointer active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(234,179,8,0.15)]"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Star size={60} className="text-yellow-500" fill="currentColor" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-100 shadow-inner flex items-center justify-center border border-yellow-200">
                            <Sparkles size={24} className="text-yellow-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-gray-900 font-black text-sm uppercase tracking-wider italic leading-none">Star Member Rewards</h3>
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
                                                className={`transition-all duration-500 ${isReached ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-gray-200'}`}
                                                fill={isReached ? "currentColor" : "none"}
                                            />
                                            {isReached && (
                                                <div className="absolute inset-0 bg-yellow-400 blur-md opacity-20 animate-pulse rounded-full"></div>
                                            )}
                                        </div>
                                    );
                                })}
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-tighter ml-1">
                                    {(user?.starPoints || 0)} pts
                                </span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                </div>

                {/* Utility Options */}
                <div className="space-y-3 pb-6">
                    <div className="bg-white/80 backdrop-blur-md overflow-hidden border border-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={handleDownload}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-inner">
                                    <Download size={18} />
                                </div>
                                <span className="text-gray-800 text-sm font-bold uppercase tracking-tight">App Download</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md overflow-hidden border border-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-xl text-red-500 shadow-inner">
                                    <LogOut size={18} />
                                </div>
                                <span className="text-red-500 text-sm font-bold uppercase tracking-tight">Logout Session</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
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
