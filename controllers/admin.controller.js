const User = require('../models/User');
const Package = require('../models/Package');
const College = require('../models/College');
const Bus = require('../models/Bus');
const Place = require('../models/Place');

// ==================== GET ADMIN DASHBOARD ====================
exports.getDashboard = async (req, res) => {
  try {
    console.log('\n=========================');
    console.log('ADMIN DASHBOARD');
    console.log('=========================\n');

    const totalUsers = await User.countDocuments();
    const totalColleges = await College.countDocuments();
    const totalPackages = await Package.countDocuments();
    const totalBuses = await Bus.countDocuments();
    const totalPlaces = await Place.countDocuments();

    const packages = await Package.find()
      .populate('places')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentUsers = await User.find()
      .populate('college')
      .populate('selectedPackage')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentColleges = await College.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentBuses = await Bus.find()
      .populate('college')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - HTI',
      stats: {
        totalUsers,
        totalColleges,
        totalPackages,
        totalBuses,
        totalPlaces
      },
      totalUsers,
      totalColleges,
      totalPackages,
      totalBuses,
      totalPlaces,
      packages,
      recentPackages: packages,
      recentUsers,
      recentColleges,
      recentBuses,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('❌ ADMIN DASHBOARD ERROR:', error.message);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load admin dashboard',
      user: req.user
    });
  }
};

// ==================== GET ADMIN USERS PAGE ====================
exports.getUsers = async (req, res) => {
  try {
    console.log('\n=========================');
    console.log('GET ADMIN USERS PAGE');
    console.log('=========================\n');

    // Only students (no admins)
    const users = await User.find({ role: { $ne: 'admin' } })
      .populate('college')
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places' }
      })
      .populate('selectedBus')
      .populate('extraPlaces')
      .sort({ createdAt: -1 })
      .lean();

    const colleges = await College.find({ isActive: true }).lean();

    res.render('admin/users', {
      title: 'Manage Users - Admin',
      users,
      colleges,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load users',
      user: req.user
    });
  }
};

// ==================== CREATE USER (ADMIN) ====================
exports.createUser = async (req, res) => {
  try {
    const { fullName, email, password, college, role } = req.body;

    if (!fullName || !email || !password) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('All fields are required'));
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('User with this email already exists'));
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      college: college || null,
      role: role || 'user',
      isActive: true
    });

    res.redirect('/admin/users?success=' + encodeURIComponent('User created successfully'));
  } catch (error) {
    console.error('Create user error:', error);
    res.redirect('/admin/users?error=' + encodeURIComponent('Failed to create user'));
  }
};

// ==================== RESET USER PASSWORD ====================
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Password must be at least 6 characters'));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('User not found'));
    }

    user.password = newPassword;
    await user.save();

    res.redirect('/admin/users?success=' + encodeURIComponent('Password reset successfully'));
  } catch (error) {
    console.error('Reset password error:', error);
    res.redirect('/admin/users?error=' + encodeURIComponent('Failed to reset password'));
  }
};

// ==================== UPDATE USER ROLE ====================
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Invalid role'));
    }

    await User.findByIdAndUpdate(userId, { role });

    res.redirect('/admin/users?success=' + encodeURIComponent('User role updated successfully'));
  } catch (error) {
    console.error('Update user role error:', error);
    res.redirect('/admin/users?error=' + encodeURIComponent('Failed to update user role'));
  }
};

exports.updateUserPaymentStatus = async (req, res) => {
  try {
    const { userId, paymentStatus } = req.body;

    if (!userId || !paymentStatus) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('User and status are required'));
    }

    if (!['pending', 'success'].includes(paymentStatus)) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Invalid payment status'));
    }

    // yahi important line hai
    await User.findByIdAndUpdate(userId, { paymentStatus });

    return res.redirect('/admin/users?success=' + encodeURIComponent('Payment status updated successfully'));
  } catch (error) {
    console.error('Update payment status error:', error);
    return res.redirect('/admin/users?error=' + encodeURIComponent('Failed to update payment status'));
  }
};


// ==================== DELETE USER ====================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.body;

    console.log('\n========================================');
    console.log('🗑️  DELETE USER');
    console.log('========================================');
    console.log('User ID to delete:', id);

    if (!id) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('User ID is required'));
    }

    const user = await User.findById(id)
      .populate('selectedBus')
      .select('fullName email role selectedBus seatNumber');

    if (!user) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('User not found'));
    }

    if (user.role === 'admin') {
      return res.redirect('/admin/users?error=' + encodeURIComponent('Cannot delete admin users'));
    }

    await User.findByIdAndDelete(id);

    res.redirect('/admin/users?success=' + encodeURIComponent('Student deleted successfully'));
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.redirect('/admin/users?error=' + encodeURIComponent('Failed to delete user'));
  }
};



// ==================== GET COLLEGES PAGE ====================
exports.getColleges = async (req, res) => {
  try {
    const colleges = await College.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/colleges', {
      title: 'Manage Colleges - Admin',
      colleges,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load colleges',
      user: req.user
    });
  }
};

// ==================== CREATE COLLEGE ====================
exports.createCollege = async (req, res) => {
  try {
    const { name, departments, souAmbassadorName, souAmbassadorContact } = req.body;

    const departmentArray = departments
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    await College.create({
      name: name.trim(),
      departments: departmentArray,
      souAmbassadorName: souAmbassadorName.trim(),
      souAmbassadorContact: souAmbassadorContact.trim(),
      isActive: true
    });

    res.redirect('/admin/colleges?success=' + encodeURIComponent('College created successfully'));
  } catch (error) {
    console.error('Create college error:', error);
    res.redirect('/admin/colleges?error=' + encodeURIComponent('Failed to create college'));
  }
};

// ==================== UPDATE COLLEGE ====================
exports.updateCollege = async (req, res) => {
  try {
    const { id, name, departments, souAmbassadorName, souAmbassadorContact } = req.body;

    const departmentArray = departments
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    await College.findByIdAndUpdate(id, {
      name: name.trim(),
      departments: departmentArray,
      souAmbassadorName: souAmbassadorName.trim(),
      souAmbassadorContact: souAmbassadorContact.trim()
    });

    res.redirect('/admin/colleges?success=' + encodeURIComponent('College updated successfully'));
  } catch (error) {
    console.error('Update college error:', error);
    res.redirect('/admin/colleges?error=' + encodeURIComponent('Failed to update college'));
  }
};

// ==================== DELETE COLLEGE ====================
exports.deleteCollege = async (req, res) => {
  try {
    const { id } = req.body;
    await College.findByIdAndDelete(id);
    res.redirect('/admin/colleges?success=' + encodeURIComponent('College deleted successfully'));
  } catch (error) {
    console.error('Delete college error:', error);
    res.redirect('/admin/colleges?error=' + encodeURIComponent('Failed to delete college'));
  }
};

// GET PACKAGES PAGE
exports.getPackages = async (req, res) => {
  try {
    const colleges = await College.find({ isActive: true }).lean();
    const places = await Place.find({ isActive: true }).lean();

    // ❗ Yaha college bhi populate karo
    const packages = await Package.find()
      .populate('places')
      .populate('college')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/packages', {
      title: 'Manage Packages - Admin',
      packages,
      colleges,
      places,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get packages error', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load packages',
      user: req.user
    });
  }
};


// ==================== CREATE PACKAGE ====================
exports.createPackage = async (req, res) => {
  try {
    const { name, college, places, duration, price, description, startDate } = req.body;

    console.log('\n========================================');
    console.log('📦 CREATE PACKAGE');
    console.log('========================================');
    console.log('Name:', name);
    console.log('College:', college);
    console.log('Places:', places);
    console.log('Start Date:', startDate);

    // ✅ Validation - ALL FIELDS REQUIRED
    if (!name || !college || !places || !duration || !price || !description || !startDate) {
      console.log('❌ Missing required fields');
      console.log('========================================\n');
      return res.redirect('/admin/packages?error=' + encodeURIComponent('All fields including college and start date are required'));
    }

    // ✅ Create package with college - NO isGlobal field
    const newPackage = await Package.create({
      name: name.trim(),
      college: college,  // ✅ REQUIRED
      places: Array.isArray(places) ? places : [places],
      duration: parseInt(duration),
      price: parseFloat(price),
      description: description.trim(),
      startDate: new Date(startDate),
      isActive: true
    });

    console.log('✅ Package created successfully:', newPackage.name);
    console.log('Package ID:', newPackage._id);
    console.log('College:', newPackage.college);
    console.log('========================================\n');

    res.redirect('/admin/packages?success=' + encodeURIComponent('Package created successfully!'));
  } catch (error) {
    console.error('❌ Create package error:', error);
    console.error('Error message:', error.message);
    res.redirect('/admin/packages?error=' + encodeURIComponent(error.message || 'Failed to create package'));
  }
};



// ==================== UPDATE PACKAGE ====================
exports.updatePackage = async (req, res) => {
  try {
    const { id, name, college, places, duration, price, description, startDate } = req.body;

    console.log('\n========================================');
    console.log('📝 UPDATE PACKAGE');
    console.log('========================================');
    console.log('Package ID:', id);
    console.log('College:', college);

    if (!id) {
      return res.redirect('/admin/packages?error=' + encodeURIComponent('Package ID is required'));
    }

    // ✅ Find package first
    const pkg = await Package.findById(id);
    if (!pkg) {
      console.log('❌ Package not found');
      return res.redirect('/admin/packages?error=' + encodeURIComponent('Package not found'));
    }

    // ✅ Update fields - NO isGlobal
    pkg.name = name.trim();
    pkg.college = college;  // ✅ UPDATE COLLEGE
    pkg.places = Array.isArray(places) ? places : [places];
    pkg.duration = parseInt(duration);
    pkg.price = parseFloat(price);
    pkg.description = description.trim();
    
    if (startDate) {
      pkg.startDate = new Date(startDate);
    }

    // ✅ Save to trigger pre-save hooks
    await pkg.save();

    console.log('✅ Package updated successfully');
    console.log('========================================\n');

    res.redirect('/admin/packages?success=' + encodeURIComponent('Package updated successfully'));
  } catch (error) {
    console.error('❌ Update package error:', error);
    res.redirect('/admin/packages?error=' + encodeURIComponent('Failed to update package'));
  }
};



// ==================== DELETE PACKAGE ====================
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.body;
    await Package.findByIdAndDelete(id);
    res.redirect('/admin/packages?success=' + encodeURIComponent('Package deleted successfully'));
  } catch (error) {
    console.error('Delete package error:', error);
    res.redirect('/admin/packages?error=' + encodeURIComponent('Failed to delete package'));
  }
};

// ==================== GET BUSES PAGE ====================
exports.getBuses = async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('college')
      .sort({ createdAt: -1 })
      .lean();

    const colleges = await College.find({ isActive: true }).lean();

    res.render('admin/buses', {
      title: 'Manage Buses - Admin',
      buses,
      colleges,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load buses',
      user: req.user
    });
  }
};

// ==================== CREATE BUS ====================
exports.createBus = async (req, res) => {
  try {
    const { busName, busNumber, college, capacity } = req.body;

    await Bus.create({
      busName: busName.trim(),
      busNumber: busNumber.trim(),
      college,
      capacity: parseInt(capacity),
      availableSeats: parseInt(capacity),
      bookedSeats: 0,
      isActive: true
    });

    res.redirect('/admin/buses?success=' + encodeURIComponent('Bus created successfully'));
  } catch (error) {
    console.error('Create bus error:', error);
    res.redirect('/admin/buses?error=' + encodeURIComponent('Failed to create bus'));
  }
};

// ==================== UPDATE BUS ====================
exports.updateBus = async (req, res) => {
  try {
    const { id, busName, busNumber, college, capacity } = req.body;

    const bus = await Bus.findById(id);
    const bookedSeats = bus.bookedSeats || 0;

    await Bus.findByIdAndUpdate(id, {
      busName: busName.trim(),
      busNumber: busNumber.trim(),
      college,
      capacity: parseInt(capacity),
      availableSeats: parseInt(capacity) - bookedSeats
    });

    res.redirect('/admin/buses?success=' + encodeURIComponent('Bus updated successfully'));
  } catch (error) {
    console.error('Update bus error:', error);
    res.redirect('/admin/buses?error=' + encodeURIComponent('Failed to update bus'));
  }
};

// ==================== DELETE BUS ====================
exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.body;

    console.log('\n========================================');
    console.log('🗑️  DELETE BUS');
    console.log('========================================');
    console.log('Bus ID to delete:', id);

    if (!id) {
      console.log('❌ Bus ID missing');
      console.log('========================================\n');
      return res.redirect('/admin/buses?error=' + encodeURIComponent('Bus ID is required'));
    }

    // ✅ Find bus first
    const Bus = require('../models/Bus');
    const User = require('../models/User');
    
    const bus = await Bus.findById(id).populate('college');
    
    if (!bus) {
      console.log('❌ Bus not found');
      console.log('========================================\n');
      return res.redirect('/admin/buses?error=' + encodeURIComponent('Bus not found'));
    }

    console.log('Bus to delete:', bus.busName, `(${bus.busNumber})`);
    console.log('College:', bus.college ? bus.college.name : 'Unknown');
    console.log('Booked Seats:', bus.bookedSeats);

    // ✅ REMOVE BUS FROM ALL USERS WHO SELECTED IT
    const usersWithThisBus = await User.find({ selectedBus: id });
    
    if (usersWithThisBus.length > 0) {
      console.log(`\n👥 Found ${usersWithThisBus.length} users with this bus`);
      console.log('Removing bus from their profiles...\n');
      
      for (const user of usersWithThisBus) {
        console.log(`   - Removing from: ${user.fullName} (${user.email})`);
        user.selectedBus = null;
        user.seatNumber = null;
        user.busSelectedAt = null;
        await user.save();
      }
      
      console.log(`\n✅ Bus removed from ${usersWithThisBus.length} users successfully!`);
    } else {
      console.log('\nℹ️  No users found with this bus');
    }

    // ✅ Delete the bus
    await Bus.findByIdAndDelete(id);

    console.log('\n✅ Bus deleted successfully:', bus.busName);
    console.log('========================================\n');

    res.redirect('/admin/buses?success=' + encodeURIComponent(`Bus "${bus.busName}" deleted successfully. ${usersWithThisBus.length} users updated.`));
  } catch (error) {
    console.error('❌ Delete bus error:', error);
    console.error('Error stack:', error.stack);
    res.redirect('/admin/buses?error=' + encodeURIComponent('Failed to delete bus'));
  }
};


// ==================== GET PLACES PAGE ====================
exports.getPlaces = async (req, res) => {
  try {
    const places = await Place.find()
      .sort({ name: 1 })
      .lean();

    res.render('admin/places', {
      title: 'Manage Places - Admin',
      places,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get places error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load places',
      user: req.user
    });
  }
};

// ==================== CREATE PLACE ====================
exports.createPlace = async (req, res) => {
  try {
    const { name, location, price, description } = req.body;

    await Place.create({
      name: name.trim(),
      location: location.trim(),
      price: parseFloat(price),
      description: description.trim(),
      isActive: true
    });

    res.redirect('/admin/places?success=' + encodeURIComponent('Place created successfully'));
  } catch (error) {
    console.error('Create place error:', error);
    res.redirect('/admin/places?error=' + encodeURIComponent('Failed to create place'));
  }
};

// ==================== UPDATE PLACE ====================
exports.updatePlace = async (req, res) => {
  try {
    const { id, name, location, price, description } = req.body;

    await Place.findByIdAndUpdate(id, {
      name: name.trim(),
      location: location.trim(),
      price: parseFloat(price),
      description: description.trim()
    });

    res.redirect('/admin/places?success=' + encodeURIComponent('Place updated successfully'));
  } catch (error) {
    console.error('Update place error:', error);
    res.redirect('/admin/places?error=' + encodeURIComponent('Failed to update place'));
  }
};

// ==================== DELETE PLACE ====================
exports.deletePlace = async (req, res) => {
  try {
    const { id } = req.body;
    await Place.findByIdAndDelete(id);
    res.redirect('/admin/places?success=' + encodeURIComponent('Place deleted successfully'));
  } catch (error) {
    console.error('Delete place error:', error);
    res.redirect('/admin/places?error=' + encodeURIComponent('Failed to delete place'));
  }
};

module.exports = exports;
