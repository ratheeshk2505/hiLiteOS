import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { Spinner } from '../../../components/ui/Spinner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { platformApi } from '../api/platformApi';
import { getErrorMessage } from '../api/apiClient';

export default function OrganizationDetail() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingModuleId, setPendingModuleId] = useState(null);
  const [confirmingStatusChange, setConfirmingStatusChange] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmingPasswordReset, setConfirmingPasswordReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  async function fetchOrg() {
    setIsLoading(true);
    setError('');
    try {
      const data = await platformApi.getOrganization(id);
      setOrg(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleModule(moduleId, enabled) {
    setPendingModuleId(moduleId);
    try {
      const updatedModules = await platformApi.updateOrganizationModules(id, [{ moduleId, enabled }]);
      setOrg((prev) => ({ ...prev, modules: updatedModules }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPendingModuleId(null);
    }
  }

  async function confirmStatusChange() {
    const nextStatus = org.status === 'active' ? 'suspended' : 'active';
    setIsUpdatingStatus(true);
    try {
      const updated = await platformApi.updateOrganizationStatus(id, nextStatus);
      setOrg((prev) => ({ ...prev, status: updated.status }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
      setConfirmingStatusChange(false);
    }
  }

  async function confirmPasswordReset() {
    setIsResettingPassword(true);
    try {
      const result = await platformApi.resetAdminPassword(id);
      setResetResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResettingPassword(false);
      setConfirmingPasswordReset(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Organization">
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-slate" />
        </div>
      </AppShell>
    );
  }

  if (error || !org) {
    return (
      <AppShell title="Organization">
        <div className="rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error || 'Organization not found'}</div>
        <Link to="/platform/organizations" className="mt-4 inline-block text-sm text-slate underline">
          Back to organizations
        </Link>
      </AppShell>
    );
  }

  const isActive = org.status === 'active';

  return (
    <AppShell title={org.name}>
      <Link to="/platform/organizations" className="text-sm text-slate hover:text-ink">
        ← All organizations
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-paper-raised p-6 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl text-ink">{org.name}</h2>
                <StatusBadge status={org.status} />
              </div>
              <div className="mt-1 font-mono text-xs text-slate">{org.code}</div>
            </div>
            <Button
              variant={isActive ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setConfirmingStatusChange(true)}
              className="self-start"
            >
              {isActive ? 'Suspend organization' : 'Reactivate organization'}
            </Button>
          </div>

          {org.description && <p className="mt-4 text-sm text-slate">{org.description}</p>}

          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">Primary admin</h3>
              {org.primaryAdmin && (
                <button
                  onClick={() => setConfirmingPasswordReset(true)}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  Reset password
                </button>
              )}
            </div>
            {org.primaryAdmin ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft font-display text-sm text-ink">
                  {org.primaryAdmin.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{org.primaryAdmin.name}</div>
                  <div className="text-xs text-slate">{org.primaryAdmin.email}</div>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate">No admin user found.</p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <Row label="Created" value={new Date(org.created_at).toLocaleString()} />
            <Row label="Last updated" value={new Date(org.updated_at).toLocaleString()} />
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-raised p-6">
          <h3 className="font-display text-lg text-ink">Module access</h3>
          <p className="mt-0.5 text-xs text-slate">Enable or disable features for this organization — no redeploy needed.</p>

          <div className="mt-4 space-y-4">
            {org.modules.map((m) => (
              <div key={m.module_id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-ink">{m.name}</div>
                  <div className="text-xs text-slate">{m.description}</div>
                </div>
                {pendingModuleId === m.module_id ? (
                  <Spinner className="h-4 w-4 text-slate" />
                ) : (
                  <Toggle
                    checked={m.enabled}
                    onChange={(val) => toggleModule(m.module_id, val)}
                    label={`Toggle ${m.name}`}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmingStatusChange}
        title={isActive ? 'Suspend this organization?' : 'Reactivate this organization?'}
        description={
          isActive
            ? `${org.name} and all of its users will immediately lose access to the platform.`
            : `${org.name} and its users will regain access to the platform.`
        }
        confirmLabel={isActive ? 'Suspend' : 'Reactivate'}
        tone={isActive ? 'danger' : 'default'}
        onConfirm={confirmStatusChange}
        onCancel={() => setConfirmingStatusChange(false)}
      />
      <ConfirmDialog
        open={confirmingPasswordReset}
        title={`Reset ${org.primaryAdmin?.name}'s password?`}
        description="A new temporary password will be generated, their current password stops working immediately, and any active session of theirs is signed out."
        confirmLabel="Reset password"
        tone="danger"
        onConfirm={confirmPasswordReset}
        onCancel={() => setConfirmingPasswordReset(false)}
      />

      <Modal open={!!resetResult} title="Password reset" onClose={() => setResetResult(null)}>
        <p className="text-sm text-slate">
          Share this temporary password with {resetResult?.adminUser?.name} directly — there's no email service wired
          up yet, and it won't be shown again.
        </p>
        <div className="mt-4 space-y-2 rounded-lg bg-paper p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate">Email</span>
            <span className="font-medium text-ink">{resetResult?.adminUser?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate">New temporary password</span>
            <span className="lite-mark font-mono text-ink">{resetResult?.tempPassword}</span>
          </div>
        </div>
        <Button onClick={() => setResetResult(null)} className="mt-5 w-full">Done</Button>
      </Modal>

      {isUpdatingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20">
          <Spinner className="h-6 w-6 text-paper" />
        </div>
      )}
      {isResettingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20">
          <Spinner className="h-6 w-6 text-paper" />
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate">{label}</div>
      <div className="mt-0.5 text-ink">{value}</div>
    </div>
  );
}
