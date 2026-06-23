-- HiLITE Sales OS — Security hardening
--
-- Two additions that apply across every module rather than to one of them:
--
-- 1. refresh_tokens: access tokens (JWTs) are short-lived (15m) and can't
--    be revoked once issued — that's inherent to stateless JWTs. Sessions
--    are carried by a refresh token instead, which *is* revocable: it's
--    looked up in this table on every refresh, so logging out, deactivating
--    a user, or an admin response to a compromised account all take effect
--    immediately instead of waiting out a token's remaining lifetime.
--    One table serves both platform admins and org users (`subject_type`
--    distinguishes them) since the lifecycle logic is identical for both.
--
-- 2. audit_logs: a forensic trail of security- and business-relevant
--    actions (org suspended, user deactivated, role deleted, etc.) —
--    useful for incident investigation, and doubles as the basis for the
--    "Audit Timeline" bonus feature.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type    VARCHAR(20) NOT NULL CHECK (subject_type IN ('platform_admin', 'org_user')),
  subject_id      UUID NOT NULL,
  token_hash      VARCHAR(64) NOT NULL UNIQUE, -- sha256 hex digest; the raw token is never stored
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  replaced_by_id  UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent      TEXT,
  ip_address      VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_subject ON refresh_tokens(subject_type, subject_id);
-- Lets a cron/job periodically purge rows that can no longer be used for
-- anything, instead of this table growing forever.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- null for platform-level actions
  actor_type      VARCHAR(20) NOT NULL CHECK (actor_type IN ('platform_admin', 'org_user')),
  actor_id        UUID NOT NULL,
  action          VARCHAR(100) NOT NULL, -- e.g. 'organization.suspended', 'user.deactivated'
  target_type     VARCHAR(50),
  target_id       UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
