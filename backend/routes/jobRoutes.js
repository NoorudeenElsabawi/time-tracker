const express = require('express');
const {
    createJob, getAllJobs, getMyJobs, getJob, timerAction, adminAction,
} = require('../controllers/jobController');
const { protect, adminOnly, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

const technicianOnly = requireRole('standard');

router.get('/', protect, adminOnly, getAllJobs);
router.post('/', protect, adminOnly, createJob);
router.get('/mine', protect, technicianOnly, getMyJobs);
router.get('/:id', protect, getJob);
router.post('/:id/start', protect, technicianOnly, timerAction('start'));
router.post('/:id/stop', protect, technicianOnly, timerAction('stop'));
router.post('/:id/resume', protect, technicianOnly, timerAction('resume'));
router.post('/:id/submit', protect, technicianOnly, timerAction('submit'));
router.post('/:id/review', protect, adminOnly, adminAction('review'));
router.post('/:id/approve', protect, adminOnly, adminAction('approve'));

module.exports = router;