import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'explore' | 'crm';
  onTabChange: (tab: 'explore' | 'crm') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-screen bg-background text-gray-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
            M
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
            Maps Prospector AI
          </h1>
        </div>
        
        <nav className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-700/50">
          <button
            onClick={() => onTabChange('explore')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'explore' 
                ? 'bg-surface text-white shadow-sm border border-gray-700' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            Exploration
          </button>
          <button
            onClick={() => onTabChange('crm')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'crm' 
                ? 'bg-surface text-white shadow-sm border border-gray-700' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            CRM Prospects
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};