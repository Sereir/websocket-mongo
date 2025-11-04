const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * POST /api/messages
 * Body: { recipient_id, content(max5000) }
 * 201: message créé
 */
exports.createMessage = async (req, res) => {
  try {
    const { recipient_id, content } = req.body || {};
    if (!recipient_id || !mongoose.isValidObjectId(recipient_id)) {
      return res.status(400).json({ error: 'recipient_id invalide' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'contenu requis' });
    }
    if (content.length > 5000) {
      return res.status(400).json({ error: 'contenu trop long (max 5000)' });
    }

    if (recipient_id === String(req.user._id)) {
      return res.status(400).json({ error: 'impossible de s\'envoyer un message à soi-même' });
    }

    const recipient = await User.findById(recipient_id).select('_id');
    if (!recipient) return res.status(404).json({ error: 'destinataire introuvable' });

    const msg = await Message.create({
      sender: req.user._id,
      recipient: recipient._id,
      content: content.trim(),
      status: 'sent',
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * GET /api/messages/:user_id
 * Query: page=1
 * Retourne { total, page, pageSize, data } triés desc; marque les reçus comme lus.
 */
exports.getMessagesWithUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ error: 'user_id invalide' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = 30;
    const skip = (page - 1) * limit;

    const me = req.user._id;
    const other = new mongoose.Types.ObjectId(user_id);

    const baseFilter = {
      deleted: false,
      $or: [
        { sender: me, recipient: other },
        { sender: other, recipient: me },
      ],
    };

    // Marquer comme lus les messages reçus de l'autre
    await Message.updateMany({ sender: other, recipient: me, status: { $ne: 'read' } }, { $set: { status: 'read' } });

    const [total, messages] = await Promise.all([
      Message.countDocuments(baseFilter),
      Message.find(baseFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.json({ total, page, pageSize: messages.length, data: messages });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * GET /api/conversations
 * Retourne la liste des conversations: { other, lastMessage, unreadCount }.
 */
exports.getConversations = async (req, res) => {
  try {
    const me = req.user._id;

    const conv = await Message.aggregate([
      {
        $match: {
          deleted: false,
          $or: [{ sender: me }, { recipient: me }],
        },
      },
      {
        $addFields: {
          other: {
            $cond: [{ $eq: ['$sender', me] }, '$recipient', '$sender'],
          },
          isToMe: { $eq: ['$recipient', me] },
          isUnread: { $and: [{ $ne: ['$status', 'read'] }, { $eq: ['$recipient', me] }] },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$other',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: { $sum: { $cond: ['$isUnread', 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser',
        },
      },
      { $unwind: '$otherUser' },
      {
        $project: {
          _id: 0,
          other: {
            id: '$otherUser._id',
            username: '$otherUser.username',
            avatar: '$otherUser.avatar',
            status: '$otherUser.status',
            lastLogin: '$otherUser.lastLogin',
          },
          lastMessage: {
            _id: '$lastMessage._id',
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            sender: '$lastMessage.sender',
            recipient: '$lastMessage.recipient',
            status: '$lastMessage.status',
          },
          unreadCount: 1,
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    return res.json(conv);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * PUT /api/messages/:id
 * Body: { content }
 * Édite un message (propriétaire uniquement), renvoie le message.
 */
exports.updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id invalide' });
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'contenu requis' });
    }
    if (content.length > 5000) return res.status(400).json({ error: 'contenu trop long (max 5000)' });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: 'message introuvable' });
    if (String(msg.sender) !== String(req.user._id)) return res.status(403).json({ error: 'forbidden' });

    msg.content = content.trim();
    msg.edited = true;
    await msg.save();
    return res.json(msg);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * DELETE /api/messages/:id
 * Soft delete (propriétaire uniquement), { ok: true }.
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id invalide' });
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: 'message introuvable' });
    if (String(msg.sender) !== String(req.user._id)) return res.status(403).json({ error: 'forbidden' });

    msg.deleted = true;
    await msg.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/messages/:id/read
 * Marque un message comme lu (destinataire uniquement), { ok: true }.
 */
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'id invalide' });

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: 'message introuvable' });
    if (String(msg.recipient) !== String(req.user._id)) return res.status(403).json({ error: 'forbidden' });

    if (msg.status !== 'read') {
      msg.status = 'read';
      await msg.save();
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
