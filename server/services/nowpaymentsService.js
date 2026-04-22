import axios from 'axios';
import crypto from 'crypto';

const API_KEY  = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const BASE_URL = 'https://api.nowpayments.io/v1';

// Network → NowPayments currency code
const CURRENCY_MAP = {
    TRC20: 'usdttrc20',
    BSC:   'usdtbsc',
    ETH:   'usdterc20',
    BTC:   'btc',
};

const headers = () => ({
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
});

/* ── GET /status ── */
export const checkApiStatus = async () => {
    try {
        const r = await axios.get(`${BASE_URL}/status`, { headers: headers() });
        return r.data?.message === 'OK';
    } catch { return false; }
};

/* ── POST /payment ── */
export const createPayment = async ({ amount, network, orderId, orderDescription }) => {
    const pay_currency = CURRENCY_MAP[network] || 'usdtbsc';

    const body = {
        price_amount:     parseFloat(amount),
        price_currency:   pay_currency,   // same as pay_currency → no conversion, exact amount
        pay_currency,
        order_id:         String(orderId),
        order_description: orderDescription || `Deposit ${amount} USDT`,
        ipn_callback_url:  `${process.env.SERVER_URL || 'https://doveinvestment.cloud'}/api/recharge/nowpayments/webhook`,
        is_fixed_rate:     true,
        is_fee_paid_by_user: false,
    };

    console.log('[NowPayments] POST /payment →', body);

    const r = await axios.post(`${BASE_URL}/payment`, body, { headers: headers() });

    console.log('[NowPayments] Response ←', r.data);
    return r.data;
};

/* ── GET /payment/:id ── */
export const getPaymentStatus = async (paymentId) => {
    const r = await axios.get(`${BASE_URL}/payment/${paymentId}`, { headers: headers() });
    return r.data;
};

/* ── IPN Signature Verification ──
   From API docs (Node.js example):
   JSON.stringify(sortObject(params))
   hmac-sha512 with IPN secret key
*/
function sortObject(obj) {
    return Object.keys(obj).sort().reduce((result, key) => {
        result[key] = (obj[key] && typeof obj[key] === 'object') ? sortObject(obj[key]) : obj[key];
        return result;
    }, {});
}

export const verifyIpnSignature = (rawBody, receivedSig) => {
    try {
        if (!IPN_SECRET) {
            console.warn('[IPN] IPN_SECRET not configured — skipping verification');
            return true; // allow in dev if no secret
        }

        // Parse body if it's a Buffer
        const params = Buffer.isBuffer(rawBody)
            ? JSON.parse(rawBody.toString('utf8'))
            : (typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody);

        // API docs: JSON.stringify(sortObject(params))
        const sorted   = sortObject(params);
        const str      = JSON.stringify(sorted);

        const hmac = crypto.createHmac('sha512', IPN_SECRET);
        hmac.update(str);
        const computed = hmac.digest('hex');

        console.log('[IPN] computed sig:', computed.substring(0, 16) + '...');
        console.log('[IPN] received sig:', receivedSig?.substring(0, 16) + '...');

        return computed === receivedSig;
    } catch (err) {
        console.error('[IPN] Signature error:', err.message);
        return false;
    }
};

// Statuses that mean payment is complete
export const CONFIRMED_STATUSES = ['finished', 'confirmed', 'complete', 'partially_paid'];
