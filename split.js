const fs = require('fs');

const orig = fs.readFileSync('src/features/warehouse/pages/StockMovementsPage.tsx', 'utf8');

// For ReceiptsDeliveriesPage
let r = orig.replace('export default function StockMovementsPage()', 'export default function ReceiptsDeliveriesPage()');
r = r.replace('📊 Stock Movements Page (حركات المخزون)', '📥 Receipts & Deliveries (أذون الاستلام والتسليم)');
r = r.replace('حركات المخزون', 'أذون الاستلام والتسليم');
r = r.replace('Stock Movements', 'Receipts & Deliveries');
r = r.replace("const [activeTab, setActiveTab] = useState('all');", "const [activeTab, setActiveTab] = useState('pending');");

fs.writeFileSync('src/features/warehouse/pages/ReceiptsDeliveriesPage.tsx', r);

// For StockMovementsPage
let s = orig.replace("const [pendingSubFilter, setPendingSubFilter] = useState<'all' | 'purchases' | 'sales' | 'containers' | 'transfers'>('all');", "// No pending sub filter");
s = s.replace('<TabsTrigger value="pending"', '{/* <TabsTrigger value="pending"');
s = s.replace('{isRTL ? \'⏳ المعلقة\' : \'⏳ Pending\'}', '{isRTL ? \'⏳ المعلقة\' : \'⏳ Pending\'} */}');
s = s.replace('value="pending"', 'value="pending"');

fs.writeFileSync('src/features/warehouse/pages/StockMovementsPage.tsx', s);

console.log('done');
