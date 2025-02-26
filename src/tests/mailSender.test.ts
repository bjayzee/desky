import dotenv from 'dotenv';
import { sendEmail } from '../utils/mailSender';

// Load environment variables from .env file
dotenv.config();

async function testEmailSender() {
    try {
        console.log('EMAIL_USER:', process.env.EMAIL_USER); // Log to check if it's loaded
        console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD); // Log to check if it's loaded

        await sendEmail(
            'shivambhandari@gmail.com',
            'Test Email',
            'This is a test email from the application.'
        );
        console.log('Test email sent successfully');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testEmailSender();