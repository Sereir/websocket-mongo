const { expect } = require('chai');
const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/socket/handlers');
const { connect, clear, close } = require('./helpers/mongo');

describe('WebSocket chat', function () {
  this.timeout(30000);

  let server, io, address, port;
  let tokenA, tokenB, userA, userB;

  before(async () => {
    await connect();
    process.env.JWT_SECRET = 'test_secret';
    let res = await request(app).post('/api/auth/register').send({ email: `wa${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenA = res.body.token; userA = res.body.user;
    res = await request(app).post('/api/auth/register').send({ email: `wb${Date.now()}@ex.com`, password: 'Passw0rd!' });
    tokenB = res.body.token; userB = res.body.user;

    server = http.createServer(app);
    io = new Server(server);
    initSocket(io);
    await new Promise((resolve) => server.listen(0, resolve));
    address = server.address();
    port = address.port;
  });

  after(async () => {
    if (io) io.close();
    if (server) server.close();
    await close();
  });

  afterEach(async () => { await clear(); });

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
});
