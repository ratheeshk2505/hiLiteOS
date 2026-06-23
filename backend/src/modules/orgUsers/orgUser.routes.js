const express = require('express');
const controller = require('./orgUser.controller');
const { requireOrgUser, requireOrgAdmin } = require('../../middleware/orgAuth');

const router = express.Router();

router.use(requireOrgUser, requireOrgAdmin);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.patch('/:id/assignment', controller.updateAssignment);
router.post('/:id/reset-password', controller.resetPassword);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
