import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    MessageCircle,
    Send,
    User,
    Search,
    Clock,
    ArrowLeft,
    Plus,
    X,
    Loader
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AdminSupport = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const chatEndRef = useRef(null);

    // New conversation modal state
    const [showNewModal, setShowNewModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [selectedNewUser, setSelectedNewUser] = useState(null);
    const [newConvMessage, setNewConvMessage] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [sendingNew, setSendingNew] = useState(false);
    const searchTimeout = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getToken = () => localStorage.getItem('token');

    const fetchConversations = async () => {
        try {
            const res = await axios.get('/api/support/admin/conversations', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setConversations(res.data);
        } catch (error) {
            console.error('Fetch conversations error:', error);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const res = await axios.get(`/api/support/admin/messages/${userId}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setMessages(res.data);
        } catch (error) {
            console.error('Fetch messages error:', error);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
            if (selectedUser) fetchMessages(selectedUser._id);
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedUser]);

    useEffect(() => {
        if (selectedUser) scrollToBottom();
    }, [messages]);

    const handleSelectUser = (conv) => {
        setSelectedUser({ ...conv.userInfo, _id: conv._id });
        fetchMessages(conv._id);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/support/admin/reply',
                { userId: selectedUser._id, message: newMessage },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setMessages([...messages, res.data]);
            setNewMessage('');
            fetchConversations();
        } catch (error) {
            console.error('Send reply error:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── New Conversation: search users ──
    const handleUserSearch = (val) => {
        setUserSearchQuery(val);
        setSelectedNewUser(null);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (val.trim().length < 2) { setUserSearchResults([]); return; }
        setSearchLoading(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/support/admin/search-users?q=${encodeURIComponent(val.trim())}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                setUserSearchResults(res.data);
            } catch (err) {
                console.error('User search error:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 400);
    };

    const handleStartConversation = async (e) => {
        e.preventDefault();
        if (!selectedNewUser || !newConvMessage.trim()) return;
        setSendingNew(true);
        try {
            await axios.post('/api/support/admin/start-conversation',
                { userId: selectedNewUser._id, message: newConvMessage },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            // Open this user's chat
            setSelectedUser({ ...selectedNewUser });
            fetchMessages(selectedNewUser._id);
            fetchConversations();
            // Close modal & reset
            setShowNewModal(false);
            setUserSearchQuery('');
            setUserSearchResults([]);
            setSelectedNewUser(null);
            setNewConvMessage('');
        } catch (err) {
            console.error('Start conversation error:', err);
        } finally {
            setSendingNew(false);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        const fullName = conv.userInfo?.fullName || '';
        const phone = conv.userInfo?.phone || '';
        return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phone.includes(searchTerm);
    });

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row gap-6">

            {/* ─── New Conversation Modal ─── */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-dark-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <Plus size={18} className="text-primary" />
                                <h3 className="font-bold text-gray-900 dark:text-white">New Message</h3>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                <X size={18} className="text-gray-500 dark:text-white/50" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* User Search */}
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 mb-2 block">Search User</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Name, phone or email..."
                                        value={userSearchQuery}
                                        onChange={(e) => handleUserSearch(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
                                        autoFocus
                                    />
                                    {searchLoading && (
                                        <Loader size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                                    )}
                                </div>

                                {/* Search Results */}
                                {userSearchResults.length > 0 && !selectedNewUser && (
                                    <div className="mt-2 bg-white dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                                        {userSearchResults.map(u => (
                                            <button
                                                key={u._id}
                                                onClick={() => { setSelectedNewUser(u); setUserSearchQuery(u.fullName || u.phone || u.email); setUserSearchResults([]); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 text-left"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                                    {u.profileImage
                                                        ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                                                        : <User size={18} />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{u.fullName || '—'}</p>
                                                    <p className="text-[10px] text-primary font-semibold">{u.phone || u.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected User Badge */}
                                {selectedNewUser && (
                                    <div className="mt-2 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                                            {selectedNewUser.profileImage
                                                ? <img src={selectedNewUser.profileImage} alt="" className="w-full h-full object-cover" />
                                                : <User size={16} />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-gray-900 dark:text-white truncate">{selectedNewUser.fullName || '—'}</p>
                                            <p className="text-[10px] text-primary font-semibold">{selectedNewUser.phone || selectedNewUser.email}</p>
                                        </div>
                                        <button onClick={() => { setSelectedNewUser(null); setUserSearchQuery(''); }} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                                            <X size={13} className="text-red-500" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Message Input */}
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 mb-2 block">Message</label>
                                <textarea
                                    rows={4}
                                    value={newConvMessage}
                                    onChange={(e) => setNewConvMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 resize-none"
                                />
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleStartConversation}
                                disabled={!selectedNewUser || !newConvMessage.trim() || sendingNew}
                                className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${selectedNewUser && newConvMessage.trim() && !sendingNew
                                    ? 'bg-primary text-black shadow-lg shadow-primary/20 hover:opacity-90'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed'
                                    }`}
                            >
                                {sendingNew ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                                {sendingNew ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Conversations List ─── */}
            <div className={`w-full md:w-80 flex flex-col bg-white dark:bg-dark-200 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Support Chats</h2>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="flex items-center gap-1.5 bg-primary text-black text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-primary/20"
                        >
                            <Plus size={13} />
                            New Message
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900/20 dark:text-white/20" size={16} />
                        <input
                            type="text"
                            placeholder="Search user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center opacity-40">
                            <MessageCircle size={32} className="mb-2" />
                            <p className="text-xs">No conversations found</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv._id}
                                onClick={() => handleSelectUser(conv)}
                                className={`w-full p-4 flex gap-3 text-left transition-all hover:bg-white/5 border-b border-slate-200 dark:border-white/5 ${selectedUser?._id === conv._id ? 'bg-gray-900/5 dark:bg-white/5' : ''}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 relative overflow-hidden">
                                    {conv.userInfo.profileImage ? (
                                        <img src={conv.userInfo.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="text-sm font-black text-gray-900 dark:text-white truncate">{conv.userInfo.fullName}</p>
                                        <span className="text-[10px] text-gray-900/40 dark:text-white/40 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-primary mb-1 font-bold">{conv.userInfo.phone}</p>
                                    <p className="text-[11px] text-gray-900/60 dark:text-white/60 truncate italic">"{conv.lastMessage}"</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ─── Chat Window ─── */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-dark-200 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-gray-900/5 dark:bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="md:hidden p-2 -ml-2 text-gray-900/60 dark:text-white/60 hover:text-white"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary relative overflow-hidden">
                                    {selectedUser.profileImage ? (
                                        <img src={selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{selectedUser.fullName}</h3>
                                    <p className="text-[10px] text-gray-900/40 dark:text-white/40">{selectedUser.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-black/20">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${msg.isAdmin
                                        ? 'bg-primary text-black font-medium rounded-tr-none'
                                        : 'bg-gray-50 dark:bg-dark-300 text-gray-900 dark:text-white rounded-tl-none border border-slate-200 dark:border-white/5'
                                        }`}>
                                        <p className="leading-relaxed">{msg.message}</p>
                                        <div className={`text-[9px] mt-1 opacity-50 flex items-center gap-1 ${msg.isAdmin ? 'text-black/60' : 'text-gray-900/60 dark:text-white/60'}`}>
                                            <Clock size={8} />
                                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-white/5">
                            <div className="relative flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-2xl py-3 px-5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !newMessage.trim()}
                                    className={`p-3 rounded-2xl transition-all ${newMessage.trim() ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-gray-900/5 dark:bg-white/5 text-gray-900/20 dark:text-white/20'
                                        }`}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                        <MessageCircle size={64} className="mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select a conversation</h2>
                        <p className="text-sm">Click on a user from the list to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupport;
