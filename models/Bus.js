const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
    },
    busName: {
      type: String,
      required: [true, 'Bus name is required'],
      trim: true,
    },
    busNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    capacity: {
      type: Number,
      default: 50,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100, 'Capacity cannot exceed 100'],
    },
    bookedSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableSeats: {
      type: Number,
      default: function() {
        return this.capacity;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== VIRTUALS ====================

// Check if bus is full
busSchema.virtual('isFull').get(function() {
  return this.bookedSeats >= this.capacity;
});

// Get occupancy percentage
busSchema.virtual('occupancyPercentage').get(function() {
  return ((this.bookedSeats / this.capacity) * 100).toFixed(2);
});

// ==================== PRE-SAVE MIDDLEWARE ====================

// Calculate available seats before saving
busSchema.pre('save', function (next) {
  this.availableSeats = this.capacity - this.bookedSeats;
  
  // ✅ Ensure bookedSeats doesn't exceed capacity
  if (this.bookedSeats > this.capacity) {
    this.bookedSeats = this.capacity;
    this.availableSeats = 0;
  }
  
  // ✅ Ensure bookedSeats is not negative
  if (this.bookedSeats < 0) {
    this.bookedSeats = 0;
    this.availableSeats = this.capacity;
  }
  
  next();
});

// ==================== PRE-DELETE MIDDLEWARE ====================

// ✅ Remove bus from all users before deletion
busSchema.pre('findOneAndDelete', async function(next) {
  try {
    const bus = await this.model.findOne(this.getQuery());
    
    if (bus) {
      const User = require('./User');
      const usersWithThisBus = await User.find({ selectedBus: bus._id });
      
      if (usersWithThisBus.length > 0) {
        console.log(`\n🔧 [Bus Middleware] Removing bus "${bus.busName}" from ${usersWithThisBus.length} users...`);
        
        // ✅ Batch update all users at once
        await User.updateMany(
          { selectedBus: bus._id },
          { 
            $set: { 
              selectedBus: null,
              seatNumber: null,
              busSelectedAt: null
            }
          }
        );
        
        console.log(`✅ [Bus Middleware] Bus removed from ${usersWithThisBus.length} users successfully!`);
      } else {
        console.log(`ℹ️  [Bus Middleware] No users found with bus "${bus.busName}"`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [Bus Middleware] Error removing bus from users:', error.message);
    // Continue with delete even if update fails
    next();
  }
});

// ✅ Remove bus from all users (for deleteOne method)
busSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    if (this._id) {
      const User = require('./User');
      const usersWithThisBus = await User.find({ selectedBus: this._id });
      
      if (usersWithThisBus.length > 0) {
        console.log(`\n🔧 [Bus Middleware] Removing bus "${this.busName}" from ${usersWithThisBus.length} users (deleteOne)...`);
        
        await User.updateMany(
          { selectedBus: this._id },
          { 
            $set: { 
              selectedBus: null,
              seatNumber: null,
              busSelectedAt: null
            }
          }
        );
        
        console.log(`✅ [Bus Middleware] Bus removed successfully!`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [Bus Middleware] Error in deleteOne:', error.message);
    next();
  }
});

// ==================== POST-DELETE MIDDLEWARE ====================

// ✅ Logging after deletion
busSchema.post('findOneAndDelete', function(doc) {
  if (doc) {
    console.log(`\n📋 [Bus Middleware] Bus deleted: "${doc.busName}" (${doc.busNumber})`);
    console.log(`   College: ${doc.college}`);
    console.log(`   Capacity: ${doc.capacity} seats`);
    console.log(`   Was booked: ${doc.bookedSeats} seats\n`);
  }
});

busSchema.post('deleteOne', { document: true, query: false }, function(doc) {
  if (doc) {
    console.log(`\n📋 [Bus Middleware] Bus deleted: "${doc.busName}" (${doc.busNumber})\n`);
  }
});

// ==================== INSTANCE METHODS ====================

// ✅ Method to book a seat
busSchema.methods.bookSeat = async function() {
  if (this.availableSeats > 0) {
    this.bookedSeats += 1;
    this.availableSeats -= 1;
    await this.save();
    console.log(`✅ Seat booked on bus "${this.busName}". Available: ${this.availableSeats}`);
    return true;
  }
  console.log(`❌ Cannot book seat on "${this.busName}". Bus is full!`);
  return false;
};

// ✅ Method to release a seat
busSchema.methods.releaseSeat = async function() {
  if (this.bookedSeats > 0) {
    this.bookedSeats -= 1;
    this.availableSeats += 1;
    await this.save();
    console.log(`✅ Seat released on bus "${this.busName}". Available: ${this.availableSeats}`);
    return true;
  }
  console.log(`⚠️  Cannot release seat on "${this.busName}". No booked seats!`);
  return false;
};

// ✅ Check if bus has seats available
busSchema.methods.hasSeatsAvailable = function() {
  return this.availableSeats > 0;
};

// ✅ Get bus status
busSchema.methods.getStatus = function() {
  if (this.availableSeats === 0) return 'FULL';
  if (this.availableSeats <= 10) return 'FILLING';
  return 'AVAILABLE';
};

// ==================== STATIC METHODS ====================

// ✅ Find buses by college
busSchema.statics.findByCollege = function(collegeId) {
  return this.find({ college: collegeId, isActive: true })
    .populate('college')
    .sort('-createdAt');
};

// ✅ Find available buses (with seats)
busSchema.statics.findAvailable = function(collegeId) {
  const query = { 
    availableSeats: { $gt: 0 },
    isActive: true
  };
  
  if (collegeId) {
    query.college = collegeId;
  }
  
  return this.find(query)
    .populate('college')
    .sort('-availableSeats');
};

// ✅ Find full buses
busSchema.statics.findFull = function() {
  return this.find({ 
    availableSeats: 0,
    isActive: true
  }).populate('college');
};

// ✅ Get bus statistics
busSchema.statics.getStats = async function(collegeId) {
  const query = collegeId ? { college: collegeId } : {};
  
  const total = await this.countDocuments(query);
  const full = await this.countDocuments({ ...query, availableSeats: 0 });
  const available = total - full;
  
  const capacityData = await this.aggregate([
    { $match: query },
    { 
      $group: { 
        _id: null, 
        totalCapacity: { $sum: '$capacity' },
        totalBooked: { $sum: '$bookedSeats' }
      } 
    }
  ]);

  const stats = {
    totalBuses: total,
    fullBuses: full,
    availableBuses: available,
    totalCapacity: capacityData[0]?.totalCapacity || 0,
    totalBooked: capacityData[0]?.totalBooked || 0,
    totalAvailable: (capacityData[0]?.totalCapacity || 0) - (capacityData[0]?.totalBooked || 0),
    occupancyRate: capacityData[0]?.totalCapacity 
      ? ((capacityData[0]?.totalBooked / capacityData[0]?.totalCapacity) * 100).toFixed(2)
      : 0
  };

  return stats;
};

// ✅ Get buses grouped by college
busSchema.statics.getByCollege = async function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$college',
        buses: { $push: '$$ROOT' },
        totalCapacity: { $sum: '$capacity' },
        totalBooked: { $sum: '$bookedSeats' },
        totalAvailable: { $sum: '$availableSeats' },
        busCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'colleges',
        localField: '_id',
        foreignField: '_id',
        as: 'collegeInfo'
      }
    },
    { $unwind: '$collegeInfo' },
    { $sort: { 'collegeInfo.name': 1 } }
  ]);
};

// ==================== INDEXES ====================

// ✅ Create indexes for better query performance
busSchema.index({ college: 1 });
busSchema.index({ busNumber: 1 });
busSchema.index({ availableSeats: 1 });
busSchema.index({ isActive: 1 });
busSchema.index({ college: 1, isActive: 1 });

// ==================== ENSURE VIRTUALS IN JSON ====================

busSchema.set('toJSON', { virtuals: true });
busSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Bus', busSchema);
