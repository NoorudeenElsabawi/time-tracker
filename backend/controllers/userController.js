const User = require('../models/User');

// GET /api/users?role=standard  (Administrator only)
// Lists users without their passwords. Used for the technician dropdown when creating a job.
const getUsers = async (req, res) => {
    try {
        const filter = {};
        if (req.query.role) {
            if (!['admin', 'standard'].includes(req.query.role)) {
                return res.status(400).json({ message: 'Role must be admin or standard' });
            }
            filter.role = req.query.role;
        }
        const users = await User.find(filter).select('name email role').sort({ name: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsers };