import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePageTitle } from '../../../hooks/usePageTitle';

export function AppShell({ title, children }) {
  usePageTitle(title);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-paper px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
