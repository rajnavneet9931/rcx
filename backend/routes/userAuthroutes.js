// routes/userAuthRoutes.js
const express    = require('express');
const router     = express.Router();
const userAuth   = require('../middleware/userAuth');
const {
  sendOTP, verifyOTP, googleLogin, getMe,
} = require('../controllers/userAuthController');

router.post('/send-otp',     sendOTP);
router.post('/verify-otp',   verifyOTP);
router.post('/google-login', googleLogin);
router.get('/me',            userAuth, getMe);

module.exports = router;