const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female'],
    },

    // 🆕 SPU ID
    spuId: {
      type: String,
      required: [true, 'SPU ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // 🆕 AGE FIELD
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [16, 'Age must be at least 16'],
      max: [35, 'Age must not exceed 35'],
    },

    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
      enum: ['A', 'B', 'C'],
      uppercase: true,
    },

    // ✅ Payment & selection fields
    paymentStatus: {
      type: String,
      enum: ['pending', 'success'],
      default: 'pending',
    },
    selectedPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      default: null,
    },
    packageSelectedAt: {
      type: Date,
      default: null,
    },
    hasSelectedPackage: {
      type: Boolean,
      default: false,
    },
    extraPlaces: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
    }],
    extraPlacesSelectedAt: {
      type: Date,
      default: null,
    },
    hasSelectedExtraPlaces: {
      type: Boolean,
      default: false,
    },
    selectedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null,
    },
    seatNumber: {
      type: String,
      default: null,
    },
    busSelectedAt: {
      type: Date,
      default: null,
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

// ==================== PASSWORD HASHING ====================

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ==================== BUS SEAT RELEASE MIDDLEWARE ====================

userSchema.pre('findOneAndDelete', async function(next) {
  try {
    const user = await this.model.findOne(this.getQuery())
      .select('fullName email selectedBus seatNumber');
    
    if (user && user.selectedBus) {
      const Bus = require('./Bus');
      const bus = await Bus.findById(user.selectedBus);
      
      if (bus) {
        console.log('\n🔧 [Middleware] Auto-releasing bus seat...');
        console.log(`   User: ${user.fullName} (${user.email})`);
        console.log(`   Bus: ${bus.busName} (${bus.busNumber})`);
        console.log(`   Seat: ${user.seatNumber || 'N/A'}`);
        console.log(`   Before - Booked: ${bus.bookedSeats}, Available: ${bus.availableSeats}`);
        
        bus.bookedSeats = Math.max(0, bus.bookedSeats - 1);
        bus.availableSeats = bus.capacity - bus.bookedSeats;
        
        await bus.save();
        
        console.log(`   After - Booked: ${bus.bookedSeats}, Available: ${bus.availableSeats}`);
        console.log('   ✅ Bus seat released successfully!\n');
      } else {
        console.log(`   ⚠️  Bus not found for user ${user.email}\n`);
      }
    } else if (user) {
      console.log(`\n   ℹ️  User ${user.email} had no bus assigned\n`);
    }
    
    next();
  } catch (error) {
    console.error('❌ [Middleware] Error releasing bus seat:', error.message);
    console.error('   Stack:', error.stack);
    next();
  }
});

userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    if (this.selectedBus) {
      const Bus = require('./Bus');
      const bus = await Bus.findById(this.selectedBus);
      
      if (bus) {
        console.log('\n🔧 [Middleware] Auto-releasing bus seat (deleteOne)...');
        console.log(`   User: ${this.fullName} (${this.email})`);
        console.log(`   Bus: ${bus.busName} (${bus.busNumber})`);
        console.log(`   Seat: ${this.seatNumber || 'N/A'}`);
        console.log(`   Before - Booked: ${bus.bookedSeats}, Available: ${bus.availableSeats}`);
        
        bus.bookedSeats = Math.max(0, bus.bookedSeats - 1);
        bus.availableSeats = bus.capacity - bus.bookedSeats;
        
        await bus.save();
        
        console.log(`   After - Booked: ${bus.bookedSeats}, Available: ${bus.availableSeats}`);
        console.log(`   ✅ Bus updated successfully!\n`);
      } else {
        console.log(`   ⚠️  Bus not found\n`);
      }
    } else {
      console.log(`\n   ℹ️  User ${this.email} had no bus assigned\n`);
    }
    
    next();
  } catch (error) {
    console.error('❌ [Middleware] Error in deleteOne:', error.message);
    next();
  }
});

userSchema.post('findOneAndDelete', function(doc) {
  if (doc) {
    console.log(`📋 [Middleware] User deleted: ${doc.fullName} (${doc.email})`);
    if (doc.selectedBus) {
      console.log(`   🚌 Bus seat was released for this user`);
    }
    console.log('========================================\n');
  }
});

userSchema.post('deleteOne', { document: true, query: false }, function(doc) {
  if (doc) {
    console.log(`📋 [Middleware] User deleted: ${doc.fullName} (${doc.email})`);
    console.log('========================================\n');
  }
});

// ==================== VIRTUAL FIELDS ====================

userSchema.virtual('isFullyRegistered').get(function() {
  return !!(this.selectedPackage && this.selectedBus);
});

userSchema.virtual('totalPrice').get(function() {
  let total = 0;
  
  if (this.selectedPackage && this.selectedPackage.price) {
    total += this.selectedPackage.price;
  }
  
  if (this.extraPlaces && this.extraPlaces.length > 0) {
    this.extraPlaces.forEach(place => {
      if (place.price) {
        total += place.price;
      }
    });
  }
  
  return total;
});

// ==================== INSTANCE METHODS ====================

userSchema.methods.canSelectBus = function() {
  return !!(this.selectedPackage && !this.selectedBus);
};

userSchema.methods.canSelectExtraPlaces = function() {
  return !!(this.selectedPackage && !this.hasSelectedExtraPlaces);
};

userSchema.methods.getRegistrationStatus = function() {
  return {
    hasPackage: !!this.selectedPackage,
    hasBus: !!this.selectedBus,
    hasExtraPlaces: this.extraPlaces && this.extraPlaces.length > 0,
    isComplete: !!(this.selectedPackage && this.selectedBus)
  };
};

userSchema.methods.releaseBusSeat = async function() {
  if (this.selectedBus) {
    const Bus = require('./Bus');
    const bus = await Bus.findById(this.selectedBus);
    
    if (bus) {
      bus.bookedSeats = Math.max(0, bus.bookedSeats - 1);
      bus.availableSeats = bus.capacity - bus.bookedSeats;
      await bus.save();
      
      console.log(`✅ Bus seat manually released for ${this.fullName}`);
      return true;
    }
  }
  return false;
};

// ==================== STATIC METHODS ====================

userSchema.statics.findByCollege = function(collegeId) {
  return this.find({ college: collegeId, role: 'student' })
    .populate('college')
    .populate('selectedPackage')
    .populate('selectedBus')
    .sort('-createdAt');
};

userSchema.statics.findIncomplete = function() {
  return this.find({
    role: 'student',
    $or: [
      { selectedPackage: null },
      { selectedBus: null }
    ]
  })
    .populate('college')
    .sort('-createdAt');
};

userSchema.statics.findByBus = function(busId) {
  return this.find({ 
    selectedBus: busId,
    role: 'student'
  })
    .populate('college')
    .populate('selectedPackage')
    .select('fullName email seatNumber mobileNumber')
    .sort('seatNumber');
};

userSchema.statics.findByPackage = function(packageId) {
  return this.find({ 
    selectedPackage: packageId,
    role: 'student'
  })
    .populate('college')
    .populate('selectedBus')
    .sort('-createdAt');
};

userSchema.statics.getStats = async function(collegeId) {
  const query = collegeId ? { role: 'student', college: collegeId } : { role: 'student' };
  
  const total = await this.countDocuments(query);
  const withPackage = await this.countDocuments({ 
    ...query,
    selectedPackage: { $ne: null } 
  });
  const withBus = await this.countDocuments({ 
    ...query,
    selectedBus: { $ne: null } 
  });
  const complete = await this.countDocuments({
    ...query,
    selectedPackage: { $ne: null },
    selectedBus: { $ne: null }
  });

  return {
    total,
    withPackage,
    withBus,
    complete,
    incomplete: total - complete,
    completionRate: total > 0 ? ((complete / total) * 100).toFixed(2) : '0.00',
    packageRate: total > 0 ? ((withPackage / total) * 100).toFixed(2) : '0.00',
    busRate: total > 0 ? ((withBus / total) * 100).toFixed(2) : '0.00'
  };
};

// ==================== INDEXES ====================

userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ rollNumber: 1 });
userSchema.index({ spuId: 1 });
userSchema.index({ college: 1 });
userSchema.index({ role: 1 });
userSchema.index({ selectedBus: 1 });
userSchema.index({ selectedPackage: 1 });
userSchema.index({ role: 1, college: 1 });
userSchema.index({ role: 1, selectedBus: 1 });
userSchema.index({ role: 1, selectedPackage: 1 });
userSchema.index({ department: 1 });
userSchema.index({ division: 1 });
userSchema.index({ paymentStatus: 1 });
userSchema.index({ age: 1 }); // 🆕 Added age index

// ==================== ENSURE VIRTUALS IN JSON ====================

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
