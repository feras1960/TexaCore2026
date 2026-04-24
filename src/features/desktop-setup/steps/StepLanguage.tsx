// Step 1: Language Selection (auto-detect from OS)
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES, type DesktopSetupData } from '../types';

interface Props {
  data: DesktopSetupData;
  onChange: (field: string, value: any) => void;
}

export function StepLanguage({ data, onChange }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <Globe className="w-12 h-12 mx-auto mb-3 text-teal-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          اختر لغة الواجهة / Choose Language
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          يمكنك تغييرها لاحقاً من الإعدادات
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SUPPORTED_LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => onChange('language', lang.code)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-[1.02]',
              data.language === lang.code
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
            )}
          >
            <span className="text-3xl">{lang.flag}</span>
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              {lang.name}
            </span>
            {data.language === lang.code && (
              <div className="absolute top-2 end-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
