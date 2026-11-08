// SCRUM-22: Administrators edit job details and times to correct errors.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const Job = require('../models/Job');
const { validateTimeSegments } = require('../utils/validateTimes');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });
const JOB_ID = '64b000000000000000000022';

const at = (time) => `2026-11-02T${time}:00.000Z`;
const segments = [
    { start: at('09:00'), end: at('09:50') },
    { start: at('10:10'), end: at('10:34') },
];

// The job as it is stored before the edit
const storedJob = (fields = {}) => ({
    _id: JOB_ID,
    jobNumber: '1236',
    technician: 'tech1',
    status: 'submitted',
    timeSegments: segments,
    ...fields,
});

const edit = (fields = {}) => ({
    jobNumber: '1236',
    customerName: 'Priya Patel',
    address: '123 Queensland Rd',
    technician: 'tech1',
    calloutFee: 80,
    labourRate: 30,
    timeSegments: segments,
    ...fields,
});

// Stubs the database calls made by PUT /api/jobs/:id and records the update
const stubJob = (existing, { duplicate = null, updated = 'echo' } = {}) => {
    const calls = {};
    sinon.stub(Job, 'findById').returns(Promise.resolve(existing));
    sinon.stub(Job, 'exists').resolves(duplicate);
    sinon.stub(Job, 'findOneAndUpdate').callsFake((filter, update) => {
        calls.filter = filter;
        calls.update = update;
        const result = updated === 'echo' ? { ...existing, ...update.$set } : updated;
        return { populate: () => Promise.resolve(result) };
    });
    return calls;
};

describe('Time segment validation', () => {
    const now = new Date('2026-11-03T00:00:00Z');

    it('accepts segments in order with each end after its start', () => {
        expect(validateTimeSegments(segments, 2, now)).to.deep.equal({});
    });

    it('rejects an end time that is not after the start time', () => {
        const errors = validateTimeSegments([{ start: at('09:50'), end: at('09:00') }, segments[1]], 2, now);
        expect(errors).to.deep.equal({ 0: 'End time must be after start time' });
    });

    it('rejects missing, invalid, overlapping and future times', () => {
        expect(validateTimeSegments([{ start: '', end: at('09:50') }], 1, now)[0]).to.equal('Start time is required');
        expect(validateTimeSegments([{ start: at('09:00'), end: null }], 1, now)[0]).to.equal('End time is required');
        expect(validateTimeSegments([{ start: 'soon', end: at('09:50') }], 1, now)[0]).to.equal('Enter a valid date and time');
        expect(validateTimeSegments([segments[0], { start: at('09:30'), end: at('10:00') }], 2, now)[1])
            .to.equal('This segment overlaps the one before it');
        expect(validateTimeSegments([{ start: at('09:00'), end: '2026-12-01T00:00:00Z' }], 1, now)[0])
            .to.equal('Times cannot be in the future');
    });

    it('does not allow segments to be added or removed', () => {
        expect(validateTimeSegments([segments[0]], 2, now).general)
            .to.equal('Recorded time segments can be corrected, but not added or removed');
    });
});

describe('PUT /api/jobs/:id', () => {
    afterEach(() => sinon.restore());

    it('saves valid changes to details and times and returns the new cost', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const corrected = [segments[0], { start: at('10:10'), end: at('10:38') }];
        const calls = stubJob(storedJob());

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'))
            .send(edit({ customerName: ' Priya Patel ', timeSegments: corrected }));
        expect(res).to.have.status(200);
        expect(calls.filter).to.deep.equal({ _id: JOB_ID, status: 'submitted' });
        expect(calls.update.$set.customerName).to.equal('Priya Patel');
        expect(calls.update.$set.timeSegments[1].end.toISOString()).to.equal(at('10:38'));
        expect(calls.update.$set).to.not.have.property('status');
        // 50 + 28 = 78 minutes -> 5 blocks (3 min into the 6th is not charged) -> $80 + 5 x $30
        expect(res.body.cost.totalMinutes).to.equal(78);
        expect(res.body.cost.totalCost).to.equal(230);
    });

    it('rejects an end time before the start time (400) and saves nothing', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const calls = stubJob(storedJob());

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'))
            .send(edit({ timeSegments: [{ start: at('09:50'), end: at('09:00') }, segments[1]] }));
        expect(res).to.have.status(400);
        expect(res.body.errors.timeSegments[0]).to.equal('End time must be after start time');
        expect(calls.update).to.equal(undefined);
    });

    it('validates the job details (400)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        stubJob(storedJob());

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'))
            .send(edit({ customerName: '', labourRate: -5 }));
        expect(res).to.have.status(400);
        expect(res.body.errors.customerName).to.equal('Customer name is required');
        expect(res.body.errors.labourRate).to.equal('Must be a positive number');
    });

    it('returns an Approved job to Under review when it is edited', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const calls = stubJob(storedJob({ status: 'approved', approvedBy: 'admin1', approvedAt: new Date() }));

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'))
            .send(edit({ calloutFee: 90 }));
        expect(res).to.have.status(200);
        expect(calls.filter.status).to.equal('approved');
        expect(calls.update.$set.status).to.equal('under_review');
        expect(calls.update.$set.approvedBy).to.equal(null);
        expect(calls.update.$set.approvedAt).to.equal(null);
        expect(res.body.reopened).to.equal(true);
    });

    it('does not edit times while the timer is running (409)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        stubJob(storedJob({ status: 'in_progress' }));

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1')).send(edit());
        expect(res).to.have.status(409);
    });

    it('rejects a job number used by another job (400)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        stubJob(storedJob(), { duplicate: { _id: 'other' } });

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'))
            .send(edit({ jobNumber: '1237' }));
        expect(res).to.have.status(400);
        expect(res.body.errors.jobNumber).to.equal('A job with this number already exists');
    });

    it('returns 409 if the job changed status while the Administrator was editing', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        stubJob(storedJob({ status: 'stopped' }), { updated: null });

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1')).send(edit());
        expect(res).to.have.status(409);
    });

    it('returns 404 for an unknown job', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(Job, 'findById').returns(Promise.resolve(null));

        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1')).send(edit());
        expect(res).to.have.status(404);
    });

    it('does not let a Standard User edit jobs (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const res = await chai.request(app).put(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('tech1')).send(edit());
        expect(res).to.have.status(403);
    });
});