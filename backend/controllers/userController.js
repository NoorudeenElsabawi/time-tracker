const User = require('../models/User');
const { validateNewUser } = require('../utils/validateUser');

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

// POST /api/users  (Administrator only)
// The support team issues logins (there is no public registration).
// The password is hashed by the User model before it is saved, and never returned.
const createUser = async (req, res) => {
    const errors = validateNewUser(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Check the highlighted fields and try again.', errors });
    }

    const email = req.body.email.trim().toLowerCase();
    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({
                message: 'Check the highlighted fields and try again.',
                errors: { email: 'A user with this email already exists' },
            });
        }

        const user = await User.create({
            name: req.body.name.trim(),
            email,
            password: req.body.password,
            role: req.body.role,
        });

        res.status(201).json({ _id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsers, createUser };