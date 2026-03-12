import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter based on environment
const createTransporter = () => {
    // Using Gmail SMTP for now - admin can configure Brevo/SendGrid later
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

// Email templates with beautiful HTML design
const getEmailTemplate = (type, data) => {
    const baseStyle = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container { 
                max-width: 600px; 
                margin: 40px auto; 
                background: #ffffff; 
                border-radius: 16px; 
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 40px 30px; 
                text-align: center; 
                border-radius: 12px 12px 0 0;
            }
            .logo { 
                font-size: 32px; 
                font-weight: 700; 
                color: #ffffff; 
                margin: 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .tagline {
                color: rgba(255,255,255,0.9);
                font-size: 14px;
                margin-top: 8px;
            }
            .content { 
                padding: 40px 30px; 
            }
            .title { 
                font-size: 24px; 
                font-weight: 700; 
                color: #1a202c; 
                margin: 0 0 16px 0; 
            }
            .message { 
                color: #4a5568; 
                line-height: 1.6; 
                margin-bottom: 24px; 
            }
            .info-card { 
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                border-left: 4px solid #667eea;
                border-radius: 8px; 
                padding: 24px; 
                margin: 24px 0; 
            }
            .info-row { 
                display: flex; 
                justify-content: space-between; 
                margin: 12px 0; 
            }
            .info-label { 
                color: #718096; 
                font-weight: 600; 
                font-size: 14px;
            }
            .info-value { 
                color: #1a202c; 
                font-weight: 700; 
                font-size: 16px;
            }
            .amount-highlight { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-size: 32px; 
                font-weight: 700;
                text-align: center;
                margin: 20px 0;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .status-success { background: #c6f6d5; color: #22543d; }
            .status-pending { background: #feebc8; color: #7c2d12; }
            .status-info { background: #bee3f8; color: #2c5282; }
            .footer { 
                background: #f7fafc; 
                padding: 30px; 
                text-align: center; 
                border-top: 1px solid #e2e8f0;
            }
            .footer-text { 
                color: #718096; 
                font-size: 13px; 
                margin: 8px 0; 
            }
            .support-link {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #e2e8f0, transparent);
                margin: 24px 0;
            }
        </style>
    `;

    const templates = {
        withdrawalRequest: `
            ${baseStyle}
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="logo">🚀 Dove Investment Gold Mine</h1>
                        <p class="tagline">Your Trusted Investment Platform</p>
                    </div>
                    <div class="content">
                        <h2 class="title">Withdrawal Request Submitted</h2>
                        <p class="message">Hello <strong>${data.userName}</strong>,</p>
                        <p class="message">
                            Your withdrawal request has been received and is currently being processed by our team.
                        </p>
                        
                        <div class="amount-highlight">$${data.amount}</div>
                        
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Withdrawal Amount</span>
                                <span class="info-value">$${data.amount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Processing Fee (5%)</span>
                                <span class="info-value">$${data.fee}</span>
                            </div>
                            <div class="divider"></div>
                            <div class="info-row">
                                <span class="info-label">Total Deducted</span>
                                <span class="info-value">$${data.totalAmount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Payment Method</span>
                                <span class="info-value">${data.paymentMethod}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status</span>
                                <span class="status-badge status-pending">Pending Review</span>
                            </div>
                        </div>
                        
                        <p class="message">
                            Your request will be reviewed within 24 hours. You will receive a confirmation email once processed.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text"><strong>Dove Investment Gold Mine</strong></p>
                        <p class="footer-text">doveinvestment.cloud</p>
                        <p class="footer-text">Need help? <a href="https://doveinvestment.cloud" class="support-link">Contact Support</a></p>
                    </div>
                </div>
            </body>
        `,

        withdrawalApproved: `
            ${baseStyle}
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="logo">🚀 Dove Investment Gold Mine</h1>
                        <p class="tagline">Your Trusted Investment Platform</p>
                    </div>
                    <div class="content">
                        <h2 class="title">✅ Withdrawal Approved!</h2>
                        <p class="message">Hello <strong>${data.userName}</strong>,</p>
                        <p class="message">
                            Great news! Your withdrawal has been successfully processed and sent to your account.
                        </p>
                        
                        <div class="amount-highlight">$${data.amount}</div>
                        
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Withdrawal Amount</span>
                                <span class="info-value">$${data.amount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Processing Fee (5%)</span>
                                <span class="info-value">$${data.fee}</span>
                            </div>
                            <div class="divider"></div>
                            <div class="info-row">
                                <span class="info-label">Total Amount Sent</span>
                                <span class="info-value">$${data.totalAmount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Transaction ID</span>
                                <span class="info-value">${data.transactionId}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Payment Method</span>
                                <span class="info-value">${data.paymentMethod}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Processed At</span>
                                <span class="info-value">${data.processedAt}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status</span>
                                <span class="status-badge status-success">Completed</span>
                            </div>
                        </div>
                        
                        <p class="message">
                            The funds should appear in your account within 1-3 business days depending on your payment provider.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text"><strong>Dove Investment Gold Mine</strong></p>
                        <p class="footer-text">doveinvestment.cloud</p>
                        <p class="footer-text">Need help? <a href="https://doveinvestment.cloud" class="support-link">Contact Support</a></p>
                    </div>
                </div>
            </body>
        `,

        depositApproved: `
            ${baseStyle}
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="logo">🚀 Dove Investment Gold Mine</h1>
                        <p class="tagline">Your Trusted Investment Platform</p>
                    </div>
                    <div class="content">
                        <h2 class="title">✅ Deposit Confirmed!</h2>
                        <p class="message">Hello <strong>${data.userName}</strong>,</p>
                        <p class="message">
                            Your deposit has been successfully credited to your account. You can now start investing!
                        </p>
                        
                        <div class="amount-highlight">$${data.amount}</div>
                        
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Deposit Amount</span>
                                <span class="info-value">$${data.amount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">New Balance</span>
                                <span class="info-value">$${data.newBalance}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Transaction ID</span>
                                <span class="info-value">${data.transactionId || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date</span>
                                <span class="info-value">${data.processedAt}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status</span>
                                <span class="status-badge status-success">Confirmed</span>
                            </div>
                        </div>
                        
                        <p class="message">
                            Ready to grow your wealth? Explore our investment packages and start earning daily returns!
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text"><strong>Dove Investment Gold Mine</strong></p>
                        <p class="footer-text">doveinvestment.cloud</p>
                        <p class="footer-text">Need help? <a href="https://doveinvestment.cloud" class="support-link">Contact Support</a></p>
                    </div>
                </div>
            </body>
        `,
        depositReceived: `
            ${baseStyle}
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="logo">🚀 Dove Investment Gold Mine</h1>
                        <p class="tagline">Your Trusted Investment Platform</p>
                    </div>
                    <div class="content">
                        <h2 class="title">📩 Deposit Received</h2>
                        <p class="message">Hello <strong>${data.userName}</strong>,</p>
                        <p class="message">
                            We have received your deposit request. Our team is currently verifying the transaction.
                        </p>
                        
                        <div class="amount-highlight">$${data.amount}</div>
                        
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Amount</span>
                                <span class="info-value">$${data.amount}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Network</span>
                                <span class="info-value">${data.network}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status</span>
                                <span class="status-badge status-pending">Pending Review</span>
                            </div>
                        </div>
                        
                        <p class="message">
                            Verification usually takes 72-96 hours. You will receive another email once your balance is updated.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text"><strong>Dove Investment Gold Mine</strong></p>
                        <p class="footer-text">doveinvestment.cloud</p>
                        <p class="footer-text">Need help? <a href="https://doveinvestment.cloud" class="support-link">Contact Support</a></p>
                    </div>
                </div>
            </body>
        `,
        verificationCode: `
            ${baseStyle}
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="logo">🚀 Dove Investment Gold Mine</h1>
                        <p class="tagline">Your Trusted Investment Platform</p>
                    </div>
                    <div class="content">
                        <h2 class="title">Verify Your Email</h2>
                        <p class="message">Hello <strong>User</strong>,</p>
                        <p class="message">
                            Thank you for registering with Dove Investment! Please use the 6-digit verification code below to complete your registration.
                        </p>
                        
                        <div style="background: #f7fafc; padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #764ba2; font-family: monospace; border: 1px solid #e2e8f0;">
                            ${data.otpCode}
                        </div>
                        
                        <p class="message" style="text-align: center; font-size: 14px;">
                            This code will expire in 5 minutes. If you did not request this verification, please ignore this email.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text"><strong>Dove Investment Gold Mine</strong></p>
                        <p class="footer-text">doveinvestment.cloud</p>
                        <p class="footer-text">Need help? <a href="https://doveinvestment.cloud" class="support-link">Contact Support</a></p>
                    </div>
                </div>
            </body>
        `
    };

    return templates[type] || templates.withdrawalRequest;
};

// Send email function
export const sendEmail = async ({ to, subject, type, data }) => {
    try {
        // Validate SMTP configuration
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.warn('⚠️  SMTP not configured. Email would be sent to:', to);
            return { success: false, message: 'SMTP not configured' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'Dove'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html: getEmailTemplate(type, data)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return { success: false, error: error.message };
    }
};

// Specific email functions
export const sendWithdrawalRequestEmail = async (user, withdrawal) => {
    return sendEmail({
        to: user.email,
        subject: '🔔 Withdrawal Request Received - Dove Investment Gold Mine',
        type: 'withdrawalRequest',
        data: {
            userName: user.fullName || user.phone,
            amount: withdrawal.amount.toFixed(2),
            fee: withdrawal.fee.toFixed(2),
            totalAmount: withdrawal.totalAmount.toFixed(2),
            paymentMethod: withdrawal.paymentMethod || 'Bank Transfer'
        }
    });
};

export const sendWithdrawalApprovedEmail = async (user, withdrawal) => {
    return sendEmail({
        to: user.email,
        subject: '✅ Withdrawal Approved - Dove Investment Gold Mine',
        type: 'withdrawalApproved',
        data: {
            userName: user.fullName || user.phone,
            amount: withdrawal.amount.toFixed(2),
            fee: withdrawal.fee.toFixed(2),
            totalAmount: withdrawal.totalAmount.toFixed(2),
            transactionId: withdrawal.transactionId,
            paymentMethod: withdrawal.paymentMethod || 'Bank Transfer',
            processedAt: new Date(withdrawal.processedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
        }
    });
};

export const sendDepositApprovedEmail = async (user, deposit) => {
    return sendEmail({
        to: user.email,
        subject: '✅ Deposit Confirmed - Dove Investment Gold Mine',
        type: 'depositApproved',
        data: {
            userName: user.fullName || user.phone,
            amount: deposit.amount.toFixed(2),
            newBalance: user.balance.toFixed(2),
            transactionId: deposit.transactionId || deposit._id,
            processedAt: new Date(deposit.createdAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
        }
    });
};

export const sendDepositReceivedEmail = async (user, deposit) => {
    return sendEmail({
        to: user.email,
        subject: '📩 Deposit Received - Dove Investment Gold Mine',
        type: 'depositReceived',
        data: {
            userName: user.fullName || user.phone,
            amount: deposit.amount.toFixed(2),
            network: deposit.network
        }
    });
};

export const sendVerificationEmail = async (email, otpCode) => {
    try {
        // Validate SMTP configuration
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.warn('⚠️  SMTP not configured. Verification email would be sent to:', email);
            return false;
        }

        const transporter = createTransporter();
        const subject = 'Your Verification Code - Dove Investment Gold Mine';
        
        // Use consistent from field like sendEmail
        const from = `"${process.env.SMTP_FROM_NAME || 'Dove'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

        const info = await transporter.sendMail({
            from: from,
            to: email,
            subject: subject,
            html: getEmailTemplate('verificationCode', { otpCode })
        });

        console.log(`✅ Verification email sent successfully to ${email}. MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Verification email error:', error.message);
        return false;
    }
};

export default {
    sendEmail,
    sendWithdrawalRequestEmail,
    sendWithdrawalApprovedEmail,
    sendDepositApprovedEmail,
    sendDepositReceivedEmail,
    sendVerificationEmail
};
