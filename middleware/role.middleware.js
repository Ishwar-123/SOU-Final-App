// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You do not have permission to access this page',
    user: req.user
  });
};

// Check if user is student
exports.isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    return next();
  }
  
  return res.status(403).render('error', {
    title: 'Access Denied',
    message: 'This page is only accessible to students',
    user: req.user
  });
};
