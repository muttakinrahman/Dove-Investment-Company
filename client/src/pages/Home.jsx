import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import PinModal from '../components/PinModal';
import BalanceWarningPopup from '../components/BalanceWarningPopup';

const HeroSlider = () => {
    const slides = [
        { type: 'image', url: '/images/dove-hero.png', duration: 5000 },
        { type: 'video', url: '/video/gold.mp4', duration: 8000 }
    ];
    const [currentSlide, setCurrentSlide] = useState(0);
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = React.useRef(null);

    // Auto-advance slides
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, slides[currentSlide].duration);

        return () => clearTimeout(timer);
    }, [currentSlide]);

    // When video slide is active, play only if buffered
    useEffect(() => {
        if (slides[currentSlide].type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            if (videoReady) {
                videoRef.current.play().catch(() => { });
            }
        }
        // Pause video when not visible
        if (slides[currentSlide].type !== 'video' && videoRef.current) {
            videoRef.current.pause();
        }
    }, [currentSlide, videoReady]);

    return (
        <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 bg-white dark:bg-dark-200 h-56 shadow-xl">
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    {slide.type === 'video' ? (
                        <video
                            ref={videoRef}
                            muted
                            playsInline
                            preload="auto"
                            onCanPlayThrough={() => setVideoReady(true)}
                            className="w-full h-full object-cover"
                        >
                            <source src={slide.url} type="video/mp4" />
                        </video>
                    ) : (
                        <img
                            src={slide.url}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            ))}

            {/* Slide Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {slides.map((_, index) => (
                    <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentSlide ? 'bg-primary w-4' : 'bg-gray-900/30 dark:bg-white/30'}`}
                    ></div>
                ))}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 dark:from-black/20 to-transparent pointer-events-none z-10"></div>
        </div>
    );
};




const Home = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showPinModal, setShowModal] = useState(false);
    const [pinMode, setPinMode] = useState('verify'); // 'setup' or 'verify'
    const [actionType, setActionType] = useState(null); // 'deposit' or 'withdraw'
    const [stats, setStats] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [showWarningPopup, setShowWarningPopup] = useState(false);

    // Show balance warning popup once per session
    useEffect(() => {
        if (user?.balanceWarning?.hasWarning) {
            const sessionKey = `balanceWarningShown_${user.id}`;
            const alreadyShown = sessionStorage.getItem(sessionKey);
            if (!alreadyShown) {
                // Small delay so the page loads first, then popup appears
                const t = setTimeout(() => {
                    setShowWarningPopup(true);
                    sessionStorage.setItem(sessionKey, 'true');
                }, 800);
                return () => clearTimeout(t);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [statsRes, infoRes] = await Promise.all([
                axios.get('/api/home/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('/api/home/company-info')
            ]);
            setStats(statsRes.data);
            setCompanyInfo(infoRes.data);
        } catch (error) {
            console.error('Error fetching home data:', error);
        }
    };

    const handleActionClick = (type) => {
        setActionType(type);
        if (user?.hasTransactionPin) {
            setPinMode('verify');
        } else {
            setPinMode('setup');
        }
        setShowModal(true);
    };

    const handlePinSuccess = () => {
        setShowModal(false);
        if (actionType === 'deposit') {
            navigate('/deposit');
        } else if (actionType === 'withdraw') {
            navigate('/withdraw');
        }

        if (pinMode === 'setup') {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-24">
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowModal(false)}
                onSuccess={handlePinSuccess}
                mode={pinMode}
            />

            {/* Balance Warning Popup */}
            {showWarningPopup && (
                <BalanceWarningPopup
                    warningInfo={user?.balanceWarning}
                    onClose={() => setShowWarningPopup(false)}
                />
            )}

            {/* Header */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/10">
                <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between relative">
                    <div className="w-10"></div>
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg">Home</h1>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <button
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                        >
                            <Bell size={20} />
                            {stats?.unreadNotifications > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-dark-200 animate-pulse"></span>
                            )}
                        </button>
                        <button
                            onClick={() => navigate('/help')}
                            className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto space-y-4">
                {/* Hero Slider */}
                <HeroSlider />

                {/* Withdraw and Deposit Sections */}
                <div className="px-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Withdraw Section */}
                        <div
                            onClick={() => handleActionClick('withdraw')}
                            className="glass-card p-4 text-center cursor-pointer hover:bg-glass-medium transition-all"
                        >
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Withdraw</h3>
                            <p className="text-gray-900/60 dark:text-white/60 text-xs">Fast withdrawal</p>
                        </div>

                        {/* Deposit Section */}
                        <div
                            onClick={() => handleActionClick('deposit')}
                            className="glass-card p-4 text-center cursor-pointer hover:bg-glass-medium transition-all"
                        >
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5l9 2-9 18-9-18 9-2zm0 0v8" />
                                </svg>
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Deposit</h3>
                            <p className="text-gray-900/60 dark:text-white/60 text-xs">Quick deposit</p>
                        </div>
                    </div>
                </div>

                {/* Company Information Section */}
                <div className="px-4">
                    <div className="glass-card p-6 text-center">
                        <div className="mb-4">
                            <h2 className="text-gray-900 dark:text-white text-xl font-bold mb-2">{companyInfo?.name || 'Dove Investment Gold Mine'}</h2>
                            <p className="text-gray-900/70 dark:text-white/70 text-sm leading-relaxed">
                                {companyInfo?.description || 'A premier US-based investment company specializing in gold mining and cryptocurrency. We provide secure, transparent, and high-yield investment solutions trusted by investors across 36+ countries worldwide.'}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/about')}
                            className="w-full bg-gradient-primary text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl hover:shadow-glow-lg transition-all"
                        >
                            Learn More About Us
                        </button>
                    </div>
                </div>

                {/* Social Links Section */}
                <div className="px-4 pb-4">
                    <div className="glass-card p-6">
                        <h3 className="text-gray-900 dark:text-white font-semibold mb-6 text-center">Join Our Community</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {/* Telegram Channel */}
                            <a
                                href="https://t.me/doveinvestmentgoldmine"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-[#229ED9]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-[#229ED9]/20 shadow-glow">
                                    <svg className="w-8 h-8 text-[#229ED9]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.544.26l.213-3.045 5.542-5.008c.24-.213-.054-.33-.373-.12l-6.85 4.312-2.95-.922c-.64-.204-.653-.64.135-.947l11.51-4.436c.533-.194 1 .127.817.91z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] text-gray-900/60 dark:text-white/60 text-center leading-tight">TG Channel</span>
                            </a>

                            {/* Facebook */}
                            <a
                                href="http://facebook.com/DoveGoldOfficial"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-[#1877F2]/20 shadow-glow">
                                    <svg className="w-8 h-8 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] text-gray-900/60 dark:text-white/60 text-center leading-tight">Facebook</span>
                            </a>

                            {/* Twitter / X */}
                            <a
                                href="https://x.com/DoveGold52"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-gray-900/8 dark:bg-white/8 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-gray-900/15 dark:group-hover:bg-white/15 shadow-glow">
                                    <svg className="w-7 h-7 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] text-gray-900/60 dark:text-white/60 text-center leading-tight">Twitter</span>
                            </a>

                            {/* Instagram */}
                            <a
                                href="https://www.instagram.com/dovegoldofficial?utm_source=qr&igsh=MWRhZGVwZHYzY21oNw=="
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-[#E1306C]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-[#E1306C]/20 shadow-glow">
                                    <svg className="w-7 h-7 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] text-gray-900/60 dark:text-white/60 text-center leading-tight">Instagram</span>
                            </a>

                            {/* TikTok */}
                            <a
                                href="http://tiktok.com/@dovegoldofficial"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-gray-900/8 dark:bg-white/8 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-gray-900/15 dark:group-hover:bg-white/15 shadow-glow">
                                    <svg className="w-7 h-7 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.27 6.27 0 0 0-3.11.3 6.3 6.3 0 0 0-3.9 6.07 6.3 6.3 0 0 0 10.98 4.13 6.3 6.3 0 0 0 1.9-4.43V8.4a8.1 8.1 0 0 0 4.76 1.67V6.69z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] text-gray-900/60 dark:text-white/60 text-center leading-tight">TikTok</span>
                            </a>
                        </div>
                    </div>
                </div>


            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default Home;
