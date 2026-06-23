const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./notification.service');

const list = asyncHandler(async (req, res) => {
  const { unreadOnly, page, pageSize } = req.query;
  const { rows, meta } = await service.listForUser(req.orgUser.organizationId, req.orgUser.id, { unreadOnly, page, pageSize });
  return ok(res, rows, 200, meta);
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.orgUser.organizationId, req.orgUser.id);
  return ok(res, { count });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await service.markAsRead(req.orgUser.organizationId, req.orgUser.id, req.params.id);
  return ok(res, notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await service.markAllAsRead(req.orgUser.organizationId, req.orgUser.id);
  return ok(res, { markedAllRead: true });
});

module.exports = { list, unreadCount, markAsRead, markAllAsRead };
