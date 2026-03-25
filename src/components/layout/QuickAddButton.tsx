import { 
  Plus, FileText, Receipt, Package, BookOpen, 
  Calculator, Users, Truck, UserPlus 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ── Event for opening the Currency Calculator ──
export const CURRENCY_CALC_EVENT = 'open-currency-calculator';

export function QuickAddButton() {
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const isAr = t('quickActions.newSalesInvoice') !== 'quickActions.newSalesInvoice';

  const openCurrencyCalculator = () => {
    // Dispatch Ctrl+E programmatically
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'e', ctrlKey: true, bubbles: true 
    }));
  };

  return (
    <motion.div 
      className={`fixed bottom-8 z-50 ${direction === 'rtl' ? 'left-8' : 'right-8'}`}
      initial={{ opacity: 0, scale: 0, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5, type: 'spring', stiffness: 200 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="icon" 
              className="h-14 w-14 rounded-full bg-erp-teal hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-colors duration-300"
            >
              <Plus className="h-7 w-7" />
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={direction === 'rtl' ? 'end' : 'start'} 
          className="w-64 mb-2 font-tajawal"
        >
          <DropdownMenuLabel>{t('header.quickAdd')}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* ── Sales ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/sales/cycle?create=quotation')}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>{t('quickActions.newSalesInvoice')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/sales/customers')}
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>{t('quickActions.newCustomer')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* ── Accounting ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/accounting/vouchers?type=receipt&create=true')}
            >
              <Receipt className="w-4 h-4 text-green-600" />
              <span>{t('quickActions.receiptVoucher')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/accounting/vouchers?type=payment&create=true')}
            >
              <Truck className="w-4 h-4 text-orange-600" />
              <span>{t('quickActions.paymentVoucher')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/accounting/journal-entries?create=true')}
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>{t('quickActions.journalEntry')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* ── Inventory ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem 
              className="cursor-pointer gap-2.5 py-2"
              onClick={() => navigate('/warehouse/materials')}
            >
              <Package className="w-4 h-4 text-purple-600" />
              <span>{t('quickActions.newProduct')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* ── Tools ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem 
              className={cn(
                "cursor-pointer gap-2.5 py-2",
                "bg-gradient-to-r from-emerald-50/50 to-teal-50/50",
                "dark:from-emerald-900/10 dark:to-teal-900/10"
              )}
              onClick={openCurrencyCalculator}
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">{isAr ? 'حاسبة العملات' : 'Currency Calculator'}</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+E
              </kbd>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
