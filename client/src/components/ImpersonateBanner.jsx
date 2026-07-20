import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const ImpersonateBanner = () => {
    const { user } = useAuth();
    const adminToken = localStorage.getItem('adminToken');

    if (!adminToken) return null;

    const handleReturnToAdmin = () => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            localStorage.setItem('token', token);
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/users';
        } else {
            window.location.href = '/admin/login';
        }
    };

    return (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white py-2 px-4 flex items-center justify-between shadow-md sticky top-0 z-[100] text-xs font-semibold">
            <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="animate-pulse" />
                <span>
                    Viewing site as user: <strong>{user?.fullName || user?.email || user?.phone || 'Selected User'}</strong> (ID #{user?.memberId || '—'})
                </span>
            </div>
            <button
                onClick={handleReturnToAdmin}
                className="bg-black/40 hover:bg-black/60 text-white px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 font-bold text-xs border border-white/20"
            >
                <ArrowLeft size={14} /> Return to Admin Panel
            </button>
        </div>
    );
};

export default ImpersonateBanner;
