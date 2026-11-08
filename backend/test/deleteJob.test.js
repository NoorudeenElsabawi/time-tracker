// SCRUM-23: Administrators delete jobs created by mistake.
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
const JOB_ID = '64b000000000000000000023';

describe('DELETE /api/jobs/:id', () => {
    afterEach(() => sinon.restore());

    it('deletes the job from the database, so it no longer appears in any list', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        let filter;
        sinon.stub(Job, 'findOneAndDelete').callsFake((f) => {
            filter = f;
            return Promise.resolve({ _id: JOB_ID, jobNumber: '1239', status: 'not_started' });
        });

        const res = await chai.request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(res.body.message).to.equal('Job #1239 deleted');
        // The approved check is part of the delete itself
        expect(filter).to.deep.equal({ _id: JOB_ID, status: { $ne: 'approved' } });
    });

    it('does not delete an Approved job (409)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(Job, 'findOneAndDelete').returns(Promise.resolve(null));
        sinon.stub(Job, 'findById').returns(Promise.resolve({ _id: JOB_ID, status: 'approved' }));

        const res = await chai.request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(409);
    });

    it('returns 404 for a job that does not exist', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(Job, 'findOneAndDelete').returns(Promise.resolve(null));
        sinon.stub(Job, 'findById').returns(Promise.resolve(null));

        const res = await chai.request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(404);
    });

    it('does not let a Standard User delete jobs (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const remove = sinon.stub(Job, 'findOneAndDelete');

        const res = await chai.request(app).delete(`/api/jobs/${JOB_ID}`).set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(403);
        expect(remove.called).to.equal(false);
    });
});