-- HiLITE Sales OS — forced password change on first login
--
-- Every temp password this app generates (org admin at org creation, org
-- users at creation, either kind at an admin-initiated reset) currently
-- works indefinitely until someone voluntarily changes it. This flag
-- closes that gap: it's set true at the moment a temp password is
-- handed out, and cleared the moment that person successfully changes
-- their own password.
--
-- Existing rows default to false rather than retroactively forcing every
-- already-active account into a forced change — this only applies to
-- temp passwords issued from this point forward.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
