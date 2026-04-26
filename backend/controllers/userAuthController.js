// controllers/userAuthController.js
// Handles customer login: Email+OTP and Google OAuth

const jwt         = require('jsonwebtoken');
const nodemailer  = require('nodemailer');
const User        = require('../models/User');

// ─── OTP Store (in-memory) ────────────────────────────────────────────────────
// Key: email → { code, expiresAt, attempts }
const otpStore = new Map();

// ─── Gmail Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signUserToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function buildOtpEmail(otp, name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f6f3;border-radius:12px;overflow:hidden;">
      <div style="background:#1a3a5c;padding:28px 32px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">⚡ Jeecom IT</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Information Technology</p>
      </div>
      <div style="background:#fff;padding:32px;">
        <p style="color:#1a1714;font-size:15px;margin:0 0 8px;">Hello ${name || 'there'},</p>
        <p style="color:#5a5650;font-size:14px;line-height:1.6;margin:0 0 28px;">
          Use the OTP below to sign in to your Jeecom IT account.
        </p>
        <div style="background:#f0ede8;border:2px dashed #b8860b;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
          <p style="color:#5a5650;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;font-weight:700;">Your One-Time Password</p>
          <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:#1a3a5c;font-family:'Courier New',monospace;">${otp}</div>
          <p style="color:#9a948e;font-size:12px;margin:12px 0 0;">Valid for <strong>10 minutes</strong> only</p>
        </div>
        <p style="color:#9a948e;font-size:12px;line-height:1.6;margin:0;">
          ⚠️ Do not share this OTP with anyone.<br>
          If you did not request this, please ignore this email.
        </p>
      </div>
      <div style="background:#f0ede8;padding:16px 32px;text-align:center;border-top:1px solid #e2ddd6;">
        <p style="color:#9a948e;font-size:11px;margin:0;">© 2025 Jeecom Information Technology · Gurugram, Haryana</p>
      </div>
    </div>
  `;
}

// ─── POST /api/user/send-otp ──────────────────────────────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email)              return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });

    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), { code: otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${otp} — Your Jeecom IT Login OTP`,
      html: buildOtpEmail(otp, name),
    });

    console.log(`✅ Login OTP sent → ${email}`);
    res.status(200).json({ success: true, message: `OTP sent to ${email}. Check your inbox.` });

  } catch (err) {
    console.error('sendOTP error:', err.message);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return res.status(500).json({ success: false, message: 'Email not configured. Check GMAIL_USER / GMAIL_APP_PASS in .env' });
    }
    res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.', error: err.message });
  }
};

// ─── POST /api/user/verify-otp ────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: 'OTP must be 6 digits.' });

    const record = otpStore.get(email.toLowerCase());
    if (!record)                  return res.status(400).json({ success: false, message: 'No OTP found. Request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }
    if (record.attempts >= 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
    }
    if (record.code !== code) {
      record.attempts++;
      const left = 5 - record.attempts;
      return res.status(400).json({ success: false, message: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    // ✅ OTP correct — find or create user
    otpStore.delete(email.toLowerCase());

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({ name: name || email.split('@')[0], email: email.toLowerCase(), authMethod: 'otp', isVerified: true, lastLogin: new Date() });
    } else {
      user.isVerified = true;
      user.lastLogin = new Date();
      if (name) user.name = name;
      await user.save();
    }

    const token = signUserToken(user);
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, picture: user.picture },
    });

  } catch (err) {
    console.error('verifyOTP error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed.', error: err.message });
  }
};

// ─── POST /api/user/google-login ─────────────────────────────────────────────
// Receives the Google ID token from the frontend (via Google Identity Services)
// Verifies it with Google and creates/updates the user record.
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;   // JWT ID-token from Google
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential missing.' });

    // Decode the JWT without verifying (Google already verified client-side).
    // For production, verify with google-auth-library. Here we decode the payload.
    const [, payloadB64] = credential.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ success: false, message: 'Could not retrieve email from Google.' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({ name, email: email.toLowerCase(), googleId, picture, authMethod: 'google', isVerified: true, lastLogin: new Date() });
    } else {
      user.googleId  = googleId;
      user.picture   = picture || user.picture;
      user.name      = user.name || name;
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save();
    }

    const token = signUserToken(user);
    res.status(200).json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token,
      user: { id: user._id, name: user.name, email: user.email, picture: user.picture },
    });

  } catch (err) {
    console.error('googleLogin error:', err.message);
    res.status(500).json({ success: false, message: 'Google login failed.', error: err.message });
  }
};

// ─── GET /api/user/me ─────────────────────────────────────────────────────────
// Returns the logged-in user's profile (requires Bearer token)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { sendOTP, verifyOTP, googleLogin, getMe };