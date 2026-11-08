const express = require('express');
const { getUsers, getUser, createUser, updateUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// All user management is for Administrators only
router.get('/', protect, adminOnly, getUsers);
router.post('/', protect, adminOnly, createUser);
router.get('/:id', protect, adminOnly, getUser);
router.put('/:id', protect, adminOnly, updateUser);

module.exports = router;