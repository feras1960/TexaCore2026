/**
 * ReceiptVoucherTab - سند القبض (المقبوضات)
 * Wrapper around JournalVoucherTab with docType='receipt'
 * All improvements (row coloring, duplicate detection, cell coloring, etc.) are inherited.
 */
import { JournalVoucherTab, type JournalVoucherTabProps } from './JournalVoucherTab';

export type ReceiptVoucherTabProps = Omit<JournalVoucherTabProps, 'docType'>;

export function ReceiptVoucherTab(props: ReceiptVoucherTabProps) {
    return <JournalVoucherTab {...props} docType="receipt" />;
}
