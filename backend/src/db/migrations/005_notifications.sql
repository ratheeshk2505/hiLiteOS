-- HiLITE Sales OS — Module 5: Notifications
--
-- The Sales module (Module 3) never inserts into this table directly —
-- it only publishes domain events ('lead.assigned', 'lead.won') to the
-- event bus (see src/events/eventBus.js), and this module's subscribers
-- turn those into rows here. That's the loosely-coupled design the
-- assessment calls for: Sales has no idea Notifications exists.

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('lead_assigned', 'lead_won');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The only two queries this module ever runs: "this user's notifications,
-- newest first" and "this user's unread count" — both match this index
-- directly rather than needing a second one for the unread-only case.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
