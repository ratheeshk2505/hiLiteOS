const express = require('express');
const controller = require('./orgAuth.controller');
const { requireOrgUser } = require('../../middleware/orgAuth');
const { loginLimiter } = require('../../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginLimiter, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', requireOrgUser, controller.me);
router.post('/change-password', requireOrgUser, controller.changePassword);

module.exports = router;
