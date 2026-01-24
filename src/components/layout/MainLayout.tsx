import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
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
        <motion.main 
          className="flex-1 p-4 lg:p-6 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="max-w-[1400px] mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Outlet />
          </motion.div>
        </motion.main>
      </div>

      {/* Floating Quick Add Button */}
      <QuickAddButton />
    </div>
  );
}
