const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');
const { connect, clear, close } = require('./helpers/mongo');

// regroupe les tests d'intégration Users (public/profile/list/search/update/password)

describe('Integration - Users', function () {
  this.timeout(20000);

  let tokenA, tokenB, userA, userB;

  before(async () => { await connect(); process.env.JWT_SECRET='test_secret'; });
  after(async () => { await close(); });
  afterEach(async () => { await clear(); });

  beforeEach(async () => {
    let res = await request(app).post('/api/auth/register').send({ email: `ua${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenA = res.body.token; userA = res.body.user;
    res = await request(app).post('/api/auth/register').send({ email: `ub${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenB = res.body.token; userB = res.body.user;
  });

  it('public profile not found -> 404', async () => {
    const res = await request(app).get('/api/users/000000000000000000000000');
    expect(res.status).to.equal(404);
  });

  it('list users requires auth -> 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).to.equal(401);
  });

  it('list users returns users (excluding me) with status/lastLogin', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('data');
    const ids = res.body.data.map(u => String(u._id));
    expect(ids).to.not.include(String(userA.id));
  });

  it('search users by username', async () => {
    await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenB}`).send({ username: 'johnny' });
    const res = await request(app).get('/api/users/search?q=john').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).to.equal(200);
    const names = (res.body.data||[]).map(u => u.username);
    expect(names).to.include('johnny');
  });

  it('update profile username ok and conflict', async () => {
    // set username for A
    let res = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenA}`).send({ username: 'alpha' });
    expect(res.status).to.equal(200);
    expect(res.body.username).to.equal('alpha');

    // try to set same username on B to force conflict
    res = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenB}`).send({ username: 'alpha' });
    expect(res.status).to.equal(409);
  });

  it('update profile: email invalid, email conflict, avatar clear', async () => {
    // invalid email
    let r = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenA}`).send({ email: 'bad' });
    expect(r.status).to.equal(400);

    // set a valid email and clear avatar
    const newEmail = `new${Date.now()}@ex.com`;
    r = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenA}`).send({ email: newEmail, avatar: '' });
    expect(r.status).to.equal(200);
    expect(r.body.email).to.equal(newEmail);
    expect(r.body.avatar).to.equal(null);

    // conflict email (try to set B's email on A)
    r = await request(app).put('/api/users/profile').set('Authorization', `Bearer ${tokenA}`).send({ email: userB.email });
    expect(r.status).to.equal(409);
  });

  it('change password success and invalid current', async () => {
    let r = await request(app).put('/api/users/password').set('Authorization', `Bearer ${tokenA}`).send({ currentPassword: 'Passw0rd!', newPassword: 'N3wpass!' });
    expect(r.status).to.equal(200);
    expect(r.body.ok).to.equal(true);

    // invalid current
    r = await request(app).put('/api/users/password').set('Authorization', `Bearer ${tokenA}`).send({ currentPassword: 'wrong', newPassword: 'Other123!' });
    expect(r.status).to.equal(401);
  });
});
