/**
 * ════════════════════════════════════════════════════════════════
 * 🔐 MfaChallengeScreen — شاشة التحقق بخطوتين عند تسجيل الدخول
 * ════════════════════════════════════════════════════════════════
 * تظهر بعد نجاح كلمة المرور إذا كان المستخدم مفعّل 2FA
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowRight, KeyRound, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface MfaChallengeScreenProps {
    onVerify: (code: string, trustDevice?: boolean) => Promise<{ success?: boolean; error?: string }>;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
    userEmail?: string;
}

export default function MfaChallengeScreen({
    onVerify,
    onCancel,
    loading = false,
    error: externalError,
    userEmail,
}: MfaChallengeScreenProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [localError, setLocalError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const error = externalError || localError;

    // Auto-focus first input on mount
    useEffect(() => {
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, []);

    const handleDigitChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const newDigits = [...digits];
        newDigits[index] = digit;
        setDigits(newDigits);
        setLocalError('');

        // Auto-advance to next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are filled
        if (digit && index === 5) {
            const code = newDigits.join('');
            if (code.length === 6) {
                handleSubmit(code);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            const code = digits.join('');
            if (code.length === 6) {
                handleSubmit(code);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length > 0) {
            const newDigits = [...digits];
            text.split('').forEach((char, i) => {
                if (i < 6) newDigits[i] = char;
            });
            setDigits(newDigits);
            const focusIndex = Math.min(text.length, 5);
            inputRefs.current[focusIndex]?.focus();

            if (text.length === 6) {
                setTimeout(() => handleSubmit(text), 100);
            }
        }
    };

    const handleSubmit = async (code?: string) => {
        const verifyCode = code || digits.join('');
        if (verifyCode.length !== 6) {
            setLocalError(isAr ? 'أدخل 6 أرقام' : 'Enter 6 digits');
            return;
        }

        setVerifying(true);
        setLocalError('');
        const result = await onVerify(verifyCode, trustDevice);
        setVerifying(false);

        if (result.error) {
            setLocalError(result.error);
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const isSubmitting = loading || verifying;
    const codeComplete = digits.every(d => d !== '');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-10 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4"
                        >
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-white mb-1">
                            {isAr ? 'المصادقة بخطوتين' : 'Two-Factor Authentication'}
                        </h2>
                        <p className="text-emerald-100 text-sm">
                            {isAr
                                ? 'أدخل الرمز من تطبيق المصادقة'
                                : 'Enter the code from your authenticator app'}
                        </p>
                        {userEmail && (
                            <p className="text-emerald-200/70 text-xs mt-2 font-mono" dir="ltr">
                                {userEmail}
                            </p>
                        )}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 end-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-8">
                        {/* 6-Digit Input */}
                        <div className="flex justify-center gap-2 mb-6" dir="ltr">
                            {digits.map((digit, idx) => (
                                <React.Fragment key={idx}>
                                    <motion.input
                                        ref={el => { inputRefs.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleDigitChange(idx, e.target.value)}
                                        onKeyDown={e => handleKeyDown(idx, e)}
                                        onPaste={idx === 0 ? handlePaste : undefined}
                                        disabled={isSubmitting}
                                        className={`
                                            w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
                                            transition-all duration-200 outline-none
                                            ${digit
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                                            }
                                            ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : ''}
                                            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800
                                            disabled:opacity-50
                                        `}
                                        initial={false}
                                        animate={digit ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ duration: 0.15 }}
                                    />
                                    {/* Separator dash between groups of 3 */}
                                    {idx === 2 && (
                                        <span className="flex items-center text-gray-300 dark:text-gray-600 text-xl font-light">—</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Verify Button */}
                        <button
                            onClick={() => handleSubmit()}
                            disabled={!codeComplete || isSubmitting}
                            className={`
                                w-full py-3.5 rounded-xl font-semibold text-white
                                flex items-center justify-center gap-2.5
                                transition-all duration-200
                                ${codeComplete && !isSubmitting
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30'
                                    : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <KeyRound className="w-5 h-5" />
                            )}
                            {isSubmitting
                                ? (isAr ? 'جاري التحقق...' : 'Verifying...')
                                : (isAr ? 'تحقق والدخول' : 'Verify & Login')
                            }
                        </button>

                        {/* Trust Device Checkbox */}
                        <label className="flex items-center gap-2.5 mt-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={trustDevice}
                                onChange={e => setTrustDevice(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                                {isAr ? 'الوثوق بهذا الجهاز لمدة 30 يوم' : 'Trust this device for 30 days'}
                            </span>
                        </label>

                        {/* Back to login */}
                        <div className="text-center mt-5">
                            <button
                                onClick={onCancel}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors inline-flex items-center gap-1.5"
                            >
                                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                                {isAr ? 'العودة لتسجيل الدخول' : 'Back to login'}
                            </button>
                        </div>

                        {/* Help text */}
                        <div className="mt-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                                {isAr
                                    ? 'افتح تطبيق المصادقة (Google Authenticator أو Authy) وأدخل الرمز المعروض لحساب TexaCore'
                                    : 'Open your authenticator app (Google Authenticator or Authy) and enter the code shown for TexaCore'}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
