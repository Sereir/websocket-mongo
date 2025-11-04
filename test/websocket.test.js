const { expect } = require('chai');
const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/socket/handlers');
const { connect, clear, close } = require('./helpers/mongo');

describe('WebSocket', function () {
  this.timeout(30000);

  let server, io, port;
  let tokenA, tokenB, userA, userB;

  before(async () => {
    await connect();
    process.env.JWT_SECRET = 'test_secret';
    server = http.createServer(app);
    io = new Server(server);
    initSocket(io);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
  });

  after(async () => {
    if (io) io.close();
    if (server) server.close();
    await close();
  });

  beforeEach(async () => {
    await clear();
    let res = await request(app).post('/api/auth/register').send({ email: `wa${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenA = res.body.token; userA = res.body.user;
    res = await request(app).post('/api/auth/register').send({ email: `wb${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenB = res.body.token; userB = res.body.user;
  });

  it('should deliver messages in real-time between two clients', async () => {
    const cA = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenA } });
    const cB = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenB } });

    await Promise.all([
      new Promise((res) => cA.on('connect', res)),
      new Promise((res) => cB.on('connect', res)),
    ]);

    const recv = new Promise((resolve) => {
      cB.on('message', (m) => resolve(m));
    });

    cA.emit('send-message', { to: userB.id, content: 'Hi WS' }, (ack) => {
      expect(ack).to.include({ ok: true });
    });

    const m = await recv;
    expect(m.content).to.equal('Hi WS');

    cA.disconnect();
    cB.disconnect();
  });

  it('typing event flows to recipient', async () => {
    const cA = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenA } });
    const cB = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenB } });
    await Promise.all([
      new Promise((res) => cA.on('connect', res)),
      new Promise((res) => cB.on('connect', res)),
    ]);

    const recv = new Promise((resolve) => { cB.on('typing', (p) => resolve(p)); });
    cA.emit('typing', { to: userB.id, typing: true });
    const p = await recv;
    expect(p).to.deep.include({ from: String(userA.id), typing: true });

    cA.disconnect(); cB.disconnect();
  });

  it('message-read notifies sender', async () => {
    const cA = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenA } });
    const cB = ioClient.connect(`http://localhost:${port}`, { auth: { token: tokenB } });
    await Promise.all([
      new Promise((res) => cA.on('connect', res)),
      new Promise((res) => cB.on('connect', res)),
    ]);

    // Send a message A->B via REST to get an id
    const m = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipient_id: userB.id, content: 'read me' })
      .then(r => r.body);

    const notified = new Promise((resolve) => cA.on('message-read', (p) => resolve(p)));
    cB.emit('message-read', { messageId: m._id });
    const note = await notified;
    expect(note).to.have.property('messageId');

    cA.disconnect(); cB.disconnect();
  });
});
