const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');
const { connect, clear, close } = require('./helpers/mongo');

describe('Auth', function () {
  this.timeout(20000);

  before(async () => { await connect(); process.env.JWT_SECRET='test_secret'; });
  after(async () => { await close(); });
  afterEach(async () => { await clear(); });

  describe('Auth API', () => {
    it('register -> 201 + token', async () => {
      const email = `u${Date.now()}@example.com`;
      const res = await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token');
      expect(res.body.user).to.include.keys('id', 'email', 'username', 'status');
    });

    it('login -> 200 + token', async () => {
      const email = `u${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      const res = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
      expect(res.body.user.status).to.equal('online');
    });

    it('register with invalid email -> 400', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'bad', password: 'Passw0rd!' });
      expect(res.status).to.equal(400);
    });

    it('register duplicate email -> 409', async () => {
      const email = `dup${Date.now()}@ex.com`;
      let res = await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      expect(res.status).to.equal(201);
      res = await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      expect(res.status).to.equal(409);
    });

    it('login wrong password -> 401', async () => {
      const email = `lp${Date.now()}@ex.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      const res = await request(app).post('/api/auth/login').send({ email, password: 'Wrong123!' });
      expect(res.status).to.equal(401);
    });

    it('register without JWT_SECRET -> 500', async () => {
      const old = process.env.JWT_SECRET;
      process.env.JWT_SECRET = '';
      const res = await request(app).post('/api/auth/register').send({ email: `ns${Date.now()}@ex.com`, password: 'Passw0rd!' });
      expect(res.status).to.equal(500);
      process.env.JWT_SECRET = old;
    });

    it('login without JWT_SECRET -> 500', async () => {
      const email = `nosec${Date.now()}@ex.com`;
      await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
      const old = process.env.JWT_SECRET;
      process.env.JWT_SECRET = '';
      const res = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
      expect(res.status).to.equal(500);
      process.env.JWT_SECRET = old;
    });
  });

  describe('Auth middleware', () => {
    it('rejects missing token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).to.equal(401);
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).to.equal(401);
    });

    it('returns 500 when JWT secret missing', async () => {
      const old = process.env.JWT_SECRET;
      process.env.JWT_SECRET = '';
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer anything');
      expect(res.status).to.equal(500);
      process.env.JWT_SECRET = old;
    });
  });
});
