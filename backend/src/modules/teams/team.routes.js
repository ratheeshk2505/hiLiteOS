const express = require('express');
const controller = require('./team.controller');
const { requireOrgUser, requireOrgAdmin } = require('../../middleware/orgAuth');

const router = express.Router();

router.use(requireOrgUser, requireOrgAdmin);

router.post('/', controller.create);
router.get('/', controller.list);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
