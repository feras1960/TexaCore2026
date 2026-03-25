/**
 * PaymentVoucherTab - سند الصرف (المدفوعات)
 * Wrapper around JournalVoucherTab with docType='payment'
 * All improvements (row coloring, duplicate detection, cell coloring, etc.) are inherited.
 */
import { JournalVoucherTab, type JournalVoucherTabProps } from './JournalVoucherTab';

export type PaymentVoucherTabProps = Omit<JournalVoucherTabProps, 'docType'>;

export function PaymentVoucherTab(props: PaymentVoucherTabProps) {
    return <JournalVoucherTab {...props} docType="payment" />;
}
