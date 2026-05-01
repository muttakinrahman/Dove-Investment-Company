import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Deposit from './pages/Deposit';
import Lend from './pages/Lend';
import Income from './pages/Income';
import LendFunding from './pages/LendFunding';
import Me from './pages/Me';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminUsers from './pages/admin/AdminUsers';
import Withdraw from './pages/Withdraw';
import AdminPackages from './pages/admin/AdminPackages';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReports from './pages/admin/AdminReports';
import AdminSupport from './pages/admin/AdminSupport';
import AdminManualDeposit from './pages/admin/AdminManualDeposit';
import AdminReferralTree from './pages/admin/AdminReferralTree';
import WalletPage from './pages/Wallet';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import History from './pages/History';
import About from './pages/About';
import WithdrawalSuccess from './pages/WithdrawalSuccess';
import BonusSuccess from './pages/BonusSuccess';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import SecuritySettings from './pages/SecuritySettings';
import LevelRequirements from './pages/LevelRequirements';
import DiamondSalary from './pages/DiamondSalary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Maintenance from './pages/Maintenance';
import MyTeam from './pages/MyTeam';
import axios from 'axios';

// Restoring Placeholder components
const Market = () => <div className="min-h-screen bg-gray-50 dark:bg-dark-300 text-gray-900 dark:text-white flex items-center justify-center"><h1 className="text-2xl">Market Page - Coming Soon</h1></div>;
const Community = () => <div className="min-h-screen bg-gray-50 dark:bg-dark-300 text-gray-900 dark:text-white flex items-center justify-center"><h1 className="text-2xl">Community Page - Coming Soon</h1></div>;
const Mine = () => <div className="min-h-screen bg-gray-50 dark:bg-dark-300 text-gray-900 dark:text-white flex items-center justify-center"><h1 className="text-2xl">Mine Page - Coming Soon</h1></div>;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center">
                <div className="text-primary text-xl">Loading...</div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center">
                <div className="text-primary text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/home" replace />;
    }

    return children;
};




function App() {
    const [maintenanceMode, setMaintenanceMode] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(true);
    const location = window.location;

    React.useEffect(() => {
        const checkMaintenance = async () => {
            try {
                const res = await axios.get('/api/home/company-info');
                setMaintenanceMode(res.data.maintenanceMode);
            } catch (error) {
                console.error("Error checking maintenance mode", error);
            } finally {
                setIsChecking(false);
            }
        };
        checkMaintenance();
    }, []);

    if (isChecking) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-300 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const isAdminRoute = location.pathname.startsWith('/admin');

    if (maintenanceMode && !isAdminRoute) {
        return <Maintenance />;
    }

    return (
        <>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected User Routes */}
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
                <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
                <Route path="/lend" element={<ProtectedRoute><Lend /></ProtectedRoute>} />
                <Route path="/lend-funding" element={<ProtectedRoute><LendFunding /></ProtectedRoute>} />
                <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
                <Route path="/me" element={<ProtectedRoute><Me /></ProtectedRoute>} />
                <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                <Route path="/mine" element={<ProtectedRoute><Mine /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/withdrawal-success/:id" element={<ProtectedRoute><WithdrawalSuccess /></ProtectedRoute>} />
                <Route path="/bonus-success/:id" element={<ProtectedRoute><BonusSuccess /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/level-requirements" element={<ProtectedRoute><LevelRequirements /></ProtectedRoute>} />
                <Route path="/my-team" element={<ProtectedRoute><MyTeam /></ProtectedRoute>} />
                <Route path="/diamond-salary" element={<ProtectedRoute><DiamondSalary /></ProtectedRoute>} />
                <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />

                {/* Admin Login */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Protected Admin Routes */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="deposits" element={<AdminDeposits />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="packages" element={<AdminPackages />} />
                    <Route path="withdrawals" element={<AdminWithdrawals />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="support" element={<AdminSupport />} />
                    <Route path="manual-deposit" element={<AdminManualDeposit />} />
                    <Route path="referral-tree" element={<AdminReferralTree />} />
                </Route>

                {/* Maintenance Mode Handling */}
                {maintenanceMode && !isAdminRoute && (
                    <Route path="*" element={<Maintenance />} />
                )}

                {/* Default Route */}
                <Route path="/" element={maintenanceMode && !isAdminRoute ? <Maintenance /> : <Navigate to="/home" replace />} />
                <Route path="*" element={maintenanceMode && !isAdminRoute ? <Maintenance /> : <Navigate to="/home" replace />} />
            </Routes>
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
        </>
    );
}

export default App;
