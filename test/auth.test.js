const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');
const { connect, clear, close } = require('./helpers/mongo');

describe('Auth API', function () {
  this.timeout(20000);

  before(async () => { await connect(); });
  after(async () => { await close(); });
  afterEach(async () => { await clear(); });

  it('register -> 201 + token', async () => {
    process.env.JWT_SECRET = 'test_secret';
    const email = `u${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('token');
    expect(res.body.user).to.include.keys('id', 'email', 'username', 'status');
  });

  it('login -> 200 + token', async () => {
    process.env.JWT_SECRET = 'test_secret';
    const email = `u${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body.user.status).to.equal('online');
  });
});
