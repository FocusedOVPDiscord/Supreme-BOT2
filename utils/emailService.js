const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-app-password';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Supreme MM <noreply@suprememm.com>';

// Create transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            }
        });
    }
    return transporter;
}

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code email
async function sendVerificationEmail(email, code, purpose = 'login') {
    try {
        const transporter = getTransporter();
        
        const subject = purpose === 'login' 
            ? 'Supreme MM - Login Verification Code'
            : 'Supreme MM - Email Verification Code';
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Supreme MM</h1>
                        <p>Verification Code</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Your verification code is:</p>
                        <div class="code">${code}</div>
                        <p>This code will expire in <strong>10 minutes</strong>.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Supreme MM. All rights reserved.</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject,
            html
        });

        return true;
    } catch (error) {
        console.error('Failed to send verification email:', error);
        return false;
    }
}

// Verify email service is configured
function isEmailServiceConfigured() {
    return EMAIL_USER !== 'your-email@gmail.com' && EMAIL_PASS !== 'your-app-password';
}

module.exports = {
    sendVerificationEmail,
    generateVerificationCode,
    isEmailServiceConfigured
};
