const express = require('express');
const { getUsers, createUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, adminOnly, getUsers);
router.post('/', protect, adminOnly, createUser);

module.exports = router;