// SCRUM-28: a job can only be submitted once the timer is stopped, and is then locked.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const Job = require('../models/Job');
const { checkTransition } = require('../utils/jobTransitions');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });
const JOB_ID = '64b000000000000000000099';

describe('Submitting a job', () => {
    afterEach(() => sinon.restore());

    it('can only be submitted from Stopped', () => {
        expect(checkTransition('submit', 'stopped')).to.deep.equal({ ok: true, to: 'submitted' });
        expect(checkTransition('submit', 'in_progress').error).to.equal('Stop the timer before submitting this job');
        expect(checkTransition('submit', 'not_started').ok).to.equal(false);
    });

    it('locks the job: no timer action is allowed after submission', () => {
        ['submitted', 'under_review', 'approved'].forEach((status) => {
            ['start', 'stop', 'resume', 'submit'].forEach((action) => {
                const result = checkTransition(action, status);
                expect(result.ok, `${action} from ${status}`).to.equal(false);
                expect(result.error).to.include('locked');
            });
        });
    });

    it('rejects submitting while the timer is running (409)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        sinon.stub(Job, 'findOneAndUpdate').returns({ select: () => Promise.resolve(null) });
        sinon.stub(Job, 'findOne').returns(Promise.resolve({ status: 'in_progress' }));

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/submit`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(409);
        expect(res.body.message).to.equal('Stop the timer before submitting this job');
    });

    it('submits a stopped job and records the server time', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        let filterUsed;
        let updateUsed;
        sinon.stub(Job, 'findOneAndUpdate').callsFake((filter, update) => {
            filterUsed = filter;
            updateUsed = update;
            return { select: () => Promise.resolve({ status: 'submitted' }) };
        });

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/submit`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(200);
        expect(filterUsed.status).to.equal('stopped');
        expect(updateUsed.$set.status).to.equal('submitted');
        expect(updateUsed.$set.submittedAt).to.be.an.instanceOf(Date);
    });
});