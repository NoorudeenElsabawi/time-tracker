// SCRUM-25: a Standard User only ever receives their own jobs, without pricing.
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

describe('GET /api/jobs/mine', () => {
    afterEach(() => sinon.restore());

    it("filters jobs to the logged-in technician and leaves out cost fields", async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        let filterUsed;
        let fieldsSelected;
        sinon.stub(Job, 'find').callsFake((filter) => {
            filterUsed = filter;
            return {
                select: (fields) => {
                    fieldsSelected = fields;
                    return { sort: () => Promise.resolve([{ jobNumber: '1234' }]) };
                },
            };
        });

        const res = await chai.request(app).get('/api/jobs/mine').set('Authorization', tokenFor('tech1'));

        expect(res).to.have.status(200);
        expect(filterUsed).to.deep.equal({ technician: 'tech1' });
        expect(fieldsSelected).to.not.include('calloutFee');
        expect(fieldsSelected).to.not.include('labourRate');
    });

    it('is not available to Administrators (403)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        const res = await chai.request(app).get('/api/jobs/mine').set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(403);
    });
});