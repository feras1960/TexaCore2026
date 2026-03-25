import { useLanguage } from '@/app/providers/LanguageProvider';

export default function Healthcare() {
    const { t } = useLanguage();
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-cairo text-erp-navy dark:text-white">
                        {t('healthcare.title')}
                    </h1>
                    <p className="text-gray-500 font-tajawal mt-1">
                        {t('healthcare.subtitle')}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 text-center shadow-sm">
                <h2 className="text-xl font-semibold mb-2">{t('healthcare.systemTitle')}</h2>
                <p className="text-gray-500 max-w-lg mx-auto">
                    {t('healthcare.systemDescription')}
                </p>
            </div>
        </div>
    );
}
