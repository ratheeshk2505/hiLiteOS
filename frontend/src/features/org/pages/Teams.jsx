import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' | 'edit', team? }
  const [deletingTeam, setDeletingTeam] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    setIsLoading(true);
    setError('');
    try {
      setTeams(await orgApi.listTeams());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Teams">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate">Group your sales force into territories or focus areas.</p>
        <Button onClick={() => setModalState({ mode: 'create' })} className="w-full sm:w-auto sm:flex-shrink-0">+ New Team</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-slate" />
          </div>
        ) : teams.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="font-display text-lg text-ink">No teams yet</div>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate">
              Create your first team — e.g. "North Kerala Sales" — to start organizing users.
            </p>
            <Button onClick={() => setModalState({ mode: 'create' })} className="mt-5">
              + New Team
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-5 py-3 font-medium">Team</th>
                <th className="px-5 py-3 font-medium">Members</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-ink">{team.name}</div>
                    {team.description && <div className="text-xs text-slate">{team.description}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-slate">{team.member_count}</td>
                  <td className="px-5 py-3.5 text-slate">{new Date(team.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setModalState({ mode: 'edit', team })}
                      className="mr-3 text-sm font-medium text-ink hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingTeam(team)}
                      className="text-sm font-medium text-ember hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <TeamFormModal
        state={modalState}
        onClose={() => setModalState(null)}
        onSaved={() => {
          setModalState(null);
          fetchTeams();
        }}
      />

      <ConfirmDialog
        open={!!deletingTeam}
        title={`Delete ${deletingTeam?.name}?`}
        description={
          deletingTeam?.member_count > 0
            ? `${deletingTeam.member_count} member(s) will become unassigned — they won't be deleted.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeletingTeam(null)}
        onConfirm={async () => {
          try {
            await orgApi.deleteTeam(deletingTeam.id);
            setDeletingTeam(null);
            fetchTeams();
          } catch (err) {
            setError(getErrorMessage(err));
            setDeletingTeam(null);
          }
        }}
      />
    </AppShell>
  );
}

function TeamFormModal({ state, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (state?.mode === 'edit') {
      setName(state.team.name);
      setDescription(state.team.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (state.mode === 'edit') {
        await orgApi.updateTeam(state.team.id, { name, description });
      } else {
        await orgApi.createTeam({ name, description });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={!!state} title={state?.mode === 'edit' ? 'Edit team' : 'New team'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        <label className="block text-sm font-medium text-ink">
          Team name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="North Kerala Sales"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          Description <span className="text-xs font-normal text-slate">Optional</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            {state?.mode === 'edit' ? 'Save changes' : 'Create team'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
