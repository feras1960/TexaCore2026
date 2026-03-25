import re

with open('src/features/warehouse/pages/StockMovementsPage.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

# FOR RECEIPTS AND DELIVERIES
# name: ReceiptsDeliveriesPage
r_content = orig.replace('StockMovementsPage', 'ReceiptsDeliveriesPage')
r_content = r_content.replace('📊 Stock Movements Page (حركات المخزون)', '📥 Receipts & Deliveries (أذون الاستلام والتسليم)')
r_content = r_content.replace('حركات المخزون', 'الاستلام والتسليم')
r_content = r_content.replace('Stock Movements', 'Receipts & Deliveries')

# Change Main Tabs
r_tabs = """const [activeTab, setActiveTab] = useState<'pending' | 'purchases' | 'sales' | 'containers' | 'transfers'>('pending');

    const tabs = useMemo(() => [
        { id: 'pending', label: isRTL ? 'الكل' : 'All', count: stats.pendingCount },
        { id: 'purchases', label: isRTL ? 'مشتريات' : 'Purchases', icon: <ArrowDownToLine className="h-4 w-4" />, count: pendingCounts.purchases },
        { id: 'sales', label: isRTL ? 'مبيعات' : 'Sales', icon: <ArrowUpFromLine className="h-4 w-4" />, count: pendingCounts.sales },
        { id: 'containers', label: isRTL ? 'كونتينرات' : 'Containers', icon: <Package className="h-4 w-4" />, count: pendingCounts.containers },
        { id: 'transfers', label: isRTL ? 'مناقلات' : 'Transfers', icon: <ArrowLeftRight className="h-4 w-4" />, count: pendingCounts.transfers },
    ], [isRTL, stats, pendingCounts]);"""

r_content = re.sub(r'const \[activeTab, setActiveTab\] = useState.*?\], \[isRTL, stats\]\);', r_tabs, r_content, flags=re.DOTALL)

# Let's write another regex to simplify filteredData
r_filtered_data = """    const currentData = useMemo(() => {
        if (activeTab === 'pending') return pendingReceipts;
        return pendingReceipts.filter((r: any) => {
            const type = r.type || '';
            switch (activeTab) {
                case 'containers': return type === 'container';
                case 'transfers': return type === 'transfer' || type === 'stock_transfer';
                case 'sales': return type === 'sales_invoice' || type === 'sales_order';
                case 'purchases': return !['container', 'transfer', 'stock_transfer', 'sales_invoice', 'sales_order'].includes(type);
                default: return true;
            }
        });
    }, [pendingReceipts, activeTab]);

    const isPending = true;"""

r_content = re.sub(r'const filteredPendingReceipts = useMemo.*?const currentData =.*?(?=// ═══ Search Filter \(local\) ═══)', r_filtered_data + '\n\n    ', r_content, flags=re.DOTALL)

# Delete movement columns, renderMovementActions
r_content = re.sub(r'const movementColumns: NexaListColumn.*?\]\, \[isRTL, language, baseCurrency, formatDate\]\)\;', '', r_content, flags=re.DOTALL)
r_content = re.sub(r'const renderMovementActions = useCallback\(\(row: any\) => \(.*?\), \[isRTL, handleOpenLinkedInvoice\]\);', '', r_content, flags=re.DOTALL)

# Edit NexaListTable props
r_list_props = """                <NexaListTable
                    data={sortedData}
                    columns={pendingColumns}
                    rowKey="id"
                    renderActions={renderPendingActions}
                    searchPlaceholder={isRTL ? 'بحث بالمرجع، المورد، أو الوصف...' : 'Search by reference, supplier, etc...'}
                />"""

r_content = re.sub(r'<NexaListTable.*?/>', r_list_props, r_content, flags=re.DOTALL)

# Remove the pending Sub Filter UI entirely since we moved it to main tabs
r_content = re.sub(r'\{\s*isPending && \(\s*<div className="flex flex-wrap items-center gap-2 pb-4">.*?</div>\s*\)\}', '', r_content, flags=re.DOTALL)


with open('src/features/warehouse/pages/ReceiptsDeliveriesPage.tsx', 'w', encoding='utf-8') as f:
    f.write(r_content)


# FOR STOCK MOVEMENTS:
# Keep "all", "receipts", "issues" and remove "pending"
s_content = orig

s_tabs = """const [activeTab, setActiveTab] = useState<'all' | 'receipts' | 'issues'>('all');

    const tabs = useMemo(() => [
        { id: 'all', label: isRTL ? 'الكل' : 'All', count: stats.totalMovements },
        { id: 'receipts', label: isRTL ? 'الاستلامات' : 'Inbound', icon: <ArrowDownToLine className="h-4 w-4 text-emerald-500" />, count: stats.inboundCount },
        { id: 'issues', label: isRTL ? 'التسليمات' : 'Outbound', icon: <ArrowUpFromLine className="h-4 w-4 text-rose-500" />, count: stats.outboundCount },
    ], [isRTL, stats]);"""

s_content = re.sub(r'const \[activeTab, setActiveTab\] = useState.*?\], \[isRTL, stats\]\);', s_tabs, s_content, flags=re.DOTALL)

s_current_data = """    const currentData = activeTab === 'receipts' ? inboundMovements :
        activeTab === 'issues' ? outboundMovements :
            movements;
    
    const isPending = false;"""

s_content = re.sub(r'const pendingCounts = useMemo.*?(?=// ═══ Search Filter \(local\) ═══)', s_current_data + '\n\n    ', s_content, flags=re.DOTALL)

s_content = re.sub(r'const pendingColumns: NexaListColumn.*?\]\, \[isRTL, language, baseCurrency, formatDate\]\);', '', s_content, flags=re.DOTALL)
s_content = re.sub(r'const renderPendingActions = useCallback\(\(row: any\) => \{.*?\), \[isRTL, handleConfirmReceipt\]\);', '', s_content, flags=re.DOTALL)

# Also remove MaterialDialog logic
s_content = re.sub(r'const \[receiptDialog, setReceiptDialog\].*?setReceiptDialog\(\{ open: false \}\);\n    \}, \[\]\);', '', s_content, flags=re.DOTALL)
s_content = re.sub(r'<MaterialReceiptDialog.*?/>', '', s_content, flags=re.DOTALL)
s_content = re.sub(r'import \{ MaterialReceiptDialog \} from \'\.\./components/MaterialReceiptDialog\';\n', '', s_content)

# Update return table
s_list_props = """                <NexaListTable
                    data={sortedData}
                    columns={movementColumns}
                    rowKey="id"
                    renderActions={renderMovementActions}
                    searchPlaceholder={isRTL ? 'بحث برقم الحركة،رقم الفاتورة، المنتج، المورد، المستودع...' : 'Search bounds...'}
                />"""

s_content = re.sub(r'<NexaListTable.*?/>', s_list_props, s_content, flags=re.DOTALL)

# Delete Sub Filter UI
s_content = re.sub(r'\{\s*isPending && \(\s*<div className="flex flex-wrap items-center gap-2 pb-4">.*?</div>\s*\)\}', '', s_content, flags=re.DOTALL)

with open('src/features/warehouse/pages/StockMovementsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(s_content)

print("done")
