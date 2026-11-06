const express = require('express');
const { createJob, getMyJobs } = require('../controllers/jobController');
const { protect, adminOnly, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, adminOnly, createJob);
router.get('/mine', protect, requireRole('standard'), getMyJobs);

module.exports = router;