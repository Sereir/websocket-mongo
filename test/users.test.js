const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');
const { connect, clear, close } = require('./helpers/mongo');

describe('Users API', function () {
  this.timeout(20000);

  let token, user;

  before(async () => { await connect(); process.env.JWT_SECRET='test_secret'; });
  after(async () => { await close(); });
  afterEach(async () => { await clear(); });

  beforeEach(async () => {
    const email = `u${Date.now()}@ex.com`;
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd!' });
    token = res.body.token; user = res.body.user;
  });

  it('public profile not found -> 404', async () => {
    const res = await request(app).get('/api/users/000000000000000000000000');
    expect(res.status).to.equal(404);
  });

  it('list users requires auth -> 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).to.equal(401);
  });

  it('update profile username ok and conflict', async () => {
    // create another user
    const r2 = await request(app).post('/api/auth/register').send({ email: `v${Date.now()}@ex.com`, password: 'Passw0rd!' });
    const other = r2.body.user;

    // set username
    let res = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${token}`).send({ username: 'alpha' });
    expect(res.status).to.equal(200);
    expect(res.body.username).to.equal('alpha');

    // try to set same username on other user to force conflict
    const tokenOther = r2.body.token;
    res = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenOther}`).send({ username: 'alpha' });
    expect(res.status).to.equal(409);
  });
});
