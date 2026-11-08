// SCRUM-22: checks time segments corrected by an Administrator.
// Returns { index: 'error message' } for each segment with a problem (plus "general" for the list as a whole).
// An empty object means the times are valid.
const toDate = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const validateTimeSegments = (segments, originalCount, now = new Date()) => {
    if (!Array.isArray(segments)) return { general: 'Time segments must be a list' };
    if (segments.length !== originalCount) {
        return { general: 'Recorded time segments can be corrected, but not added or removed' };
    }

    const errors = {};
    let previousEnd = null;

    segments.forEach((segment, index) => {
        const start = toDate(segment && segment.start);
        const end = toDate(segment && segment.end);

        if (start === null) errors[index] = 'Start time is required';
        else if (end === null) errors[index] = 'End time is required';
        else if (start === undefined || end === undefined) errors[index] = 'Enter a valid date and time';
        else if (end <= start) errors[index] = 'End time must be after start time';
        else if (end > now) errors[index] = 'Times cannot be in the future';
        else if (previousEnd && start < previousEnd) errors[index] = 'This segment overlaps the one before it';

        if (end instanceof Date) previousEnd = end;
    });

    return errors;
};

module.exports = { validateTimeSegments };