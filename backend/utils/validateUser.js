// Validates user details entered by an Administrator.
// Returns { fieldName: 'error message' }; an empty object means the input is valid.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Name, email and role: shared by creating and editing a user
const validateUserDetails = (input) => {
    const errors = {};

    if (!text(input.name)) errors.name = 'Name is required';

    if (!text(input.email)) errors.email = 'Email is required';
    else if (!EMAIL_PATTERN.test(text(input.email))) errors.email = 'Enter a valid email address';

    if (!['admin', 'standard'].includes(input.role)) errors.role = 'Select a role';

    return errors;
};

// Creating a user also needs an initial password
const validateNewUser = (input) => {
    const errors = validateUserDetails(input);

    if (!input.password) errors.password = 'Password is required';
    else if (String(input.password).length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    return errors;
};

// Editing a user (SCRUM-19): password is not changed here; "active" must be true or false if sent
const validateUserUpdate = (input) => {
    const errors = validateUserDetails(input);
    if (input.active !== undefined && typeof input.active !== 'boolean') {
        errors.active = 'Active must be true or false';
    }
    return errors;
};

module.exports = { validateNewUser, validateUserUpdate, MIN_PASSWORD_LENGTH };