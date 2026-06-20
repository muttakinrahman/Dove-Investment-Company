import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Bell,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    TrendingUp,
    DollarSign,
    Users,
    Info,
    Trash2,
    CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import SuccessModal from '../components/SuccessModal';
import NotificationDetailModal from '../components/NotificationDetailModal';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/notifications/read-all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const deleteNotification = async (id, e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'deposit': return <TrendingUp className="text-primary" size={20} />;
            case 'withdrawal': return <DollarSign className="text-red-400" size={20} />;
            case 'investment': return <CheckCircle2 className="text-cyan-400" size={20} />;
            case 'commission': return <Users className="text-yellow-400" size={20} />;
            default: return <Info className="text-gray-900/60 dark:text-white/60" size={20} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-300 transition-colors duration-300 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-dark-200/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-3 px-4 shadow-sm transition-all">
                <div className="max-w-md mx-auto flex items-center justify-between relative">
                    <div className="flex items-center gap-3 relative z-10">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 text-slate-400 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                        <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black block mt-0.5 tracking-widest">{unreadCount} UNREAD</span>
                        )}
                    </div>

                    <div className="relative z-10">
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-white font-black hover:bg-blue-50 dark:hover:bg-white/10 transition-all uppercase px-3 py-1.5 rounded-xl border border-blue-100 dark:border-white/20 bg-blue-50 dark:bg-white/5"
                            >
                                <CheckCheck size={14} />
                                Read All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-4 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 bg-gray-900/5 dark:bg-white/5 rounded-xl shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-900/10 dark:bg-white/10 rounded w-1/3"></div>
                                        <div className="h-3 bg-gray-900/5 dark:bg-white/5 rounded w-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                            <Bell size={48} className="animate-bounce" />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Clean Slates!</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 px-10 leading-relaxed">
                            No new alerts right now. We'll ping you as soon as something important happens.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-10">
                        {notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => {
                                    if (notif.status === 'unread') markAsRead(notif._id);
                                    setSelectedNotification(notif);
                                }}
                                className={`bg-white dark:bg-dark-200 rounded-[1.8rem] p-5 shadow-lg border-2 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group 
                                    ${notif.status === 'unread' 
                                        ? 'border-blue-500/30 ring-4 ring-blue-500/5' 
                                        : 'border-slate-100 dark:border-white/5 opacity-90'
                                    }`}
                            >
                                {notif.status === 'unread' && (
                                    <div className="absolute top-0 right-0 w-12 h-12">
                                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-blue-500/20"></div>
                                    </div>
                                )}
                                
                                <div className="flex gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 ${
                                        notif.status === 'unread' ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-slate-50 dark:bg-white/5'
                                    }`}>
                                        <div className={notif.status === 'unread' ? 'animate-pulse' : ''}>
                                            {getIcon(notif.type)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h3 className={`text-[15px] font-black truncate pr-4 ${
                                                notif.status === 'unread' ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {notif.title}
                                            </h3>
                                        </div>
                                        
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4 font-medium">
                                            {notif.message}
                                        </p>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                    <Info size={12} />
                                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                </span>
                                                {notif.amount && (
                                                    <div className="text-[11px] font-black text-emerald-600 dark:text-[#a4f13a] bg-emerald-50 dark:bg-[#a4f13a]/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-[#a4f13a]/20">
                                                        +{notif.amount.toFixed(2)} USDT
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <button
                                                onClick={(e) => deleteNotification(notif._id, e)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all active:scale-90"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SuccessModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                title={modalConfig.title}
                message={modalConfig.message}
            />
            <NotificationDetailModal
                isOpen={!!selectedNotification}
                onClose={() => setSelectedNotification(null)}
                notification={selectedNotification}
            />
        </div>
    );
};

export default Notifications;
