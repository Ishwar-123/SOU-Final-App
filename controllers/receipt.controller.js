const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const User = require('../models/User');
const Package = require('../models/Package');

exports.downloadReceipt = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate({
        path: 'selectedPackage',
        populate: [
          { path: 'college', select: 'name' },
          { path: 'places', select: 'name price location' },
        ],
      })
      .lean();

    if (!user || !user.selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'You have not selected any package',
      });
    }

    const pkg = user.selectedPackage;

    // Generate QR code
    const qrData = `
User: ${user.fullName}
Email: ${user.email}
Package: ${pkg.name}
Booking Date: ${new Date(user.packageSelectedAt).toLocaleDateString('en-IN')}
Amount: ₹${pkg.price}
Booking ID: PKG-${user._id.toString().slice(-8).toUpperCase()}
    `.trim();

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
    });

    // Create PDF with A4 size
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
    });

    // Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Receipt-${user._id}.pdf"`
    );

    doc.pipe(res);

    // ==================== HEADER SECTION ====================
    // Top border
    doc
      .rect(50, 50, 495, 2)
      .fillAndStroke('#4F46E5', '#4F46E5');

    // Logo & Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('🏛️ HERITAGE TOURISM INDIA', { align: 'center', margin: 0 });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Explore India Heritage Sites', { align: 'center' })
      .text('www.heritagetourismindia.com | Ph: +91-XXX-XXX-XXXX', {
        align: 'center',
      });

    doc.moveDown(0.8);

    // ==================== BOOKING CONFIRMATION HEADER ====================
    doc
      .rect(50, doc.y, 495, 35)
      .fillAndStroke('#4F46E5', '#4F46E5');

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('BOOKING CONFIRMATION', 60, doc.y + 8, { width: 475 });

    doc.moveDown(1.5);

    // ==================== RECEIPT ID & DATE ====================
    const receiptId = `PKG-${user._id.toString().slice(-8).toUpperCase()}`;
    const bookingDate = new Date(user.packageSelectedAt);

    doc
      .rect(50, doc.y, 495, 50)
      .fillAndStroke('#F3F4F6', '#E5E7EB');

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text(`Receipt ID: ${receiptId}`, 60, doc.y + 8);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text(
        `Booking Date: ${bookingDate.toLocaleDateString('en-IN')} at ${bookingDate.toLocaleTimeString('en-IN')}`,
        60,
        doc.y + 3
      )
      .text(
        `Generated: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
        60,
        doc.y
      );

    doc.moveDown(1.5);

    // ==================== PASSENGER DETAILS ====================
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('📌 PASSENGER DETAILS', 50, doc.y);

    doc.moveDown(0.3);

    doc
      .rect(50, doc.y, 495, 70)
      .fillAndStroke('#F0F4FF', '#C7D2FE');

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#1F2937');

    const passengerY = doc.y + 8;
    doc.text(`Name: ${user.fullName}`, 60, passengerY);
    doc.text(`Email: ${user.email}`, 60, passengerY + 16);
    doc.text(`College: ${pkg.college.name}`, 60, passengerY + 32);
    doc.text(
      `Member Since: ${new Date(user.createdAt).toLocaleDateString('en-IN')}`,
      60,
      passengerY + 48
    );

    doc.moveDown(2.5);

    // ==================== PACKAGE DETAILS ====================
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('📦 PACKAGE DETAILS', 50, doc.y);

    doc.moveDown(0.3);

    doc
      .rect(50, doc.y, 495, 80)
      .fillAndStroke('#F5F3FF', '#DDD6FE');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#4F46E5')
      .text(`${pkg.name}`, 60, doc.y + 8);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#4B5563')
      .text(`${pkg.description}`, 60, doc.y + 5, { width: 450 });

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text(`Duration: ${pkg.duration} Days`, 60, doc.y + 8);

    doc.moveDown(2.5);

    // ==================== HERITAGE SITES ====================
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('🏛️ HERITAGE SITES INCLUDED', 50, doc.y);

    doc.moveDown(0.3);

    let siteY = doc.y;
    pkg.places.forEach((place, idx) => {
      // Site box
      doc
        .rect(50, siteY, 495, 50)
        .fillAndStroke('#FFFBEB', '#FCD34D');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#92400E')
        .text(`${idx + 1}. ${place.name}`, 60, siteY + 8);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#78350F')
        .text(`📍 ${place.location}`, 60, siteY + 26);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#15803D')
        .text(`₹${place.price.toLocaleString('en-IN')}`, 420, siteY + 26);

      siteY += 55;
    });

    doc.y = siteY;
    doc.moveDown(0.5);

    // ==================== PRICE BREAKDOWN ====================
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('💰 PRICE BREAKDOWN', 50, doc.y);

    doc.moveDown(0.3);

    // Price table
    const tableTop = doc.y;
    const col1 = 60;
    const col2 = 400;

    doc
      .rect(50, tableTop, 495, 25)
      .fillAndStroke('#374151', '#1F2937');

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('Description', col1, tableTop + 8)
      .text('Amount', col2, tableTop + 8);

    // Items
    let tableY = tableTop + 25;
    const itemsTotal = pkg.places.reduce((sum, p) => sum + p.price, 0);

    doc
      .rect(50, tableY, 495, 20)
      .fillAndStroke('#F9FAFB', '#E5E7EB');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#1F2937')
      .text('Heritage Sites Total', col1, tableY + 5)
      .text(`₹${itemsTotal.toLocaleString('en-IN')}`, col2, tableY + 5);

    tableY += 20;

    // Taxes (if any)
    doc
      .rect(50, tableY, 495, 20)
      .fillAndStroke('#F9FAFB', '#E5E7EB');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#1F2937')
      .text('Package Service Fee', col1, tableY + 5)
      .text('₹0', col2, tableY + 5);

    tableY += 20;

    // TOTAL
    doc
      .rect(50, tableY, 495, 30)
      .fillAndStroke('#065F46', '#047857');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('TOTAL AMOUNT', col1, tableY + 8)
      .text(`₹${pkg.price.toLocaleString('en-IN')}`, col2, tableY + 8);

    doc.y = tableY + 30;
    doc.moveDown(1);

    // ==================== TERMS & CONDITIONS + QR CODE ====================
    const termsQRY = doc.y;

    // QR Code (Left side)
    if (qrCodeDataUrl) {
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, 60, termsQRY, { width: 110, height: 110 });
    }

    // Terms (Right side)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Terms & Conditions:', 180, termsQRY);

    const terms = [
      '✓ Valid ID proof required at booking time',
      '✓ Cancellation allowed 7 days before departure',
      '✓ Package includes transport & meals',
      '✓ Weather dependent itinerary changes allowed',
      '✓ Follow guide instructions (mandatory)',
      '✓ Emergency contact must be provided',
    ];

    let termsY = termsQRY + 20;
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#4B5563');

    terms.forEach(term => {
      doc.text(term, 180, termsY, { width: 330 });
      termsY += 13;
    });

    doc.moveDown(6);

    // ==================== FOOTER ====================
    // Bottom border
    doc
      .rect(50, doc.y, 495, 2)
      .fillAndStroke('#4F46E5', '#4F46E5');

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('Thank you for choosing Heritage Tourism India!', { align: 'center' });

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text(
        'Contact: support@heritagetourismindia.com | Ph: +91-XXX-XXX-XXXX',
        { align: 'center' }
      )
      .text('This is a digital receipt. Please keep it safe for your records.', {
        align: 'center',
      });

    // End PDF
    doc.end();
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: error.message,
    });
  }
};
