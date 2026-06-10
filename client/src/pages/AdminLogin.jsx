import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminLogin = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, logout } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Use AuthContext login which handles everything
            const data = await login(phone, password);

            // Check if user is admin
            if (data.user.role !== 'admin') {
                toast.error('Access denied. Admin credentials required.', {
                    position: "top-center",
                    autoClose: 3000,
                });
                logout(); // Clear the login
                setLoading(false);
                return;
            }

            // Login successful
            toast.success('Welcome to Admin Panel!', {
                position: "top-center",
                autoClose: 2000,
            });

            setTimeout(() => {
                navigate('/admin');
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            const serverError = error.response?.data?.error;
            const message = error.response?.data?.message || 'Invalid credentials';

            toast.error(serverError ? `${message}: ${serverError}` : message, {
                position: "top-center",
                autoClose: 5000,
            });
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Admin Badge */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-xl shadow-red-500/25 mb-4">
                        <ShieldCheck size={40} className="text-gray-900 dark:text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Portal</h1>
                    <p className="text-gray-900/60 dark:text-white/60">Dove Investment Control Panel</p>
                </div>

                {/* Login Form */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Phone Input */}
                        <div>
                            <label className="block text-gray-900/70 dark:text-white/70 text-sm font-medium mb-2">
                                Username / Email / Phone
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <User size={18} className="text-gray-900/40 dark:text-white/40" />
                                </div>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Enter username, email or phone"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-white/40 focus:border-primary focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-gray-900/70 dark:text-white/70 text-sm font-medium mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Lock size={18} className="text-gray-900/40 dark:text-white/40" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-white/40 focus:border-primary focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-gray-900 dark:text-white font-bold rounded-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Authenticating...' : 'Login to Admin Panel'}
                        </button>
                    </form>

                    {/* Back to Home */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-gray-900/60 dark:text-white/60 text-sm hover:text-white transition-colors"
                        >
                            ← Back to User Login
                        </button>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-6 text-center">
                    <p className="text-gray-900/40 dark:text-white/40 text-xs">
                        🔒 Secure admin authentication required
                    </p>
                </div>
            </div>

            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
        </div>
    );
};

export default AdminLogin;
