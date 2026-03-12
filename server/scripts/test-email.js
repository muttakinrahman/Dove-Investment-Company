import { sendVerificationEmail } from '../services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testRegistrationEmail() {
    const testEmail = process.argv[2] || process.env.SMTP_USER;
    
    if (!testEmail) {
        console.error('❌ Error: Please provide an email address as an argument or set SMTP_USER in .env');
        console.log('Usage: node test-email.js example@gmail.com');
        process.exit(1);
    }

    console.log(`\n📧 Testing Registration (OTP) Email...`);
    console.log(`--------------------------------------`);
    console.log(`From Name:  ${process.env.SMTP_FROM_NAME || 'NovaEarn'}`);
    console.log(`From Email: ${process.env.SMTP_FROM_EMAIL || 'Not Set'}`);
    console.log(`To:         ${testEmail}`);
    console.log(`--------------------------------------\n`);

    try {
        const success = await sendVerificationEmail(testEmail, '123456');
        
        if (success) {
            console.log('\n✅ TEST SUCCESSFUL!');
            console.log('Please check your inbox (and spam folder) for the verification code.');
        } else {
            console.error('\n❌ TEST FAILED!');
            console.log('Check the console errors above for the reason.');
        }
    } catch (error) {
        console.error('\n❌ UNEXPECTED ERROR:');
        console.error(error);
    }
}

testRegistrationEmail();
