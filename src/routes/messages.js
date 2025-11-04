const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  createMessage,
  getMessagesWithUser,
  getConversations,
  updateMessage,
  deleteMessage,
  markRead,
} = require('../controllers/messageController');

router.use(auth);

router.post('/', createMessage);
router.get('/:user_id', getMessagesWithUser);
router.get('/conversations/list', (req, res) => res.redirect(301, '/api/conversations'));
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/read', markRead);

module.exports = router;
