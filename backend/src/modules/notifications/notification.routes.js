const express = require('express');
const controller = require('./notification.controller');
const { requireOrgUser } = require('../../middleware/orgAuth');

const router = express.Router();

router.use(requireOrgUser);

router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', controller.markAsRead);
router.post('/mark-all-read', controller.markAllAsRead);

module.exports = router;
