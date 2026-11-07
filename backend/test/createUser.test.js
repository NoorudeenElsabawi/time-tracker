// SCRUM-18: Administrators create user accounts (no public registration).
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const { validateNewUser } = require('../utils/validateUser');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });

const newTech = { name: 'Tech C', email: 'TechC@ComputerSquad.test', password: 'Tech12345', role: 'standard' };

describe('New user validation', () => {
    it('accepts a valid user', () => {
        expect(validateNewUser(newTech)).to.deep.equal({});
    });

    it('requires name, a valid email, an 8+ character password and a role', () => {
        const errors = validateNewUser({ name: ' ', email: 'not-an-email', password: 'short', role: 'boss' });
        expect(errors).to.deep.equal({
            name: 'Name is required',
            email: 'Enter a valid email address',
            password: 'Password must be at least 8 characters',
            role: 'Select a role',
        });
    });
});

describe('POST /api/users', () => {
    afterEach(() => sinon.restore());

    it('lets an Administrator create a user, storing the email in lowercase and never returning the password', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(User, 'findOne').resolves(null);
        let created;
        sinon.stub(User, 'create').callsFake(async (data) => {
            created = data;
            return { id: 'u3', name: data.name, email: data.email, role: data.role };
        });

        const res = await chai.request(app).post('/api/users').set('Authorization', tokenFor('admin1')).send(newTech);
        expect(res).to.have.status(201);
        expect(created.email).to.equal('techc@computersquad.test');
        expect(res.body).to.not.have.property('password');
    });

    it('rejects a duplicate email (400)', async () => {
        stubLoggedInUser({ id: 'admin1', role: 'admin' });
        sinon.stub(User, 'findOne').resolves({ email: 'techc@computersquad.test' });

        const res = await chai.request(app).post('/api/users').set('Authorization', tokenFor('admin1')).send(newTech);
        expect(res).to.have.status(400);
        expect(res.body.errors.email).to.equal('A user with this email already exists');
    });

    it('does not let a Standard User create accounts (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard' });
        const res = await chai.request(app).post('/api/users').set('Authorization', tokenFor('tech1')).send(newTech);
        expect(res).to.have.status(403);
    });
});