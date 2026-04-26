// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail, sendOrderStatusEmail, sendGSTInvoiceEmail } = require('../utils/emailService');

// @route POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { customer, items, paymentMethod, notes, requestGST, gstin } = req.body;

    if (!customer || !items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Customer info and items are required.' });

    if (!customer.email)
      return res.status(400).json({ success: false, message: 'Email is required to place an order.' });

    // OTP check removed — user is authenticated via login (JWT session)

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product)
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      if (product.quantity < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for "${product.name}". Available: ${product.quantity}` });

      totalAmount += product.price * item.quantity;
      validatedItems.push({ product: product._id, name: product.name, price: product.price, quantity: item.quantity });
    }

    // Attach GSTIN to customer info if they requested GST invoice
    if (requestGST && gstin) customer.gstin = gstin;

    const order = await Order.create({ customer, items: validatedItems, totalAmount, paymentMethod, notes });

    for (const item of validatedItems)
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });

    // Always send regular bill PDF with confirmation
    sendOrderConfirmationEmail(order);

    // Also send GST invoice immediately if customer requested it
    if (requestGST && gstin) {
      sendGSTInvoiceEmail(order);
    }

    res.status(201).json({ success: true, message: 'Order placed successfully!', order });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/orders
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product', 'name category image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: orders.length, total, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id, { status }, { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    sendOrderStatusEmail(order);
    res.status(200).json({ success: true, message: `Status updated to "${status}". Customer notified.`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route POST /api/orders/:id/gst-invoice  [Admin — send GST invoice on demand]
const sendGSTInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Allow admin to attach customer GSTIN if not already set
    if (req.body.gstin) {
      order.customer.gstin = req.body.gstin;
      await order.save();
    }

    await sendGSTInvoiceEmail(order);
    res.status(200).json({ success: true, message: `GST invoice sent to ${order.customer.email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.status(200).json({ success: true, message: `Order #${order.orderNumber} deleted.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/orders/stats/overview
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const statusCounts = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      stats: { totalOrders, totalRevenue: totalRevenue[0]?.total || 0, statusCounts, recentOrders }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus, sendGSTInvoice, deleteOrder, getOrderStats };