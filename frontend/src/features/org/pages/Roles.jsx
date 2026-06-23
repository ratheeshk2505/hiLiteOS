import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';

const DATA_SCOPE_LABELS = {
  own: 'Own leads only',
  team: "Team's leads",
  organization: 'Organization-wide',
};

const DATA_SCOPE_OPTIONS = [
  { value: 'own', label: 'Own leads only', description: 'Can only see leads assigned to them' },
  { value: 'team', label: "Team's leads", description: "Can see every lead assigned to anyone on their team" },
  { value: 'organization', label: 'Organization-wide', description: 'Can see every lead across the organization' },
];

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setIsLoading(true);
    setError('');
    try {
      setRoles(await orgApi.listRoles());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Roles">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate">
          Executive, Team Lead, Sales Manager and Director are seeded by default — add more to fit your structure.
        </p>
        <Button onClick={() => setModalState({ mode: 'create' })} className="w-full sm:w-auto sm:flex-shrink-0">+ New Role</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-slate" />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Data access</th>
                <th className="px-5 py-3 font-medium">Users</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{role.name}</span>
                      {role.is_default && (
                        <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-ink">Default</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-slate">
                      {DATA_SCOPE_LABELS[role.data_scope] || role.data_scope}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{role.user_count}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setModalState({ mode: 'edit', role })}
                      className="mr-3 text-sm font-medium text-ink hover:underline"
                    >
                      Rename
                    </button>
                    {!role.is_default && (
                      <button
                        onClick={() => setDeletingRole(role)}
                        className="text-sm font-medium text-ember hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <RoleFormModal
        state={modalState}
        onClose={() => setModalState(null)}
        onSaved={() => {
          setModalState(null);
          fetchRoles();
        }}
      />

      <ConfirmDialog
        open={!!deletingRole}
        title={`Delete ${deletingRole?.name}?`}
        description={
          deletingRole?.user_count > 0
            ? `${deletingRole.user_count} user(s) currently have this role. Reassign them first.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeletingRole(null)}
        onConfirm={async () => {
          try {
            await orgApi.deleteRole(deletingRole.id);
            setDeletingRole(null);
            fetchRoles();
          } catch (err) {
            setError(getErrorMessage(err));
            setDeletingRole(null);
          }
        }}
      />
    </AppShell>
  );
}

function RoleFormModal({ state, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [dataScope, setDataScope] = useState('own');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(state?.mode === 'edit' ? state.role.name : '');
    setDataScope(state?.mode === 'edit' ? state.role.data_scope : 'own');
    setError('');
  }, [state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (state.mode === 'edit') {
        await orgApi.updateRole(state.role.id, { name, dataScope });
      } else {
        await orgApi.createRole({ name, dataScope });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={!!state} title={state?.mode === 'edit' ? 'Edit role' : 'New role'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        <label className="block text-sm font-medium text-ink">
          Role name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Regional Head"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-ink">Lead data access</legend>
          <div className="mt-2 space-y-2">
            {DATA_SCOPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line p-3 hover:bg-paper">
                <input
                  type="radio"
                  name="dataScope"
                  value={opt.value}
                  checked={dataScope === opt.value}
                  onChange={() => setDataScope(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-ink">{opt.label}</div>
                  <div className="text-xs text-slate">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            {state?.mode === 'edit' ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
