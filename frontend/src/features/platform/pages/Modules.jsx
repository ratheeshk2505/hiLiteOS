import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { platformApi } from '../api/platformApi';
import { getErrorMessage } from '../api/apiClient';

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', module }

  useEffect(() => {
    fetchModules();
  }, []);

  async function fetchModules() {
    setIsLoading(true);
    setError('');
    try {
      setModules(await platformApi.listModules());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Modules">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate">
          The master catalog every organization's module access is granted from. Adding one here doesn't turn it on
          for anyone — each org still needs it enabled individually from its detail page.
        </p>
        <Button onClick={() => setModalState({ mode: 'create' })} className="w-full sm:w-auto sm:flex-shrink-0">+ New Module</Button>
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
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">Key</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5 font-medium text-ink">{module.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate">{module.key}</td>
                  <td className="px-5 py-3.5 max-w-sm truncate text-slate">{module.description || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setModalState({ mode: 'edit', module })}
                      className="text-sm font-medium text-ink hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <ModuleFormModal
        state={modalState}
        onClose={() => setModalState(null)}
        onSaved={() => {
          setModalState(null);
          fetchModules();
        }}
      />
    </AppShell>
  );
}

function ModuleFormModal({ state, onClose, onSaved }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (state?.mode === 'edit') {
      setKey(state.module.key);
      setName(state.module.name);
      setDescription(state.module.description || '');
    } else {
      setKey('');
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
        await platformApi.updateModule(state.module.id, { name, description });
      } else {
        await platformApi.createModule({ key, name, description });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={!!state} title={state?.mode === 'edit' ? 'Edit module' : 'New module'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        {state?.mode === 'create' ? (
          <label className="block text-sm font-medium text-ink">
            Key <span className="text-xs font-normal text-slate">Lowercase, no spaces — can't be changed later</span>
            <input
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="inventory_mgmt"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-ink"
            />
          </label>
        ) : (
          <div className="text-sm font-medium text-ink">
            Key <span className="ml-2 rounded-md bg-paper px-2 py-0.5 font-mono text-xs text-slate">{key}</span>
          </div>
        )}

        <label className="mt-4 block text-sm font-medium text-ink">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Inventory Management"
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
            {state?.mode === 'edit' ? 'Save changes' : 'Create module'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
