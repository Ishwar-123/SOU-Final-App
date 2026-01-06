const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true
    },

    // ✅ College Field (REQUIRED - college wise packages)
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required for this package'],
    },

    places: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
        required: true
      }
    ],

    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: 1,
      max: 30
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },

    // ✅ Start Date Field
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    maxParticipants: {
      type: Number,
      default: 50
    },

    // Agar optional concept use nahi karna to isko ignore kar sakta hai,
    // lekin ab logic college-wise hi chalega.
    isOptional: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    features: [
      {
        type: String
      }
    ],

    itinerary: [
      {
        time: String,
        activity: String
      }
    ]
  },
  {
    timestamps: true
  }
);

// ✅ Validation - Max 5 main packages PER COLLEGE
packageSchema.pre('save', async function (next) {
  // sirf naya package + non-optional ke liye check
  if (this.isNew && !this.isOptional) {
    if (!this.college) {
      return next(new Error('College is required for package limit validation'));
    }

    const count = await mongoose.model('Package').countDocuments({
      isActive: true,
      isOptional: false,
      college: this.college   // 🔥 per-college limit
    });

    if (count >= 5) {
      return next(
        new Error('Maximum 5 main packages allowed per college')
      );
    }
  }
  next();
});

// ✅ UPDATED: More lenient date validation (warns instead of blocking)
packageSchema.pre('save', function (next) {
  // Skip validation for existing packages being updated
  if (!this.isNew) {
    return next();
  }

  // For new packages, validate start date
  if (this.startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const packageStart = new Date(this.startDate);
    packageStart.setHours(0, 0, 0, 0);

    if (packageStart < today) {
      console.log(
        `⚠️  WARNING: Package "${this.name}" has start date in the past: ${packageStart.toLocaleDateString('en-IN')}`
      );
      console.log(
        '   This package will still be saved but may not be visible to users.'
      );
      // Allow saving - don't throw error
    }
  }
  next();
});

// ✅ Virtual field to check if package is upcoming
packageSchema.virtual('isUpcoming').get(function () {
  if (!this.startDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const packageStart = new Date(this.startDate);
  packageStart.setHours(0, 0, 0, 0);

  return packageStart >= today;
});

// ✅ Virtual field to check if package has valid future date
packageSchema.virtual('hasValidDate').get(function () {
  if (!this.startDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const packageStart = new Date(this.startDate);
  packageStart.setHours(0, 0, 0, 0);

  // Package is valid if start date is today or in future
  return packageStart >= today;
});

// ✅ Virtual to check if package is global (ab basically hamesha false hoga)
packageSchema.virtual('isGlobal').get(function () {
  return !this.college || this.college === null;
});

// ✅ Instance method to get formatted date
packageSchema.methods.getFormattedDate = function () {
  if (!this.startDate) return 'Date not set';

  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  return this.startDate.toLocaleDateString('en-IN', options);
};

// ✅ Instance method to get short formatted date
packageSchema.methods.getShortDate = function () {
  if (!this.startDate) return 'TBD';

  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  };
  return this.startDate.toLocaleDateString('en-IN', options);
};

// ✅ Instance method to get days until start
packageSchema.methods.getDaysUntilStart = function () {
  if (!this.startDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(this.startDate);
  start.setHours(0, 0, 0, 0);

  const diffTime = start - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// ✅ Instance method to check if package is bookable
packageSchema.methods.isBookable = function () {
  if (!this.isActive) return false;
  if (!this.startDate) return false;

  const daysUntil = this.getDaysUntilStart();
  return daysUntil !== null && daysUntil >= 0;
};

// ✅ Static method to find ALL valid packages (global list, admin use)
packageSchema.statics.findAllValid = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    isActive: true,
    isOptional: { $ne: true },
    startDate: { $gte: today } // Only future or today's packages
  })
    .populate('college', 'name')
    .populate('places', 'name price location')
    .sort({ startDate: 1 });
};

// ✅ Static method: valid packages FOR A COLLEGE (user side)
packageSchema.statics.findValidByCollege = async function (collegeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    isActive: true,
    isOptional: { $ne: true },
    startDate: { $gte: today },
    college: collegeId
  })
    .populate('college', 'name')
    .populate('places', 'name price location')
    .sort({ startDate: 1 });
};

// ✅ Ensure virtuals are included in JSON
packageSchema.set('toJSON', { virtuals: true });
packageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Package', packageSchema);
