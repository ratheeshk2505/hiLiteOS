const express = require('express');
const controller = require('./platformAdmin.controller');
const { requirePlatformAdmin } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginLimiter, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', requirePlatformAdmin, controller.me);
router.post('/change-password', requirePlatformAdmin, controller.changePassword);

module.exports = router;
