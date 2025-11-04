const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

function getTokenFromHandshake(handshake) {
  const t = handshake?.auth?.token || handshake?.query?.token;
  if (t) return t;
  const header = handshake?.headers?.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}


async function getContacts(userId) {
  const me = userId;
  const out = await Message.aggregate([
    {
      $match: {
        deleted: false,
        $or: [{ sender: me }, { recipient: me }],
      },
    },
    {
      $project: {
        other: { $cond: [{ $eq: ['$sender', me] }, '$recipient', '$sender'] },
      },
    },
    { $group: { _id: '$other' } },
  ]);
  return out.map((d) => String(d._id));
}

function initSocket(io) {
  const socketsByUser = new Map();

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromHandshake(socket.handshake);
      if (!token) return next(new Error('auth_required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub || payload.id);
      if (!user) return next(new Error('auth_invalid'));
      socket.user = user;
      return next();
    } catch (e) {
      return next(new Error('auth_invalid'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    if (!socketsByUser.has(String(user._id))) socketsByUser.set(String(user._id), new Set());
    socketsByUser.get(String(user._id)).add(socket.id);

    try {
      user.status = 'online';
      await user.save();
    } catch (_) {}

    try {
      const contacts = await getContacts(user._id);
      for (const cid of contacts) {
        const recSockets = socketsByUser.get(String(cid));
        if (recSockets) {
          for (const sid of recSockets) {
            io.sockets.sockets.get(sid)?.emit('user-online', { userId: String(user._id) });
          }
        }
      }
    } catch (_) {}

    socket.on('send-message', async (payload, ack) => {
      try {
        const { to, content } = payload || {};
        if (!to || typeof content !== 'string' || content.trim().length === 0 || content.length > 5000) {
          return ack && ack({ ok: false, code: 'INVALID_PAYLOAD', message: 'Destinataire et contenu requis (<=5000)' });
        }
        const recipient = await User.findById(to).select('_id');
        if (!recipient) return ack && ack({ ok: false, code: 'RECIPIENT_NOT_FOUND', message: 'Destinataire introuvable' });

        const msg = await Message.create({ sender: user._id, recipient: recipient._id, content: content.trim() });

        const recSockets = socketsByUser.get(String(recipient._id));
        if (recSockets) {
          for (const sid of recSockets) {
            io.sockets.sockets.get(sid)?.emit('message', {
              _id: String(msg._id),
              sender: String(msg.sender),
              recipient: String(msg.recipient),
              content: msg.content,
              status: msg.status,
              createdAt: msg.createdAt,
            });
          }
        }

        ack && ack({ ok: true, id: String(msg._id) });
      } catch (e) {
        ack && ack({ ok: false, code: 'SERVER_ERROR', message: 'Erreur serveur' });
      }
    });

    socket.on('message-read', async (payload) => {
      try {
        const { messageId } = payload || {};
        const msg = await Message.findById(messageId);
        if (!msg) return;
        if (String(msg.recipient) !== String(user._id)) return; 
        if (msg.status !== 'read') {
          msg.status = 'read';
          await msg.save();
        }
        // notifier l’expéditeur
        const expSockets = socketsByUser.get(String(msg.sender));
        if (expSockets) {
          for (const sid of expSockets) {
            io.sockets.sockets.get(sid)?.emit('message-read', { messageId: String(msg._id) });
          }
        }
      } catch (_) {}
    });

    socket.on('typing', async (payload) => {
      const { to, typing } = payload || {};
      if (!to) return;
      const recSockets = socketsByUser.get(String(to));
      if (recSockets) {
        for (const sid of recSockets) {
          io.sockets.sockets.get(sid)?.emit('typing', { from: String(user._id), typing: !!typing });
        }
      }
      if (typing) {
        setTimeout(() => {
          const recSockets2 = socketsByUser.get(String(to));
          if (recSockets2) {
            for (const sid of recSockets2) io.sockets.sockets.get(sid)?.emit('typing', { from: String(user._id), typing: false });
          }
        }, 3000);
      }
    });

    socket.on('user-status', async (cb) => {
      try {
        const users = await User.find({}).select('username status lastLogin');
        cb && cb({ ok: true, users: users.map((u) => ({ id: String(u._id), username: u.username, status: u.status, lastLogin: u.lastLogin })) });
      } catch (e) {
        cb && cb({ ok: false });
      }
    });

    socket.on('disconnect', async () => {
      const setSockets = socketsByUser.get(String(user._id));
      if (setSockets) {
        setSockets.delete(socket.id);
        if (setSockets.size === 0) socketsByUser.delete(String(user._id));
      }
      try {
        user.status = 'offline';
        user.lastLogin = new Date();
        await user.save();
      } catch (_) {}
      try {
        const contacts = await getContacts(user._id);
        for (const cid of contacts) {
          const recSockets = socketsByUser.get(String(cid));
          if (recSockets) {
            for (const sid of recSockets) {
              io.sockets.sockets.get(sid)?.emit('user-offline', { userId: String(user._id), lastLogin: user.lastLogin });
            }
          }
        }
      } catch (_) {}
    });
  });
}

module.exports = { initSocket };
