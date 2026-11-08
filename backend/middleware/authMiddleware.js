const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Checks the login token and loads the user. Every protected route uses this first.
const protect = async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    let user;
    try {
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        user = await User.findById(decoded.id).select('-password');
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // A deactivated account loses access straight away, even with a token issued before deactivation
    if (user.active === false) {
        return res.status(401).json({ message: 'This account has been deactivated' });
    }

    req.user = user;
    next();
};

// Allows the request only if the logged-in user has one of the given roles.
// Use after protect, e.g. router.post('/', protect, adminOnly, createJob)
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
};

const adminOnly = requireRole('admin');

module.exports = { protect, requireRole, adminOnly };