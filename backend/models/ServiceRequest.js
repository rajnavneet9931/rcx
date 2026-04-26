// models/ServiceRequest.js - Service Request Schema
const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  customer: {
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['Repair', 'Exchange', 'Maintenance', 'Installation', 'Consultation']
  },
  deviceInfo: {
    type: { type: String, trim: true },  // Laptop, Desktop, etc.
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, trim: true }
  },
  issueDescription: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Received', 'Diagnosing', 'In Progress', 'Waiting for Parts', 'Ready for Pickup', 'Completed', 'Cancelled'],
    default: 'Received'
  },
  estimatedCost: { type: Number, default: 0 },
  adminNotes: { type: String },
  completedAt: { type: Date }
}, {
  timestamps: true
});

serviceRequestSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('ServiceRequest').countDocuments();
    this.ticketNumber = `SVC-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
