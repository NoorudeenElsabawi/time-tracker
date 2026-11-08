const User = require('../models/User');
const { validateNewUser, validateUserUpdate } = require('../utils/validateUser');

const USER_FIELDS = 'name email role active';

// Never send the password back
const publicUser = (user) => ({
    _id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active !== false,
});

// GET /api/users?role=standard&active=true  (Administrator only)
// Lists users without their passwords. The job form asks for active technicians only.
const getUsers = async (req, res) => {
    try {
        const filter = {};
        if (req.query.role) {
            if (!['admin', 'standard'].includes(req.query.role)) {
                return res.status(400).json({ message: 'Role must be admin or standard' });
            }
            filter.role = req.query.role;
        }
        if (req.query.active === 'true') filter.active = { $ne: false };

        const users = await User.find(filter).select(USER_FIELDS).sort({ name: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/users/:id  (Administrator only)
const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).select(USER_FIELDS).catch(() => null);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(publicUser(user));
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

        res.status(201).json(publicUser(user));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/users/:id  (Administrator only) – SCRUM-19
// Edits name, email and role, and deactivates or reactivates the account.
// Deactivated users keep their job history but can no longer log in.
const updateUser = async (req, res) => {
    const errors = validateUserUpdate(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Check the highlighted fields and try again.', errors });
    }

    // An Administrator cannot lock themselves out
    const isSelf = String(req.params.id) === String(req.user.id);
    if (isSelf && req.body.active === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    if (isSelf && req.body.role !== req.user.role) {
        return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const email = req.body.email.trim().toLowerCase();
    try {
        const user = await User.findOne({ _id: req.params.id }).catch(() => null);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (await User.exists({ email, _id: { $ne: user._id } })) {
            return res.status(400).json({
                message: 'Check the highlighted fields and try again.',
                errors: { email: 'A user with this email already exists' },
            });
        }

        user.name = req.body.name.trim();
        user.email = email;
        user.role = req.body.role;
        if (typeof req.body.active === 'boolean') user.active = req.body.active;

        await user.save();
        res.json(publicUser(user));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsers, getUser, createUser, updateUser };