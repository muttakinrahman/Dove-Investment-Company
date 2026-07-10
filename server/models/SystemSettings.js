import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
    // Company Information
    companyName: {
        type: String,
        default: 'Dove Investment Gold Mine'
    },
    companyDescription: {
        type: String,
        default: 'Your trusted partner in financial growth. We provide secure and profitable investment solutions with transparency and excellence.'
    },
    companyEmail: {
        type: String,
        default: 'info@doveinvest.com'
    },
    companyPhone: {
        type: String,
        default: '+880-1XXX-XXXXXX'
    },
    companyAddress: {
        type: String,
        default: 'Dhaka, Bangladesh'
    },

    // Platform Settings
    minWithdrawalAmount: {
        type: Number,
        default: 100
    },
    maxWithdrawalAmount: {
        type: Number,
        default: 100000
    },
    withdrawalFeePercentage: {
        type: Number,
        default: 0
    },
    minDepositAmount: {
        type: Number,
        default: 10
    },

    // Wallet Addresses
    walletTRC20: {
        type: String,
        default: ''
    },
    walletBTC: {
        type: String,
        default: ''
    },
    walletETH: {
        type: String,
        default: ''
    },
    walletBSC: {
        type: String,
        default: ''
    },
    appDownloadUrl: {
        type: String,
        default: '#'
    },

    // Platform Statistics (Updated by system)
    totalUsersCount: {
        type: Number,
        default: 0
    },
    totalInvestmentsAmount: {
        type: Number,
        default: 0
    },
    totalEarningsDistributed: {
        type: Number,
        default: 0
    },

    // Feature Toggles
    registrationEnabled: {
        type: Boolean,
        default: true
    },
    withdrawalEnabled: {
        type: Boolean,
        default: true
    },
    depositEnabled: {
        type: Boolean,
        default: true
    },
    investmentEnabled: {
        type: Boolean,
        default: true
    },

    // Maintenance
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    maintenanceMessage: {
        type: String,
        default: 'System is under maintenance. Please check back later.'
    }
}, {
    timestamps: true
});

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
