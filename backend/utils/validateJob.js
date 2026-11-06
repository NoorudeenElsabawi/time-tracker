// Validates the fields an Administrator enters when creating or editing a job.
// Returns an object of { fieldName: 'error message' }. An empty object means the input is valid.
const validateJobInput = (input) => {
    const errors = {};
    const text = (value) => (typeof value === 'string' ? value.trim() : '');

    if (!text(input.jobNumber)) errors.jobNumber = 'Job number is required';
    if (!text(input.customerName)) errors.customerName = 'Customer name is required';
    if (!text(input.address)) errors.address = 'Address is required';
    if (!text(input.technician)) errors.technician = 'Select a technician';

    ['calloutFee', 'labourRate'].forEach((field) => {
        const raw = input[field];
        const value = Number(raw);
        if (raw === undefined || raw === null || raw === '') {
            errors[field] = 'This field is required';
        } else if (!Number.isFinite(value) || value <= 0) {
            errors[field] = 'Must be a positive number';
        }
    });

    return errors;
};

module.exports = { validateJobInput };