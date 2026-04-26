// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');

// POST /api/payment/create-order  → Step 1: create Razorpay order
// POST /api/payment/verify        → Step 2: verify signature + save order
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;