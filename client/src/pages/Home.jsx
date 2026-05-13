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
                        <div className="grid grid-cols-3 gap-4">
                            {/* Telegram */}
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
                                <span className="text-xs text-gray-900/60 dark:text-white/60">Telegram</span>
                            </a>

                            {/* LinkedIn */}
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-[#0A66C2]/10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-[#0A66C2]/20 shadow-glow">
                                    <svg className="w-8 h-8 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-900/60 dark:text-white/60">LinkedIn</span>
                            </a>

                            {/* Twitter / X */}
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-gray-900/8 dark:bg-white/8 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-gray-900/15 dark:group-hover:bg-white/15 shadow-glow">
                                    <svg className="w-7 h-7 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-900/60 dark:text-white/60">Twitter</span>
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
