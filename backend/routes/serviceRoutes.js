// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const { createServiceRequest, getAllServiceRequests, getServiceRequestById, trackServiceRequest, updateServiceRequest, getServiceStats } = require('../controllers/serviceController');
const { protect } = require('../middleware/auth');

router.post('/', createServiceRequest);   // Public - customers submit requests
router.get('/track/:ticketNumber', trackServiceRequest); // Public ticket tracking
router.get('/', protect, getAllServiceRequests);
router.get('/stats/overview', protect, getServiceStats);
router.get('/:id', protect, getServiceRequestById);
router.patch('/:id', protect, updateServiceRequest);

module.exports = router;
