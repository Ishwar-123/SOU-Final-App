const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const exportController = require('../controllers/export.controller');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// ==================== APPLY MIDDLEWARE TO ALL ROUTES ====================
router.use(isAuthenticated);
router.use(isAdmin);

// ==================== DASHBOARD ====================
router.get('/dashboard', adminController.getDashboard);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.createUser);
router.post('/users/reset-password', adminController.resetUserPassword);
router.post('/users/update-role', adminController.updateUserRole);
router.post('/users/delete', adminController.deleteUser);

// ✅ NEW: UPDATE PAYMENT STATUS
router.post('/users/update-payment', adminController.updateUserPaymentStatus);

// ==================== COLLEGES ====================
router.get('/colleges', adminController.getColleges);
router.post('/colleges/create', adminController.createCollege);
router.post('/colleges/update', adminController.updateCollege);
router.post('/colleges/delete', adminController.deleteCollege);

// ==================== PLACES ====================
router.get('/places', adminController.getPlaces);
router.post('/places/create', adminController.createPlace);
router.post('/places/update', adminController.updatePlace);
router.post('/places/delete', adminController.deletePlace);

// ==================== PACKAGES ====================
router.get('/packages', adminController.getPackages);
router.post('/packages/create', adminController.createPackage);
router.post('/packages/update', adminController.updatePackage);
router.post('/packages/delete', adminController.deletePackage);

// ==================== BUSES ====================
router.get('/buses', adminController.getBuses);
router.post('/buses/create', adminController.createBus);
router.post('/buses/update', adminController.updateBus);
router.post('/buses/delete', adminController.deleteBus);

// ==================== EXPORT DATA ====================
router.get('/export', exportController.getExportPage);
router.post('/export/download', exportController.downloadCollegeCSV);

module.exports = router;
