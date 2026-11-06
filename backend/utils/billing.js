// Billing rule (assumption A7):
// - Every job is charged the call-out fee plus a minimum of one 15-minute labour block.
// - After that, a partial 15-minute interval is charged as a full block only if it reaches 5 minutes.
// - The rule is applied once, to the total time across all start/stop segments.
const BLOCK_MINUTES = 15;
const PARTIAL_THRESHOLD_MINUTES = 5;
const MS_PER_MINUTE = 60 * 1000;

// Total time worked across all segments, in milliseconds. An open segment counts up to `now`.
const totalWorkedMs = (segments = [], now = new Date()) =>
    segments.reduce((total, seg) => {
        const start = new Date(seg.start).getTime();
        const end = seg.end ? new Date(seg.end).getTime() : new Date(now).getTime();
        return total + Math.max(0, end - start);
    }, 0);

// Number of billable 15-minute blocks for a given amount of worked time (in milliseconds).
const billableBlocks = (workedMs) => {
    const blockMs = BLOCK_MINUTES * MS_PER_MINUTE;
    const fullBlocks = Math.floor(workedMs / blockMs);
    const remainderMs = workedMs - fullBlocks * blockMs;
    const partialBlock = remainderMs >= PARTIAL_THRESHOLD_MINUTES * MS_PER_MINUTE ? 1 : 0;
    return Math.max(1, fullBlocks + partialBlock);
};

const roundCents = (amount) => Math.round(amount * 100) / 100;

// Full cost breakdown for a job, shown to Administrators only.
const calculateCost = (job, now = new Date()) => {
    const workedMs = totalWorkedMs(job.timeSegments, now);
    const blocks = billableBlocks(workedMs);
    const labourCost = roundCents(blocks * job.labourRate);
    return {
        totalMinutes: Math.floor(workedMs / MS_PER_MINUTE),
        billableBlocks: blocks,
        calloutFee: roundCents(job.calloutFee),
        labourRate: roundCents(job.labourRate),
        labourCost,
        totalCost: roundCents(job.calloutFee + labourCost),
    };
};

module.exports = { BLOCK_MINUTES, PARTIAL_THRESHOLD_MINUTES, totalWorkedMs, billableBlocks, calculateCost };