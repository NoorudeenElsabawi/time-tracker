// SCRUM-19: Administrators edit or deactivate users so that former staff lose access.
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'test-secret';
const app = require('../server');
const User = require('../models/User');
const Job = require('../models/Job');
const { validateUserUpdate } = require('../utils/validateUser');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const stubLoggedInUser = (user) =>
    sinon.stub(User, 'findById').returns({ select: () => Promise.resolve(user) });

const admin = { id: 'admin1', role: 'admin', active: true };

// A user document as loaded by findOne, with a save() we can check
const userDoc = (fields) => {
    const doc = { _id: 'u2', id: 'u2', password: 'hashed', active: true, ...fields };
    doc.save = sinon.stub().resolves(doc);
    return doc;
};

const edit = { name: 'Tech B', email: 'TechB.New@ComputerSquad.test', role: 'standard' };

describe('Edit user validation', () => {
    it('accepts valid details without a password', () => {
        expect(validateUserUpdate(edit)).to.deep.equal({});
    });

    it('requires name, a valid email and a role, and active must be true or false', () => {
        const errors = validateUserUpdate({ name: '', email: 'bad', role: 'boss', active: 'no' });
        expect(errors).to.deep.equal({
            name: 'Name is required',
            email: 'Enter a valid email address',
            role: 'Select a role',
            active: 'Active must be true or false',
        });
    });
});

describe('PUT /api/users/:id', () => {
    afterEach(() => sinon.restore());

    it('lets an Administrator edit a user, storing the email in lowercase and never returning the password', async () => {
        stubLoggedInUser(admin);
        const doc = userDoc({ name: 'Tech B', email: 'techb@computersquad.test', role: 'standard' });
        sinon.stub(User, 'findOne').returns(Promise.resolve(doc));
        sinon.stub(User, 'exists').resolves(null);

        const res = await chai.request(app).put('/api/users/u2').set('Authorization', tokenFor('admin1')).send(edit);
        expect(res).to.have.status(200);
        expect(doc.email).to.equal('techb.new@computersquad.test');
        expect(doc.save.calledOnce).to.equal(true);
        expect(res.body).to.not.have.property('password');
    });

    it('deactivates a user', async () => {
        stubLoggedInUser(admin);
        const doc = userDoc({ name: 'Tech B', email: 'techb@computersquad.test', role: 'standard' });
        sinon.stub(User, 'findOne').returns(Promise.resolve(doc));
        sinon.stub(User, 'exists').resolves(null);

        const res = await chai.request(app).put('/api/users/u2').set('Authorization', tokenFor('admin1'))
            .send({ ...edit, active: false });
        expect(res).to.have.status(200);
        expect(doc.active).to.equal(false);
        expect(res.body.active).to.equal(false);
    });

    it('rejects an email that belongs to another user (400)', async () => {
        stubLoggedInUser(admin);
        sinon.stub(User, 'findOne').returns(Promise.resolve(userDoc({ email: 'techb@computersquad.test' })));
        sinon.stub(User, 'exists').resolves({ _id: 'u3' });

        const res = await chai.request(app).put('/api/users/u2').set('Authorization', tokenFor('admin1')).send(edit);
        expect(res).to.have.status(400);
        expect(res.body.errors.email).to.equal('A user with this email already exists');
    });

    it('stops an Administrator deactivating their own account or changing their own role (400)', async () => {
        stubLoggedInUser(admin);
        const self = { name: 'Support Admin', email: 'admin@computersquad.test' };

        const deactivate = await chai.request(app).put('/api/users/admin1').set('Authorization', tokenFor('admin1'))
            .send({ ...self, role: 'admin', active: false });
        expect(deactivate).to.have.status(400);
        expect(deactivate.body.message).to.equal('You cannot deactivate your own account');

        const demote = await chai.request(app).put('/api/users/admin1').set('Authorization', tokenFor('admin1'))
            .send({ ...self, role: 'standard' });
        expect(demote).to.have.status(400);
        expect(demote.body.message).to.equal('You cannot change your own role');
    });

    it('returns 404 for an unknown user', async () => {
        stubLoggedInUser(admin);
        sinon.stub(User, 'findOne').returns(Promise.resolve(null));

        const res = await chai.request(app).put('/api/users/nobody').set('Authorization', tokenFor('admin1')).send(edit);
        expect(res).to.have.status(404);
    });

    it('does not let a Standard User edit accounts (403)', async () => {
        stubLoggedInUser({ id: 'tech1', role: 'standard', active: true });
        const res = await chai.request(app).put('/api/users/u2').set('Authorization', tokenFor('tech1')).send(edit);
        expect(res).to.have.status(403);
    });
});

describe('Deactivated users lose access', () => {
    afterEach(() => sinon.restore());

    it('cannot log in, even with the correct password (403)', async () => {
        const password = await bcrypt.hash('Tech1234', 4);
        sinon.stub(User, 'findOne').resolves({ id: 'tech2', email: 'techb@computersquad.test', password, active: false });

        const res = await chai.request(app).post('/api/auth/login')
            .send({ email: 'techb@computersquad.test', password: 'Tech1234' });
        expect(res).to.have.status(403);
        expect(res.body).to.not.have.property('token');
    });

    it('cannot keep using a login token issued before deactivation (401)', async () => {
        stubLoggedInUser({ id: 'tech2', role: 'standard', active: false });
        const res = await chai.request(app).get('/api/jobs/mine').set('Authorization', tokenFor('tech2'));
        expect(res).to.have.status(401);
        expect(res.body.message).to.equal('This account has been deactivated');
    });

    it('cannot be assigned new jobs', async () => {
        const users = {
            admin1: admin,
            tech2: { id: 'tech2', role: 'standard', active: false },
        };
        // protect() calls findById(...).select(); createJob calls findById(...) directly
        sinon.stub(User, 'findById').callsFake((id) => {
            const result = Promise.resolve(users[id] || null);
            result.select = () => Promise.resolve(users[id] || null);
            return result;
        });
        const create = sinon.stub(Job, 'create');

        const res = await chai.request(app).post('/api/jobs').set('Authorization', tokenFor('admin1')).send({
            jobNumber: '2001', customerName: 'Alex Nguyen', address: '12 Example St',
            technician: 'tech2', calloutFee: 80, labourRate: 30,
        });
        expect(res).to.have.status(400);
        expect(res.body.errors.technician).to.equal('Select a valid technician');
        expect(create.called).to.equal(false);
    });
});