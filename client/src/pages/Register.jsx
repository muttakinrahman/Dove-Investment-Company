import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowLeft, RefreshCw, Globe, Download } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import CountrySelector from '../components/CountrySelector';
import { usePWA } from '../hooks/usePWA';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        otp: '',
        invitationCode: '',
        password: '',
        confirmPassword: '',
        agreedToTerms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const { isInstallable, installApp } = usePWA();
    const [isReferralLink, setIsReferralLink] = useState(false);

    // Auto-fill invitation code from URL parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            setFormData(prev => ({
                ...prev,
                invitationCode: refCode
            }));
            setIsReferralLink(true);
        }
    }, []);

    const handleDownload = async () => {
        const installed = await installApp();
        if (installed) {
            console.log('App installed successfully');
        }
    };

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleSendOtp = async () => {
        if (!formData.email || !formData.email.includes('@')) {
            setError('Please enter a valid email address first');
            return;
        }

        setError('');
        setIsSendingOtp(true);

        try {
            const response = await axios.post('/api/auth/register/send-otp', {
                email: formData.email
            });
            console.log(response.data.message);
            setCountdown(60); // Start 60s countdown
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.otp || formData.otp.length !== 6) {
            setError('Please enter the 6-digit verification code');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!formData.agreedToTerms) {
            setError('Please agree to the Privacy Agreement');
            return;
        }

        setLoading(true);

        try {
            await register({
                fullName: formData.fullName,
                phone: formData.phone,
                email: formData.email,
                password: formData.password,
                invitationCode: formData.invitationCode,
                otp: formData.otp
            });
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            {/* Header */}
            <div className="text-center mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-0 p-2 text-gray-900/60 dark:text-white/60 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="flex items-center justify-center gap-2 mb-2">
                    <Globe size={20} className="text-gray-900/60 dark:text-white/60" />
                    <RefreshCw size={20} className="text-gray-900/60 dark:text-white/60" />
                </div>

                <div className="flex items-center justify-center gap-3 mb-3">
                    {/* Logo */}
                    <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-lg transition-transform hover:scale-110 overflow-hidden">
                        <img
                            src="/pwa-icon-192.png"
                            alt="Dove Logo"
                            className="w-full h-full object-cover p-1"
                        />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome To,</h1>
                <p className="text-gray-900/60 dark:text-white/60">Dove Investment Gold Mine</p>
            </div>

            {/* Registration Form */}
            <div className="glass-card p-6 space-y-5 shadow-glow">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Login</h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Please enter your full name"
                            className="input-glass w-full"
                            required
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your phone number"
                            className="input-glass w-full"
                            required
                        />
                    </div>

                    {/* Gmail Address */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Gmail Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your-email@gmail.com"
                            className="input-glass w-full"
                            required
                        />
                    </div>

                    {/* Email Verification Code */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Verification Code</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="otp"
                                value={formData.otp}
                                onChange={handleChange}
                                placeholder="Enter 6-digit code"
                                className="input-glass flex-1"
                                maxLength={6}
                                required
                            />
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={isSendingOtp || countdown > 0}
                                className={`px-4 py-3 rounded-xl font-medium transition-all min-w-[120px] ${
                                    isSendingOtp || countdown > 0 
                                        ? 'bg-gray-900/10 dark:bg-white/10 text-gray-900/40 dark:text-white/40 cursor-not-allowed' 
                                        : 'bg-primary text-gray-900 dark:text-white hover:bg-primary-hover shadow-glow'
                                }`}
                            >
                                {isSendingOtp ? (
                                    <RefreshCw size={18} className="animate-spin mx-auto" />
                                ) : countdown > 0 ? (
                                    `${countdown}s`
                                ) : (
                                    'Send Code'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Invitation Code */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Invitation Code</label>
                        <input
                            type="text"
                            name="invitationCode"
                            value={formData.invitationCode}
                            onChange={handleChange}
                            placeholder="PM57X8 (Optional)"
                            className="input-glass w-full"
                            readOnly={isReferralLink}
                            disabled={isReferralLink}
                        />
                        {isReferralLink && (
                            <p className="text-xs text-primary mt-1">✓ Referral code applied from link</p>
                        )}
                    </div>

                    {/* Login Password */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Login Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Please enter a password (6-20 alphanumeric)"
                                className="input-glass w-full pr-12"
                                required
                                minLength={6}
                                maxLength={20}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900/40 dark:text-white/40 hover:text-white/60 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-gray-900/80 dark:text-white/80 text-sm mb-2">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Please enter your password again"
                                className="input-glass w-full pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900/40 dark:text-white/40 hover:text-white/60 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Privacy Agreement */}
                    <div className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="agreedToTerms"
                            checked={formData.agreedToTerms}
                            onChange={handleChange}
                            className="w-4 h-4 mt-0.5 rounded border-slate-200 dark:border-white/20 bg-glass-light text-primary focus:ring-primary/50"
                            required
                        />
                        <label className="text-gray-900/80 dark:text-white/80">
                            I Have Read The{' '}
                            <Link to="/privacy" className="text-primary hover:text-primary-light transition-colors">
                                Privacy Agreement
                            </Link>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" />
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Register</span>
                                <span>→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* App Download Button */}
                {isInstallable && (
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            onClick={handleDownload}
                            className="btn-glass w-full flex items-center justify-center gap-2 hover:shadow-glow"
                        >
                            <Download size={20} className="text-primary" />
                            <span>Install App</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Login Link */}
            <div className="text-center mt-6">
                <span className="text-gray-900/60 dark:text-white/60">Already have an account? </span>
                <Link to="/login" className="text-primary hover:text-primary-light font-semibold transition-colors">
                    Login Now
                </Link>
            </div>
        </AuthLayout>
    );
};

export default Register;
