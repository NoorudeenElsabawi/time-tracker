// SCRUM-21: Administrators can list all jobs, optionally filtered by status.
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

// Stubs Job.find(...).select(...).populate(...).sort(...) and records the filter used
const stubJobFind = (jobs) => {
    const calls = {};
    sinon.stub(Job, 'find').callsFake((filter) => {
        calls.filter = filter;
        return { select: () => ({ populate: () => ({ sort: () => Promise.resolve(jobs) }) }) };
    });
    return calls;
};

describe('GET /api/jobs (admin job list)', () => {
    afterEach(() => sinon.restore());

    it('lists all jobs for an Administrator', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const calls = stubJobFind([{ jobNumber: '1234' }, { jobNumber: '1235' }]);

        const res = await chai.request(app).get('/api/jobs').set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(res.body).to.have.length(2);
        expect(calls.filter).to.deep.equal({});
    });

    it('filters by status', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const calls = stubJobFind([]);

        const res = await chai.request(app).get('/api/jobs?status=submitted').set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(calls.filter).to.deep.equal({ status: 'submitted' });
    });

    it('rejects an unknown status (400)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const res = await chai.request(app).get('/api/jobs?status=finished').set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(400);
    });

    it('is not available to Standard Users (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const res = await chai.request(app).get('/api/jobs').set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(403);
    });
});