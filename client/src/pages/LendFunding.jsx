import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PiggyBank, Calendar, Clock, DollarSign, CheckCircle, Activity, AlertCircle } from 'lucide-react';
import axios from 'axios';

const LendFunding = () => {
    const navigate = useNavigate();
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvestments();
    }, []);

    const fetchInvestments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/invest/my-investments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvestments(res.data);
        } catch (error) {
            console.error('Error fetching investments:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDaysRemaining = (endDate) => {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-6">
            {/* Header */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/10 sticky top-0 z-10 shadow-lg">
                <div className="max-w-md mx-auto px-4 py-2 relative flex items-center justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute left-4 p-2 text-gray-900/60 dark:text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-gray-900 dark:text-white font-bold text-lg">My Investments</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : investments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-900/40 dark:text-white/40 glass-card">
                        <PiggyBank size={48} className="mb-3 opacity-50" />
                        <p className="text-sm">No active investments found</p>
                        <button
                            onClick={() => navigate('/lend')}
                            className="mt-4 px-6 py-2 bg-primary/20 text-primary rounded-full text-sm font-bold border border-primary/20 hover:bg-primary/30 transition-colors"
                        >
                            Start Investing
                        </button>
                    </div>
                ) : (
                    investments.map((inv, index) => {
                        const isCompleted = inv.status === 'completed';
                        const daysLeft = calculateDaysRemaining(inv.endDate);
                        const progress = Math.min((inv.totalEarned / inv.package.totalReturn) * 100, 100);

                        return (
                            <div key={index} className={`glass-card p-4 relative overflow-hidden ${isCompleted ? 'opacity-80' : ''}`}>
                                {/* Status Badge */}
                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl border-l border-b border-slate-200 dark:border-white/10 ${isCompleted
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-primary/20 text-primary'
                                    }`}>
                                    {isCompleted ? 'COMPLETED' : 'ACTIVE'}
                                </div>

                                <div className="flex items-start gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'
                                        }`}>
                                        <PiggyBank size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 dark:text-white font-bold text-base">{inv.package.name}</h3>
                                        <p className="text-gray-900/40 dark:text-white/40 text-xs mt-0.5 flex items-center gap-1">
                                            <Activity size={10} />
                                            Daily Return: ${(inv.package.dailyEarning || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Financials */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className={`rounded-lg p-2.5 border ${index % 2 === 0 ? 'bg-teal-500/15 border-teal-400/20' : 'bg-violet-500/15 border-violet-400/20'}`}>
                                        <div className={`text-[10px] uppercase mb-1 font-semibold ${index % 2 === 0 ? 'text-teal-400' : 'text-violet-400'}`}>Invested</div>
                                        <div className={`font-bold text-sm ${index % 2 === 0 ? 'text-teal-100' : 'text-violet-100'}`}>${inv.package.investmentAmount}</div>
                                    </div>
                                    <div className={`rounded-lg p-2.5 border ${index % 2 === 0 ? 'bg-amber-500/15 border-amber-400/20' : 'bg-orange-500/15 border-orange-400/20'}`}>
                                        <div className={`text-[10px] uppercase mb-1 font-semibold ${index % 2 === 0 ? 'text-amber-400' : 'text-orange-400'}`}>Total Earned</div>
                                        <div className={`font-bold text-sm ${index % 2 === 0 ? 'text-amber-300' : 'text-orange-300'}`}>+${inv.totalEarned.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-gray-900/60 dark:text-white/60">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {formatDate(inv.startDate)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            {isCompleted ? 'Ended' : `${daysLeft} days left`}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {formatDate(inv.endDate)}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-1.5 bg-gray-900/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-primary to-cyan-400'
                                                }`}
                                            style={{ width: `${isCompleted ? 100 : progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {!isCompleted && (
                                    <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-900/40 dark:text-white/40 bg-gray-900/5 dark:bg-white/5 p-2 rounded-lg">
                                        <AlertCircle size={12} className="text-primary shrink-0" />
                                        <p>Profit distributions occur daily. Collect earnings from Income page.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LendFunding;
