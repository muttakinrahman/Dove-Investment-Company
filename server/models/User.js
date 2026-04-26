import mongoose from 'mongoose';

const investmentPackageSchema = new mongoose.Schema({
    packageNumber: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    investmentAmount: {
        type: Number,
        required: true
    },
    dailyEarning: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in days
        required: true
    },
    totalReturn: {
        type: Number,
        required: true
    }
});

const userInvestmentSchema = new mongoose.Schema({
    package: {
        type: investmentPackageSchema,
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    lastEarningDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
});

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    memberId: {
        type: Number,
        unique: true,
        sparse: true // Allows existing users to have null until migration
    },
    fullName: {
        type: String,
        default: null,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    invitationCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    referredBy: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 5
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    interestIncome: {
        type: Number,
        default: 0
    },
    teamIncome: {
        type: Number,
        default: 0
    },
    teamEarnings: {
        type: Number,
        default: 0
    },
    bonusIncome: {
        type: Number,
        default: 0
    },
    investments: [userInvestmentSchema],
    profileImage: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    transactionPin: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    vipLevel: {
        type: Number,
        default: 0
    },
    redeemableBalance: {
        type: Number,
        default: 0
    },
    isTeamMember: {
        type: Boolean,
        default: false
    },
    withdrawalBlockMessage: {
        type: String,
        default: null
    },
    claimedStarRewards: {
        type: [String],
        default: []
    },
    starPoints: {
        type: Number,
        default: 0
    },
    starMissionStart: {
        type: Date,
        default: null
    },
    // 💎 Diamond Salary System
    claimedSalaryLevels: {
        type: [String],
        default: []
    },
    // 📅 Tracks monthly mission start per level (to calculate 28-30% working ratio)
    salaryMissions: {
        type: [{
            levelId: { type: String, required: true },
            missionStart: { type: Date, required: true },
            missionEnd: { type: Date, required: true }
        }],
        default: []
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Generate unique invitation code
userSchema.statics.generateInvitationCode = async function () {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let exists = true;

    while (exists) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        exists = await this.findOne({ invitationCode: code });
    }

    return code;
};

const User = mongoose.model('User', userSchema);

export default User;
