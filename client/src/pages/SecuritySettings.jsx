import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Shield, Loader2, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';

const SecuritySettings = () => {
    const navigate = useNavigate();
    const { user, updateUserInfo } = useAuth();
    const [loadingPwd, setLoadingPwd] = useState(false);
    const [loadingPin, setLoadingPin] = useState(false);
    const [loading2FA, setLoading2FA] = useState(false);

    const [pwdData, setPwdData] = useState({ newPassword: '', confirmPassword: '' });
    const [pinData, setPinData] = useState({ newPin: '', confirmPin: '' });

    // 2FA Setup State
    const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [twoFactorData, setTwoFactorData] = useState({ secret: '', otpauth_url: '' });
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    const handlePwdChange = (e) => setPwdData({ ...pwdData, [e.target.name]: e.target.value });
    const handlePinChange = (e) => setPinData({ ...pinData, [e.target.name]: e.target.value });

    const submitPassword = async (e) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (pwdData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setLoadingPwd(true);
        try {
            await axios.put('/api/auth/password', { newPassword: pwdData.newPassword });
            toast.success('Password updated successfully');
            setPwdData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoadingPwd(false);
        }
    };

    const submitPin = async (e) => {
        e.preventDefault();
        if (pinData.newPin !== pinData.confirmPin) {
            return toast.error('PINs do not match');
        }
        if (pinData.newPin.length !== 6) {
            return toast.error('PIN must be 6 digits');
        }

        setLoadingPin(true);
        try {
            await axios.put('/api/auth/pin', { newPin: pinData.newPin });
            toast.success('Transaction PIN updated successfully');
            setPinData({ newPin: '', confirmPin: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update PIN');
        } finally {
            setLoadingPin(false);
        }
    };

    const initiate2FASetup = async () => {
        setLoading2FA(true);
        try {
            const { data } = await axios.post('/api/2fa/setup');
            setTwoFactorData(data);

            // Generate QR Code
            const url = await QRCode.toDataURL(data.otpauth_url);
            setQrCodeUrl(url);
            setIsSettingUp2FA(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate 2FA setup');
        } finally {
            setLoading2FA(false);
        }
    };

    const enable2FA = async (e) => {
        e.preventDefault();
        if (twoFactorToken.length !== 6) {
            return toast.error('Please enter 6-digit code');
        }

        setLoading2FA(true);
        try {
            await axios.post('/api/2fa/enable', { token: twoFactorToken });
            toast.success('Google Authenticator enabled successfully');
            updateUserInfo({ twoFactorEnabled: true });
            setIsSettingUp2FA(false);
            setTwoFactorToken('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid code. Please try again.');
        } finally {
            setLoading2FA(false);
        }
    };

    const disable2FA = async () => {
        const token = prompt('Enter your current 2FA code to disable:');
        if (!token) return;

        setLoading2FA(true);
        try {
            await axios.post('/api/2fa/disable', { token });
            toast.success('Google Authenticator disabled');
            updateUserInfo({ twoFactorEnabled: false });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disable 2FA');
        } finally {
            setLoading2FA(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-10 max-w-md mx-auto relative shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-dark-200 p-4 flex items-center gap-3 sticky top-0 z-20 border-b border-slate-200 dark:border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900/60 dark:text-white/60 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-gray-900 dark:text-white font-bold text-lg">Security Settings</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* 2FA Section */}
                <div className="glass-card p-5 border border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 dark:text-white font-bold text-sm flex items-center gap-2">
                            <Smartphone size={16} className="text-primary" />
                            Google Authenticator
                        </h2>
                        {user?.twoFactorEnabled ? (
                            <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                                <CheckCircle2 size={10} /> Enabled
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                                <XCircle size={10} /> Disabled
                            </span>
                        )}
                    </div>

                    {!user?.twoFactorEnabled && !isSettingUp2FA && (
                        <div className="space-y-3">
                            <p className="text-gray-900/40 dark:text-white/40 text-xs leading-relaxed">
                                Add an extra layer of security to your account. You will need to provide a code from your Google Authenticator app for withdrawals.
                            </p>
                            <button
                                onClick={initiate2FASetup}
                                disabled={loading2FA}
                                className="w-full bg-primary hover:bg-primary-600 text-dark-400 font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                            >
                                {loading2FA ? <Loader2 size={18} className="animate-spin" /> : 'Enable 2FA'}
                            </button>
                        </div>
                    )}

                    {isSettingUp2FA && (
                        <div className="space-y-4 text-center animate-in fade-in slide-in-from-top-4 duration-300">
                            <p className="text-gray-900/60 dark:text-white/60 text-xs text-left">
                                1. Scan this QR code in your Google Authenticator app:
                            </p>

                            <div className="bg-white p-2 rounded-lg inline-block mx-auto border-4 border-primary/20">
                                <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                            </div>

                            <div className="text-left space-y-1">
                                <p className="text-gray-900/60 dark:text-white/60 text-xs">2. Or enter this code manually:</p>
                                <div className="bg-black/20 p-2 rounded border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <code className="text-primary font-mono text-sm">{twoFactorData.secret}</code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(twoFactorData.secret);
                                            toast.info('Secret copied');
                                        }}
                                        className="text-[10px] text-gray-900/40 dark:text-white/40 hover:text-white"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={enable2FA} className="space-y-3 pt-2">
                                    <input
                                        type="text"
                                        value={twoFactorToken}
                                        onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit code"
                                        className="w-full bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-4 text-emerald-950 dark:text-emerald-400 text-center tracking-[0.5em] font-black text-2xl focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-gray-400 dark:placeholder:text-emerald-500/30 shadow-inner"
                                        required
                                    />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSettingUp2FA(false)}
                                        className="flex-1 bg-gray-900/5 dark:bg-white/5 text-gray-900/60 dark:text-white/60 py-3 rounded-lg text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading2FA}
                                        className="flex-[2] bg-primary text-dark-400 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2"
                                    >
                                        {loading2FA ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Enable'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {user?.twoFactorEnabled && (
                        <div className="space-y-3">
                            <p className="text-gray-900/40 dark:text-white/40 text-xs leading-relaxed flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-500" />
                                Your account is protected with Google Authenticator.
                            </p>
                            <button
                                onClick={disable2FA}
                                disabled={loading2FA}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-lg transition-all border border-red-500/20 flex justify-center items-center gap-2"
                            >
                                {loading2FA ? <Loader2 size={18} className="animate-spin" /> : 'Disable 2FA'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Password Section */}
                <div className="glass-card p-5">
                    <h2 className="text-gray-900 dark:text-white font-bold text-sm mb-4 flex items-center gap-2">
                        <Lock size={16} className="text-primary" />
                        Change Password
                    </h2>
                    <form onSubmit={submitPassword} className="space-y-3">
                        <input
                            type="password"
                            name="newPassword"
                            value={pwdData.newPassword}
                            onChange={handlePwdChange}
                            placeholder="New Password (min 6 chars)"
                            required
                            className="w-full bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-blue-100 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-blue-500/30 transition-all"
                        />
                        <input
                            type="password"
                            name="confirmPassword"
                            value={pwdData.confirmPassword}
                            onChange={handlePwdChange}
                            placeholder="Confirm New Password"
                            required
                            className="w-full bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-blue-100 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-blue-500/30 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loadingPwd}
                            className="w-full bg-gray-900/5 dark:bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white font-bold py-3 rounded-lg transition-all border border-slate-200 dark:border-white/10 flex justify-center hover:border-white/20"
                        >
                            {loadingPwd ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* PIN Section */}
                <div className="glass-card p-5">
                    <h2 className="text-gray-900 dark:text-white font-bold text-sm mb-4 flex items-center gap-2">
                        <Shield size={16} className="text-primary" />
                        Transaction PIN
                    </h2>
                    <form onSubmit={submitPin} className="space-y-3">
                        <input
                            type="text"
                            name="newPin"
                            value={pinData.newPin}
                            onChange={handlePinChange}
                            maxLength={6}
                            required
                            placeholder="New 6-Digit PIN"
                            className="w-full bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-amber-100 text-sm focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-amber-500/30 transition-all"
                        />
                        <input
                            type="text"
                            name="confirmPin"
                            value={pinData.confirmPin}
                            onChange={handlePinChange}
                            maxLength={6}
                            required
                            placeholder="Confirm New PIN"
                            className="w-full bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 rounded-xl px-4 py-3.5 text-gray-900 dark:text-amber-100 text-sm focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-amber-500/30 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loadingPin}
                            className="w-full bg-gray-900/5 dark:bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white font-bold py-3 rounded-lg transition-all border border-slate-200 dark:border-white/10 flex justify-center hover:border-white/20"
                        >
                            {loadingPin ? <Loader2 size={18} className="animate-spin" /> : 'Update PIN'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
