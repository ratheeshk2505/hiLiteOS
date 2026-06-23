const express = require('express');
const controller = require('./modulesCatalog.controller');
const { requirePlatformAdmin } = require('../../middleware/auth');

const router = express.Router();

router.get('/', requirePlatformAdmin, controller.list);
router.post('/', requirePlatformAdmin, controller.create);
router.patch('/:id', requirePlatformAdmin, controller.update);

module.exports = router;
