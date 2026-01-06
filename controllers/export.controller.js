const User = require('../models/User');
const College = require('../models/College');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// ==================== EXPORT COLLEGE DATA ====================

// GET: Export page with college selection
exports.getExportPage = async (req, res) => {
  try {
    const colleges = await College.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    res.render('admin/export', {
      title: 'Export College Data - HTI',
      colleges,
      user: req.user,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Get export page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load export page',
      user: req.user
    });
  }
};

// POST: Generate and download CSV
exports.downloadCollegeCSV = async (req, res) => {
  try {
    const { collegeId, fields } = req.body; // fields: student, package, bus, pricing, dates
    console.log('\n========================================');
    console.log('📥 CSV EXPORT REQUEST');
    console.log('========================================');
    console.log('College ID:', collegeId);
    console.log('Fields:', fields);

    if (!collegeId) {
      return res.redirect('/admin/export?error=' + encodeURIComponent('Please select a college'));
    }

    // Normalise fields to array
    const selectedFields = Array.isArray(fields)
      ? fields
      : fields ? [fields] : [];

    if (selectedFields.length === 0) {
      return res.redirect('/admin/export?error=' + encodeURIComponent('Please select at least one data section'));
    }

    // Get college details
    const college = await College.findById(collegeId).lean();
    if (!college) {
      return res.redirect('/admin/export?error=' + encodeURIComponent('College not found'));
    }

    // Get all students from this college
    const students = await User.find({
      college: collegeId,
      role: 'student'
    })
      .populate('college', 'name')
      .populate({
        path: 'selectedPackage',
        populate: { path: 'places', select: 'name price' }
      })
      .populate('selectedBus', 'busName busNumber')
      .sort({ department: 1, fullName: 1 })
      .lean();

    console.log(`✅ Found ${students.length} students`);

    if (students.length === 0) {
      return res.redirect('/admin/export?error=' + encodeURIComponent('No students found for this college'));
    }

    // Prepare CSV data
    const csvData = students.map((student, index) => {
      // Base object
      const row = {
        sNo: index + 1
      };

      // Student details
      if (selectedFields.includes('student')) {
        row.fullName = student.fullName;
        row.email = student.email;
        row.spuId = student.spuId || '';                    // SPU ID
        row.rollNumber = student.rollNumber || '';          // 🔹 Roll No
        row.gender = student.gender || '';                  // 🔹 Gender
        row.age = typeof student.age === 'number' ? student.age : ''; // 🔹 Age
        row.department = student.department || 'Not Specified';
        row.collegeName = college.name;
      }

      // Package details (no extra places now)
      let packagePrice = 0;
      let packageName = 'Not Selected';
      let packagePlaces = '';

      if (student.selectedPackage) {
        packageName = student.selectedPackage.name;
        packagePrice = student.selectedPackage.price || 0;

        if (student.selectedPackage.places && student.selectedPackage.places.length > 0) {
          packagePlaces = student.selectedPackage.places
            .map(p => `${p.name} (Rs.${p.price})`)
            .join('; ');
        }
      }

      if (selectedFields.includes('package')) {
        row.packageName = packageName;
        row.packagePrice = packagePrice;
        row.packagePlaces = packagePlaces || 'N/A';
      }

      // Pricing (no extra places)
      const totalPrice = packagePrice;

      if (selectedFields.includes('pricing')) {
        row.totalPrice = totalPrice;
      }

      // Bus details
      if (selectedFields.includes('bus')) {
        row.busName = student.selectedBus ? student.selectedBus.busName : 'Not Selected';
        row.busNumber = student.selectedBus ? student.selectedBus.busNumber : 'N/A';
        row.seatNumber = student.seatNumber ? student.seatNumber : 'N/A';
      }

      // Dates
      if (selectedFields.includes('dates')) {
        row.packageSelectedDate = student.packageSelectedAt
          ? new Date(student.packageSelectedAt).toLocaleDateString('en-IN')
          : 'N/A';
        row.registrationDate = new Date(student.createdAt).toLocaleDateString('en-IN');
      }

      return row;
    });

    // Build CSV header dynamically
    const header = [
      { id: 'sNo', title: 'S.No' }
    ];

    if (selectedFields.includes('student')) {
      header.push(
        { id: 'fullName', title: 'Student Name' },
        { id: 'email', title: 'Email' },
        { id: 'spuId', title: 'SPU ID' },
        { id: 'rollNumber', title: 'Roll Number' },     // 🔹 Roll No column
        { id: 'gender', title: 'Gender' },              // 🔹 Gender column
        { id: 'age', title: 'Age' },                    // 🔹 Age column
        { id: 'department', title: 'Department' },
        { id: 'collegeName', title: 'College Name' }
      );
    }

    if (selectedFields.includes('package')) {
      header.push(
        { id: 'packageName', title: 'Package Name' },
        { id: 'packagePrice', title: 'Package Price (Rs)' },
        { id: 'packagePlaces', title: 'Package Places' }
      );
    }

    if (selectedFields.includes('pricing')) {
      header.push(
        { id: 'totalPrice', title: 'Total Price (Rs)' }
      );
    }

    if (selectedFields.includes('bus')) {
      header.push(
        { id: 'busName', title: 'Bus Name' },
        { id: 'busNumber', title: 'Bus Number' },
        { id: 'seatNumber', title: 'Seat Number' }
      );
    }

    if (selectedFields.includes('dates')) {
      header.push(
        { id: 'packageSelectedDate', title: 'Package Selected Date' },
        { id: 'registrationDate', title: 'Registration Date' }
      );
    }

    // Create CSV file
    const timestamp = Date.now();
    const fileName = `${college.name.replace(/\s+/g, '_')}_Students_${timestamp}.csv`;
    const tempDir = path.join(__dirname, '..', 'temp');
    const filePath = path.join(tempDir, fileName);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const csvWriter = createCsvWriter({
      path: filePath,
      encoding: 'utf8',
      header
    });

    await csvWriter.writeRecords(csvData);

    console.log('✅ CSV file created:', fileName);
    console.log('========================================\n');

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('❌ Export CSV error:', error);
    res.redirect('/admin/export?error=' + encodeURIComponent('Failed to export data: ' + error.message));
  }
};

module.exports = exports;
