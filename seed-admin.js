require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    console.log('\n========================================');
    console.log('🌱 ADMIN SEEDING SCRIPT');
    console.log('========================================\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hti.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    const adminMobile = process.env.ADMIN_MOBILE || '9999999999';
    
    console.log('\n📋 Admin Credentials from .env:');
    console.log('   - Email:', adminEmail);
    console.log('   - Password:', adminPassword);
    console.log('   - Name:', adminName);
    console.log('   - Mobile:', adminMobile);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('   - Updating password from .env...');
      
      // Update password to match .env
      existingAdmin.password = adminPassword; // Will be auto-hashed by pre-save hook
      existingAdmin.fullName = adminName;
      existingAdmin.mobileNumber = adminMobile;
      await existingAdmin.save();
      
      console.log('✅ Admin password UPDATED successfully!');
    } else {
      console.log('\n🔨 Creating new admin user...');
      
      // Create new admin
      await User.create({
        fullName: adminName,
        email: adminEmail,
        password: adminPassword, // Will be auto-hashed by pre-save hook
        mobileNumber: adminMobile,
        role: 'admin'
      });
      
      console.log('✅ Admin user CREATED successfully!');
    }
    
    console.log('\n========================================');
    console.log('✅ SEEDING COMPLETED!');
    console.log('========================================');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('==========================================');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('==========================================');
    console.log('\n🎯 Login at: http://localhost:3000/auth/login\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

seedAdmin();
