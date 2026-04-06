import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft,
    MessageCircle,
    Send,
    FileText,
    ShieldCheck,
    HelpCircle,
    ChevronRight,
    PlayCircle,
    User,
    Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Help = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const chatContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/support/messages', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (error) {
            console.error('Fetch messages error:', error);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Use a small timeout to ensure DOM is updated before scrolling
        const timer = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(timer);
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/support/send',
                { message: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessages([...messages, res.data]);
            setNewMessage('');
        } catch (error) {
            console.error('Send message error:', error);
        } finally {
            setLoading(false);
        }
    };

    const faqs = [
        {
            q: "How to invest in packages?",
            a: "Go to the 'Lend' page, select a level matching your balance, and click on an investment package to start earning daily income."
        },
        {
            q: "How much can I withdrawal?",
            a: "The minimum withdrawal amount depends on your level. Withdrawals are usually processed within 24 hours."
        },
        {
            q: "How to earn team benefits?",
            a: "Share your referral link from the 'Me' page. When your friends invest, you earn a percentage based on your level across 3 levels."
        }
    ];

    const supportChannels = [
        {
            name: "WhatsApp Support",
            icon: <MessageCircle className="text-[#25D366]" size={24} />,
            desc: "9:00 AM - 10:00 PM",
            link: "https://wa.me/447476591257",
            color: "hover:bg-[#25D366]/10"
        },
        {
            name: "Telegram Channel",
            icon: <Send className="text-[#0088cc]" size={24} />,
            desc: "Official Updates",
            link: "https://t.me/doveinvestmentgoldmine",
            color: "hover:bg-[#0088cc]/10"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-dark-300 transition-colors duration-300 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-emerald-400 dark:bg-dark-200 backdrop-blur-md border-b border-white/10 py-3 px-4 shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-between relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-black/80 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-black dark:text-white">Support Center</h1>
                    <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/5 flex items-center justify-center">
                        <HelpCircle size={18} className="text-black/60 dark:text-white/60" />
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
                {/* Live Chat Section */}
                <div className="bg-white dark:bg-dark-200 rounded-[2.5rem] overflow-hidden flex flex-col h-[580px] border border-slate-200 dark:border-white/5 shadow-2xl relative">
                    {/* Glass Overlay for header */}
                    <div className="bg-emerald-500/10 dark:bg-emerald-400/5 px-6 py-5 border-b border-emerald-100 dark:border-white/5 flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-200 shadow-sm">
                                <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Live Support</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Admin is Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide bg-slate-50/50 dark:bg-transparent"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                                    <MessageCircle size={40} />
                                </div>
                                <h4 className="text-slate-800 dark:text-white font-bold mb-1">No conversation yet</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 px-10 leading-relaxed">
                                    Need help? Send us a message and our support team will get back to you shortly.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 text-sm shadow-sm ${msg.isAdmin
                                        ? 'bg-white dark:bg-dark-100 text-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-white/5'
                                        : 'bg-emerald-500 text-white font-bold rounded-tr-none shadow-emerald-500/20'
                                        }`}>
                                        <p className="leading-relaxed">{msg.message}</p>
                                        <div className={`text-[10px] mt-1.5 opacity-60 flex items-center gap-1 ${msg.isAdmin ? 'text-slate-500 dark:text-slate-400' : 'text-white'}`}>
                                            <PlayCircle size={10} className="rotate-90" />
                                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendMessage} className="p-5 bg-white dark:bg-dark-200 border-t border-slate-100 dark:border-white/5">
                        <div className="relative flex items-center gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="w-full bg-slate-100 dark:bg-dark-300 border border-transparent focus:border-emerald-500/30 rounded-2xl py-3.5 px-5 pr-12 text-sm text-slate-800 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !newMessage.trim()}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${newMessage.trim() 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95' 
                                        : 'bg-slate-200 dark:bg-dark-200 text-slate-400'
                                    }`}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="text-center pb-10">
                    <p className="text-[10px] text-gray-900/20 dark:text-white/20 uppercase tracking-widest">Dove Investment Gold Mine v1.2.0</p>
                </div>
            </div>
        </div>
    );
};

export default Help;
