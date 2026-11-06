const express = require('express');
const { createJob, getMyJobs, getMyJob, timerAction } = require('../controllers/jobController');
const { protect, adminOnly, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

const technicianOnly = requireRole('standard');

router.post('/', protect, adminOnly, createJob);
router.get('/mine', protect, technicianOnly, getMyJobs);
router.get('/:id', protect, technicianOnly, getMyJob);
router.post('/:id/start', protect, technicianOnly, timerAction('start'));
router.post('/:id/stop', protect, technicianOnly, timerAction('stop'));
router.post('/:id/resume', protect, technicianOnly, timerAction('resume'));
router.post('/:id/submit', protect, technicianOnly, timerAction('submit'));

module.exports = router;