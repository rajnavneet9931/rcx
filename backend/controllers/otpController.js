// controllers/otpController.js
// Email OTP system using Nodemailer + Gmail
// No paid service required — just a Gmail account with App Password enabled

const nodemailer = require('nodemailer');

// ─── OTP Store (in-memory) ────────────────────────────────────────────────────
// Key: email  →  Value: { code, verified, expiresAt, attempts }
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
          Use the OTP below to verify your email and complete your order on Jeecom Information Technology.
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

// ─── Route: POST /api/otp/send ────────────────────────────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email address is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });

    // Already verified? skip resend
    const existing = otpStore.get(email);
    if (existing && existing.verified && Date.now() < existing.expiresAt) {
      return res.status(200).json({ success: true, message: 'Email already verified.' });
    }

    const otp = generateOTP();
    otpStore.set(email, { code: otp, verified: false, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

    await transporter.sendMail({
      from: `"Jeecom Information Technology" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${otp} — Your Jeecom IT Order OTP`,
      html: buildOtpEmail(otp, name),
    });

    console.log(`✅ OTP email sent → ${email}`);
    res.status(200).json({ success: true, message: `OTP sent to ${email}. Check your inbox.` });

  } catch (err) {
    console.error('sendOTP error:', err.message);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return res.status(500).json({ success: false, message: 'Email not configured. Add GMAIL_USER and GMAIL_APP_PASS to your .env file.' });
    }
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.', error: err.message });
  }
};

// ─── Route: POST /api/otp/verify ─────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits.' });

    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }
    if (record.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ success: false, message: 'Too many wrong attempts. Request a new OTP.' });
    }
    if (record.code !== code) {
      record.attempts += 1;
      const left = 5 - record.attempts;
      return res.status(400).json({ success: false, message: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    // ✅ Correct
    otpStore.set(email, { ...record, verified: true, expiresAt: Date.now() + 15 * 60 * 1000 });
    res.status(200).json({ success: true, message: 'Email verified successfully!' });

  } catch (err) {
    console.error('verifyOTP error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed.', error: err.message });
  }
};

const isEmailVerified = (email) => {
  const r = otpStore.get(email);
  return !!(r && r.verified && Date.now() < r.expiresAt);
};

const clearVerification = (email) => otpStore.delete(email);

module.exports = { sendOTP, verifyOTP, isEmailVerified, clearVerification };