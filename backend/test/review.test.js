// SCRUM-24: Administrators review and approve submitted jobs, following the state machine.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const Job = require('../models/Job');
const { checkAdminTransition } = require('../utils/jobTransitions');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });
const JOB_ID = '64b000000000000000000099';

// Stubs Job.findOneAndUpdate(...).populate(...) and records the filter and update used
const stubUpdate = (result) => {
    const calls = {};
    sinon.stub(Job, 'findOneAndUpdate').callsFake((filter, update) => {
        calls.filter = filter;
        calls.update = update;
        return { populate: () => Promise.resolve(result) };
    });
    return calls;
};

describe('Review and approve rules', () => {
    it('only allows Submitted -> Under review -> Approved', () => {
        expect(checkAdminTransition('review', 'submitted')).to.deep.equal({ ok: true, to: 'under_review' });
        expect(checkAdminTransition('approve', 'under_review')).to.deep.equal({ ok: true, to: 'approved' });
    });

    it('rejects approving without a review, and reviewing unsubmitted jobs', () => {
        expect(checkAdminTransition('approve', 'submitted').error).to.equal('Start the review before approving this job');
        expect(checkAdminTransition('review', 'in_progress').ok).to.equal(false);
        expect(checkAdminTransition('review', 'approved').ok).to.equal(false);
        expect(checkAdminTransition('approve', 'approved').ok).to.equal(false);
    });
});

describe('Review and approve endpoints', () => {
    afterEach(() => sinon.restore());

    it('approves an Under review job and records who approved it', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const calls = stubUpdate({ status: 'approved', calloutFee: 100, labourRate: 30, timeSegments: [] });

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/approve`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(calls.filter.status).to.equal('under_review');
        expect(calls.update.$set).to.include({ status: 'approved', approvedBy: 'admin1' });
        expect(res.body.cost.totalCost).to.equal(130);
    });

    it('returns 409 when approving a job that is not under review', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        stubUpdate(null);
        sinon.stub(Job, 'findById').returns({ catch: () => Promise.resolve({ status: 'submitted' }) });

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/approve`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(409);
        expect(res.body.message).to.equal('Start the review before approving this job');
    });

    it('does not let a Standard User review or approve (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/approve`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(403);
    });
});