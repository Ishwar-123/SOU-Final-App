const User = require('../models/User');
const Package = require('../models/Package');
const College = require('../models/College');
const Bus = require('../models/Bus');
const Place = require('../models/Place');
// const htmlPdf = require('html-pdf-node');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');


// Helper function to get Chrome executable path
async function getChromePath() {
  // Check if running on Vercel/serverless (production)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'
    );
  }
  
  // Local development - use system Chrome/Chromium
  const os = require('os');
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows paths
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' ||
           'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'darwin') {
    // macOS path
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    // Linux paths
    return '/usr/bin/google-chrome' || '/usr/bin/chromium-browser';
  }
}


// ==================== USER DASHBOARD ====================
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('college')
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places' }
      })
      .populate('extraPlaces')
      .populate('selectedBus');

    // ❗ Safety: user ya college missing ho to packages mat dikhाओ
    if (!user || !user.college) {
      return res.render('user/dashboard', {
        title: 'My Dashboard - HTI',
        user,
        availablePackages: [],
        buses: [],
        totalPrice: user && user.selectedPackage ? user.selectedPackage.price : 0,
        success: req.query.success,
        error: !user
          ? 'User not found'
          : 'College not assigned. Please contact admin.'
      });
    }

    // ✅ Sirf user ke college ke active packages (future / today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availablePackages = await Package.find({
      isActive: true,
      college: user.college._id,
      startDate: { $gte: today }
    })
      .populate('places')
      .populate('college');

    // (agar schema me `endDate` nahi hai to ye filter hata do)
    // Yaha tum pehle endDate use kar rahe the, remove kar diya
    const validPackages = availablePackages.filter(pkg => pkg.startDate);

    console.log('📦 Total packages for college:', availablePackages.length);
    console.log('✅ Valid packages with dates:', validPackages.length);

    // Buses only if user has package but no bus
    let buses = [];
    if (user.selectedPackage && !user.selectedBus) {
      buses = await Bus.find({
        college: user.college._id,
        isActive: true
      }).sort({ busName: 1 });
    }

    const packagePrice = user.selectedPackage ? user.selectedPackage.price : 0;

    res.render('user/dashboard', {
      title: 'My Dashboard - HTI',
      user,
      availablePackages: validPackages,
      buses,
      totalPrice: packagePrice,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load dashboard',
      user: req.user
    });
  }
};


exports.selectPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).populate('college');

    if (!user || !user.college) {
      return res.redirect(
        '/user/select-package?error=' +
        encodeURIComponent('College not assigned. Please contact admin.')
      );
    }

    const pkg = await Package.findOne({
      _id: packageId,
      college: user.college._id,
      isActive: true
    });

    if (!pkg) {
      return res.redirect(
        '/user/select-package?error=' +
        encodeURIComponent('Invalid package selected for your college')
      );
    }

    // Agar already package selected hai to block
    if (user.selectedPackage) {
      return res.redirect(
        '/user/select-package?error=' +
        encodeURIComponent('You have already selected a package')
      );
    }

    user.selectedPackage = pkg._id;
    user.packageSelectedAt = new Date();
    await user.save();

    res.redirect(
      '/user/select-package?success=' +
      encodeURIComponent('Package selected successfully! ✓')
    );
  } catch (error) {
    console.error('Select package error:', error);
    res.redirect(
      '/user/select-package?error=' +
      encodeURIComponent('Failed to select package')
    );
  }
};



// ==================== SELECT BUS ====================
exports.selectBus = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🚌 BUS SELECTION REQUEST');
    console.log('========================================');

    const userId = req.user._id;
    const { busId } = req.body;

    console.log('👤 User ID:', userId);
    console.log('🚌 Bus ID:', busId);
    console.log(
      '⏰ Time:',
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    );

    if (!busId) {
      console.log('❌ Bus ID missing');
      console.log('========================================\n');
      return res.redirect(
        '/user/select-bus?error=' +
        encodeURIComponent('Please select a bus')
      );
    }

    const user = await User.findById(userId).populate('college');

    if (!user) {
      console.log('❌ User not found');
      console.log('========================================\n');
      return res.redirect(
        '/auth/login?error=' + encodeURIComponent('User not found')
      );
    }

    console.log('✅ User found:', user.fullName);
    console.log('🏫 College:', user.college ? user.college.name : 'Not assigned');

    if (!user.college) {
      console.log('❌ College not assigned');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('College not assigned')
      );
    }

    if (!user.selectedPackage) {
      console.log('❌ Package not selected');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('Please select a package first')
      );
    }

    if (user.selectedBus) {
      console.log('❌ Bus already selected');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('You have already selected a bus')
      );
    }

    const bus = await Bus.findById(busId).populate('college');

    if (!bus) {
      console.log('❌ Bus not found');
      console.log('========================================\n');
      return res.redirect(
        '/user/select-bus?error=' +
        encodeURIComponent('Selected bus not found')
      );
    }

    console.log('✅ Bus found:', bus.busName);
    console.log('🏫 Bus college:', bus.college ? bus.college.name : 'Not assigned');
    console.log('🪑 Available seats BEFORE:', bus.availableSeats);
    console.log('🪑 Booked seats BEFORE:', bus.bookedSeats);

    if (
      !bus.college ||
      bus.college._id.toString() !== user.college._id.toString()
    ) {
      console.log('❌ Bus does not belong to user\'s college');
      console.log('========================================\n');
      return res.redirect(
        '/user/select-bus?error=' +
        encodeURIComponent('You can only select buses from your college')
      );
    }

    if (!bus.isActive) {
      console.log('❌ Bus is not active');
      console.log('========================================\n');
      return res.redirect(
        '/user/select-bus?error=' +
        encodeURIComponent('Selected bus is not available')
      );
    }

    if (bus.availableSeats <= 0) {
      console.log('❌ No seats available');
      console.log('========================================\n');
      return res.redirect(
        '/user/select-bus?error=' +
        encodeURIComponent('No seats available in this bus')
      );
    }

    user.selectedBus = busId;
    user.busSelectedAt = new Date();
    await user.save();

    console.log('✅ User updated with bus selection');

    bus.bookedSeats += 1;
    bus.availableSeats -= 1;
    await bus.save();

    console.log('✅ Bus seats updated');
    console.log('🪑 Available seats AFTER:', bus.availableSeats);
    console.log('🪑 Booked seats AFTER:', bus.bookedSeats);

    console.log('✅ BUS SELECTION SUCCESSFUL');
    console.log('   - User:', user.fullName);
    console.log('   - College:', user.college.name);
    console.log('   - Bus:', bus.busName);
    console.log('   - Bus Number:', bus.busNumber);
    console.log('   - Selection Time:', user.busSelectedAt);
    console.log('========================================\n');

    res.redirect(
      '/user/dashboard?success=' +
      encodeURIComponent('Bus selected successfully! ✓')
    );
  } catch (error) {
    console.error('========================================');
    console.error('❌ BUS SELECTION ERROR');
    console.error('========================================');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================\n');

    res.redirect(
      '/user/select-bus?error=' +
      encodeURIComponent('Bus selection failed. Please try again.')
    );
  }
};


// ==================== GET SELECT BUS PAGE ====================
exports.getSelectBus = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🚌 GET SELECT BUS PAGE');
    console.log('========================================');
    console.log('👤 User ID:', req.user._id);
    console.log(
      '⏰ Time:',
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    );

    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('selectedPackage')
      .populate('selectedBus')
      .populate('college')
      .lean();

    if (!user) {
      console.log('❌ User not found');
      console.log('========================================\n');
      return res.redirect(
        '/auth/login?error=' + encodeURIComponent('User not found')
      );
    }

    console.log('✅ User found:', user.fullName);
    console.log('📧 Email:', user.email);
    console.log('🏫 User college:', user.college ? user.college.name : 'Not assigned');
    console.log('📦 Package selected:', user.selectedPackage ? 'Yes' : 'No');
    console.log('🚌 Bus selected:', user.selectedBus ? 'Yes' : 'No');

    if (!user.college) {
      console.log('❌ College not assigned - Redirecting to dashboard');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('College not assigned. Please contact admin.')
      );
    }

    if (!user.selectedPackage) {
      console.log('❌ Package not selected - Redirecting to dashboard');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('Please select a package first')
      );
    }

    if (user.selectedBus) {
      console.log('❌ Bus already selected - Redirecting to dashboard');
      console.log('========================================\n');
      return res.redirect(
        '/user/dashboard?error=' +
        encodeURIComponent('You have already selected a bus')
      );
    }

    const buses = await Bus.find({
      college: user.college._id,
      isActive: true
    })
      .populate('college')
      .sort({ busName: 1 })
      .lean();

    console.log('🚌 Total Buses found:', buses.length);

    res.render('user/select-bus', {
      title: 'Select Bus - HTI',
      user,
      buses,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ GET SELECT BUS ERROR');
    console.error('========================================');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================\n');

    res.redirect(
      '/user/dashboard?error=' +
      encodeURIComponent('Unable to load bus selection page')
    );
  }
};


// ==================== VIEW PACKAGE DETAILS ====================
exports.getPackageDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id).populate('college');

    if (!user || !user.college) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'College not assigned. Please contact admin.',
        user: req.user
      });
    }

    // ✅ Sirf user ke college ka package open karne de
    const pkg = await Package.findOne({
      _id: id,
      college: user.college._id,
      isActive: true
    }).populate('places');

    if (!pkg) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Package not found for your college',
        user: req.user
      });
    }

    res.render('user/package-details', {
      title: `${pkg.name} - HTI`,
      user: req.user,
      package: pkg
    });
  } catch (error) {
    console.error('Package details error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load package details',
      user: req.user
    });
  }
};


// ==================== VIEW RECEIPT ====================
exports.viewReceipt = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'college',
        select: 'name departments souAmbassadorName souAmbassadorContact'
      })
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places', select: 'name price location' }
      })
      .populate('extraPlaces', 'name price location')
      .populate('selectedBus', 'busName busNumber')
      .lean();

    if (!user) {
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('User not found')
      );
    }

    const packagePrice = user.selectedPackage ? user.selectedPackage.price : 0;
    const extraPlacesTotal = user.extraPlaces
      ? user.extraPlaces.reduce(
        (sum, place) => sum + (place.price || 0),
        0
      )
      : 0;
    const totalAmount = packagePrice + extraPlacesTotal;

    res.render('user/receipt', {
      title: 'Receipt - HTI',
      user,
      packagePrice,
      extraPlacesTotal,
      totalAmount,
      receiptDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    });
  } catch (error) {
    console.error('Receipt view error:', error);
    res.redirect(
      '/user/dashboard?error=' +
      encodeURIComponent('Unable to view receipt')
    );
  }
};



// ==================== DOWNLOAD RECEIPT AS PDF ====================
exports.downloadReceipt = async (req, res) => {
  let browser = null;

  try {
    console.log('\n========================================');
    console.log('📥 DOWNLOAD RECEIPT REQUEST');
    console.log('========================================');
    console.log('User ID:', req.user._id);

    const user = await User.findById(req.user._id)
      .populate({
        path: 'college',
        select: 'name departments souAmbassadorName souAmbassadorContact'
      })
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places', select: 'name price location' }
      })
      .populate('extraPlaces', 'name price location')
      .populate('selectedBus', 'busName busNumber')
      .lean();

    if (!user) {
      console.log('❌ User not found');
      return res.redirect(
        '/user/dashboard?error=' + encodeURIComponent('User not found')
      );
    }

    console.log('✅ User found:', user.fullName);

    const packagePrice = user.selectedPackage ? user.selectedPackage.price : 0;
    const extraPlacesTotal = user.extraPlaces
      ? user.extraPlaces.reduce(
          (sum, place) => sum + (place.price || 0),
          0
        )
      : 0;
    const totalAmount = packagePrice + extraPlacesTotal;

    const receiptDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    console.log('💰 Total Amount:', totalAmount);

    // 1) Render EJS -> HTML
    const html = await ejs.renderFile(
      path.join(__dirname, '../views/user/receipt-pdf.ejs'),
      {
        user,
        packagePrice,
        extraPlacesTotal,
        totalAmount,
        receiptDate
      }
    );

    console.log('✅ HTML rendered successfully');

    // 2) Launch puppeteer (bundled Chromium)
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 3) Set content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // 4) Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    const filename = `HTI_Receipt_${user.fullName.replace(
      /\s+/g,
      '_'
    )}_${Date.now()}.pdf`;

    // 5) Send PDF correctly
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    // Content-Length optional; agar doubt ho to hata bhi sakte ho
    // res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);

  } catch (error) {
    console.error('❌ PDF Download error:', error);
    console.error('Error stack:', error.stack);
    console.log('========================================\n');

    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    return res.redirect(
      '/user/dashboard?error=' +
        encodeURIComponent('Unable to download receipt. Please try again.')
    );
  }
};


// SELECT PACKAGE PAGE (renders this EJS)
exports.getSelectPackagePage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('college')
      .populate('selectedPackage')
      .lean();

    if (!user || !user.college) {
      return res.render('user/select-package', {
        title: 'Select Package - HTI',
        user,
        packages: [],
        selectedPackageId: user && user.selectedPackage ? user.selectedPackage._id.toString() : null,
        hasSelectedPackage: !!(user && user.selectedPackage),
        success: req.query.success || null,
        error: !user
          ? 'User not found'
          : 'College not assigned. Please contact admin.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Sirf is user ke college ke packages
    const packages = await Package.find({
      isActive: true,
      college: user.college._id,
      startDate: { $gte: today }
    })
      .populate('places')
      .populate('college')
      .sort({ startDate: 1 })
      .lean();

    res.render('user/select-package', {
      title: 'Select Package - HTI',
      user,
      packages,
      selectedPackageId: user.selectedPackage ? user.selectedPackage._id.toString() : null,
      hasSelectedPackage: !!user.selectedPackage,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('getSelectPackagePage error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load packages',
      user: req.user
    });
  }
};

module.exports = exports;
