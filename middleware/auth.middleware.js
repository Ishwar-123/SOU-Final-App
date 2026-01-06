const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ====================================
// MAIN AUTHENTICATION MIDDLEWARE
// ====================================
exports.isAuthenticated = async (req, res, next) => {
  try {
    console.log('\n========================================');
    console.log('🔒 AUTHENTICATION CHECK');
    console.log('========================================');
    console.log('📍 Route:', req.method, req.originalUrl);
    console.log('⏰ Time:', new Date().toLocaleString('en-US'));
    
    // ====== STEP 1: SET NO-CACHE HEADERS ======
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    
    console.log('📋 Cache-Control Headers Set');
    
    // ====== STEP 2: EXTRACT TOKEN ======
    const token = req.cookies.token || req.session.token;
    
    console.log('🎫 Token Status:', token ? '✅ Found' : '❌ Not Found');
    
    if (!token) {
      console.log('❌ Authentication Failed: No token provided');
      console.log('   - Redirecting to: /auth/login');
      console.log('========================================\n');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Please login to continue'));
    }
    
    console.log('🎫 Token (first 30 chars):', token.substring(0, 30) + '...');
    
    // ====== STEP 3: VERIFY JWT TOKEN ======
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT Verification: SUCCESS');
      console.log('   - User ID:', decoded.id);
      console.log('   - Issued At:', new Date(decoded.iat * 1000).toLocaleString('en-US'));
      console.log('   - Expires At:', new Date(decoded.exp * 1000).toLocaleString('en-US'));
      
      // Check if token is about to expire (less than 1 day)
      const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      const daysLeft = Math.floor(timeUntilExpiry / (24 * 60 * 60));
      const hoursLeft = Math.floor((timeUntilExpiry % (24 * 60 * 60)) / (60 * 60));
      
      console.log('⏳ Token Valid For:', daysLeft, 'days', hoursLeft, 'hours');
      
      if (timeUntilExpiry < 86400) { // Less than 1 day
        console.log('⚠️  Token expiring soon!');
      }
      
    } catch (error) {
      console.log('❌ JWT Verification: FAILED');
      console.log('   - Error Type:', error.name);
      console.log('   - Error Message:', error.message);
      
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        console.log('⏰ Token has expired');
        console.log('   - Expired At:', new Date(error.expiredAt).toLocaleString('en-US'));
      } else if (error.name === 'JsonWebTokenError') {
        console.log('🔐 Invalid token signature');
      } else if (error.name === 'NotBeforeError') {
        console.log('⏰ Token not yet valid');
      }
      
      // Clear invalid token
      res.clearCookie('token');
      if (req.session) {
        req.session.destroy();
      }
      
      console.log('🧹 Invalid token cleared');
      console.log('   - Redirecting to: /auth/login');
      console.log('========================================\n');
      
      return res.redirect('/auth/login?error=' + encodeURIComponent('Session expired. Please login again'));
    }
    
    // ====== STEP 4: FETCH USER FROM DATABASE ======
    console.log('🔍 Fetching user from database...');
    
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('college', 'name department souAmbassadorName souAmbassadorContact numberOfBuses')
      .populate('selectedPackage')
      .lean();
    
    if (!user) {
      console.log('❌ User Not Found in Database');
      console.log('   - User ID:', decoded.id);
      console.log('   - Token valid but user deleted/not exists');
      
      // Clear token for non-existent user
      res.clearCookie('token');
      if (req.session) {
        req.session.destroy();
      }
      
      console.log('🧹 Token cleared for non-existent user');
      console.log('   - Redirecting to: /auth/login');
      console.log('========================================\n');
      
      return res.redirect('/auth/login?error=' + encodeURIComponent('User not found. Please login again'));
    }
    
    console.log('✅ User Retrieved:');
    console.log('   - Name:', user.fullName);
    console.log('   - Email:', user.email);
    console.log('   - Role:', user.role);
    console.log('   - College:', user.college?.name || 'N/A');
    
    // ====== STEP 5: ATTACH USER TO REQUEST ======
    req.user = user;
    res.locals.user = user; // Make user available in views
    
    console.log('✅ User attached to request object');
    
    // ====== STEP 6: UPDATE SESSION ======
    if (req.session) {
      req.session.userId = user._id.toString();
      req.session.lastAccess = new Date();
    }
    
    console.log('✅ AUTHENTICATION SUCCESSFUL');
    console.log('   - Proceeding to:', req.originalUrl);
    console.log('========================================\n');
    
    // ====== STEP 7: PROCEED TO NEXT MIDDLEWARE ======
    next();
    
  } catch (error) {
    console.error('========================================');
    console.error('❌ AUTHENTICATION ERROR');
    console.error('========================================');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================\n');
    
    // Clear cookies and session
    res.clearCookie('token');
    if (req.session) {
      req.session.destroy();
    }
    
    return res.redirect('/auth/login?error=' + encodeURIComponent('Authentication error occurred'));
  }
};

// ====================================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// ====================================
exports.isAuthenticatedOptional = async (req, res, next) => {
  try {
    console.log('\n🔓 Optional Auth Check:', req.originalUrl);
    
    const token = req.cookies.token || req.session.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
          .select('-password')
          .populate('college', 'name')
          .lean();
        
        if (user) {
          req.user = user;
          res.locals.user = user;
          console.log('✅ Optional Auth: User found -', user.fullName);
        } else {
          console.log('⚠️  Optional Auth: Token valid but user not found');
        }
      } catch (error) {
        console.log('⚠️  Optional Auth: Invalid token -', error.message);
      }
    } else {
      console.log('ℹ️  Optional Auth: No token - Guest access');
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Optional Auth Error:', error.message);
    req.user = null;
    next();
  }
};

// ====================================
// ROLE-BASED AUTHORIZATION MIDDLEWARE
// ====================================
exports.isAdmin = (req, res, next) => {
  console.log('\n🔐 Admin Authorization Check');
  console.log('   - User:', req.user?.fullName || 'Unknown');
  console.log('   - Role:', req.user?.role || 'Unknown');
  
  if (!req.user) {
    console.log('❌ Authorization Failed: User not authenticated');
    return res.redirect('/auth/login?error=' + encodeURIComponent('Please login to continue'));
  }
  
  if (req.user.role !== 'admin') {
    console.log('❌ Authorization Failed: User is not admin');
    console.log('   - User Role:', req.user.role);
    console.log('   - Required Role: admin');
    
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.',
      user: req.user
    });
  }
  
  console.log('✅ Admin Authorization: SUCCESS');
  next();
};

// ====================================
// STUDENT ROLE AUTHORIZATION
// ====================================
exports.isStudent = (req, res, next) => {
  console.log('\n👨‍🎓 Student Authorization Check');
  console.log('   - User:', req.user?.fullName || 'Unknown');
  console.log('   - Role:', req.user?.role || 'Unknown');
  
  if (!req.user) {
    console.log('❌ Authorization Failed: User not authenticated');
    return res.redirect('/auth/login?error=' + encodeURIComponent('Please login to continue'));
  }
  
  if (req.user.role !== 'student') {
    console.log('❌ Authorization Failed: User is not student');
    console.log('   - User Role:', req.user.role);
    console.log('   - Required Role: student');
    
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'This page is only accessible to students.',
      user: req.user
    });
  }
  
  console.log('✅ Student Authorization: SUCCESS');
  next();
};

// ====================================
// REDIRECT IF AUTHENTICATED
// ====================================
exports.redirectIfAuthenticated = async (req, res, next) => {
  console.log('\n🔄 Checking if already authenticated...');
  
  const token = req.cookies.token || req.session.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('role').lean();
      
      if (user) {
        console.log('ℹ️  User already authenticated -', user.role);
        const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
        console.log('   - Redirecting to:', redirectUrl);
        return res.redirect(redirectUrl);
      }
    } catch (error) {
      console.log('⚠️  Invalid token - Allowing access to login/register');
    }
  }
  
  console.log('✅ Not authenticated - Proceeding to login/register page');
  next();
};

// ====================================
// TOKEN REFRESH HELPER
// ====================================
exports.refreshTokenIfNeeded = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
    
    // Refresh token if less than 1 day remaining
    if (timeUntilExpiry < 86400 && timeUntilExpiry > 0) {
      console.log('\n🔄 Refreshing token...');
      
      const newToken = jwt.sign(
        { id: decoded.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      req.session.token = newToken;
      
      console.log('✅ Token refreshed successfully');
      console.log('   - New expiry:', new Date((Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)) * 1000).toLocaleString('en-US'));
    }
    
    next();
    
  } catch (error) {
    console.log('⚠️  Token refresh failed:', error.message);
    next();
  }
};

// ====================================
// EXPORT ALL MIDDLEWARE
// ====================================
module.exports = exports;
