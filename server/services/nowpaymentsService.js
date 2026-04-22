import crypto from 'crypto';

const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const BASE_URL = process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';

// Map our network IDs to NowPayments currency codes
const NETWORK_CURRENCY_MAP = {
    TRC20: 'usdttrc20',
    BSC: 'usdtbsc',
    ETH: 'usdterc20',
    BTC: 'btc',
};

/**
 * Create a NowPayments payment order
 * @param {Object} params
 * @param {number} params.amount - USDT amount
 * @param {string} params.network - TRC20 | BSC | ETH | BTC
 * @param {string} params.orderId - Our internal deposit ID
 * @param {string} params.orderDescription - Human-readable label
 */
export const createPayment = async ({ amount, network, orderId, orderDescription }) => {
    const currency = NETWORK_CURRENCY_MAP[network] || 'usdttrc20';

    const payload = {
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: currency,
        order_id: orderId,
        order_description: orderDescription || `Deposit ${amount} USDT`,
        ipn_callback_url: `${process.env.SERVER_URL || ''}/api/recharge/nowpayments/webhook`,
        is_fixed_rate: false,
        is_fee_paid_by_user: false,
    };

    const response = await fetch(`${BASE_URL}/payment`, {
        method: 'POST',
        headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'NowPayments API error');
    }

    return await response.json();
};

/**
 * Get payment status from NowPayments
 * @param {string} paymentId - NowPayments payment_id
 */
export const getPaymentStatus = async (paymentId) => {
    const response = await fetch(`${BASE_URL}/payment/${paymentId}`, {
        headers: { 'x-api-key': API_KEY },
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'NowPayments status check error');
    }

    return await response.json();
};

/**
 * Verify IPN signature from NowPayments webhook
 * NowPayments sends HMAC-SHA512 of sorted JSON body with IPN secret
 * @param {Object|Buffer} body - Raw request body (Buffer or parsed JSON)
 * @param {string} receivedSig - Value of x-nowpayments-sig header
 */
export const verifyIpnSignature = (body, receivedSig) => {
    try {
        let stringified;
        if (Buffer.isBuffer(body)) {
            // If body is raw Buffer, parse → sort → re-stringify
            const parsed = JSON.parse(body.toString('utf8'));
            stringified = JSON.stringify(sortObjectKeys(parsed));
        } else {
            // Already parsed JSON object
            stringified = JSON.stringify(sortObjectKeys(body));
        }

        const hmac = crypto.createHmac('sha512', IPN_SECRET);
        hmac.update(stringified);
        const computedSig = hmac.digest('hex');

        return computedSig === receivedSig;
    } catch (err) {
        console.error('[NowPayments] Signature verification error:', err.message);
        return false;
    }
};


/**
 * Recursively sort object keys alphabetically (needed for IPN verification)
 */
function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }
    return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
            acc[key] = sortObjectKeys(obj[key]);
            return acc;
        }, {});
}

/**
 * NowPayments payment statuses that mean "fully paid"
 */
export const CONFIRMED_STATUSES = ['finished', 'confirmed', 'complete'];

/**
 * Check API health
 */
export const checkApiStatus = async () => {
    try {
        const res = await fetch(`${BASE_URL}/status`, {
            headers: { 'x-api-key': API_KEY },
        });
        const data = await res.json();
        return data.message === 'OK';
    } catch {
        return false;
    }
};
