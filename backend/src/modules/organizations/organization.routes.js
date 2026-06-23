const express = require('express');
const controller = require('./organization.controller');
const { requirePlatformAdmin } = require('../../middleware/auth');

const router = express.Router();

// Every route here is platform-admin-only — organizations are managed
// from above the tenant boundary, not by tenants themselves.
router.use(requirePlatformAdmin);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/:id/reset-admin-password', controller.resetAdminPassword);
router.patch('/:id/status', controller.updateStatus);
router.patch('/:id/modules', controller.updateModules);

module.exports = router;
