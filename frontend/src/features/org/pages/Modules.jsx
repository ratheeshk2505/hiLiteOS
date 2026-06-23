import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Spinner } from '../../../components/ui/Spinner';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    orgApi
      .listModules()
      .then(setModules)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell title="Modules">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <p className="mb-4 text-sm text-slate">
        What your organization has access to. Enabling or disabling a module is managed by your HiLITE platform
        admin — reach out to them to change what's available here.
      </p>

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
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.module_id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{module.name}</td>
                  <td className="px-5 py-3.5 text-slate">{module.description || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
                        (module.enabled ? 'bg-verdant-soft text-verdant' : 'bg-line/60 text-slate')
                      }
                    >
                      <span className={'h-1.5 w-1.5 rounded-full ' + (module.enabled ? 'bg-verdant' : 'bg-slate')} />
                      {module.enabled ? 'Enabled' : 'Not enabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
