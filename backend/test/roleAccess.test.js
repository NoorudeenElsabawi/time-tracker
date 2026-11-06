// SCRUM-16: admin-only API routes must reject Standard Users.
// Run with: npm test  (from the backend folder). No database needed: User lookups are stubbed.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;

// Makes User.findById(id).select(...) resolve to the given user
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });

describe('Role-based access to admin routes', () => {
    afterEach(() => sinon.restore());

    it('rejects requests with no token (401)', async () => {
        const res = await chai.request(app).get('/api/users');
        expect(res).to.have.status(401);
    });

    it('rejects an invalid token (401)', async () => {
        const res = await chai.request(app).get('/api/users').set('Authorization', 'Bearer not-a-real-token');
        expect(res).to.have.status(401);
    });

    it('blocks a Standard User from an admin route (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const res = await chai.request(app).get('/api/users').set('Authorization', tokenFor('tech1'));
        expect(res).to.have.status(403);
        expect(res.body.message).to.equal('You do not have permission to do this');
    });

    it('allows an Administrator (200)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(User, 'find').returns({
            select: () => ({ sort: () => Promise.resolve([{ name: 'Tech A', role: 'standard' }]) }),
        });
        const res = await chai.request(app).get('/api/users?role=standard').set('Authorization', tokenFor('admin1'));
        expect(res).to.have.status(200);
        expect(res.body).to.have.length(1);
    });
});