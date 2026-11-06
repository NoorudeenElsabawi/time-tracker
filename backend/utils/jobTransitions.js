// Allowed timer actions for a Standard User, taken from the state machine diagram.
// Any other combination is rejected, so a job can never skip or reverse a step.
const TIMER_TRANSITIONS = {
    start: { from: 'not_started', to: 'in_progress', error: 'This job has already been started' },
    stop: { from: 'in_progress', to: 'stopped', error: 'You can only stop a job that is in progress' },
    resume: { from: 'stopped', to: 'in_progress', error: 'You can only resume a job that is stopped' },
};

// Returns { ok: true, to } if the action is allowed from the current status,
// otherwise { ok: false, error }.
const checkTransition = (action, currentStatus) => {
    const rule = TIMER_TRANSITIONS[action];
    if (!rule) return { ok: false, error: 'Unknown action' };
    if (currentStatus !== rule.from) return { ok: false, error: rule.error };
    return { ok: true, to: rule.to };
};

module.exports = { TIMER_TRANSITIONS, checkTransition };