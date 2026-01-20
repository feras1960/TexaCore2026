import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { QuickAddButton } from './QuickAddButton';
import { useLanguage } from '@/app/providers/LanguageProvider';

export default function MainLayout() {
  const { direction } = useLanguage();

  return (
    <div className="h-screen bg-erp-cream dark:bg-gray-950 font-tajawal flex overflow-hidden" dir={direction}>
      {/* Sidebar */}
      <Sidebar className="shrink-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Quick Add Button */}
      <QuickAddButton />
    </div>
  );
}
