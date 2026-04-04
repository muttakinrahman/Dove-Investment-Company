import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, AlertCircle, Lock, Unlock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

// Wallet section password - stored only in frontend
const WALLET_SECTION_PASSWORD = '11aA22@@33';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        companyName: '',
        companyDescription: '',
        companyEmail: '',
        companyPhone: '',
        minWithdrawalAmount: '',
        minDepositAmount: '',
        maintenanceMode: false,
        walletTRC20: '',
        walletBTC: '',
        walletETH: '',
        walletBSC: '',
        appDownloadUrl: ''
    });
    const [loading, setLoading] = useState(true);

    // Wallet lock state
    const [walletUnlocked, setWalletUnlocked] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [walletPassword, setWalletPassword] = useState('');
    const [showWalletPassword, setShowWalletPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/admin/settings', settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Settings updated successfully');

            // Lock wallet section again after save
            setWalletUnlocked(false);
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        }
    };

    const handleUnlockWallet = () => {
        if (walletPassword === WALLET_SECTION_PASSWORD) {
            setWalletUnlocked(true);
            setShowPasswordModal(false);
            setWalletPassword('');
            setPasswordError('');
            toast.success('Wallet section unlocked!');
        } else {
            setPasswordError('Incorrect password. Access denied.');
            setWalletPassword('');
        }
    };

    const handleLockWallet = () => {
        setWalletUnlocked(false);
        toast.info('Wallet section locked.');
    };

    if (loading) return <div className="p-6 text-gray-900 dark:text-white">Loading settings...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Settings className="text-blue-500" />
                System Settings
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Info */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                        Company Information
                    </h3>
                    <div className="grid gap-4">
                        <div>
                            <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Company Name</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                value={settings.companyName}
                                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Description</label>
                            <textarea
                                className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 h-24"
                                value={settings.companyDescription}
                                onChange={(e) => setSettings({ ...settings, companyDescription: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Support Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={settings.companyEmail}
                                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Support Phone</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={settings.companyPhone}
                                    onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Management - Password Protected */}
                <div className={`glass-card p-6 transition-all duration-300 ${walletUnlocked ? 'border border-green-500/40 shadow-green-500/10 shadow-lg' : 'border border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            {walletUnlocked ? (
                                <ShieldCheck className="text-green-400" size={20} />
                            ) : (
                                <Lock className="text-red-400" size={20} />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Wallet Addresses (Deposit)
                            </h3>
                            {walletUnlocked ? (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">UNLOCKED</span>
                            ) : (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">LOCKED</span>
                            )}
                        </div>
                        {walletUnlocked ? (
                            <button
                                type="button"
                                onClick={handleLockWallet}
                                className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                            >
                                <Lock size={14} />
                                Lock Section
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setShowPasswordModal(true); setPasswordError(''); setWalletPassword(''); }}
                                className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                            >
                                <Unlock size={14} />
                                Unlock to Edit
                            </button>
                        )}
                    </div>

                    {/* Locked Overlay */}
                    {!walletUnlocked ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-60">
                            <Lock className="text-red-400" size={40} />
                            <p className="text-gray-900/60 dark:text-white/60 text-sm text-center">
                                This section is password protected.<br />
                                Click <strong>"Unlock to Edit"</strong> to modify wallet addresses.
                            </p>
                            <div className="grid grid-cols-2 gap-4 w-full mt-2 opacity-50 pointer-events-none select-none">
                                <div>
                                    <label className="text-gray-900/40 dark:text-white/40 text-sm mb-1 block">USDT (TRC20)</label>
                                    <div className="w-full bg-gray-100 dark:bg-dark-300 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-gray-400 dark:text-white/30 font-mono text-sm blur-sm">
                                        {settings.walletTRC20 || '••••••••••••••••••••••••••••••••••'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-900/40 dark:text-white/40 text-sm mb-1 block">BSC (BNB/USDT)</label>
                                    <div className="w-full bg-gray-100 dark:bg-dark-300 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-gray-400 dark:text-white/30 font-mono text-sm blur-sm">
                                        {settings.walletBSC || '••••••••••••••••••••••••••••••••••'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Unlocked - Show editable fields */
                        <div className="grid gap-4">
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <ShieldCheck className="text-green-400" size={16} />
                                <p className="text-green-400 text-xs">Wallet section is unlocked. Changes will be saved when you click "Save All Changes". Section will auto-lock after saving.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">USDT (TRC20)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-green-500/30 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                                        value={settings.walletTRC20}
                                        onChange={(e) => setSettings({ ...settings, walletTRC20: e.target.value })}
                                        placeholder="TRC20 wallet address"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Bitcoin (BTC)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-green-500/30 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                                        value={settings.walletBTC}
                                        onChange={(e) => setSettings({ ...settings, walletBTC: e.target.value })}
                                        placeholder="BTC wallet address"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Ethereum (ETH)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-green-500/30 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                                        value={settings.walletETH}
                                        onChange={(e) => setSettings({ ...settings, walletETH: e.target.value })}
                                        placeholder="ETH wallet address"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">BSC (BNB/USDT)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-green-500/30 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                                        value={settings.walletBSC}
                                        onChange={(e) => setSettings({ ...settings, walletBSC: e.target.value })}
                                        placeholder="BSC wallet address"
                                    />
                                </div>
                            </div>
                            <div className="mt-2 pt-4 border-t border-slate-200 dark:border-white/10">
                                <div>
                                    <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">App Download URL (APK Link)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-dark-300 border border-green-500/30 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                                        value={settings.appDownloadUrl}
                                        onChange={(e) => setSettings({ ...settings, appDownloadUrl: e.target.value })}
                                        placeholder="https://example.com/app.apk"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Platform Config */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                        Platform Configuration
                    </h3>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Min Withdrawal Amount (USDT)</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={settings.minWithdrawalAmount}
                                    onChange={(e) => setSettings({ ...settings, minWithdrawalAmount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-900/60 dark:text-white/60 text-sm mb-1 block">Min Deposit Amount (USDT)</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    value={settings.minDepositAmount}
                                    onChange={(e) => setSettings({ ...settings, minDepositAmount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
                            <AlertCircle className="text-red-400" size={24} />
                            <div className="flex-1">
                                <h4 className="text-red-400 font-medium">Maintenance Mode</h4>
                                <p className="text-red-400/60 text-xs">Enable to block all user access for updates</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.maintenanceMode}
                                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-50 dark:bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white px-8 py-3 rounded-lg transition-all font-bold text-lg shadow-lg hover:shadow-blue-500/20"
                    >
                        <Save size={20} />
                        Save All Changes
                    </button>
                </div>
            </form>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex flex-col items-center gap-3 mb-5">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <Lock className="text-blue-400" size={28} />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-bold text-lg">Wallet Section Protected</h3>
                            <p className="text-gray-900/60 dark:text-white/60 text-sm text-center">
                                Enter the security password to unlock and edit wallet deposit addresses.
                            </p>
                        </div>

                        <div className="relative mb-3">
                            <input
                                type={showWalletPassword ? 'text' : 'password'}
                                value={walletPassword}
                                onChange={(e) => { setWalletPassword(e.target.value); setPasswordError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlockWallet()}
                                placeholder="Enter security password"
                                autoFocus
                                className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowWalletPassword(!showWalletPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                            >
                                {showWalletPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {passwordError && (
                            <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
                                <p className="text-red-400 text-xs">{passwordError}</p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => { setShowPasswordModal(false); setWalletPassword(''); setPasswordError(''); }}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-100 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUnlockWallet}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Unlock size={16} />
                                Unlock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
