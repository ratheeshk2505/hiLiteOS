import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Pagination } from '../../../components/ui/Pagination';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';

const selectClass = 'rounded-md border border-line bg-paper-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newUserResult, setNewUserResult] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    orgApi.listTeams().then(setTeams).catch(() => {});
    orgApi.listRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, teamFilter, roleFilter, statusFilter, page]);

  async function fetchUsers() {
    setIsLoading(true);
    setError('');
    try {
      const { rows, meta: m } = await orgApi.listUsers({
        search: search || undefined,
        teamId: teamFilter || undefined,
        roleId: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
      });
      setUsers(rows);
      setMeta(m);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAssignmentChange(user, field, value) {
    try {
      const updated = await orgApi.updateUserAssignment(user.id, {
        teamId: field === 'team' ? value || null : user.team_id,
        roleId: field === 'role' ? value || null : user.role_id,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function confirmStatusToggle() {
    const target = deactivatingUser;
    try {
      const updated = await orgApi.updateUserStatus(target.id, !target.is_active);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? updated : u)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeactivatingUser(null);
    }
  }

  async function confirmPasswordReset() {
    const target = resettingUser;
    setIsResettingPassword(true);
    try {
      const result = await orgApi.resetUserPassword(target.id);
      // Same shape as user-creation's result ({ ...user, tempPassword }),
      // so the existing reveal modal below works unchanged for both.
      setNewUserResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResettingPassword(false);
      setResettingUser(null);
    }
  }

  return (
    <AppShell title="Users">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-56"
          />
          <select value={teamFilter} onChange={(e) => { setPage(1); setTeamFilter(e.target.value); }} className="rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink">
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }} className="rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink">
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto sm:flex-shrink-0">+ New User</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-slate" />
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="font-display text-lg text-ink">No users found</div>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate">Adjust your filters, or add a new user to this organization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Team</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft font-display text-sm text-ink">
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-ink">
                          {user.name}
                          {user.is_org_admin && <span className="ml-1.5 text-xs text-slate">(Admin)</span>}
                        </div>
                        <div className="text-xs text-slate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={user.team_id || ''}
                      onChange={(e) => handleAssignmentChange(user, 'team', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Unassigned</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={user.role_id || ''}
                      onChange={(e) => handleAssignmentChange(user, 'role', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Unassigned</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={user.is_active ? 'active' : 'suspended'} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setResettingUser(user)}
                      className="mr-3 text-sm font-medium text-ink hover:underline"
                    >
                      Reset password
                    </button>
                    {!user.is_org_admin && (
                      <button
                        onClick={() => setDeactivatingUser(user)}
                        className={'text-sm font-medium hover:underline ' + (user.is_active ? 'text-ember' : 'text-verdant')}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <CreateUserModal
        open={createOpen}
        teams={teams}
        roles={roles}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          setNewUserResult(result);
          fetchUsers();
        }}
      />

      <Modal open={!!newUserResult} title="Temporary password" onClose={() => setNewUserResult(null)}>
        <p className="text-sm text-slate">
          There's no email service wired up yet — share this temporary password with {newUserResult?.name} directly
          so they can sign in. It won't be shown again.
        </p>
        <div className="mt-4 space-y-2 rounded-lg bg-paper p-4 text-sm">
          <div className="flex justify-between"><span className="text-slate">Email</span><span className="font-medium text-ink">{newUserResult?.email}</span></div>
          <div className="flex justify-between"><span className="text-slate">Temporary password</span><span className="lite-mark font-mono text-ink">{newUserResult?.tempPassword}</span></div>
        </div>
        <Button onClick={() => setNewUserResult(null)} className="mt-5 w-full">Done</Button>
      </Modal>

      <ConfirmDialog
        open={!!resettingUser}
        title={`Reset ${resettingUser?.name}'s password?`}
        description="A new temporary password will be generated, their current password stops working immediately, and any active session of theirs is signed out."
        confirmLabel="Reset password"
        tone="danger"
        onCancel={() => setResettingUser(null)}
        onConfirm={confirmPasswordReset}
      />

      <ConfirmDialog
        open={!!deactivatingUser}
        title={`${deactivatingUser?.is_active ? 'Deactivate' : 'Activate'} ${deactivatingUser?.name}?`}
        description={
          deactivatingUser?.is_active
            ? 'They will immediately lose access to the platform.'
            : 'They will regain access to the platform with their existing password.'
        }
        confirmLabel={deactivatingUser?.is_active ? 'Deactivate' : 'Activate'}
        tone={deactivatingUser?.is_active ? 'danger' : 'default'}
        onCancel={() => setDeactivatingUser(null)}
        onConfirm={confirmStatusToggle}
      />
      {isResettingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20">
          <Spinner className="h-6 w-6 text-paper" />
        </div>
      )}
    </AppShell>
  );
}

function CreateUserModal({ open, teams, roles, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setTeamId('');
      setRoleId('');
      setError('');
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const created = await orgApi.createUser({ name, email, teamId: teamId || null, roleId: roleId || null });
      onCreated(created);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New user" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        <label className="block text-sm font-medium text-ink">
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@yourcompany.com"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Team <span className="text-xs font-normal text-slate">Optional</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink">
              <option value="">Unassigned</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            Role <span className="text-xs font-normal text-slate">Optional</span>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink">
              <option value="">Unassigned</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
