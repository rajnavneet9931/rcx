// models/Product.js - Product Schema
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Laptops', 'Motherboards', 'Accessories', 'Components', 'Networking', 'Storage'],
    default: 'Accessories'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  specs: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/400x300/1a1a2e/ffffff?text=Product'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for availability status
productSchema.virtual('availability').get(function () {
  if (this.quantity === 0) return 'Out of Stock';
  if (this.quantity <= 5) return 'Low Stock';
  return 'In Stock';
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
