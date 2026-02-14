const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');
const { sendVerificationEmail, generateVerificationCode, isEmailServiceConfigured } = require('../utils/emailService');

// Staff role IDs for verification
const STAFF_ROLE_IDS = [
    '1354402446994309123', // Founder
    '1410661468688482314', // Moderator
    '1457664338163667072', // Senior Middleman
    '1470227366692392960', // Trainee Middleman
    '1467922047148625920'  // Trusted
];

// Add email to user account (requires Discord login first)
router.post('/add-email', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (!isEmailServiceConfigured()) {
            return res.status(500).json({ error: 'Email service not configured' });
        }

        // Check if email already exists
        const existing = await query('SELECT * FROM user_emails WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate verification code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Save to database
        await query(
            `INSERT INTO user_emails (discord_id, email, verified, verification_code, code_expires_at, created_at, updated_at)
             VALUES (?, ?, FALSE, ?, ?, ?, ?)`,
            [req.session.user.id, email, code, expiresAt, Date.now(), Date.now()]
        );

        // Send verification email
        const sent = await sendVerificationEmail(email, code, 'verify');
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({ success: true, message: 'Verification code sent to email' });

    } catch (error) {
        console.error('Error adding email:', error);
        res.status(500).json({ error: 'Failed to add email' });
    }
});

// Verify email with code
router.post('/verify-email', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Verification code required' });
        }

        // Find email entry
        const result = await query(
            'SELECT * FROM user_emails WHERE discord_id = ? AND verification_code = ? AND verified = FALSE',
            [req.session.user.id, code]
        );

        if (result.length === 0) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const emailEntry = result[0];

        // Check if code expired
        if (Date.now() > emailEntry.code_expires_at) {
            return res.status(400).json({ error: 'Verification code expired' });
        }

        // Mark as verified
        await query(
            'UPDATE user_emails SET verified = TRUE, verification_code = NULL, code_expires_at = NULL, updated_at = ? WHERE id = ?',
            [Date.now(), emailEntry.id]
        );

        res.json({ success: true, message: 'Email verified successfully' });

    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Request login code via email
router.post('/request-login-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (!isEmailServiceConfigured()) {
            return res.status(500).json({ error: 'Email service not configured' });
        }

        // Check if email is registered and verified
        const result = await query('SELECT * FROM user_emails WHERE email = ? AND verified = TRUE', [email]);
        if (result.length === 0) {
            return res.status(404).json({ error: 'Email not found or not verified' });
        }

        // Generate verification code
        const code = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Clean up old login sessions for this email
        await query('DELETE FROM email_login_sessions WHERE email = ?', [email]);

        // Create new login session
        await query(
            'INSERT INTO email_login_sessions (email, verification_code, code_expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)',
            [email, code, expiresAt, Date.now()]
        );

        // Send verification email
        const sent = await sendVerificationEmail(email, code, 'login');
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        res.json({ success: true, message: 'Verification code sent to email' });

    } catch (error) {
        console.error('Error requesting login code:', error);
        res.status(500).json({ error: 'Failed to request login code' });
    }
});

// Verify login code and authenticate
router.post('/verify-login-code', async (req, res) => {
    try {
        const { email, code, rememberMe } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }

        // Find login session
        const sessions = await query(
            'SELECT * FROM email_login_sessions WHERE email = ? AND verification_code = ?',
            [email, code]
        );

        if (sessions.length === 0) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const session = sessions[0];

        // Check if code expired
        if (Date.now() > session.code_expires_at) {
            await query('DELETE FROM email_login_sessions WHERE id = ?', [session.id]);
            return res.status(400).json({ error: 'Verification code expired' });
        }

        // Check attempts
        if (session.attempts >= 5) {
            await query('DELETE FROM email_login_sessions WHERE id = ?', [session.id]);
            return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
        }

        // Increment attempts
        await query('UPDATE email_login_sessions SET attempts = attempts + 1 WHERE id = ?', [session.id]);

        // Get user info from email
        const userEmails = await query('SELECT * FROM user_emails WHERE email = ? AND verified = TRUE', [email]);
        if (userEmails.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userEmails[0];
        const client = req.app.get('client');

        if (!client) {
            return res.status(500).json({ error: 'Bot client not available' });
        }

        // Fetch Discord user
        const discordUser = await client.users.fetch(userEmail.discord_id).catch(() => null);
        if (!discordUser) {
            return res.status(404).json({ error: 'Discord user not found' });
        }

        // Check if user is staff in any guild
        let isStaff = false;
        for (const guild of client.guilds.cache.values()) {
            const member = await guild.members.fetch(discordUser.id).catch(() => null);
            if (member) {
                const userRoles = member.roles.cache.map(role => role.id);
                if (userRoles.some(roleId => STAFF_ROLE_IDS.includes(roleId))) {
                    isStaff = true;
                    break;
                }
            }
        }

        if (!isStaff) {
            return res.status(403).json({ error: 'Access denied: Staff only' });
        }

        // Set session
        req.session.user = {
            id: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator,
            avatar: discordUser.avatar,
            email: email
        };

        // Set cookie expiration based on rememberMe
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
        }

        // Clean up login session
        await query('DELETE FROM email_login_sessions WHERE id = ?', [session.id]);

        res.json({ success: true, user: req.session.user });

    } catch (error) {
        console.error('Error verifying login code:', error);
        res.status(500).json({ error: 'Failed to verify login code' });
    }
});

// Get user's registered email
router.get('/my-email', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const result = await query('SELECT email, verified FROM user_emails WHERE discord_id = ?', [req.session.user.id]);
        
        if (result.length === 0) {
            return res.json({ email: null, verified: false });
        }

        res.json({ email: result[0].email, verified: result[0].verified });

    } catch (error) {
        console.error('Error fetching email:', error);
        res.status(500).json({ error: 'Failed to fetch email' });
    }
});

// Remove email from account
router.delete('/remove-email', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        await query('DELETE FROM user_emails WHERE discord_id = ?', [req.session.user.id]);
        res.json({ success: true, message: 'Email removed successfully' });

    } catch (error) {
        console.error('Error removing email:', error);
        res.status(500).json({ error: 'Failed to remove email' });
    }
});

module.exports = router;
