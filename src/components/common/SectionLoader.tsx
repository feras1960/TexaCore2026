/**
 * SectionLoader - Section-level Loading Component
 * Beautiful skeleton loading for sections with tabs
 */

import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { cn } from '@/lib/utils';

interface SectionLoaderProps {
  /** Number of skeleton cards to show */
  cards?: number;
  /** Show tabs skeleton */
  showTabs?: boolean;
  /** Number of tabs to show */
  tabCount?: number;
  /** Show stats skeleton */
  showStats?: boolean;
  /** Show table skeleton */
  showTable?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant */
  variant?: 'dashboard' | 'table' | 'form' | 'cards';
}

export default function SectionLoader({
  cards = 4,
  showTabs = true,
  tabCount = 6,
  showStats = true,
  showTable = false,
  className,
  variant = 'dashboard'
}: SectionLoaderProps) {

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Dashboard variant
  if (variant === 'dashboard') {
    return (
      <motion.div
        className={cn("space-y-6", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tabs Skeleton */}
        {showTabs && (
          <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: tabCount }).map((_, i) => (
              <Skeleton 
                key={i} 
                width={100} 
                height={40} 
                borderRadius={8}
                baseColor="#f3f4f6"
                highlightColor="#e5e7eb"
              />
            ))}
          </motion.div>
        )}

        {/* Stats Skeleton */}
        {showStats && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <Skeleton width={80} height={12} className="mb-2" />
                <Skeleton width={120} height={28} className="mb-1" />
                <Skeleton width={60} height={10} />
              </div>
            ))}
          </motion.div>
        )}

        {/* Cards Skeleton */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton circle width={40} height={40} />
                <div className="flex-1">
                  <Skeleton width="60%" height={16} className="mb-1" />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
              <Skeleton count={3} height={12} className="mb-2" />
              <div className="flex gap-2 mt-4">
                <Skeleton width={80} height={32} borderRadius={6} />
                <Skeleton width={80} height={32} borderRadius={6} />
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <motion.div
        className={cn("space-y-4", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Skeleton width={200} height={32} borderRadius={8} />
          <div className="flex gap-2">
            <Skeleton width={120} height={40} borderRadius={8} />
            <Skeleton width={100} height={40} borderRadius={8} />
          </div>
        </motion.div>

        {/* Table Skeleton */}
        <motion.div variants={itemVariants} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} />
              ))}
            </div>
          </div>
          
          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} height={14} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Pagination */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Skeleton width={150} height={14} />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={36} height={36} borderRadius={8} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Form variant
  if (variant === 'form') {
    return (
      <motion.div
        className={cn("space-y-6 max-w-2xl", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Skeleton width={200} height={28} className="mb-2" />
          <Skeleton width={300} height={14} />
        </motion.div>

        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div key={i} variants={itemVariants} className="space-y-2">
            <Skeleton width={100} height={14} />
            <Skeleton height={44} borderRadius={8} />
          </motion.div>
        ))}

        <motion.div variants={itemVariants} className="flex gap-3 pt-4">
          <Skeleton width={120} height={44} borderRadius={8} />
          <Skeleton width={100} height={44} borderRadius={8} />
        </motion.div>
      </motion.div>
    );
  }

  // Cards variant (simple)
  return (
    <motion.div
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <motion.div 
          key={i} 
          variants={itemVariants}
          className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
        >
          <Skeleton height={100} className="mb-4" borderRadius={8} />
          <Skeleton width="70%" height={20} className="mb-2" />
          <Skeleton width="50%" height={14} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// Content Transition Wrapper
export function ContentTransition({ 
  children, 
  isLoading,
  loadingVariant = 'dashboard'
}: { 
  children: React.ReactNode;
  isLoading: boolean;
  loadingVariant?: 'dashboard' | 'table' | 'form' | 'cards';
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SectionLoader variant={loadingVariant} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Tab Content Transition
export function TabTransition({ 
  children, 
  tabKey 
}: { 
  children: React.ReactNode;
  tabKey: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
