const User = require('../models/User');
const Bus = require('../models/Bus');

// GET: Bus Selection Page
exports.getSelectBus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('college', 'name')
      .populate('selectedPackage', 'name')
      .populate('selectedBus', 'busName busNumber availableSeats capacity bookedSeats')
      .lean();

    if (!user.selectedPackage) {
      return res.redirect(
        '/user/select-package?error=' +
          encodeURIComponent('Please select package first')
      );
    }

    if (!user.college) {
      return res.redirect(
        '/user/dashboard?error=' +
          encodeURIComponent('No college assigned. Contact admin.')
      );
    }

    const buses = await Bus.find({
      college: user.college._id,
      isActive: true
    })
      .sort({ busName: 1 })
      .lean();

    res.render('user/select-bus', {
      title: 'Select Bus - HTI',
      user,
      buses,
      success: req.query.success,
      error: req.query.error,
    });
  } catch (error) {
    console.error('Get select bus error:', error);
    res.redirect(
      '/user/dashboard?error=' +
        encodeURIComponent('Unable to load bus selection')
    );
  }
};

// POST: Select Bus
exports.postSelectBus = async (req, res) => {
  try {
    const { busId } = req.body;
    const userId = req.user._id;

    console.log('\n========================================');
    console.log('🚌 BUS SELECTION');
    console.log('========================================');
    console.log('User ID:', userId);
    console.log('Bus ID:', busId);

    if (!busId) {
      return res.redirect(
        '/user/select-bus?error=' +
          encodeURIComponent('Please select a bus')
      );
    }

    const user = await User.findById(userId);
    const bus = await Bus.findById(busId);

    if (!bus) {
      return res.redirect(
        '/user/select-bus?error=' +
          encodeURIComponent('Bus not found')
      );
    }

    if (bus.availableSeats <= 0) {
      return res.redirect(
        '/user/select-bus?error=' +
          encodeURIComponent('Bus is fully booked')
      );
    }

    // If user already has a bus, free that seat first
    if (user.selectedBus) {
      const oldBus = await Bus.findById(user.selectedBus);
      if (oldBus) {
        oldBus.bookedSeats -= 1;
        oldBus.availableSeats += 1;
        await oldBus.save();
        console.log('✅ Freed seat in old bus:', oldBus.busName);
      }
    }

    // Book seat in new bus
    bus.bookedSeats += 1;
    bus.availableSeats -= 1;
    await bus.save();

    const seatNumber = bus.bookedSeats;

    user.selectedBus = busId;
    user.busSelectedAt = new Date();
    user.seatNumber = seatNumber;
    await user.save();

    console.log('✅ Bus selected:', bus.busName);
    console.log('✅ Seat number:', seatNumber);
    console.log('✅ Available seats:', bus.availableSeats);
    console.log('========================================\n');

    return res.redirect(
      '/user/dashboard?success=' +
        encodeURIComponent(`Bus booked successfully! Seat number: ${seatNumber}`)
    );
  } catch (error) {
    console.error('postSelectBus error:', error);
    return res.redirect(
      '/user/select-bus?error=' + encodeURIComponent(error.message)
    );
  }
};

module.exports = exports;
