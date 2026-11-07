// Validates a new user entered by an Administrator.
// Returns { fieldName: 'error message' }; an empty object means the input is valid.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const validateNewUser = (input) => {
    const errors = {};
    const text = (value) => (typeof value === 'string' ? value.trim() : '');

    if (!text(input.name)) errors.name = 'Name is required';

    if (!text(input.email)) errors.email = 'Email is required';
    else if (!EMAIL_PATTERN.test(text(input.email))) errors.email = 'Enter a valid email address';

    if (!input.password) errors.password = 'Password is required';
    else if (String(input.password).length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!['admin', 'standard'].includes(input.role)) errors.role = 'Select a role';

    return errors;
};

module.exports = { validateNewUser, MIN_PASSWORD_LENGTH };