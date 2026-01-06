require('dotenv').config();
const mongoose = require('mongoose');
const Package = require('./models/Package');
const Place = require('./models/Place');
const College = require('./models/College');

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully\n');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error);
    process.exit(1);
  }
};

// Seed Data
const seedPackages = async () => {
  try {
    console.log('🌱 Starting Package Seeding Process...\n');

    // ==================== GET ALL COLLEGES ====================
    const colleges = await College.find({ isActive: true });
    
    if (colleges.length === 0) {
      console.log('⚠️  No colleges found! Please add colleges first.');
      console.log('❌ Cannot proceed without colleges.\n');
      return;
    }

    console.log(`📚 Found ${colleges.length} active colleges\n`);

    // ==================== DELETE OLD PACKAGES AND PLACES ====================
    console.log('🗑️  Cleaning old packages and places...');
    await Package.deleteMany({});
    await Place.deleteMany({});
    console.log('✅ Old data cleaned\n');

    // ==================== CREATE PLACES ====================
    console.log('📍 Creating Day 1 Places...');
    
    const day1Places = await Place.insertMany([
      { name: 'Tea - Refreshment (Sahkar Bhavan)', location: 'Sahkar Bhavan', price: 100, description: 'Morning tea and refreshments', isActive: true },
      { name: 'Jungle Safari', location: 'Wildlife Sanctuary', price: 100, description: 'Exciting jungle safari experience', isActive: true },
      { name: 'Maze Garden', location: 'City Garden Complex', price: 50, description: 'Fun maze garden exploration', isActive: true },
      { name: 'Valley of Flowers', location: 'Valley Park', price: 0, description: 'Beautiful valley of flowers', isActive: true },
      { name: 'Dam View Point', location: 'Dam Site', price: 0, description: 'Scenic dam viewpoint', isActive: true },
      { name: 'Lunch (Sahkar Bhavan)', location: 'Sahkar Bhavan', price: 140, description: 'Delicious lunch', isActive: true },
      { name: 'Miyawaki Forest', location: 'Forest Conservation Area', price: 25, description: 'Dense Miyawaki forest', isActive: true },
      { name: 'SoU Entry', location: 'Statue of Unity Campus', price: 75, description: 'Entry to Statue of Unity', isActive: true },
      { name: 'SoU Viewing Gallery', location: 'Statue of Unity', price: 190, description: 'Viewing gallery inside statue', isActive: true },
      { name: 'Laser Show', location: 'Show Arena', price: 0, description: 'Spectacular laser show', isActive: true },
      { name: 'Dinner (Sahkar Bhavan)', location: 'Sahkar Bhavan', price: 110, description: 'Dinner', isActive: true }
    ]);

    console.log(`✅ Created ${day1Places.length} places for Day 1\n`);

    console.log('📍 Creating Day 2 Additional Places...');
    
    const day2ExtraPlaces = await Place.insertMany([
      { name: 'Tea - Refreshment (Day 2)', location: 'Sahkar Bhavan', price: 100, description: 'Morning tea day 2', isActive: true },
      { name: 'Cactus & Butterfly Garden', location: 'Garden Complex', price: 30, description: 'Cactus and butterfly garden', isActive: true },
      { name: 'Dam View Point (Day 2)', location: 'Dam Site', price: 0, description: 'Dam viewpoint day 2', isActive: true },
      { name: 'Kam Ham Park', location: 'City Park', price: 0, description: 'Recreational park', isActive: true },
      { name: 'Ekta Nursery', location: 'Nursery Area', price: 25, description: 'Plant nursery', isActive: true },
      { name: 'Dino Trail', location: 'Theme Park', price: 15, description: 'Dinosaur themed trail', isActive: true },
      { name: 'Lunch (Day 2)', location: 'Sahkar Bhavan', price: 140, description: 'Lunch day 2', isActive: true },
      { name: 'Arogya Van', location: 'Health Park', price: 25, description: 'Wellness park', isActive: true },
      { name: 'Ekta Mall', location: 'Shopping Mall', price: 0, description: 'Shopping mall', isActive: true },
      { name: 'Glow Garden', location: 'Garden Area', price: 50, description: 'Illuminated garden', isActive: true },
      { name: 'Night Stay Sahkar Bhavan', location: 'Sahkar Bhavan', price: 500, description: 'Overnight stay', isActive: true }
    ]);

    console.log(`✅ Created ${day2ExtraPlaces.length} additional places for Day 2\n`);

    const allPlacesForDay2 = [...day1Places, ...day2ExtraPlaces];

    // ✅ CREATE START DATES (7 days from now)
    const startDate1Day = new Date();
    startDate1Day.setDate(startDate1Day.getDate() + 7); // 1 week from today
    startDate1Day.setHours(0, 0, 0, 0);

    const startDate2Days = new Date();
    startDate2Days.setDate(startDate2Days.getDate() + 14); // 2 weeks from today
    startDate2Days.setHours(0, 0, 0, 0);

    console.log(`📅 Package Start Dates:`);
    console.log(`   1 Day Package: ${startDate1Day.toLocaleDateString('en-IN')}`);
    console.log(`   2 Days Package: ${startDate2Days.toLocaleDateString('en-IN')}\n`);

    // ==================== CREATE PACKAGES FOR EACH COLLEGE ====================
    let totalPackagesCreated = 0;

    for (const college of colleges) {
      console.log(`\n📦 Creating packages for: ${college.name}`);

      // Package 1: 1 Day
      const package1Day = await Package.create({
        name: '1 Day Heritage Package',
        college: college._id,
        description: 'Complete one-day heritage tour with bus, meals, and attractions including Jungle Safari, Statue of Unity, and Laser Show.',
        duration: 1,
        price: 1390,
        startDate: startDate1Day,  // ✅ ADD START DATE
        places: day1Places.map(p => p._id),
        isActive: true,
        isOptional: false,
        features: [
          '🚌 Bus Transportation (₹600)',
          '☕ Tea & Refreshments',
          '🍽️ Lunch & Dinner',
          '🦁 Jungle Safari',
          '🗿 Statue of Unity Access',
          '🎆 Laser Show'
        ],
        itinerary: [
          { time: '8:00 AM - 9:00 AM', activity: 'Tea & Refreshments' },
          { time: '9:30 AM - 1:00 PM', activity: 'Jungle Safari, Maze Garden, Valley, Dam' },
          { time: '1:00 PM - 2:00 PM', activity: 'Lunch' },
          { time: '2:00 PM - 4:00 PM', activity: 'Miyawaki Forest' },
          { time: '4:00 PM - 7:00 PM', activity: 'SoU Entry & Gallery' },
          { time: '7:30 PM', activity: 'Laser Show' },
          { time: '8:00 PM', activity: 'Dinner' },
          { time: '9:00 PM', activity: 'Return' }
        ]
      });

      // Package 2: 2 Days
      const package2Days = await Package.create({
        name: '2 Days Heritage Package',
        college: college._id,
        description: 'Extended two-day tour with bus, meals, night stay, and 20+ attractions including Jungle Safari, Glow Garden, and Dino Trail.',
        duration: 2,
        price: 2475,
        startDate: startDate2Days,  // ✅ ADD START DATE
        places: allPlacesForDay2.map(p => p._id),
        isActive: true,
        isOptional: false,
        features: [
          '🚌 Bus Transportation (₹900)',
          '☕ All Meals (Tea, Lunch, Dinner x2)',
          '🏨 Night Stay (₹500)',
          '🦁 Jungle Safari',
          '✨ Glow Garden',
          '🦕 Dino Trail',
          '🗿 Statue of Unity',
          '🎆 Laser Show'
        ],
        itinerary: [
          { time: 'Day 1 - 8:00 AM', activity: 'Tea & Refreshments' },
          { time: 'Day 1 - 9:30 AM - 1:00 PM', activity: 'Jungle Safari, Gardens, Dam' },
          { time: 'Day 1 - 1:00 PM', activity: 'Lunch' },
          { time: 'Day 1 - 3:00 PM', activity: 'Miyawaki Forest' },
          { time: 'Day 1 - 4:00 PM - 7:00 PM', activity: 'SoU Access' },
          { time: 'Day 1 - 7:30 PM', activity: 'Laser Show' },
          { time: 'Day 1 - 8:00 PM', activity: 'Dinner' },
          { time: 'Day 1 - 9:00 PM', activity: 'Glow Garden' },
          { time: 'Day 1 - 10:30 PM', activity: 'Night Stay' },
          { time: 'Day 2 - 8:00 AM', activity: 'Tea' },
          { time: 'Day 2 - 9:30 AM - 12:00 PM', activity: 'Cactus Garden, Parks, Nursery' },
          { time: 'Day 2 - 9:30 AM - 1:00 PM', activity: 'Dino Trail' },
          { time: 'Day 2 - 1:00 PM', activity: 'Lunch' },
          { time: 'Day 2 - 2:00 PM', activity: 'Arogya Van' },
          { time: 'Day 2 - 3:00 PM', activity: 'Ekta Mall' },
          { time: 'Day 2 - 5:00 PM', activity: 'Return' }
        ]
      });

      console.log(`   ✅ 1 Day Package (₹1,390) - Starts ${startDate1Day.toLocaleDateString('en-IN')}`);
      console.log(`   ✅ 2 Days Package (₹2,475) - Starts ${startDate2Days.toLocaleDateString('en-IN')}`);
      totalPackagesCreated += 2;
    }

    // ==================== SUMMARY ====================
    console.log('\n═══════════════════════════════════════════════');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════');
    console.log(`📚 Colleges: ${colleges.length}`);
    console.log(`📍 Places Created: ${day1Places.length + day2ExtraPlaces.length}`);
    console.log(`📦 Total Packages Created: ${totalPackagesCreated}`);
    console.log(`   • ${colleges.length} × 1 Day Package (₹1,390 each)`);
    console.log(`   • ${colleges.length} × 2 Days Package (₹2,475 each)`);
    console.log(`📅 Start Dates:`);
    console.log(`   • 1 Day: ${startDate1Day.toLocaleDateString('en-IN')}`);
    console.log(`   • 2 Days: ${startDate2Days.toLocaleDateString('en-IN')}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
};

// Main Function
const main = async () => {
  try {
    await connectDB();
    await seedPackages();
    console.log('✅ All packages seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

main();
