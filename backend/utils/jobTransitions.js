// Allowed actions for a Standard User, taken from the state machine diagram.
// Any other combination is rejected, so a job can never skip or reverse a step.
const TIMER_TRANSITIONS = {
    start: { from: 'not_started', to: 'in_progress', error: 'This job has already been started' },
    stop: { from: 'in_progress', to: 'stopped', error: 'You can only stop a job that is in progress' },
    resume: { from: 'stopped', to: 'in_progress', error: 'You can only resume a job that is stopped' },
    submit: { from: 'stopped', to: 'submitted', error: 'Stop the timer before submitting this job' },
};

// Once submitted, only the support team (Administrator) can change a job.
const LOCKED_STATUSES = ['submitted', 'under_review', 'approved'];
const LOCKED_ERROR = 'This job has been submitted and is locked. Contact the support team to make changes.';

// Returns { ok: true, to } if the action is allowed from the current status,
// otherwise { ok: false, error }.
const checkTransition = (action, currentStatus) => {
    const rule = TIMER_TRANSITIONS[action];
    if (!rule) return { ok: false, error: 'Unknown action' };
    if (LOCKED_STATUSES.includes(currentStatus)) return { ok: false, error: LOCKED_ERROR };
    if (currentStatus !== rule.from) return { ok: false, error: rule.error };
    return { ok: true, to: rule.to };
};

// Review actions for an Administrator (support team), also from the state machine.
const ADMIN_TRANSITIONS = {
    review: { from: 'submitted', to: 'under_review', error: 'Only a submitted job can be put under review' },
    approve: { from: 'under_review', to: 'approved', error: 'Start the review before approving this job' },
};

const checkAdminTransition = (action, currentStatus) => {
    const rule = ADMIN_TRANSITIONS[action];
    if (!rule) return { ok: false, error: 'Unknown action' };
    if (currentStatus !== rule.from) return { ok: false, error: rule.error };
    return { ok: true, to: rule.to };
};

module.exports = { TIMER_TRANSITIONS, LOCKED_STATUSES, checkTransition, ADMIN_TRANSITIONS, checkAdminTransition };