const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendOTP, verifyOTP } = require('../controllers/otpController');

// Max 3 OTP sends per email per 10 minutes
const sendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body.email || req.ip,
  message: { success: false, message: 'Too many OTP requests. Wait 10 minutes and try again.' }
});

// Max 5 verify attempts per email per 10 minutes
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.email || req.ip,
  message: { success: false, message: 'Too many verification attempts. Please wait.' }
});

router.post('/send', sendLimiter, sendOTP);
router.post('/verify', verifyLimiter, verifyOTP);

module.exports = router;