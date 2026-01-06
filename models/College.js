const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'College name is required'],
    trim: true
  },
  departments: [{
    type: String,
    trim: true
  }],
  souAmbassadorName: {
    type: String,
    required: [true, 'SOU Ambassador name is required'],
    trim: true
  },
  souAmbassadorContact: {
    type: String,
    required: [true, 'SOU Ambassador contact is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit contact number']
  },
  numberOfBuses: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('College', collegeSchema);
