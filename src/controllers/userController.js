const User = require('../models/User');

/**
 * GET /api/users/:id (public)
 * Renvoie le profil public { id, username, avatar, status }.
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('username avatar status');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    return res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Requête invalide' });
  }
};

/**
 * GET /api/users
 * Query: page, limit
 * Renvoie { total, page, pageSize, data: [ { username, avatar, status, lastLogin } ] }
 */
exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const q = { _id: { $ne: req.user._id } };

    const [total, users] = await Promise.all([
      User.countDocuments(q),
      User.find(q).select('username avatar status lastLogin').skip(skip).limit(limit).sort({ username: 1 }),
    ]);

    return res.json({ total, page, pageSize: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * PUT /api/users/profile (auth)
 * Body: { username?, avatar?(url|""), email? }
 * Met à jour le profil et renvoie { id, email, username, avatar, status }.
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, avatar, email } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (typeof username === 'string') {
      const trimmed = username.trim();
      if (trimmed.length < 3) return res.status(400).json({ error: 'username doit contenir au moins 3 caractères' });
      const exists = await User.exists({ username: trimmed, _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ error: 'username déjà utilisé' });
      user.username = trimmed;
    }

    if (typeof avatar === 'string') {
      user.avatar = avatar.trim() || null;
    }

    if (typeof email === 'string') {
      const trimmed = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return res.status(400).json({ error: 'format email invalide' });
      const exists = await User.exists({ email: trimmed, _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ error: 'email déjà utilisé' });
      user.email = trimmed;
    }

    await user.save();

    return res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * PUT /api/users/password (auth)
 * Body: { currentPassword, newPassword(min6) }
 * Vérifie l’ancien mot de passe et enregistre le nouveau.
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword et newPassword requis' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'mot de passe trop court (min 6)' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'mot de passe actuel invalide' });

    user.password = newPassword; // sera hashé par pre-save
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * GET /api/users/search (auth)
 * Query: q (regex-i sur username)
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ total: 0, page: 1, pageSize: 0, data: [] });

    const limit = 20;
    const regex = new RegExp(q.trim(), 'i');
    const filter = { username: regex, _id: { $ne: req.user._id } };

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select('username avatar status lastLogin').limit(limit).sort({ username: 1 }),
    ]);

    return res.json({ total, page: 1, pageSize: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
