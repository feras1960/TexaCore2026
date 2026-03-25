import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export const LanguageSelector = () => {
    const { language, supportedLanguages, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const current = supportedLanguages.find(l => l.code === language);

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors bg-white/50 backdrop-blur-sm border border-gray-200/50"
            >
                <Globe className="w-4 h-4" />
                <span>{current?.nativeName}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-2 end-0 w-48 py-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto"
                        >
                            {supportedLanguages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code as any);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                                        language === lang.code && "bg-teal-50 text-teal-700"
                                    )}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span>{lang.nativeName}</span>
                                    {language === lang.code && (
                                        <CheckCircle2 className="w-4 h-4 ms-auto text-teal-600" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
