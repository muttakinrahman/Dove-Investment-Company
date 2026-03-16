import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Copy, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BottomNav from '../components/BottomNav';
import SuccessModal from '../components/SuccessModal';

const Deposit = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const packageInfo = location.state; // Get package info from navigation state
    const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Network options with deposit addresses
    // These will come from backend/admin panel in production
    const [networks, setNetworks] = useState([
        {
            id: 'TRC20',
            name: 'USDT (TRC20)',
            address: 'TWTLHHvdcPT9RKHxUavSVujcZXgFgYjbDP',
            coin: 'USDT',
            network: 'TRC20',
            logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png'
        },
        {
            id: 'BSC',
            name: 'Binance Smart Chain',
            address: '0x28C6c06298d514Db089934071355E5743bf21d60',
            coin: 'BNB/USDT',
            network: 'BSC',
            logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png'
        }
    ]);

    const [minDeposit, setMinDeposit] = useState(50);

    // Fetch dynamic wallet addresses from backend
    useEffect(() => {
        const fetchWallets = async () => {
            try {
                const response = await axios.get('/api/recharge/wallets');
                const { wallets, minDepositAmount } = response.data;

                setNetworks(prev => prev.map(n => ({
                    ...n,
                    address: wallets[n.id] || n.address
                })));
                if (minDepositAmount) setMinDeposit(minDepositAmount);
            } catch (error) {
                console.error('Error fetching wallets:', error);
            }
        };
        fetchWallets();
    }, []);

    const currentNetwork = networks.find(n => n.id === selectedNetwork);

    // Generate QR code when network changes
    useEffect(() => {
        if (currentNetwork?.address) {
            QRCode.toDataURL(currentNetwork.address, {
                width: 180,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).then(url => {
                setQrCodeUrl(url);
            });
        }
    }, [currentNetwork]);

    const copyAddress = () => {
        if (currentNetwork?.address) {
            navigator.clipboard.writeText(currentNetwork.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-dark-300 pb-20">
            {/* Header */}
            <div className="bg-dark-200 border-b border-white/10">
                <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between relative h-9">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 text-white hover:text-primary transition-colors relative z-10"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-white font-semibold text-base">Deposit</h1>
                    </div>
                    <button className="p-1.5 text-white/60 hover:text-white transition-colors relative z-10">
                        <Menu size={22} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto px-4 py-4 space-y-3">
                {/* Package Info Display */}
                {packageInfo && (
                    <div className="glass-card p-3 border border-primary/30 bg-primary/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/60 text-xs mb-0.5">Investment Package</p>
                                <h3 className="text-white font-bold text-sm">{packageInfo.packageName}</h3>
                                <p className="text-primary text-xs mt-0.5">
                                    Level {packageInfo.vipLevel + 1} • {packageInfo.minAmount} - {packageInfo.maxAmount} USDT
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Select Network */}
                <div>
                    <label className="block text-white text-sm font-medium mb-2">Select Network</label>
                    <div className="grid grid-cols-2 gap-2">
                        {networks.map((network) => (
                            <button
                                key={network.id}
                                onClick={() => setSelectedNetwork(network.id)}
                                className={`glass-card p-2.5 flex items-center gap-2 transition-all ${selectedNetwork === network.id
                                    ? 'border-2 border-primary bg-primary/10'
                                    : 'border border-white/10 hover:border-primary/50'
                                    }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ${selectedNetwork === network.id
                                    ? 'bg-white'
                                    : 'bg-white/90'
                                    }`}>
                                    <img
                                        src={network.logo}
                                        alt={network.network}
                                        className="w-5 h-5 object-contain"
                                    />
                                </div>
                                <span className={`text-xs font-medium ${selectedNetwork === network.id ? 'text-primary' : 'text-white'
                                    }`}>
                                    {network.network}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-3">
                    {qrCodeUrl ? (
                        <div className="bg-white p-3 rounded-xl">
                            <img
                                src={qrCodeUrl}
                                alt="Deposit QR Code"
                                className="w-40 h-40"
                            />
                        </div>
                    ) : (
                        <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-dark-300 text-xs">Loading...</span>
                        </div>
                    )}
                </div>

                {/* Address Info */}
                <div className="text-center">
                    <p className="text-white/60 text-xs">
                        This Address Only Supports {currentNetwork?.coin} Of {currentNetwork?.network}
                    </p>
                </div>

                {/* Deposit Address */}
                <div>
                    <label className="block text-white text-sm font-medium mb-2">Deposit Address</label>
                    <div className="glass-card p-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-white text-xs break-all font-mono">
                                {currentNetwork?.address}
                            </span>
                            <button
                                onClick={copyAddress}
                                className="p-1.5 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors flex-shrink-0"
                            >
                                <Copy size={16} className="text-primary" />
                            </button>
                        </div>
                        {copied && (
                            <p className="text-primary text-xs mt-1.5">Copied!</p>
                        )}
                    </div>
                </div>

                {/* Submit Deposit Form */}
                <div className="glass-card p-4 space-y-3 mt-4">
                    <h3 className="text-white font-semibold text-sm">Submit Transaction</h3>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">
                            Amount ({currentNetwork?.coin})
                            {packageInfo && <span className="text-primary ml-1">(Limit: {packageInfo.minAmount} - {packageInfo.maxAmount})</span>}
                        </label>
                        <input
                            type="number"
                            placeholder="Enter amount"
                            defaultValue={packageInfo ? packageInfo.minAmount : ''}
                            min={packageInfo ? packageInfo.minAmount : undefined}
                            max={packageInfo ? packageInfo.maxAmount : undefined}
                            className="w-full bg-dark-300 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none"
                            id="amountInput"
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1">Transaction ID / Hash</label>
                        <input
                            type="text"
                            placeholder="Enter transaction ID"
                            className="w-full bg-dark-300 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-primary focus:outline-none"
                            id="txInput"
                        />
                    </div>

                    <button
                        onClick={async () => {
                            const amountInput = document.getElementById('amountInput');
                            const txInput = document.getElementById('txInput');
                            const amount = amountInput.value;
                            const txHash = txInput.value;

                            if (!amount || !txHash) {
                                toast.error('Please fill in all required fields', {
                                    position: "top-center",
                                    autoClose: 3000,
                                });
                                return;
                            }

                            const depositAmount = parseFloat(amount);
                            if (depositAmount < minDeposit) {
                                toast.error(`Minimum deposit amount is $${minDeposit}`, {
                                    position: "top-center",
                                    autoClose: 3000,
                                });
                                return;
                            }

                            // Package limit validation
                            if (packageInfo) {
                                const depositAmount = parseFloat(amount);
                                if (depositAmount < packageInfo.minAmount) {
                                    toast.warning(`Minimum deposit for ${packageInfo.packageName} is ${packageInfo.minAmount} USDT`, {
                                        position: "top-center",
                                        autoClose: 4000,
                                    });
                                    return;
                                }
                                if (depositAmount > packageInfo.maxAmount) {
                                    toast.warning(`Maximum deposit for ${packageInfo.packageName} is ${packageInfo.maxAmount} USDT`, {
                                        position: "top-center",
                                        autoClose: 4000,
                                    });
                                    return;
                                }
                            }

                            try {
                                const token = localStorage.getItem('token');
                                const response = await axios.post('/api/recharge/submit', {
                                    amount: parseFloat(amount),
                                    transactionHash: txHash,
                                    network: currentNetwork?.network,
                                    packageId: packageInfo?.packageId || null,
                                    packageName: packageInfo?.packageName || null
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                });

                                if (response.status === 201) {
                                    setShowSuccess(true);
                                    amountInput.value = '';
                                    txInput.value = '';
                                }
                            } catch (error) {
                                console.error('Deposit error:', error);
                                toast.error(error.response?.data?.message || 'Error submitting deposit. Please try again.', {
                                    position: "top-center",
                                    autoClose: 4000,
                                });
                            }
                        }}
                        className="w-full py-2.5 bg-gradient-primary rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-opacity mt-2"
                    >
                        Submit Deposit
                    </button>
                </div>

                {/* Recharge Precautions */}
                <div className="glass-card p-3">
                    <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-primary text-xs">ℹ</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-primary font-medium text-sm mb-1.5">Recharge Precautions</h3>
                            <div className="text-white/70 text-xs space-y-1">
                                <p>
                                    After selecting network, the system displays the corresponding recharge address.
                                </p>
                                <div className="mt-2">
                                    <p className="text-white font-medium mb-1">Important:</p>
                                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-white/60">
                                        <li>Minimum deposit: {minDeposit} {currentNetwork?.coin}</li>
                                        <li>Arrives after 1-3 confirmations</li>
                                        <li>Only send {currentNetwork?.coin} to this address</li>
                                        <li>Wrong assets may result in permanent loss</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    navigate('/home');
                }}
                title="Deposit Submitted!"
                message="Your deposit request has been submitted successfully. Waiting for admin approval."
            />

            <BottomNav />
        </div>
    );
};

export default Deposit;
