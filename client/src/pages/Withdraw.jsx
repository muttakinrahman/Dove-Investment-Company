import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Wallet, AlertCircle, Bell, HelpCircle, CheckCircle2, Lock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import SuccessModal from '../components/SuccessModal';

const Withdraw = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('trc20');
    const [showSuccess, setShowSuccess] = useState(false);
    const [blockMessage, setBlockMessage] = useState(null);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSendOtp = async () => {
        if (otpSending || countdown > 0) return;

        setOtpSending(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/withdrawal/send-otp', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Verification code sent to your email');
            setCountdown(60);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send verification code');
        } finally {
            setOtpSending(false);
        }
    };

    useEffect(() => {
        if (user && user.withdrawalBlockMessage) {
            setBlockMessage(user.withdrawalBlockMessage);
        }
    }, [user]);

    // Crypto Details
    const [details, setDetails] = useState({
        address: ''
    });

    const [loading, setLoading] = useState(false);

    const methods = [
        { id: 'trc20', name: 'USDT (TRC20)', color: '#26A17B', symbol: '₮' },
        { id: 'bsc', name: 'BSC', color: '#F0B90B', symbol: 'B' }
    ];

    const isCrypto = true; // All methods are now crypto

    const handleMethodChange = (method) => {
        setPaymentMethod(method);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (user?.twoFactorEnabled && !twoFactorToken) {
            return toast.error('Please enter 2FA verification code');
        }

        /*
        if (!emailOtp) {
            return toast.error('Please enter email verification code');
        }
        */

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const bankData = {
                accountName: user.email || user.phone, // Using email/phone as reference name
                accountNumber: details.address,
                bankName: paymentMethod.toUpperCase(),
            };

            await axios.post('/api/withdrawal/request', {
                amount: parseFloat(amount),
                paymentMethod,
                bankDetails: bankData,
                twoFactorToken: user?.twoFactorEnabled ? twoFactorToken : undefined,
                // emailOtp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowSuccess(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const [withdrawals, setWithdrawals] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const fetchWithdrawals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/withdrawal/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWithdrawals(res.data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'text-green-500 bg-green-500/10';
            case 'rejected': return 'text-red-500 bg-red-500/10';
            default: return 'text-yellow-500 bg-yellow-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-20">
            {/* Header - Matching Home.jsx */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/10">
                <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between relative">
                    <button onClick={() => navigate(-1)} className="text-gray-900/60 dark:text-white/60 hover:text-white relative z-10">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg">Withdraw</h1>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <button className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-white transition-colors">
                            <Bell size={20} />
                        </button>
                        <button className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-white transition-colors">
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6 max-w-md mx-auto">

                {/* Balance Card - Refined */}
                <div className="glass-card p-6 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="text-gray-900/60 dark:text-white/60 text-sm font-medium mb-1">Available Balance</span>
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">${user?.balance?.toFixed(2) || '0.00'}</h2>
                    </div>
                </div>

                {/* Blocked Message Banner */}
                {blockMessage && (
                    <div className="glass-card p-5 border border-red-500/30 bg-red-500/10 animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="flex gap-3 relative z-10">
                            <div className="bg-red-500/20 p-2 rounded-full h-fit flex-shrink-0">
                                <AlertCircle className="text-red-500" size={24} />
                            </div>
                            <div className="space-y-1 my-0.5">
                                <h3 className="text-red-400 font-bold text-sm">Withdrawals Temporarily Blocked</h3>
                                <p className="text-gray-900/80 dark:text-white/80 text-sm leading-relaxed">
                                    {blockMessage}
                                </p>
                            </div>
                        </div>
                    </div>
                )}



                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-gray-900/80 dark:text-white/80 text-sm font-semibold ml-1">Withdrawal Amount</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">$</span>
                            <input
                                type="number"
                                required
                                min="50"
                                placeholder="0.00"
                                className="w-full bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-10 pr-4 text-gray-900 dark:text-white text-xl font-bold focus:outline-none focus:border-primary focus:bg-dark-100 transition-all"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between px-1">
                            <p className="text-gray-900/40 dark:text-white/40 text-xs text-secondary">Minimum withdrawal: $50</p>
                            <button
                                type="button"
                                onClick={() => setAmount(user?.balance?.toFixed(0))}
                                className="text-primary text-xs font-bold hover:underline"
                            >
                                Max Amount
                            </button>
                        </div>
                    </div>

                    {/* Payment Method - New Grid Layout */}
                    <div className="space-y-3">
                        <label className="text-gray-900/80 dark:text-white/80 text-sm font-semibold ml-1">Select Method</label>
                        <div className="grid grid-cols-4 gap-2">
                            {methods.map(method => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => handleMethodChange(method.id)}
                                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all aspect-square ${paymentMethod === method.id
                                        ? 'bg-primary border-primary shadow-glow shadow-primary/20'
                                        : 'bg-white dark:bg-dark-200 border-slate-200 dark:border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${paymentMethod === method.id ? 'bg-white' : 'bg-gray-900/10 dark:bg-white/10'}`}>
                                        <span style={{ color: method.color, fontSize: '18px', fontWeight: 900, lineHeight: 1 }}>{method.symbol}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold truncate w-full text-center ${paymentMethod === method.id ? 'text-gray-900 dark:text-white' : 'text-gray-900/60 dark:text-white/60'}`}>
                                        {method.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Account/Wallet Details */}
                    <div className="glass-card p-5 space-y-4 border border-slate-200 dark:border-white/5">
                        <h3 className="text-gray-900 dark:text-white font-bold text-sm tracking-wide flex items-center gap-2">
                            <Lock size={16} className="text-primary" />
                            {isCrypto ? 'CRYPTO WALLET DETAILS' : 'ACCOUNT INFORMATION'}
                        </h3>

                        <div className="animate-fade-in">
                            <label className="text-gray-900/50 dark:text-white/50 text-[11px] font-bold uppercase tracking-wider mb-1.5 block">Recipient Wallet Address ({paymentMethod.toUpperCase()})</label>
                            <input
                                type="text"
                                required
                                placeholder="Paste your wallet address here"
                                className="w-full bg-gray-50 dark:bg-dark-300 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-primary font-mono"
                                value={details.address}
                                onChange={(e) => setDetails({ ...details, address: e.target.value })}
                            />
                            <p className="text-yellow-500/80 text-[10px] mt-2 italic flex items-start gap-1">
                                <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                                Ensure address is correct for {paymentMethod.toUpperCase()} network. Incorrect address leads to permanent loss.
                            </p>
                        </div>
                    </div>

                    {/* Fee and Total Deduction Details */}
                    {amount && Number(amount) >= 10 && (
                        <div className="glass-card p-4 space-y-2 border border-primary/10 bg-primary/5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-900/60 dark:text-white/60">Processing Fee (5%)</span>
                                <span className="text-red-400 font-semibold">${(Number(amount) * 0.05).toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-gray-900/10 dark:bg-white/10 my-1"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white font-bold">Total Deduction</span>
                                <span className="text-primary font-bold text-lg">${(Number(amount) * 1.05).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Email Verification - Hidden as per request */}
                    {/*
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-gray-900 dark:text-white text-xs font-medium">
                            <Lock size={14} className="text-primary" />
                            Email Verification Code
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={emailOtp}
                                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="w-full bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-28 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-primary transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={otpSending || countdown > 0}
                                className="absolute right-2 top-1.5 bottom-1.5 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold"
                            >
                                {otpSending ? 'Sending...' : countdown > 0 ? `${countdown}s` : 'Send Code'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-900/40 dark:text-white/40 italic">
                            Click 'Send Code' to receive a verification code in your email.
                        </p>
                    </div>
                    */}

                    {/* 2FA Verification */}
                    {user?.twoFactorEnabled ? (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-gray-900 dark:text-white text-xs font-medium">
                                <Shield size={14} className="text-primary" />
                                Google Authenticator Code
                            </label>
                            <input
                                type="text"
                                value={twoFactorToken}
                                onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit 2FA code"
                                className="w-full bg-white dark:bg-dark-200 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-primary transition-all"
                                required
                            />
                            <p className="text-[10px] text-gray-900/40 dark:text-white/40 italic">
                                Enter the code from your Google Authenticator app (Dove Investment Gold Mine).
                            </p>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                                    <Shield size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Security Verification Required</h4>
                                    <p className="text-xs text-gray-900/50 dark:text-white/50 mt-1 leading-relaxed">
                                        For your security, withdrawals require Google Authenticator (2FA). Please connect your account to proceed.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/settings/security')}
                                className="w-full py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95"
                            >
                                Setup Google Authenticator
                            </button>
                        </div>
                    )}

                    {user?.twoFactorEnabled && (
                        <button
                            type="submit"
                            disabled={loading || !!blockMessage}
                            className="w-full bg-gradient-primary text-gray-900 dark:text-white font-bold py-4 rounded-2xl shadow-glow-lg hover:shadow-glow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-slate-200 dark:border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>Confirm Withdrawal</>
                            )}
                        </button>
                    )}

                    <p className="text-center text-gray-900/30 dark:text-white/30 text-[11px] px-6 leading-relaxed">
                        Processing time: 72-96 hours depending on network traffic and bank hours. 5% processing fee applies.
                    </p>
                </form>

                {/* Withdrawal History Section */}
                <div className="space-y-4">
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm ml-1">Withdrawal Records</h3>
                    <div className="space-y-3">
                        {loadingHistory ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : withdrawals.length > 0 ? (
                            withdrawals.map((item) => (
                                <div key={item._id} className="glass-card p-4 border border-slate-200 dark:border-white/5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-gray-900/5 dark:bg-white/5 rounded-xl flex items-center justify-center">
                                                <Wallet className="text-primary" size={20} />
                                            </div>
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-bold text-sm">${item.amount}</p>
                                                <p className="text-gray-900/40 dark:text-white/40 text-[10px]">{new Date(item.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                            {item.status === 'approved' ? 'Success' : item.status}
                                        </span>
                                    </div>
                                    <div className="h-px bg-gray-900/5 dark:bg-white/5"></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-gray-900/40 dark:text-white/40 text-[9px] uppercase font-bold tracking-widest">Network</p>
                                            <p className="text-gray-900/80 dark:text-white/80 text-[11px] font-medium">{item.paymentMethod?.toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-900/40 dark:text-white/40 text-[9px] uppercase font-bold tracking-widest">Fee</p>
                                            <p className="text-gray-900/80 dark:text-white/80 text-[11px] font-medium">${item.fee?.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    {item.transactionId && (
                                        <div className="bg-gray-100 dark:bg-dark-300/50 p-2 rounded-lg border border-slate-200 dark:border-white/5 transition-colors">
                                            <p className="text-gray-900/40 dark:text-white/40 text-[9px] uppercase font-bold tracking-widest mb-1">Transaction ID</p>
                                            <p className="text-primary text-[10px] font-mono break-all">{item.transactionId}</p>
                                        </div>
                                    )}
                                    {item.rejectionReason && (
                                        <p className="text-red-400 text-[10px] bg-red-400/5 p-2 rounded-lg border border-red-400/10">
                                            Rejection Reason: {item.rejectionReason}
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 glass-card border border-dashed border-slate-200 dark:border-white/10">
                                <p className="text-gray-900/40 dark:text-white/40 text-xs">No withdrawal records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    fetchWithdrawals(); // Refresh list after success
                }}
                title="Withdrawal Requested!"
                message={`Your withdrawal request for $${amount} has been submitted successfully.`}
            />
        </div>
    );
};

export default Withdraw;
