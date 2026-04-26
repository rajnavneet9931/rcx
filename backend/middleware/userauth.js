// middleware/userAuth.js - Verifies customer JWT tokens
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId    = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};