const User = require('../models/User');
const Package = require('../models/Package');
const Place = require('../models/Place');


// ==================== USER DASHBOARD ====================
exports.getUserDashboard = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🏠 USER DASHBOARD');
    console.log('========================================');
    console.log('User ID:', req.user._id);
    console.log('User Email:', req.user.email);


    const user = await User.findById(req.user._id)
      .populate('college')
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places' }
      })
      .populate('extraPlaces')
      .populate('selectedBus');


    if (!user) {
      return res.redirect('/auth/login?error=User not found');
    }


    console.log('User College:', user.college ? user.college._id : 'NO COLLEGE');
    console.log('Has Selected Package:', !!user.selectedPackage);


    // Calculate total price
    let totalPrice = 0;
    let extraPlacesTotal = 0;


    if (user.selectedPackage) {
      totalPrice = user.selectedPackage.price;
    }


    if (user.extraPlaces && user.extraPlaces.length > 0) {
      extraPlacesTotal = user.extraPlaces.reduce((sum, place) => sum + place.price, 0);
      totalPrice += extraPlacesTotal;
    }


    // ✅ FETCH ALL AVAILABLE PACKAGES (GLOBAL - NO COLLEGE FILTER)
    let availablePackages = [];
    
    if (!user.selectedPackage) {
      console.log('\n🔍 Fetching ALL available packages (Global)');
      
      // ✅ Get current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // ✅ Get ALL packages with valid future dates (NO college filter)
      availablePackages = await Package.find({
        isActive: true,
        isOptional: { $ne: true },
        startDate: { $gte: today }  // Only future packages
      })
        .populate('college', 'name')
        .populate('places', 'name price location')
        .sort({ startDate: 1 })  // Sort by start date
        .lean();


      console.log('✅ Total packages found:', availablePackages.length);
      
      if (availablePackages.length > 0) {
        console.log('\n📦 Package Details:');
        availablePackages.forEach((pkg, index) => {
          const startDate = pkg.startDate ? new Date(pkg.startDate) : null;
          
          console.log(`\n   ${index + 1}. ${pkg.name}`);
          console.log(`      • Price: ₹${pkg.price}`);
          console.log(`      • Start Date: ${startDate ? startDate.toLocaleDateString('en-IN') : 'NOT SET'}`);
          console.log(`      • Places: ${pkg.places?.length || 0}`);
          console.log(`      • College: ${pkg.college?.name || '🌍 Global (All Colleges)'}`);
        });
        
        console.log(`\n✅ Valid packages available: ${availablePackages.length}`);
      } else {
        console.log('\n⚠️  No packages with valid future dates found!');
        console.log('💡 Solution: Create packages with future start dates');
      }
    } else {
      console.log('ℹ️  User already has selected package');
    }


    console.log('========================================\n');


    res.render('user/dashboard', {
      title: 'Dashboard - Mission Unity',
      user,
      totalPrice,
      extraPlacesTotal,
      availablePackages,  // ✅ PASS ALL PACKAGES
      success: req.query.success || null,
      error: req.query.error || null
    });


  } catch (error) {
    console.error('❌ Dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.redirect('/auth/login?error=Failed to load dashboard');
  }
};


// ==================== MAIN PACKAGE SELECTION ====================


// GET PAGE: SHOW ALL PACKAGES (✅ GLOBAL - NO COLLEGE FILTER)
exports.getSelectPackage = async (req, res) => {
  try {
    const user = req.user;


    console.log('\n========================================');
    console.log('📦 PACKAGE SELECTION PAGE');
    console.log('========================================');
    console.log('User:', user.fullName);
    console.log('User College:', user.college);


    // ✅ Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);


    // ✅ SHOW ALL PACKAGES (GLOBAL - Available to ALL colleges)
    const packages = await Package.find({ 
      isActive: true,
      isOptional: { $ne: true },
      startDate: { $gte: today }  // Only future packages
      // ✅ NO college filter - packages visible to ALL
    })
      .populate('college', 'name')
      .populate('places', 'name price location')
      .sort({ startDate: 1 })
      .lean();


    console.log(`✅ Found ${packages.length} valid packages (available to all colleges)`);
    console.log('========================================\n');


    res.render('user/select-package', {
      title: 'Select Package - HTI',
      user,
      packages,
      hasSelectedPackage: !!user.selectedPackage,
      selectedPackageId: user.selectedPackage
        ? user.selectedPackage.toString()
        : null,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('getSelectPackage error:', error);
    res.redirect(
      '/user/dashboard?error=' +
        encodeURIComponent('Unable to load packages for selection')
    );
  }
};


// POST: USER SELECTS MAIN PACKAGE
exports.postSelectPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id;


    console.log('\n========================================');
    console.log('📦 PACKAGE SELECTION');
    console.log('========================================');
    console.log('User ID:', userId);
    console.log('Package ID:', packageId);


    if (!packageId) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent('Please choose a package')
      );
    }


    const user = await User.findById(userId).select(
      'selectedPackage packageSelectedAt college'
    );


    if (user.selectedPackage) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent(
            'You have already selected a package. You cannot change or cancel it.'
          )
      );
    }


    const pkg = await Package.findById(packageId).lean();
    if (!pkg) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent('Selected package does not exist')
      );
    }


    // ✅ NO COLLEGE VERIFICATION - Packages are global
    // Any student from any college can select any package


    user.selectedPackage = packageId;
    user.packageSelectedAt = new Date();
    await user.save();


    console.log(`✅ User ${userId} selected package: ${pkg.name}`);
    console.log('========================================\n');


    // ✅ REDIRECT TO EXTRA PLACES SELECTION
    return res.redirect(
      '/user/select-extra-places?success=' +
        encodeURIComponent('Package selected! Now select extra places.')
    );
  } catch (error) {
    console.error('postSelectPackage error:', error);
    return res.redirect(
      '/user/select-package?error=' + encodeURIComponent(error.message)
    );
  }
};


// ==================== EXTRA PLACES SELECTION ====================


// GET: Extra Places Selection Page
exports.getSelectExtraPlaces = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('college', 'name')
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places', select: '_id name price location' }
      })
      .populate('extraPlaces', 'name price location')
      .lean();


    if (!user.selectedPackage) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent('Please select main package first')
      );
    }


    // Get IDs of places already in package
    const packagePlaceIds = user.selectedPackage.places.map(p => p._id.toString());


    // Get all available places EXCEPT those in package
    const availablePlaces = await Place.find({
      isActive: true,
      _id: { $nin: packagePlaceIds }
    })
      .sort({ name: 1 })
      .lean();


    // Get selected extra place IDs
    const selectedExtraPlaceIds = user.extraPlaces 
      ? user.extraPlaces.map(place => place._id.toString()) 
      : [];


    // Calculate extra places total
    let extraPlacesTotal = 0;
    if (user.extraPlaces && user.extraPlaces.length > 0) {
      user.extraPlaces.forEach(place => {
        extraPlacesTotal += place.price || 0;
      });
    }


    res.render('user/select-extra-places', {
      title: 'Select Extra Places - HTI',
      user,
      availablePlaces,
      selectedExtraPlaceIds,
      extraPlacesTotal,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('Get extra places error:', error);
    res.redirect(
      '/user/dashboard?error=' +
        encodeURIComponent('Unable to load extra places')
    );
  }
};


// POST: Select Extra Places
exports.postSelectExtraPlaces = async (req, res) => {
  try {
    const { extraPlaceIds } = req.body;
    const userId = req.user._id;


    console.log('\n========================================');
    console.log('📍 EXTRA PLACES SELECTION');
    console.log('========================================');
    console.log('User ID:', userId);
    console.log('Selected Extra Places:', extraPlaceIds);


    const user = await User.findById(userId)
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places', select: '_id' }
      })
      .select('selectedPackage extraPlaces extraPlacesSelectedAt');


    if (!user.selectedPackage) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent('Please select main package first')
      );
    }


    // Extra places can be empty (user skips)
    const placeIds = Array.isArray(extraPlaceIds) 
      ? extraPlaceIds 
      : (extraPlaceIds ? [extraPlaceIds] : []);


    // ✅ VALIDATE: Make sure no place is from the package
    const packagePlaceIds = user.selectedPackage.places.map(p => p._id.toString());
    const invalidPlaces = placeIds.filter(id => packagePlaceIds.includes(id));


    if (invalidPlaces.length > 0) {
      return res.redirect(
        '/user/select-extra-places?error=' +
          encodeURIComponent('Cannot select places already in your package')
      );
    }


    user.extraPlaces = placeIds;
    user.extraPlacesSelectedAt = new Date();
    await user.save();


    console.log('✅ Extra places selected:', placeIds.length);
    console.log('========================================\n');


    return res.redirect(
      '/user/dashboard?success=' +
        encodeURIComponent('Extra places added successfully!')
    );
  } catch (error) {
    console.error('postSelectExtraPlaces error:', error);
    return res.redirect(
      '/user/select-extra-places?error=' + encodeURIComponent(error.message)
    );
  }
};


module.exports = exports;
