const express = require('express');
const controller = require('./orgModule.controller');
const { requireOrgUser, requireOrgAdmin } = require('../../middleware/orgAuth');

const router = express.Router();

router.use(requireOrgUser, requireOrgAdmin);

router.get('/', controller.list);

module.exports = router;
