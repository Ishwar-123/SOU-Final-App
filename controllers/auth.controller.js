const User = require('../models/User');
const College = require('../models/College');
const jwt = require('jsonwebtoken');

// ====================================
// JWT TOKEN GENERATION
// ====================================
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ====================================
// GET LOGIN PAGE
// ====================================
exports.getLogin = (req, res) => {
  const token = req.cookies.token || req.session.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/user/dashboard');
    } catch (error) {}
  }
  
  res.render('auth/login', {
    title: 'Login - HTI',
    error: req.query.error || null,
    success: req.query.success || null,
    user: null
  });
};

// ====================================
// POST LOGIN
// ====================================
exports.postLogin = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🔒 LOGIN ATTEMPT');
    console.log('========================================');
    
    const { email, password } = req.body;
    
    console.log('📧 Email:', email);
    
    if (!email || !password) {
      console.log('❌ Email or password missing');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Please enter email and password'));
    }
    
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('college');
    
    console.log('🔍 User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ User not found');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    if (!user.isActive) {
      console.log('❌ User account is inactive');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Your account has been deactivated'));
    }
    
    if (!user.password) {
      console.log('❌ User password is not set in database');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Account error - Password not found'));
    }
    
    console.log('🔑 Comparing passwords...');
    const isPasswordCorrect = await user.comparePassword(password);
    
    console.log('✅ Password match:', isPasswordCorrect ? 'Yes' : 'No');
    
    if (!isPasswordCorrect) {
      console.log('❌ Password incorrect');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    const token = generateToken(user._id);
    
    console.log('✅ JWT Token generated');
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    if (req.session) {
      req.session.token = token;
      req.session.userId = user._id.toString();
    }
    
    console.log('✅ LOGIN SUCCESSFUL');
    console.log('   - User ID:', user._id);
    console.log('   - Role:', user.role);
    console.log('   - Name:', user.fullName);
    console.log('   - Gender:', user.gender);
    console.log('   - Roll Number:', user.rollNumber);
    console.log('   - Division:', user.division);
    console.log('   - Redirecting to:', user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    console.log('========================================\n');
    
    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ LOGIN ERROR');
    console.error('========================================');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================\n');
    
    res.redirect('/auth/login?error=' + encodeURIComponent('Login failed - Please try again'));
  }
};

// ====================================
// GET REGISTER PAGE
// ====================================
exports.getRegister = async (req, res) => {
  try {
    const token = req.cookies.token || req.session.token;
    
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        return res.redirect('/user/dashboard');
      } catch (error) {}
    }
    
    const colleges = await College.find({ isActive: true })
      .sort({ name: 1 })
      .select('name departments')
      .lean();
    
    console.log('📚 Colleges fetched:', colleges.length);
    if (colleges.length > 0) {
      console.log('📝 Sample college:', colleges[0].name);
      console.log('📝 Sample departments:', colleges[0].departments);
    }
    
    res.render('auth/register', {
      title: 'Register - HTI',
      error: req.query.error || null,
      colleges,
      user: null
    });
    
  } catch (error) {
    console.error('Register page error:', error);
    res.render('auth/register', {
      title: 'Register - HTI',
      error: 'Unable to load registration page',
      colleges: [],
      user: null
    });
  }
};

// ====================================
// POST REGISTER (UPDATED FOR SPU ID + AGE)
// ====================================
exports.postRegister = async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      mobileNumber, 
      gender, 
      spuId,
      age,             // 🔹 NEW
      rollNumber,
      password, 
      college, 
      department,
      division 
    } = req.body;
    
    console.log('\n========================================');
    console.log('📝 REGISTRATION ATTEMPT');
    console.log('========================================');
    console.log('📧 Email:', email);
    console.log('👤 Name:', fullName);
    console.log('📱 Mobile:', mobileNumber);
    console.log('⚧️ Gender:', gender);
    console.log('🆔 SPU ID:', spuId);
    console.log('🎂 Age:', age);
    console.log('🎓 Roll Number:', rollNumber);
    console.log('🏫 College:', college);
    console.log('📚 Department:', department);
    console.log('🎯 Division:', division);
    console.log('⏰ Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    console.log('\n🔍 DEBUG - Form Data Check:');
    console.log('   rollNumber type:', typeof rollNumber, '| value:', rollNumber);
    console.log('   division type:', typeof division, '| value:', division);
    console.log('   spuId type:', typeof spuId, '| value:', spuId);
    console.log('   age type:', typeof age, '| value:', age);
    
    // ====== STEP 1: VALIDATE INPUT ======
    if (!fullName || !email || !mobileNumber || !gender || !spuId ||
        !age || !rollNumber || !password || !college || !department || !division) {
      console.log('❌ Validation Failed: Missing required fields');
      console.log('   - fullName:', !!fullName);
      console.log('   - email:', !!email);
      console.log('   - mobileNumber:', !!mobileNumber);
      console.log('   - gender:', !!gender);
      console.log('   - spuId:', !!spuId);
      console.log('   - age:', !!age);
      console.log('   - rollNumber:', !!rollNumber);
      console.log('   - password:', !!password);
      console.log('   - college:', !!college);
      console.log('   - department:', !!department);
      console.log('   - division:', !!division);
      
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'All fields are required',
        colleges,
        user: null
      });
    }

    // age basic numeric validation (frontend se min/max aa raha hai)
    const numericAge = Number(age);
    if (Number.isNaN(numericAge) || numericAge < 16 || numericAge > 35) {
      console.log('❌ Validation Failed: Invalid age:', age);
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Age must be between 16 and 35',
        colleges,
        user: null
      });
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Validation Failed: Invalid email format');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Please enter a valid email address',
        colleges,
        user: null
      });
    }
    
    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      console.log('❌ Validation Failed: Invalid mobile number');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Please enter a valid 10-digit mobile number',
        colleges,
        user: null
      });
    }
    
    if (!['Male', 'Female'].includes(gender)) {
      console.log('❌ Validation Failed: Invalid gender');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Please select a valid gender',
        colleges,
        user: null
      });
    }
    
    if (!['A', 'B', 'C'].includes(division.toUpperCase())) {
      console.log('❌ Validation Failed: Invalid division');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Please select a valid division (A, B, or C)',
        colleges,
        user: null
      });
    }
    
    if (password.length < 6) {
      console.log('❌ Validation Failed: Password too short');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Password must be at least 6 characters',
        colleges,
        user: null
      });
    }
    
    // ====== STEP 2: CHECK EXISTING USER ======
    const existingEmail = await User.findOne({ email: email.toLowerCase() }).lean();
    
    if (existingEmail) {
      console.log('❌ Registration Failed: Email already exists');
      console.log('========================================\n');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'This email is already registered',
        colleges,
        user: null
      });
    }
    
    const existingMobile = await User.findOne({ mobileNumber }).lean();
    
    if (existingMobile) {
      console.log('❌ Registration Failed: Mobile number already exists');
      console.log('========================================\n');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'This mobile number is already registered',
        colleges,
        user: null
      });
    }
    
    const existingRollNumber = await User.findOne({ 
      rollNumber: rollNumber.toUpperCase().trim()
    }).lean();
    
    if (existingRollNumber) {
      console.log('❌ Registration Failed: Roll number already exists');
      console.log('========================================\n');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'This roll number is already registered',
        colleges,
        user: null
      });
    }

    const existingSpuId = await User.findOne({ 
      spuId: spuId.toUpperCase().trim()
    }).lean();

    if (existingSpuId) {
      console.log('❌ Registration Failed: SPU ID already exists');
      console.log('========================================\n');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'This SPU ID is already registered',
        colleges,
        user: null
      });
    }
    
    const collegeExists = await College.findById(college);
    if (!collegeExists) {
      console.log('❌ Validation Failed: Invalid college');
      const colleges = await College.find({ isActive: true })
        .sort({ name: 1 })
        .select('name departments')
        .lean();
      return res.render('auth/register', {
        title: 'Register - HTI',
        error: 'Invalid college selected',
        colleges,
        user: null
      });
    }
    
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      gender: gender,
      spuId: spuId.toUpperCase().trim(),
      age: numericAge,                         // 🔹 NEW
      rollNumber: rollNumber.toUpperCase().trim(),
      password: password,
      college: college,
      department: department.trim(),
      division: division.toUpperCase(),
      role: 'student'
    };
    
    console.log('\n🔍 DEBUG - User Data Before Creation:');
    console.log('   spuId:', userData.spuId);
    console.log('   age:', userData.age);
    console.log('   rollNumber:', userData.rollNumber);
    console.log('   division:', userData.division);
    
    const user = await User.create(userData);
    
    console.log('\n✅ User Created Successfully:');
    console.log('   - ID:', user._id);
    console.log('   - Name:', user.fullName);
    console.log('   - Email:', user.email);
    console.log('   - Mobile:', user.mobileNumber);
    console.log('   - Gender:', user.gender);
    console.log('   - Age:', user.age);
    console.log('   - SPU ID:', user.spuId);
    console.log('   - Roll Number:', user.rollNumber);
    console.log('   - Department:', user.department);
    console.log('   - Division:', user.division);
    console.log('   - Role:', user.role);
    
    const token = generateToken(user._id);
    
    console.log('🎫 JWT Token Generated for new user');
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    if (req.session) {
      req.session.token = token;
      req.session.userId = user._id.toString();
    }
    
    console.log('✅ REGISTRATION SUCCESSFUL');
    console.log('   - Redirecting to: /user/dashboard');
    console.log('========================================\n');
    
    return res.redirect('/user/dashboard');
    
  } catch (error) {
    console.error('========================================');
    console.error('❌ REGISTRATION ERROR');
    console.error('========================================');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      console.error('Validation Errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}:`, error.errors[key].message);
      });
    }
    
    console.error('========================================\n');
    
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        errorMessage = 'Email already registered';
      } else if (error.keyPattern.mobileNumber) {
        errorMessage = 'Mobile number already registered';
      } else if (error.keyPattern.rollNumber) {
        errorMessage = 'Roll number already registered';
      } else if (error.keyPattern.spuId) {
        errorMessage = 'SPU ID already registered';
      }
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      errorMessage = messages.join(', ');
    }
    
    const colleges = await College.find({ isActive: true })
      .sort({ name: 1 })
      .select('name departments')
      .lean();
    res.render('auth/register', {
      title: 'Register - HTI',
      error: errorMessage,
      colleges,
      user: null
    });
  }
};

// ====================================
// LOGOUT
// ====================================
exports.logout = (req, res) => {
  console.log('\n========================================');
  console.log('🔓 LOGOUT REQUEST');
  console.log('========================================');
  console.log('👤 User:', req.user?.fullName || 'Unknown');
  console.log('⏰ Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  
  res.clearCookie('token', { 
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  console.log('🍪 Cookie Cleared: token');
  
  res.clearCookie('connect.sid', { path: '/' });
  
  console.log('🍪 Cookie Cleared: connect.sid');
  
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session Destroy Error:', err.message);
      } else {
        console.log('💾 Session Destroyed');
      }
    });
  }
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');
  
  console.log('📋 No-Cache Headers Set');
  
  req.user = null;
  
  console.log('✅ LOGOUT SUCCESSFUL');
  console.log('   - Redirecting to: /auth/login');
  console.log('========================================\n');
  
  res.redirect('/auth/login?success=' + encodeURIComponent('Logged out successfully'));
};

module.exports = exports;
