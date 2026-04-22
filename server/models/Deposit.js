import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        unique: true,
        sparse: true   // allow null for auto-payment (hash set after confirmation)
    },
    network: {
        type: String,
        required: true
    },
    packageId: {
        type: String,
        default: null
    },
    packageName: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'waiting', 'confirming', 'expired'],
        default: 'pending'
    },
    // Payment method: 'manual' (user submits TxHash) or 'auto' (NowPayments)
    paymentMethod: {
        type: String,
        enum: ['manual', 'auto'],
        default: 'manual'
    },
    // NowPayments auto-payment fields
    nowpaymentsId: {
        type: String,
        default: null
    },
    nowpaymentsStatus: {
        type: String,
        default: null
    },
    payAddress: {
        type: String,
        default: null
    },
    payCurrency: {
        type: String,
        default: null
    },
    payAmount: {
        type: Number,
        default: null
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

const Deposit = mongoose.model('Deposit', depositSchema);

export default Deposit;

