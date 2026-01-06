const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Middleware to redirect if already logged in
const redirectIfAuthenticated = (req, res, next) => {
  const token = req.cookies.token || req.session.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check user role and redirect accordingly
      const User = require('../models/User');
      User.findById(decoded.id).then(user => {
        if (user && user.role === 'admin') {
          return res.redirect('/admin/dashboard');
        } else if (user) {
          return res.redirect('/user/dashboard');
        } else {
          next();
        }
      }).catch(() => next());
    } catch (error) {
      next();
    }
  } else {
    next();
  }
};

// Login
router.get('/login', redirectIfAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

// Register
router.get('/register', redirectIfAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
