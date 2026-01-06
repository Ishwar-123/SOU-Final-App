require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const os = require('os'); // ✅ Added for network IP detection
const connectDB = require('./config/db');

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/user', require('./routes/user.routes'));

// Home Route
app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'The page you are looking for does not exist',
    user: req.user || null
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong on our end',
    user: req.user || null
  });
});

// ✅ Function to get Local Network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ✅ Start Server - Listen on ALL network interfaces (0.0.0.0)
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // ✅ Listen on all network interfaces

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  
  console.log('\n========================================');
  console.log('🚀 SERVER STARTED SUCCESSFULLY!');
  console.log('========================================\n');
  
  console.log('📍 Access URLs:');
  console.log(`   Local:            http://localhost:${PORT}`);
  console.log(`   Network (Mobile): http://${localIP}:${PORT}`);
  console.log('');
  
  console.log('👤 Admin Credentials:');
  console.log('   Email:    admin@hti.com');
  console.log('   Password: (your admin password)');
  console.log('');
  
  console.log('📱 Mobile Access Instructions:');
  console.log('   1. Connect mobile to SAME WiFi as this computer');
  console.log(`   2. Open browser and go to: http://${localIP}:${PORT}`);
  console.log('   3. You can now test on mobile! 🎉');
  console.log('');
  
  console.log('========================================\n');
});
