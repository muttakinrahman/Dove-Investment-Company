import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    ArrowLeft, Copy, CheckCircle2, AlertCircle, Clock,
    Shield, Zap, ChevronDown, ExternalLink, RefreshCw,
    Wallet, Hash, DollarSign, Info, Check
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import BottomNav from '../components/BottomNav';

/* ─────────────────────────────────────────────
   Network config
───────────────────────────────────────────── */
const NETWORK_CONFIG = [
    {
        id: 'TRC20',
        label: 'TRC20',
        fullName: 'TRON Network',
        coin: 'USDT',
        color: '#E84142',
        badge: 'Recommended',
        confirmations: '1–3 Confirmations',
        speed: 'Fast · ~1 min',
        logo: 'https://cryptologos.cc/logos/tron-trx-logo.png',
        description: 'Send USDT on the TRON blockchain',
    },
    {
        id: 'BSC',
        label: 'BSC',
        fullName: 'BNB Smart Chain',
        coin: 'USDT',
        color: '#F0B90B',
        badge: 'Low Fee',
        confirmations: '15 Confirmations',
        speed: 'Medium · ~3 min',
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        description: 'Send USDT (BEP-20) on BSC',
    },
];

/* ─────────────────────────────────────────────
   Step indicator
───────────────────────────────────────────── */
const steps = ['Select Network', 'Scan & Send', 'Submit Proof'];

const StepBar = ({ current }) => (
    <div className="flex items-center justify-center gap-0 mb-6 px-2">
        {steps.map((s, i) => (
            <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                        ${i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-primary text-black' : 'bg-white/10 text-white/40'}`}>
                        {i < current ? <Check size={14} /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium whitespace-nowrap transition-colors
                        ${i === current ? 'text-primary' : i < current ? 'text-emerald-400' : 'text-white/30'}`}>
                        {s}
                    </span>
                </div>
                {i < steps.length - 1 && (
                    <div className={`h-[2px] flex-1 mx-1 mb-4 rounded-full transition-all duration-500
                        ${i < current ? 'bg-emerald-500' : 'bg-white/10'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const Deposit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const packageInfo = location.state;

    const [step, setStep] = useState(0);
    const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [networks, setNetworks] = useState([
        { id: 'TRC20', address: '' },
        { id: 'BSC', address: '' },
    ]);
    const [minDeposit, setMinDeposit] = useState(50);
    const [amount, setAmount] = useState(packageInfo?.minAmount || '');
    const [txHash, setTxHash] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [depositHistory, setDepositHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const currentNet = NETWORK_CONFIG.find(n => n.id === selectedNetwork);
    const currentAddress = networks.find(n => n.id === selectedNetwork)?.address || '';

    /* fetch wallets */
    useEffect(() => {
        const fetchWallets = async () => {
            try {
                const res = await axios.get('/api/recharge/wallets');
                const { wallets, minDepositAmount } = res.data;
                setNetworks(prev => prev.map(n => ({ ...n, address: wallets[n.id] || '' })));
                if (minDepositAmount) setMinDeposit(minDepositAmount);
            } catch { }
        };
        fetchWallets();
        fetchHistory();
    }, []);

    /* fetch history */
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/recharge/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepositHistory(res.data?.deposits || []);
        } catch { } finally {
            setLoadingHistory(false);
        }
    };

    /* QR code */
    useEffect(() => {
        if (currentAddress) {
            QRCode.toDataURL(currentAddress, {
                width: 200, margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
            }).then(setQrCodeUrl).catch(() => { });
        } else {
            setQrCodeUrl('');
        }
    }, [currentAddress, selectedNetwork]);

    const copyAddress = () => {
        if (!currentAddress) return;
        navigator.clipboard.writeText(currentAddress);
        setCopied(true);
        toast.success('Address copied!', { autoClose: 2000 });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!amount || !txHash) {
            toast.error('Please fill all fields');
            return;
        }
        const amt = parseFloat(amount);
        if (amt < minDeposit) {
            toast.error(`Minimum deposit is ${minDeposit} USDT`);
            return;
        }
        if (packageInfo) {
            if (amt < packageInfo.minAmount) { toast.warning(`Minimum for this package: ${packageInfo.minAmount} USDT`); return; }
            if (amt > packageInfo.maxAmount) { toast.warning(`Maximum for this package: ${packageInfo.maxAmount} USDT`); return; }
        }
        if (txHash.length < 10) { toast.error('Please enter a valid transaction hash'); return; }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/recharge/submit', {
                amount: amt,
                transactionHash: txHash,
                network: selectedNetwork,
                packageId: packageInfo?.packageId || null,
                packageName: packageInfo?.packageName || null
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSubmitted(true);
            fetchHistory();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const statusColor = (s) => {
        if (s === 'approved') return 'text-emerald-400 bg-emerald-400/10';
        if (s === 'rejected') return 'text-red-400 bg-red-400/10';
        return 'text-amber-400 bg-amber-400/10';
    };
    const statusIcon = (s) => {
        if (s === 'approved') return <CheckCircle2 size={12} />;
        if (s === 'rejected') return <AlertCircle size={12} />;
        return <Clock size={12} />;
    };

    /* ── SUCCESS SCREEN ── */
    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center px-6 pb-24">
                <div className="text-center animate-modal-in">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/30">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                    </div>
                    <h2 className="text-white text-2xl font-bold mb-2">Deposit Submitted!</h2>
                    <p className="text-white/50 text-sm mb-1">Your transaction is under review.</p>
                    <p className="text-white/40 text-xs mb-8">Typically approved within 10–30 minutes</p>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6 max-w-xs mx-auto">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-white/50">Amount</span>
                            <span className="text-white font-semibold">{amount} USDT</span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-white/50">Network</span>
                            <span className="text-white font-semibold">{selectedNetwork}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-white/50">Status</span>
                            <span className="text-amber-400 font-semibold flex items-center gap-1"><Clock size={11} /> Pending</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/home')}
                        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold"
                    >
                        Back to Home
                    </button>
                    <button
                        onClick={() => { setSubmitted(false); setStep(0); setTxHash(''); setAmount(packageInfo?.minAmount || ''); }}
                        className="w-full max-w-xs py-3 mt-2 rounded-xl border border-white/10 text-white/60 text-sm"
                    >
                        Make Another Deposit
                    </button>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1120] pb-24">
            {/* ── Header ── */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-transparent pointer-events-none" />
                <div className="max-w-md mx-auto px-4 pt-4 pb-3 flex items-center gap-3 relative z-10">
                    <button
                        onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
                        className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-none">Crypto Deposit</h1>
                        <p className="text-white/40 text-xs mt-0.5">USDT · TRC20 / BSC</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                        <Shield size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-semibold">Secure</span>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-3">
                {/* Package banner */}
                {packageInfo && (
                    <div className="mb-4 p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Zap size={16} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{packageInfo.packageName}</p>
                            <p className="text-primary text-xs">{packageInfo.minAmount} – {packageInfo.maxAmount} USDT</p>
                        </div>
                    </div>
                )}

                {/* Step bar */}
                <StepBar current={step} />

                {/* ──────── STEP 0: Select Network ──────── */}
                {step === 0 && (
                    <div className="space-y-3 animate-fade-in">
                        <p className="text-white/60 text-xs mb-3 text-center">Choose the blockchain network to deposit USDT</p>
                        {NETWORK_CONFIG.map(net => {
                            const addr = networks.find(n => n.id === net.id)?.address;
                            const isSelected = selectedNetwork === net.id;
                            return (
                                <button
                                    key={net.id}
                                    onClick={() => setSelectedNetwork(net.id)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden
                                        ${isSelected
                                            ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(0,217,181,0.12)]'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check size={12} className="text-black" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                                            <img src={net.logo} alt={net.id} className="w-7 h-7 object-contain" onError={e => e.target.style.display = 'none'} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-sm">{net.label}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                                    style={{ background: net.color + '25', color: net.color }}>
                                                    {net.badge}
                                                </span>
                                            </div>
                                            <p className="text-white/40 text-xs">{net.fullName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/30 text-xs">{net.speed}</span>
                                        <span className="text-white/30 text-xs">{net.confirmations}</span>
                                    </div>
                                    {addr && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <p className="text-white/30 text-[10px] font-mono truncate">{addr}</p>
                                        </div>
                                    )}
                                    {!addr && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <p className="text-amber-400/60 text-[10px]">Address not configured by admin</p>
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => {
                                if (!currentAddress) { toast.error('Wallet address not configured yet. Contact admin.'); return; }
                                setStep(1);
                            }}
                            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
                        >
                            Continue with {selectedNetwork} →
                        </button>
                    </div>
                )}

                {/* ──────── STEP 1: Scan & Send ──────── */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Network badge */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px flex-1 bg-white/10" />
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                                <img src={currentNet?.logo} alt="" className="w-4 h-4 object-contain" onError={e => e.target.style.display = 'none'} />
                                <span className="text-white text-xs font-medium">{currentNet?.fullName}</span>
                            </div>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        {/* QR */}
                        <div className="flex justify-center">
                            <div className="p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(0,217,181,0.2)]">
                                {qrCodeUrl
                                    ? <img src={qrCodeUrl} alt="QR Code" className="w-44 h-44" />
                                    : <div className="w-44 h-44 flex items-center justify-center"><RefreshCw size={24} className="text-gray-400 animate-spin" /></div>
                                }
                            </div>
                        </div>

                        {/* Coin label */}
                        <p className="text-center text-white/50 text-xs">
                            Scan to receive <span className="text-primary font-semibold">USDT ({selectedNetwork})</span>
                        </p>

                        {/* Address box */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Deposit Address</span>
                                <button
                                    onClick={copyAddress}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                                >
                                    {copied ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                </button>
                            </div>
                            <p className="text-white font-mono text-xs break-all leading-relaxed">{currentAddress}</p>
                        </div>

                        {/* Info chips */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { icon: <Shield size={14} />, label: 'Min Deposit', value: `${minDeposit} USDT` },
                                { icon: <Zap size={14} />, label: 'Network', value: selectedNetwork },
                                { icon: <Clock size={14} />, label: 'Confirm', value: currentNet?.confirmations?.split(' ')[0] },
                            ].map((chip, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                                    <div className="text-primary mb-1 flex justify-center">{chip.icon}</div>
                                    <p className="text-white/40 text-[9px] uppercase tracking-wider">{chip.label}</p>
                                    <p className="text-white text-xs font-semibold mt-0.5">{chip.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Warning */}
                        <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-300/80 text-xs leading-relaxed">
                                Only send <strong>USDT</strong> on <strong>{selectedNetwork}</strong> to this address. Wrong network = permanent loss.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm"
                        >
                            I've Sent the Payment →
                        </button>
                    </div>
                )}

                {/* ──────── STEP 2: Submit Proof ──────── */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="text-center mb-2">
                            <p className="text-white/60 text-xs">Enter your transaction details to confirm payment</p>
                        </div>

                        {/* Amount */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <label className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider mb-3">
                                <DollarSign size={12} className="text-primary" /> Amount (USDT)
                                {packageInfo && <span className="text-primary/70 ml-auto normal-case">{packageInfo.minAmount}–{packageInfo.maxAmount} limit</span>}
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder={`Min: ${minDeposit} USDT`}
                                className="w-full bg-transparent text-white text-lg font-bold placeholder-white/20 focus:outline-none"
                            />
                            <div className="h-px bg-white/10 mt-2" />
                            <p className="text-white/30 text-xs mt-2">Network: <span className="text-primary">{selectedNetwork}</span></p>
                        </div>

                        {/* TxHash */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <label className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider mb-3">
                                <Hash size={12} className="text-primary" /> Transaction Hash / ID
                            </label>
                            <input
                                type="text"
                                value={txHash}
                                onChange={e => setTxHash(e.target.value)}
                                placeholder="Enter blockchain TX hash"
                                className="w-full bg-transparent text-white text-sm font-mono placeholder-white/20 focus:outline-none break-all"
                            />
                            <div className="h-px bg-white/10 mt-2" />
                            <p className="text-white/30 text-xs mt-2">Copy from your wallet's transaction history</p>
                        </div>

                        {/* Summary */}
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                            <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-2">Deposit Summary</p>
                            {[
                                ['Network', selectedNetwork],
                                ['Min Deposit', `${minDeposit} USDT`],
                                ['Status after submit', 'Pending Review'],
                                ['Approval Time', '10–30 minutes'],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between text-xs">
                                    <span className="text-white/40">{k}</span>
                                    <span className="text-white font-medium">{v}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-cyan-400 text-black font-bold text-sm disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                        >
                            {submitting
                                ? <><RefreshCw size={16} className="animate-spin" /> Submitting...</>
                                : <><CheckCircle2 size={16} /> Submit Deposit</>
                            }
                        </button>

                        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-blue-300/70 text-xs leading-relaxed">
                                Your deposit will be reviewed by our team. Balance will be credited after confirmation.
                            </p>
                        </div>
                    </div>
                )}

                {/* ──────── Deposit History ──────── */}
                {depositHistory.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Recent Deposits</p>
                            <button onClick={fetchHistory} className="text-primary">
                                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {depositHistory.slice(0, 5).map(dep => (
                                <div key={dep._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                            <Wallet size={14} className="text-white/60" />
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-semibold">{dep.amount} USDT</p>
                                            <p className="text-white/30 text-[10px]">{dep.network} · {new Date(dep.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${statusColor(dep.status)}`}>
                                        {statusIcon(dep.status)} {dep.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Precautions */}
                <div className="mt-6 p-4 rounded-2xl bg-white/3 border border-white/8">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={14} className="text-primary" />
                        <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Recharge Precautions</span>
                    </div>
                    <ul className="space-y-1.5">
                        {[
                            `Minimum deposit: ${minDeposit} USDT`,
                            `Arrives after ${currentNet?.confirmations || '1–3 confirmations'}`,
                            `Only send USDT (${selectedNetwork}) to this address`,
                            'Wrong asset may result in permanent loss',
                            'Always double-check the address before sending',
                        ].map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-white/40 text-xs">
                                <span className="text-primary mt-0.5">•</span> {t}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Deposit;
