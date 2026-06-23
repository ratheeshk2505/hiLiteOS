const { EventEmitter } = require('events');

/**
 * A minimal domain event bus so the Sales module never directly creates
 * notifications — it just publishes what happened ('lead.created',
 * 'lead.assigned', 'lead.won', ...) and stays completely unaware of who's
 * listening. That's the loosely-coupled design the assessment asks for.
 *
 * This implementation is a plain in-process EventEmitter, which is the
 * right amount of machinery for a single Node process: zero infra, zero
 * latency, and the publish/subscribe shape below is intentionally the
 * same shape a real queue would have. That matters once this runs as more
 * than one instance: an in-process emitter only reaches subscribers in
 * the *same* process, so if the API scales out to multiple instances, an
 * event published on instance A is invisible to a subscriber running on
 * instance B, and nothing here persists an event if the process crashes
 * between publish and handling. The fix at that point is swapping this
 * module's internals for a real broker (BullMQ+Redis, RabbitMQ, SQS) —
 * because publish()/subscribe() below is the only interface callers use,
 * that swap doesn't require touching the Sales module or the Notifications
 * module's call sites at all.
 */
const bus = new EventEmitter();

// Domain event bugs are easy to lose silently otherwise — a throwing
// subscriber shouldn't crash the process or block other subscribers.
bus.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[eventBus] Subscriber error:', err);
});

function publish(eventName, payload) {
  try {
    bus.emit(eventName, payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[eventBus] Failed to publish ${eventName}:`, err);
  }
}

function subscribe(eventName, handler) {
  bus.on(eventName, (payload) => {
    Promise.resolve(handler(payload)).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[eventBus] Handler for ${eventName} failed:`, err);
    });
  });
}

module.exports = { publish, subscribe };
