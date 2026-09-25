'use client';

import { useApplicationLayout } from './useApplicationLayout';
import { Header, Sidebar, Footer, Loading, InstallPrompt } from '@/components';

export default function ApplicationLayout({ children }) {
  const { isUnauthorized, isLoading, sidebarExpanded, toggleSidebar } =
    useApplicationLayout();

  return (
    <div className="min-h-screen bg-secondary">
      <Header
        isExpanded={sidebarExpanded.isExpanded}
        toggleSidebar={toggleSidebar}
      />
      <div className="flex pt-16 min-h-screen">
        <Sidebar
          isExpanded={sidebarExpanded.isExpanded}
          toggleSidebar={toggleSidebar}
        />
        <main
          className={`min-w-0 flex-1 p-8 transition-all duration-300 ease-in-out ${
            sidebarExpanded.isExpanded ? 'md:ml-[150px]' : 'md:ml-18'
          }`}
        >
          {isLoading || isUnauthorized ? (
            <Loading />
          ) : (
            <div className="max-w-6xl mx-auto">{children}</div>
          )}
        </main>
      </div>
      <Footer />
      {!isLoading && !isUnauthorized && <InstallPrompt />}
    </div>
  );
}
