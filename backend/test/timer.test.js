// SCRUM-26: timer actions follow the state machine and use server time.
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

describe('Timer status transitions', () => {
    it('allows start from Not started, stop from In progress, resume from Stopped', () => {
        expect(checkTransition('start', 'not_started')).to.deep.equal({ ok: true, to: 'in_progress' });
        expect(checkTransition('stop', 'in_progress')).to.deep.equal({ ok: true, to: 'stopped' });
        expect(checkTransition('resume', 'stopped')).to.deep.equal({ ok: true, to: 'in_progress' });
    });

    it('rejects every other combination', () => {
        expect(checkTransition('start', 'in_progress').ok).to.equal(false);
        expect(checkTransition('stop', 'stopped').ok).to.equal(false);
        expect(checkTransition('resume', 'in_progress').ok).to.equal(false);
        expect(checkTransition('resume', 'submitted').ok).to.equal(false);
        expect(checkTransition('stop', 'not_started').ok).to.equal(false);
    });
});

describe('Timer endpoints', () => {
    afterEach(() => sinon.restore());

    it('starts a job using the server clock, ignoring any time sent by the device', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        let filterUsed;
        let updateUsed;
        sinon.stub(Job, 'findOneAndUpdate').callsFake((filter, update) => {
            filterUsed = filter;
            updateUsed = update;
            return { select: () => Promise.resolve({ status: 'in_progress' }) };
        });

        const before = Date.now();
        const res = await chai.request(app)
            .post(`/api/jobs/${JOB_ID}/start`)
            .set('Authorization', tokenFor('tech1'))
            .send({ start: '2000-01-01T00:00:00Z' });

        expect(res).to.have.status(200);
        expect(filterUsed).to.include({ technician: 'tech1', status: 'not_started' });
        const recordedStart = updateUsed.$push.timeSegments.start.getTime();
        expect(recordedStart).to.be.at.least(before);
    });

    it('returns 409 when the action does not match the job status', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        sinon.stub(Job, 'findOneAndUpdate').returns({ select: () => Promise.resolve(null) });
        sinon.stub(Job, 'findOne').returns(Promise.resolve({ status: 'stopped' }));

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/stop`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(409);
        expect(res.body.message).to.equal('You can only stop a job that is in progress');
    });

    it("returns 404 for a job that isn't assigned to the technician", async () => {
        stubLoggedInUser({ id: 'tech2', role: 'standard' });
        sinon.stub(Job, 'findOneAndUpdate').returns({ select: () => Promise.resolve(null) });
        sinon.stub(Job, 'findOne').returns(Promise.resolve(null));

        const res = await chai.request(app).post(`/api/jobs/${JOB_ID}/start`).set('Authorization', tokenFor('tech2'));
        expect(res).to.have.status(404);
    });
});