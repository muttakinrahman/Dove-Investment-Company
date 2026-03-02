import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_created',
            'user_updated',
            'user_deleted',
            'balance_adjusted',
            'vip_level_changed',
            'deposit_approved',
            'deposit_rejected',
            'withdrawal_approved',
            'withdrawal_rejected',
            'package_created',
            'package_updated',
            'package_deleted',
            'settings_updated',
            'banner_created',
            'banner_updated',
            'banner_deleted',
            'impersonate_user'
        ]
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    targetResource: {
        resourceType: {
            type: String,
            enum: ['user', 'deposit', 'withdrawal', 'package', 'banner', 'settings'],
            default: null
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        }
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    description: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for querying
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ action: 1 });
adminLogSchema.index({ createdAt: -1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

export default AdminLog;
