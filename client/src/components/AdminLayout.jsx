import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, LogOut, ShieldCheck, Package, DollarSign, Settings, BarChart3, Menu, X, MessageSquare, PlusCircle, GitFork } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Wallet, label: 'Deposits', path: '/admin/deposits' },
        { icon: PlusCircle, label: 'Manual Deposit', path: '/admin/manual-deposit' },
        { icon: DollarSign, label: 'Withdrawals', path: '/admin/withdrawals' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: GitFork, label: 'Referral Tree', path: '/admin/referral-tree' },
        { icon: Package, label: 'Packages', path: '/admin/packages' },
        { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
        { icon: MessageSquare, label: 'Support Chat', path: '/admin/support' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const handleNavigate = (path) => {
        navigate(path);
        closeSidebar();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/5 p-4 flex items-center justify-between sticky top-0 z-[60]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="text-gray-900 dark:text-white" size={18} />
                    </div>
                    <span className="text-gray-900 dark:text-white font-bold">Admin Panel</span>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-900/60 dark:text-white/60 hover:text-white bg-gray-900/5 dark:bg-white/5 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden"
                    onClick={closeSidebar}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-200 border-r border-slate-200 dark:border-white/5 flex flex-col z-[55] transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="hidden md:flex p-5 border-b border-slate-200 dark:border-white/5 items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="text-gray-900 dark:text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg">Admin Panel</h1>
                        <p className="text-gray-900/40 dark:text-white/40 text-xs">Dove Investment</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path
                                ? 'bg-primary text-gray-900 dark:text-white shadow-lg shadow-primary/25'
                                : 'text-gray-900/60 dark:text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto h-screen">
                <div className="p-4 md:p-8 pb-24">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
