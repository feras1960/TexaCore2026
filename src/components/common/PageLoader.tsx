/**
 * PageLoader - Professional Loading Component
 * Used for page-level loading states with beautiful animations
 */

import { motion } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  /** Optional loading message */
  message?: string;
  /** Show full screen overlay */
  fullScreen?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'minimal' | 'branded';
}

export default function PageLoader({ 
  message,
  fullScreen = false,
  className,
  variant = 'default'
}: PageLoaderProps) {
  const { t } = useLanguage();

  const loadingMessage = message || t('common.loading');

  // Animated dots
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={cn(
        "flex items-center justify-center p-8",
        fullScreen && "fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50",
        className
      )}>
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-2 h-2 bg-teal-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <span className="text-sm text-gray-500">{loadingMessage}</span>
        </motion.div>
      </div>
    );
  }

  if (variant === 'branded') {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-12",
        fullScreen && "fixed inset-0 bg-white dark:bg-gray-950 z-50",
        className
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {/* Logo Animation */}
          <motion.div 
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30"
            animate={{ 
              boxShadow: [
                '0 10px 25px -5px rgba(20, 184, 166, 0.3)',
                '0 20px 40px -10px rgba(20, 184, 166, 0.4)',
                '0 10px 25px -5px rgba(20, 184, 166, 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.span 
              className="text-3xl font-bold text-white"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              T
            </motion.span>
          </motion.div>

          {/* Spinning Ring */}
          <motion.div
            className="absolute -inset-2 border-2 border-teal-200 dark:border-teal-800 rounded-3xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ borderTopColor: '#14b8a6', borderRightColor: 'transparent' }}
          />
        </motion.div>

        <motion.p
          className="mt-6 text-gray-600 dark:text-gray-400 font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loadingMessage}
        </motion.p>

        {/* Animated Dots */}
        <motion.div 
          className="flex gap-1 mt-3"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-teal-400 rounded-full"
              variants={dotVariants}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: i * 0.1
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12",
      fullScreen && "fixed inset-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm z-50",
      className
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        {/* Animated Spinner */}
        <motion.div
          className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"
          style={{ borderTopColor: '#14b8a6' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-white font-bold text-sm">T</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.p
        className="mt-6 text-gray-600 dark:text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {loadingMessage}
      </motion.p>
    </div>
  );
}

// Export named variants for convenience
export const MinimalLoader = (props: Omit<PageLoaderProps, 'variant'>) => (
  <PageLoader {...props} variant="minimal" />
);

export const BrandedLoader = (props: Omit<PageLoaderProps, 'variant'>) => (
  <PageLoader {...props} variant="branded" />
);
