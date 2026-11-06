const express = require('express');
const { createJob } = require('../controllers/jobController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, adminOnly, createJob);

module.exports = router;