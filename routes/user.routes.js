const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../controllers/user.controller');
const packageController = require('../controllers/package.controller');
const busController = require('../controllers/bus.controller');

// Middleware
const { isAuthenticated, isStudent } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(isAuthenticated);
router.use(isStudent);

// ====================================
// DASHBOARD
// ====================================
router.get('/dashboard', userController.getDashboard);

// ====================================
// PACKAGE SELECTION (COLLEGE-WISE)
// ====================================
// ✅ Use userController.getSelectPackagePage (college filter + future dates)
router.get('/select-package', userController.getSelectPackagePage);

// ✅ Package select POST (already college check inside)
router.post('/select-package', userController.selectPackage);

// ====================================
// EXTRA PLACES SELECTION
// ====================================
router.get('/select-extra-places', packageController.getSelectExtraPlaces);
router.post('/select-extra-places', packageController.postSelectExtraPlaces);

// ====================================
// BUS SELECTION
// ====================================
router.get('/select-bus', userController.getSelectBus);
router.post('/select-bus', userController.selectBus);

// ====================================
// RECEIPT
// ====================================
router.get('/view-receipt', userController.viewReceipt);
router.get('/download-receipt', userController.downloadReceipt);

module.exports = router;
