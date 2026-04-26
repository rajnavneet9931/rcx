// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  sendGSTInvoice,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.post('/',                   createOrder);               // Public — customers place orders
router.get('/',                    protect, getAllOrders);
router.get('/stats/overview',      protect, getOrderStats);
router.get('/:id',                 protect, getOrderById);
router.patch('/:id/status',        protect, updateOrderStatus);
router.delete('/:id',              protect, deleteOrder);
router.post('/:id/gst-invoice',    protect, sendGSTInvoice);   // Admin sends GST invoice

module.exports = router;