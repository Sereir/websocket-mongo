const router = require('express').Router();
const auth = require('../middleware/auth');
const { getUserById, listUsers, updateProfile, searchUsers, changePassword } = require('../controllers/userController');

router.get('/search', auth, searchUsers);
router.get('/', auth, listUsers);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword);

router.get('/:id', getUserById);

module.exports = router;
