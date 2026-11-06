// SCRUM-29: the calculated cost is shown to Administrators only.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const Job = require('../models/Job');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });
const JOB_ID = '64b000000000000000000099';

const submittedJob = {
    jobNumber: '1234',
    calloutFee: 100,
    labourRate: 30,
    status: 'submitted',
    timeSegments: [
        { start: new Date('2026-11-06T09:00:00+10:00'), end: new Date('2026-11-06T09:50:00+10:00') },
        { start: new Date('2026-11-06T10:10:00+10:00'), end: new Date('2026-11-06T10:34:00+10:00') },
    ],
};

describe('GET /api/jobs/:id cost visibility', () => {
    afterEach(() => sinon.restore());

    it('gives an Administrator the cost breakdown', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(Job, 'findById').returns({ populate: () => Promise.resolve(submittedJob) });

        const res = await chai.request(app).get(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(res.body.cost).to.include({ totalMinutes: 74, billableBlocks: 5, totalCost: 250 });
    });

    it('never gives a technician the cost or pricing', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        let fieldsSelected;
        sinon.stub(Job, 'findOne').returns({
            select: (fields) => {
                fieldsSelected = fields;
                return { catch: () => Promise.resolve({ jobNumber: '1234', status: 'submitted', timeSegments: [] }) };
            },
        });

        const res = await chai.request(app).get(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(200);
        expect(res.body).to.not.have.property('cost');
        expect(fieldsSelected).to.not.include('calloutFee');
        expect(fieldsSelected).to.not.include('labourRate');
    });
});