// controllers/serviceController.js
const ServiceRequest = require('../models/ServiceRequest');
const { sendServiceStatusEmail } = require('../utils/emailService');

// @route POST /api/services — customer submits request
const createServiceRequest = async (req, res) => {
  try {
    const serviceReq = await ServiceRequest.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully!',
      ticketNumber: serviceReq.ticketNumber,
      serviceRequest: serviceReq
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/services
const getAllServiceRequests = async (req, res) => {
  try {
    const { status, serviceType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await ServiceRequest.countDocuments(query);
    const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    res.status(200).json({ success: true, count: requests.length, total, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/services/:id
const getServiceRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });
    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/services/track/:ticketNumber — public
const trackServiceRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({ ticketNumber: req.params.ticketNumber });
    if (!request) return res.status(404).json({ success: false, message: 'Ticket not found. Please check your ticket number.' });
    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route PATCH /api/services/:id — Admin updates status or cost → triggers email
const updateServiceRequest = async (req, res) => {
  try {
    const updates = req.body;
    const previousRequest = await ServiceRequest.findById(req.params.id);
    if (!previousRequest) return res.status(404).json({ success: false, message: 'Service request not found' });

    if (updates.status === 'Completed') updates.completedAt = new Date();

    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Decide whether to send email:
    // Send if status changed OR if estimatedCost was newly set / changed
    const statusChanged = updates.status && updates.status !== previousRequest.status;
    const costChanged = updates.estimatedCost !== undefined
      && updates.estimatedCost !== previousRequest.estimatedCost
      && updates.estimatedCost > 0;

    if (statusChanged || costChanged) {
      sendServiceStatusEmail(updatedRequest);
    }

    const notifyMsg = (statusChanged || costChanged)
      ? 'Service request updated. Customer has been notified by email.'
      : 'Service request updated.';

    res.status(200).json({ success: true, message: notifyMsg, request: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @route GET /api/services/stats/overview
const getServiceStats = async (req, res) => {
  try {
    const total = await ServiceRequest.countDocuments();
    const statusCounts = await ServiceRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const typeCounts = await ServiceRequest.aggregate([{ $group: { _id: '$serviceType', count: { $sum: 1 } } }]);
    const pending = await ServiceRequest.countDocuments({ status: { $in: ['Received', 'Diagnosing', 'In Progress'] } });

    res.status(200).json({ success: true, stats: { total, pending, statusCounts, typeCounts } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createServiceRequest,
  getAllServiceRequests,
  getServiceRequestById,
  trackServiceRequest,
  updateServiceRequest,
  getServiceStats
};