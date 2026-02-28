/**
 * CashJournalTab - يومية الصندوق
 * Wrapper around JournalVoucherTab with docType='cash'
 * All improvements (row coloring, duplicate detection, cell coloring, etc.) are inherited.
 */
import { JournalVoucherTab, type JournalVoucherTabProps } from './JournalVoucherTab';

export type CashJournalTabProps = Omit<JournalVoucherTabProps, 'docType'>;

export function CashJournalTab(props: CashJournalTabProps) {
    return <JournalVoucherTab {...props} docType="cash" />;
}
