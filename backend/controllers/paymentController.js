// controllers/paymentController.js
// Razorpay Payment Gateway — Create Order + Verify Payment
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail } = require('../utils/emailService');

// Initialize Razorpay with your keys from .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP A: Create Razorpay Order
// Called when customer clicks "Pay Now"
// Backend creates the order and returns order_id to frontend
// @route  POST /api/payment/create-order
// ─────────────────────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { amount, cartItems, customerInfo } = req.body;

    // 1. Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (!customerInfo?.email) {
      return res.status(400).json({ success: false, message: 'Customer email is required.' });
    }

    // 2. Check stock availability before creating payment
    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.quantity} left.`,
        });
      }
    }

    // 4. Create Razorpay order
    // IMPORTANT: Razorpay amount is in PAISE (1 rupee = 100 paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // ₹85,000 → 8500000 paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        customerName: customerInfo.name || '',
        customerEmail: customerInfo.email || '',
      },
    });

    console.log(`✅ Razorpay order created: ${razorpayOrder.id} | ₹${amount}`);

    // 5. Return order details + key to frontend
    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,     // in paise
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // safe to send — this is public key
    });

  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Could not create payment order.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP B: Verify Payment & Save Order
// Called after Razorpay popup succeeds
// Verifies the cryptographic signature to prevent fraud
// @route  POST /api/payment/verify
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      cartItems,
    } = req.body;

    // 1. Verify signature using HMAC SHA256
    // Razorpay signs: order_id + "|" + payment_id with your key_secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Signature mismatch — possible fraud attempt');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    // 3. Validate stock one more time and build order items
    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock issue: "${product?.name || item.product}" has insufficient quantity.`,
        });
      }
      calculatedTotal += product.price * item.quantity;
      validatedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    // 4. Save order to MongoDB
    const order = await Order.create({
      customer,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod: 'Razorpay',
      status: 'Confirmed',
      notes: `Razorpay Payment ID: ${razorpay_payment_id} | Order ID: ${razorpay_order_id}`,
    });

    // 5. Deduct stock for each purchased item
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }

    // 6. Send order confirmation email with payment ID (non-blocking)
    sendOrderConfirmationEmail(order, razorpay_payment_id);

    console.log(`✅ Order saved: ${order.orderNumber} | Payment: ${razorpay_payment_id}`);

    res.status(200).json({
      success: true,
      message: 'Payment successful! Your order has been placed.',
      orderNumber: order.orderNumber,
      orderId: order._id,
      paymentId: razorpay_payment_id,
    });

  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed.', error: err.message });
  }
};

module.exports = { createOrder, verifyPayment };