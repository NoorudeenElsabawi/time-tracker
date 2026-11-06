const mongoose = require('mongoose');

// Job statuses follow the state machine diagram:
// not_started -> in_progress <-> stopped -> submitted -> under_review <-> approved
const JOB_STATUSES = ['not_started', 'in_progress', 'stopped', 'submitted', 'under_review', 'approved'];

// One continuous period of work. A new segment starts on Start/Resume and closes on Stop.
// Times are always set by the server clock, never sent from the technician's device.
const timeSegmentSchema = new mongoose.Schema(
    {
        start: { type: Date, required: true },
        end: { type: Date, default: null },
    },
    { _id: false }
);
const jobSchema = new mongoose.Schema(
    {
        jobNumber: { type: String, required: true, unique: true, trim: true },
        customerName: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        calloutFee: { type: Number, required: true, min: 0.01 },  // AUD, ex GST
        labourRate: { type: Number, required: true, min: 0.01 },  // AUD per 15-minute block, ex GST
        status: { type: String, enum: JOB_STATUSES, default: 'not_started' },
        notes: { type: String, default: '' },
        timeSegments: { type: [timeSegmentSchema], default: [] },
        submittedAt: { type: Date, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
module.exports.JOB_STATUSES = JOB_STATUSES;