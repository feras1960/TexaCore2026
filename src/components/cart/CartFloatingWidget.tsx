/**
 * 🛒 CartFloatingWidget
 * زر عائم يظهر عدد البنود في السلة
 * يظهر فقط عندما توجد بنود في السلة
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCart } from '@/contexts/CartContext';

export function CartFloatingWidget() {
    const { t } = useLanguage();
    const { computed, actions } = useCart();

    if (computed.total_items === 0) return null;

    return (
        <AnimatePresence>
            <motion.button
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 50 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={actions.openDrawer}
                className="fixed bottom-6 end-6 z-40 flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 transition-colors"
                title={t('cart.title')}
            >
                <ShoppingCart className="h-5 w-5" />
                <motion.span
                    key={computed.total_items}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-sm font-bold"
                >
                    {computed.total_items}
                </motion.span>
                <span className="text-xs opacity-80">{t('cart.widget.items')}</span>
                <span className="text-xs font-mono border-s border-white/30 ps-2 ms-1">
                    {computed.total_amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
            </motion.button>
        </AnimatePresence>
    );
}

export default CartFloatingWidget;
