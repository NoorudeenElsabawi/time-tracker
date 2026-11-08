// SCRUM-27: Technicians add notes to a job; notes can be added and edited until the job is submitted.
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
const JOB_ID = '64b000000000000000000027';

// Stubs Job.findOneAndUpdate(...).select(...).catch(...) and records the filter and update used
const stubUpdate = (result) => {
    const calls = {};
    sinon.stub(Job, 'findOneAndUpdate').callsFake((filter, update) => {
        calls.filter = filter;
        calls.update = update;
        return { select: () => Promise.resolve(result) };
    });
    return calls;
};

describe('PUT /api/jobs/:id/notes', () => {
    afterEach(() => sinon.restore());

    it('saves notes on the technician\'s own job while it can still be edited', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const calls = stubUpdate({ _id: JOB_ID, status: 'in_progress', notes: 'Replaced faulty RAM.' });

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('tech1'))
            .send({ notes: '  Replaced faulty RAM.  ' });
        expect(res).to.have.status(200);
        expect(res.body.job.notes).to.equal('Replaced faulty RAM.');
        expect(calls.update.$set.notes).to.equal('Replaced faulty RAM.');
        // Only the technician's own job, and only before it is submitted
        expect(calls.filter).to.deep.equal({
            _id: JOB_ID, technician: 'tech1', status: { $in: ['not_started', 'in_progress', 'stopped'] },
        });
    });

    it('does not change notes once the job is submitted (409)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        stubUpdate(null);
        sinon.stub(Job, 'findOne').returns(Promise.resolve({ _id: JOB_ID, status: 'submitted' }));

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('tech1'))
            .send({ notes: 'Late change' });
        expect(res).to.have.status(409);
    });

    it('returns 404 for a job that is not assigned to the technician', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        stubUpdate(null);
        sinon.stub(Job, 'findOne').returns(Promise.resolve(null));

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('tech1'))
            .send({ notes: 'Not my job' });
        expect(res).to.have.status(404);
    });

    it('validates the notes (400)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const update = sinon.stub(Job, 'findOneAndUpdate');

        const missing = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('tech1')).send({});
        expect(missing).to.have.status(400);

        const tooLong = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('tech1'))
            .send({ notes: 'x'.repeat(2001) });
        expect(tooLong).to.have.status(400);
        expect(tooLong.body.errors.notes).to.equal('Notes can be up to 2000 characters');
        expect(update.called).to.equal(false);
    });

    it('is only for Standard Users (403 for an Administrator)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}/notes`).set('Authorization', tokenFor('admin1'))
            .send({ notes: 'Admin note' });
        expect(res).to.have.status(403);
    });
});