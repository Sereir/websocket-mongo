const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');
const { connect, clear, close } = require('./helpers/mongo');

describe('Messages API', function () {
  this.timeout(20000);

  let tokenA, tokenB, userA, userB;

  before(async () => { await connect(); process.env.JWT_SECRET='test_secret'; });
  after(async () => { await close(); });
  afterEach(async () => { await clear(); });

  beforeEach(async () => {
    const emailA = `a${Date.now()}@ex.com`;
    const emailB = `b${Date.now()}@ex.com`;
    let res = await request(app).post('/api/auth/register').send({ email: emailA, password: 'Passw0rd!' });
    tokenA = res.body.token; userA = res.body.user;
    res = await request(app).post('/api/auth/register').send({ email: emailB, password: 'Passw0rd!' });
    tokenB = res.body.token; userB = res.body.user;
  });

  it('create and fetch messages with pagination/mark read', async () => {
    // A -> B
    const createRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient_id: userB.id, content: 'Hello' });
    expect(createRes.status).to.equal(201);

    const listRes = await request(app)
      .get(`/api/messages/${userA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.have.lengthOf(1);
    expect(listRes.body.data[0].content).to.equal('Hello');

    const msgId = listRes.body.data[0]._id;
    const readRes = await request(app)
      .post(`/api/messages/${msgId}/read`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();
    expect(readRes.status).to.equal(200);
  });

  it('forbid edit/delete by non-owner and validate payloads', async () => {
    let res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient_id: userB.id, content: 'X' });
    const id = res.body._id;

    res = await request(app)
      .put(`/api/messages/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'hack' });
    expect(res.status).to.equal(403);

    res = await request(app)
      .delete(`/api/messages/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send();
    expect(res.status).to.equal(403);

    const long = 'a'.repeat(5001);
    res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient_id: userB.id, content: long });
    expect(res.status).to.equal(400);
  });
});
