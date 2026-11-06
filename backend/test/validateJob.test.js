// SCRUM-20: job input validation (required fields, positive fees)
const { expect } = require('chai');
const { validateJobInput } = require('../utils/validateJob');

const validJob = {
    jobNumber: '1239',
    customerName: 'David Smith',
    address: '123 Example St, Brisbane 4000',
    technician: '64b000000000000000000001',
    calloutFee: '80',
    labourRate: '30',
};

describe('Job input validation', () => {
    it('accepts a complete, valid job', () => {
        expect(validateJobInput(validJob)).to.deep.equal({});
    });

    it('requires every field', () => {
        const errors = validateJobInput({});
        expect(errors).to.have.all.keys('jobNumber', 'customerName', 'address', 'technician', 'calloutFee', 'labourRate');
    });

    it('treats blank text as missing', () => {
        const errors = validateJobInput({ ...validJob, customerName: '   ' });
        expect(errors.customerName).to.equal('Customer name is required');
    });

    it('rejects negative, zero and non-numeric fees', () => {
        expect(validateJobInput({ ...validJob, calloutFee: '-20' }).calloutFee).to.equal('Must be a positive number');
        expect(validateJobInput({ ...validJob, labourRate: '0' }).labourRate).to.equal('Must be a positive number');
        expect(validateJobInput({ ...validJob, labourRate: 'abc' }).labourRate).to.equal('Must be a positive number');
    });
});