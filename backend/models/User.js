// models/User.js - Customer User Schema
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:         { type: String, trim: true },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  googleId:     { type: String, default: null },   // set when logged in via Google OAuth
  picture:      { type: String, default: null },   // Google profile picture URL
  authMethod:   { type: String, enum: ['otp', 'google'], default: 'otp' },
  isVerified:   { type: Boolean, default: false },
  lastLogin:    { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);