const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant');
  }
  const payload = { sub: user._id.toString() };
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

async function generateUniqueUsername(base) {
  let username = (base || '').replace(/[^a-zA-Z0-9_\.\-]/g, '').slice(0, 20);
  if (username.length < 3) username = `user${Math.floor(Math.random() * 10000)}`;
  let attempt = 0;
  while (attempt < 10) {
    const exists = await User.exists({ username });
    if (!exists) return username;
    attempt += 1;
    username = `${username}${Math.floor(Math.random() * 1000)}`;
  }
  return `${base || 'user'}_${Date.now()}`;
}

/**
 * POST /api/auth/register
 * Body: { email, password, [username], [avatar] }
 * Crée un utilisateur, émet un JWT et renvoie { token, user }.
 */
exports.register = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuration manquante: JWT_SECRET' });
    }
    const { email, password, username, avatar } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password sont requis' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'format email invalide' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (exists) {
      return res.status(409).json({ error: 'email déjà utilisé' });
    }

    let finalUsername = username && username.trim().length >= 3 ? username.trim() : null;
    if (!finalUsername) {
      const base = email.split('@')[0];
      finalUsername = await generateUniqueUsername(base);
    }

    const user = await User.create({ email, username: finalUsername, password, avatar });

    user.status = 'online';
    await user.save();

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (err) {
    if (err.message && err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Configuration manquante: JWT_SECRET' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'username déjà utilisé' });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Authentifie l’utilisateur, met status=online, renvoie { token, user }.
 */
exports.login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuration manquante: JWT_SECRET' });
    }
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password sont requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    user.status = 'online';
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (err) {
    if (err.message && err.message.includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Configuration manquante: JWT_SECRET' });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/auth/logout
 * Met status=offline, lastLogin=now.
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user;
    user.status = 'offline';
    user.lastLogin = new Date();
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
