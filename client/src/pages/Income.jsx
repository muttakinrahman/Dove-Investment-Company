import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, ChevronRight, ChevronDown, Wallet, Users, Gift, TrendingUp, CreditCard, Bell, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BottomNav from '../components/BottomNav';

const Income = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('Nearly seven days');
    const [incomeData, setIncomeData] = useState({
        totalClaimable: 0,
        claimableCount: 0,
        details: [],
        stats: {
            totalEarnings: 0,
            interestIncome: 0,
            teamIncome: 0,
            bonusIncome: 0
        }
    });
    const [loading, setLoading] = useState(false);
    const [collecting, setCollecting] = useState(false);
    const [teamBenefits, setTeamBenefits] = useState({ count: 0, totalAmount: 0 });
    const [chartData, setChartData] = useState([
        { day: 'Sun', amount: 0 },
        { day: 'Mon', amount: 0 },
        { day: 'Tue', amount: 0 },
        { day: 'Wed', amount: 0 },
        { day: 'Thu', amount: 0 },
        { day: 'Fri', amount: 0 },
        { day: 'Sat', amount: 0 }
    ]);

    // Fetch income data
    const fetchIncome = async () => {
        try {
            const token = localStorage.getItem('token');
            const [incomeRes, teamRes, statsRes] = await Promise.all([
                axios.get('/api/invest/income', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/commission/unclaimed', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/invest/daily-stats', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setIncomeData(incomeRes.data);
            setTeamBenefits({
                count: teamRes.data.count,
                totalAmount: teamRes.data.totalAmount
            });
            if (Array.isArray(statsRes.data)) {
                setChartData(statsRes.data);
            }
        } catch (error) {
            console.error('Fetch income error:', error);
        }
    };

    useEffect(() => {
        fetchIncome();
    }, []);

    const handleCollect = async () => {
        setCollecting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/invest/collect', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                fetchIncome(); // Refresh data
                // Reload page to update balance in global state
                toast.success('Income collected successfully!');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            console.error('Collect error:', error);
            toast.error(error.response?.data?.message || 'Collection failed');
        } finally {
            setCollecting(false);
        }
    };

    // Use real data from backend for the chart
    const chartValues = chartData.map(d => d.amount || 0);
    const maxVal = Math.max(...chartValues, 10); // Minimum scale of 10 USDT

    // Generate SVG path for the area chart
    const generateChartPath = () => {
        const width = 100;
        const height = 60;
        const points = chartData.map((d, index) => {
            const x = (index / (chartData.length - 1)) * width;
            const y = height - ((d.amount || 0) / maxVal) * height; // Invert Y because SVG coords top-down
            return `${x},${y}`;
        });

        // Close the path for the fill
        return `M0,${height} L${points.join(' L')} L${width},${height} Z`;
    };

    const generateLinePath = () => {
        const width = 100;
        const height = 60;
        const points = chartData.map((d, index) => {
            const x = (index / (chartData.length - 1)) * width;
            const y = height - ((d.amount || 0) / maxVal) * height;
            return `${x},${y}`;
        });
        return `M${points.join(' L')}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-300 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
            {/* Top Header */}
            <div className="bg-white dark:bg-dark-200 border-b border-slate-200 dark:border-white/10">
                <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between relative">
                    {/* Placeholder for left to balance flex if needed, but absolute is better */}
                    <div className="w-10"></div>

                    {/* Page Name - Perfect Center */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-gray-900 dark:text-white font-bold text-lg">Income</h1>
                    </div>

                    {/* Icons - Right Side */}
                    <div className="flex items-center gap-3 relative z-10">
                        <button
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 text-gray-900/60 dark:text-white/60 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
                        >
                            <Bell size={20} />
                            {/* Unread count dot could be dynamic later */}
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

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Total Income Card */}
                <div className="bg-zinc-800 text-white rounded-[2rem] p-8 relative overflow-hidden shadow-lg border border-white/5 mx-1">
                    <div className="relative z-10 text-center">
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">Cumulative Total Income</p>
                        <h2 className="text-[#a4f13a] text-4xl font-black tracking-tight">
                            {incomeData.stats.totalEarnings.toFixed(2)} USDT
                        </h2>
                    </div>
                </div>

                {/* Stats Grid - Row 1 */}
                <div className="grid grid-cols-3 gap-3 font-sans">
                    {/* Interest Income - Deep Emerald */}
                    <div className="bg-emerald-600 rounded-2xl p-3 shadow-lg flex flex-col justify-between h-24 relative overflow-hidden border border-emerald-500/20">
                        <div className="absolute top-2 right-2 text-white/20">
                            <ChevronRight size={14} />
                        </div>
                        <div className="text-[10px] text-white/70 font-bold uppercase tracking-tight leading-tight">Interest<br />Income</div>
                        <div className="font-bold text-[13px] text-white whitespace-nowrap">
                            {incomeData.stats.interestIncome.toFixed(2)} USDT
                        </div>
                    </div>

                    {/* Team Income - Deep Blue */}
                    <div className="bg-blue-600 rounded-2xl p-3 shadow-lg flex flex-col justify-between h-24 relative overflow-hidden border border-blue-500/20">
                        <div className="absolute top-2 right-2 text-white/20">
                            <ChevronRight size={14} />
                        </div>
                        <div className="text-[10px] text-white/70 font-bold uppercase tracking-tight leading-tight">Team Income</div>
                        <div className="font-bold text-[13px] text-white whitespace-nowrap">
                            {incomeData.stats.teamIncome.toFixed(2)} USDT
                        </div>
                    </div>

                    {/* Bonus - Deep Violet */}
                    <div className="bg-violet-600 rounded-2xl p-3 shadow-lg flex flex-col justify-between h-24 relative overflow-hidden border border-violet-500/20">
                        <div className="absolute top-2 right-2 text-white/20">
                            <ChevronRight size={14} />
                        </div>
                        <div className="text-[10px] text-white/70 font-bold uppercase tracking-tight leading-tight">Bonus</div>
                        <div className="font-bold text-[13px] text-white whitespace-nowrap">
                            {incomeData.stats.bonusIncome.toFixed(2)} USDT
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Row 2 */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-dark-200 rounded-2xl p-4 shadow-lg relative border border-slate-200 dark:border-white/5">
                        <div className="absolute top-4 right-2 text-gray-500">
                            <ChevronRight size={16} />
                        </div>
                        <div className="flex items-start gap-2 mb-4">
                            <div className="w-10 h-8 bg-gray-100 dark:bg-black/40 rounded-lg flex items-center justify-center relative border border-slate-200 dark:border-white/5 transition-colors">
                                <span className="text-black font-bold text-lg">$</span>
                                {/* Icon decoration */}
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#a4f13a] rounded-full"></div>
                            </div>
                            <div className="mt-1">
                                <span className="text-xs text-gray-400 block">Loan Income</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                                    {incomeData.claimableCount} items
                                    {incomeData.totalClaimable > 0 && <span className="text-[#a4f13a] ml-1">(${incomeData.totalClaimable.toFixed(2)})</span>}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleCollect}
                            disabled={incomeData.claimableCount === 0 || collecting}
                            className={`w-full py-1.5 rounded-full text-xs font-medium transition-all ${incomeData.claimableCount > 0
                                ? 'bg-[#a4f13a] text-black hover:bg-[#93d934] shadow-lg shadow-[#a4f13a]/20'
                                : 'bg-gray-900/5 dark:bg-white/5 text-gray-900/20 dark:text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {collecting ? 'Collecting...' : incomeData.claimableCount > 0 ? 'Received' : 'Received'}
                        </button>
                    </div>

                    {/* Team Benefits Section */}
                    <div className="bg-white dark:bg-dark-200 rounded-2xl p-4 shadow-lg relative border border-slate-200 dark:border-white/5">
                        <div className="absolute top-4 right-2 text-gray-500">
                            <ChevronRight size={16} />
                        </div>
                        <div className="flex items-start gap-2 mb-4">
                            <div className="w-10 h-8 bg-gray-100 dark:bg-black/40 rounded-lg flex items-center justify-center relative border border-slate-200 dark:border-white/5 transition-colors">
                                <span className="text-black font-bold text-lg">$</span>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#a4f13a] rounded-full"></div>
                            </div>
                            <div className="mt-1">
                                <span className="text-xs text-gray-400 block">Team Benefits</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                                    {teamBenefits.count} items
                                    {teamBenefits.totalAmount > 0 && <span className="text-[#a4f13a] ml-1">(${teamBenefits.totalAmount.toFixed(2)})</span>}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                if (teamBenefits.count === 0) {
                                    toast.info('No commissions to claim');
                                    return;
                                }
                                try {
                                    const token = localStorage.getItem('token');
                                    const res = await axios.post('/api/commission/claim', {}, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    toast.success(`Claimed $${res.data.amount.toFixed(2)}!`);
                                    fetchIncome();
                                } catch (error) {
                                    toast.error(error.response?.data?.message || 'Failed to claim');
                                }
                            }}
                            disabled={teamBenefits.count === 0}
                            className={`w-full py-1.5 rounded-full text-xs font-medium transition-all ${teamBenefits.count > 0
                                ? 'bg-[#a4f13a] text-black hover:bg-[#93d934] shadow-lg shadow-[#a4f13a]/20'
                                : 'bg-gray-900/5 dark:bg-white/5 text-gray-900/20 dark:text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {teamBenefits.count > 0 ? 'Received' : 'Received'}
                        </button>
                    </div>
                </div>

                {/* Daily Income Chart */}
                <div className="bg-white dark:bg-dark-200 rounded-[2rem] p-6 shadow-lg mt-4 border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Daily Income</h3>
                        <div className="flex items-center gap-1 bg-gray-900/5 dark:bg-white/5 rounded-full px-3 py-1 text-xs font-medium text-gray-900/60 dark:text-white/60 cursor-pointer hover:bg-white/10 transition-colors">
                            {timeRange}
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <div className="relative h-64 w-full">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-gray-500 font-medium">
                            <span>{(maxVal).toFixed(0)}</span>
                            <span>{(maxVal * 0.83).toFixed(0)}</span>
                            <span>{(maxVal * 0.66).toFixed(0)}</span>
                            <span>{(maxVal * 0.5).toFixed(0)}</span>
                            <span>{(maxVal * 0.33).toFixed(0)}</span>
                            <span>{(maxVal * 0.16).toFixed(0)}</span>
                            <span>0</span>
                        </div>

                        {/* Chart Area */}
                        <div className="absolute left-8 right-0 top-2 bottom-6">
                            {/* Grid lines */}
                            <div className="w-full h-full flex flex-col justify-between">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="w-full h-[1px] bg-gray-900/5 dark:bg-white/5"></div>
                                ))}
                            </div>

                            {/* SVG Chart */}
                            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a4f13a" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#a4f13a" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={generateChartPath()}
                                    fill="url(#chartGradient)"
                                />
                                <path
                                    d={generateLinePath()}
                                    fill="none"
                                    stroke="#a4f13a"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>

                            {/* X-axis labels (Days) */}
                            <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-0">
                                {chartData.map((d, i) => (
                                    <span key={i} className="text-[10px] text-gray-500 font-medium w-8 text-center">
                                        {d.day}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Income;
