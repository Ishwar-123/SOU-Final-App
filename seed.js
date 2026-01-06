require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const College = require('./models/College');
const Place = require('./models/Place');
const User = require('./models/User');
const Package = require('./models/Package');

// Heritage Places Data (27 places)
const placesData = [
  { name: 'Taj Mahal', description: 'Iconic white marble mausoleum built by Emperor Shah Jahan', location: 'Agra, Uttar Pradesh', category: 'Architectural' },
  { name: 'Red Fort', description: 'Historic fort and UNESCO World Heritage Site', location: 'Delhi', category: 'Historical' },
  { name: 'Qutub Minar', description: 'Tallest brick minaret in the world', location: 'Delhi', category: 'Architectural' },
  { name: 'Gateway of India', description: 'Iconic arch monument overlooking the Arabian Sea', location: 'Mumbai, Maharashtra', category: 'Historical' },
  { name: 'Hawa Mahal', description: 'Palace of Winds with distinctive pink facade', location: 'Jaipur, Rajasthan', category: 'Architectural' },
  { name: 'Amber Fort', description: 'Magnificent hilltop fort with stunning architecture', location: 'Jaipur, Rajasthan', category: 'Historical' },
  { name: 'Mysore Palace', description: 'Grand royal palace with Indo-Saracenic architecture', location: 'Mysore, Karnataka', category: 'Architectural' },
  { name: 'Ajanta Caves', description: 'Ancient Buddhist rock-cut cave monuments', location: 'Aurangabad, Maharashtra', category: 'Historical' },
  { name: 'Ellora Caves', description: 'Rock-cut cave temples representing three religions', location: 'Aurangabad, Maharashtra', category: 'Historical' },
  { name: 'Khajuraho Temples', description: 'Medieval Hindu and Jain temples with intricate sculptures', location: 'Khajuraho, Madhya Pradesh', category: 'Religious' },
  { name: 'Hampi', description: 'Ancient village with Vijayanagara Empire ruins', location: 'Karnataka', category: 'Historical' },
  { name: 'Konark Sun Temple', description: 'Ancient temple dedicated to the Sun God', location: 'Konark, Odisha', category: 'Religious' },
  { name: 'Sanchi Stupa', description: 'Buddhist complex with hemispherical structure', location: 'Sanchi, Madhya Pradesh', category: 'Religious' },
  { name: 'Fatehpur Sikri', description: 'Mughal city built by Emperor Akbar', location: 'Agra, Uttar Pradesh', category: 'Historical' },
  { name: 'Mahabalipuram', description: 'Ancient port city with rock-cut architecture', location: 'Tamil Nadu', category: 'Historical' },
  { name: 'Golconda Fort', description: 'Historic fort known for its acoustics and architecture', location: 'Hyderabad, Telangana', category: 'Historical' },
  { name: 'Charminar', description: 'Iconic monument with four minarets', location: 'Hyderabad, Telangana', category: 'Architectural' },
  { name: 'Victoria Memorial', description: 'Grand marble building dedicated to Queen Victoria', location: 'Kolkata, West Bengal', category: 'Historical' },
  { name: 'Meenakshi Temple', description: 'Historic Hindu temple with towering gopurams', location: 'Madurai, Tamil Nadu', category: 'Religious' },
  { name: 'Golden Temple', description: 'Sacred Sikh shrine with gold-plated dome', location: 'Amritsar, Punjab', category: 'Religious' },
  { name: 'Jallianwala Bagh', description: 'Memorial site of the 1919 massacre', location: 'Amritsar, Punjab', category: 'Historical' },
  { name: 'Bodh Gaya', description: 'Site of Buddha\'s enlightenment', location: 'Bihar', category: 'Religious' },
  { name: 'Nalanda University', description: 'Ancient center of learning and Buddhist monastery', location: 'Bihar', category: 'Historical' },
  { name: 'Elephanta Caves', description: 'Island caves with ancient Hindu sculptures', location: 'Mumbai, Maharashtra', category: 'Historical' },
  { name: 'Rani Ki Vav', description: 'Intricately constructed stepwell', location: 'Patan, Gujarat', category: 'Architectural' },
  { name: 'Jagannath Temple', description: 'Sacred Hindu temple dedicated to Lord Jagannath', location: 'Puri, Odisha', category: 'Religious' },
  { name: 'India Gate', description: 'War memorial dedicated to Indian soldiers', location: 'Delhi', category: 'Historical' }
];

// Sample Colleges Data
const collegesData = [
  {
    name: 'St. Xavier\'s College',
    department: 'Arts & Science',
    souAmbassadorName: 'Dr. Rajesh Kumar',
    souAmbassadorContact: '9876543210',
    numberOfBuses: 5
  },
  {
    name: 'Miranda House',
    department: 'Commerce',
    souAmbassadorName: 'Prof. Anjali Sharma',
    souAmbassadorContact: '9876543211',
    numberOfBuses: 3
  },
  {
    name: 'Hindu College',
    department: 'Engineering',
    souAmbassadorName: 'Dr. Vikram Singh',
    souAmbassadorContact: '9876543212',
    numberOfBuses: 4
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      College.deleteMany({}),
      Place.deleteMany({}),
      User.deleteMany({}),
      Package.deleteMany({})
    ]);
    
    // Seed Places
    console.log('📍 Seeding heritage places...');
    const places = await Place.insertMany(placesData);
    console.log(`✅ Added ${places.length} heritage places`);
    
    // Seed Colleges
    console.log('🏫 Seeding colleges...');
    const colleges = await College.insertMany(collegesData);
    console.log(`✅ Added ${colleges.length} colleges`);
    
    // Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('dnica@123', 10);
    await User.create({
      fullName: 'Admin User',
      email: 'admin@hti.com',
      password: adminPassword,
      mobileNumber: '9999999999',
      role: 'admin'
    });
    console.log('✅ Admin user created (email: admin@hti.com, password: dnica@123)');
    
    // Create Sample Student
    console.log('👨‍🎓 Creating sample student...');
    const studentPassword = await bcrypt.hash('student123', 10);
    await User.create({
      fullName: 'Student Demo',
      email: 'student@hti.com',
      password: studentPassword,
      mobileNumber: '8888888888',
      college: colleges[0]._id,
      department: 'Computer Science',
      role: 'student'
    });
    console.log('✅ Student user created (email: student@hti.com, password: student123)');
    
    // Create Sample Packages
    console.log('📦 Creating sample packages...');
    const packages = [
      {
        name: 'Golden Triangle Tour',
        college: colleges[0]._id,
        places: [places[0]._id, places[1]._id, places[2]._id, places[4]._id, places[5]._id],
        duration: 5,
        price: 100,
        description: 'Explore the magnificent monuments of Delhi, Agra, and Jaipur including the Taj Mahal, Red Fort, and Amber Fort.'
      },
      {
        name: 'South India Heritage Trail',
        college: colleges[0]._id,
        places: [places[6]._id, places[10]._id, places[14]._id, places[18]._id],
        duration: 7,
        price: 100,
        description: 'Discover the rich cultural heritage of South India with visits to Mysore Palace, Hampi, Mahabalipuram, and Meenakshi Temple.'
      },
      {
        name: 'Ancient India Explorer',
        college: colleges[1]._id,
        places: [places[7]._id, places[8]._id, places[9]._id, places[11]._id, places[12]._id],
        duration: 6,
        price: 100,
        description: 'Journey through ancient India with visits to UNESCO World Heritage Sites including Ajanta, Ellora, Khajuraho, and Sanchi.'
      }
    ];
    
    await Package.insertMany(packages);
    console.log(`✅ Added ${packages.length} sample packages`);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin - Email: admin@hti.com | Password: dnica@123');
    console.log('   Student - Email: student@hti.com | Password: student123');
    console.log('\n🚀 Run "npm run dev" to start the application');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
