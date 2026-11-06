const Job = require('../models/Job');
const User = require('../models/User');
const { validateJobInput } = require('../utils/validateJob');

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
        if (!tech || tech.role !== 'standard') {
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

module.exports = { createJob };