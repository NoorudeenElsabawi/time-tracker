const Job = require('../models/Job');
const { JOB_STATUSES } = require('../models/Job');
const User = require('../models/User');
const { validateJobInput } = require('../utils/validateJob');
const {
    TIMER_TRANSITIONS, checkTransition, ADMIN_TRANSITIONS, checkAdminTransition,
} = require('../utils/jobTransitions');
const { calculateCost } = require('../utils/billing');

// POST /api/jobs  (Administrator only)
// Creates a job from the booking system details and assigns it to a technician.
const createJob = async (req, res) => {
    const errors = validateJobInput(req.body);
    if (Object.keys(errors).length) {
        return res.status(400).json({ message: 'Check the highlighted fields and try again.', errors });
    }

    const { jobNumber, customerName, address, technician, calloutFee, labourRate } = req.body;

    try {
        // The assigned user must exist and be a Standard User (technician)
        const tech = await User.findById(technician).catch(() => null);
               if (!tech || tech.role !== 'standard' || tech.active === false) {
            return res.status(400).json({
                message: 'Check the highlighted fields and try again.',
                errors: { technician: 'Select a valid technician' },
            });
        }

        if (await Job.findOne({ jobNumber: jobNumber.trim() })) {
            return res.status(400).json({
                message: 'Check the highlighted fields and try again.',
                errors: { jobNumber: 'A job with this number already exists' },
            });
        }

        const job = await Job.create({
            jobNumber,
            customerName,
            address,
            technician,
            calloutFee: Number(calloutFee),
            labourRate: Number(labourRate),
            createdBy: req.user.id,
        });

        const populated = await job.populate('technician', 'name email');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/jobs/mine  (Standard User only)
// Returns only the jobs assigned to the logged-in technician.
// Cost fields are left out: technicians do not see pricing.
const getMyJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ technician: req.user.id })
            .select('jobNumber customerName address status updatedAt')
            .sort({ updatedAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fields a technician may see on a single job (no pricing)
const TECHNICIAN_FIELDS = 'jobNumber customerName address status notes timeSegments submittedAt updatedAt';

// GET /api/jobs/:id  (Standard User only)
// A technician can open only a job assigned to them. Anyone else's job looks like it doesn't exist.
const getMyJob = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, technician: req.user.id })
            .select(TECHNICIAN_FIELDS)
            .catch(() => null);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json({ job, serverTime: new Date() });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/jobs/:id/start | /stop | /resume | /submit  (Standard User only)
// Times come from the server clock. The status check is part of the database update itself,
// so two quick taps (or two devices) can't apply the same action twice.
const timerAction = (action) => async (req, res) => {
    const rule = TIMER_TRANSITIONS[action];
    const now = new Date();
    const filter = { _id: req.params.id, technician: req.user.id, status: rule.from };

    let update;
    let options = { new: true };
    if (action === 'stop') {
        // Close the open segment
        update = { $set: { status: rule.to, 'timeSegments.$[open].end': now } };
        options = { new: true, arrayFilters: [{ 'open.end': null }] };
    } else if (action === 'submit') {
        // Only allowed from Stopped, so there is never an open segment; the job is now locked
        update = { $set: { status: rule.to, submittedAt: now } };
    } else {
        // start / resume: open a new segment
        update = { $set: { status: rule.to }, $push: { timeSegments: { start: now, end: null } } };
    }

    try {
        const job = await Job.findOneAndUpdate(filter, update, options).select(TECHNICIAN_FIELDS).catch(() => null);
        if (job) return res.json({ job, serverTime: now });

        // Nothing updated: either the job isn't theirs, or it's in the wrong status
        const existing = await Job.findOne({ _id: req.params.id, technician: req.user.id }).catch(() => null);
        if (!existing) return res.status(404).json({ message: 'Job not found' });
        const { error } = checkTransition(action, existing.status);
        return res.status(409).json({ message: error });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Names to fill in when an Administrator views a job
const ADMIN_POPULATE = [
    { path: 'technician', select: 'name email' },
    { path: 'approvedBy', select: 'name' },
];

// GET /api/jobs/:id for an Administrator: the full job, including pricing and the calculated cost.
const getJobForAdmin = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate(ADMIN_POPULATE).catch(() => null);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        const now = new Date();
        res.json({ job, cost: calculateCost(job, now), serverTime: now });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/jobs/:id: Administrators see the full job with cost; technicians see only their own job, without pricing.
const getJob = (req, res) => (req.user.role === 'admin' ? getJobForAdmin(req, res) : getMyJob(req, res));

// GET /api/jobs?status=submitted  (Administrator only)
// Every job with its technician's name, newest activity first. Optional status filter.
const getAllJobs = async (req, res) => {
    const filter = {};
    if (req.query.status) {
        if (!JOB_STATUSES.includes(req.query.status)) {
            return res.status(400).json({ message: `Status must be one of: ${JOB_STATUSES.join(', ')}` });
        }
        filter.status = req.query.status;
    }
    try {
        const jobs = await Job.find(filter)
            .select('jobNumber customerName address technician status updatedAt')
            .populate('technician', 'name')
            .sort({ updatedAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/jobs/:id/review | /approve  (Administrator only)
// review: Submitted -> Under review.  approve: Under review -> Approved (ready for invoicing).
// As with the timer, the status check is part of the update, so a job can't be approved twice.
const adminAction = (action) => async (req, res) => {
    const rule = ADMIN_TRANSITIONS[action];
    const now = new Date();
    const changes = action === 'review'
        ? { status: rule.to, reviewStartedAt: now }
        : { status: rule.to, approvedAt: now, approvedBy: req.user.id };

    try {
        const job = await Job.findOneAndUpdate({ _id: req.params.id, status: rule.from }, { $set: changes }, { new: true })
            .populate(ADMIN_POPULATE)
            .catch(() => null);
        if (job) return res.json({ job, cost: calculateCost(job, now), serverTime: now });

        const existing = await Job.findById(req.params.id).catch(() => null);
        if (!existing) return res.status(404).json({ message: 'Job not found' });
        const { error } = checkAdminTransition(action, existing.status);
        return res.status(409).json({ message: error });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createJob, getAllJobs, getMyJobs, getMyJob, getJob, timerAction, adminAction };