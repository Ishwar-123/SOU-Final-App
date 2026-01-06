require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find admin
    const admin = await User.findOne({ email: 'admin@hti.com' });
    
    if (!admin) {
      console.log('❌ Admin not found!');
      process.exit(1);
    }
    
    console.log('✅ Admin found');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.fullName);
    console.log('🔑 Role:', admin.role);
    console.log('🔐 Password Hash:', admin.password.substring(0, 20) + '...');
    
    // Test password
    const testPassword = 'admin123';
    const isMatch = await admin.comparePassword(testPassword);
    
    console.log('\n🧪 Testing password: "admin123"');
    console.log('✅ Password Match:', isMatch ? 'YES ✓' : 'NO ✗');
    
    if (!isMatch) {
      console.log('\n⚠️  Password is incorrect! Resetting...');
      admin.password = testPassword;
      await admin.save();
      console.log('✅ Password reset successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testLogin();
