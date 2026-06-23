const app = require('./src/app');
const env = require('./src/config/env');
const { registerNotificationSubscribers } = require('./src/modules/notifications/notification.events');

// Module 5 only finds out about Sales activity through the event bus —
// this is the one line that wires it up, and it's the only place
// Notifications and Sales are mentioned anywhere near each other.
registerNotificationSubscribers();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] HiLITE Sales OS API listening on http://localhost:${env.port}`);
  // eslint-disable-next-line no-console
  console.log(`[server] Environment: ${env.nodeEnv}`);
});
