import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
// Commented out temporarily - these components may need to be created or imported from elsewhere
// import { AccountDetails } from './AccountDetails';
// import DocumentDetailsView from './DocumentDetailsView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Printer,
  Download,
  Share2,
  FileText,
  Calendar,
  User,
  Hash,
  Package,
  CreditCard,
  Layers,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  BarChart3,
  Tag,
  DollarSign,
  ChevronLeft,
  Building,
  Receipt,
  ArrowRight,
  ArrowLeft,
  Eye,
  Boxes,
  Warehouse,
  Activity
} from 'lucide-react';

interface JournalEntryDetailsViewProps {
  entry: any;
}

// Product Details View Component (embedded in drill-down)
function ProductDetailsView({ product, onClose }: { product: any; onClose: () => void }) {
  const { t, language, direction } = useLanguage();
  const { currencyCode: companyCurrency } = useCompanyCurrency();

  // Mock warehouse stock data
  const warehouseStock = [
    { id: 1, name: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse', quantity: Math.floor(Math.random() * 100) + 50, minQty: 20, maxQty: 200, status: 'good' },
    { id: 2, name: language === 'ar' ? 'مستودع الفرع' : 'Branch Warehouse', quantity: Math.floor(Math.random() * 50) + 10, minQty: 10, maxQty: 100, status: 'low' },
    { id: 3, name: language === 'ar' ? 'صالة العرض' : 'Showroom', quantity: Math.floor(Math.random() * 30) + 5, minQty: 5, maxQty: 50, status: 'good' },
  ];

  // Mock movements
  const movements = [
    { id: 1, type: 'in', date: '2024-01-15', reference: 'PO-2024-001', quantity: 50, warehouse: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse' },
    { id: 2, type: 'out', date: '2024-01-14', reference: 'INV-2024-045', quantity: 12, warehouse: language === 'ar' ? 'صالة العرض' : 'Showroom' },
    { id: 3, type: 'out', date: '2024-01-10', reference: 'INV-2024-030', quantity: 5, warehouse: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse' },
    { id: 4, type: 'in', date: '2024-01-01', reference: 'PO-2024-005', quantity: 100, warehouse: language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse' },
  ];

  const totalStock = warehouseStock.reduce((sum, w) => sum + w.quantity, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 bg-erp-navy/5 rounded-lg">
            <Package className="w-6 h-6 text-erp-navy" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-erp-navy font-cairo">{product.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{product.code}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 pt-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-transparent p-0 border-b mb-4">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none">
              <Package className="w-4 h-4" />
              {t('overview') || 'نظرة عامة'}
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none">
              <Warehouse className="w-4 h-4" />
              {t('warehouseStock') || 'الكميات بالمستودعات'}
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none">
              <Activity className="w-4 h-4" />
              {t('movements') || 'الحركات'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Boxes className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('totalStock') || 'إجمالي المخزون'}</p>
                      <p className="text-xl font-bold text-erp-navy">{totalStock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('unitPrice') || 'سعر الوحدة'}</p>
                      <p className="text-xl font-bold text-erp-navy">{product.price?.toLocaleString() || '0'} {companyCurrency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Tag className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('category') || 'الفئة'}</p>
                      <p className="text-sm font-medium text-erp-navy">{product.category || t('general') || 'عام'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Warehouse className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('warehouses') || 'المستودعات'}</p>
                      <p className="text-xl font-bold text-erp-navy">{warehouseStock.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{t('productDetails') || 'تفاصيل المنتج'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('sku') || 'رمز المنتج'}</span>
                  <span className="font-mono font-medium">{product.code}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('unit') || 'الوحدة'}</span>
                  <span className="font-medium">{product.unit || t('piece') || 'قطعة'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('costPrice') || 'سعر التكلفة'}</span>
                  <span className="font-mono font-medium">{(product.cost || product.price * 0.7)?.toLocaleString()} {companyCurrency}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('taxRate') || 'نسبة الضريبة'}</span>
                  <span className="font-medium">15%</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warehouse Stock Tab */}
          <TabsContent value="stock" className="space-y-4 mt-0">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>{t('warehouse') || 'المستودع'}</TableHead>
                    <TableHead className="text-center">{t('quantity') || 'الكمية'}</TableHead>
                    <TableHead className="text-center">{t('minQty') || 'الحد الأدنى'}</TableHead>
                    <TableHead className="text-center">{t('maxQty') || 'الحد الأقصى'}</TableHead>
                    <TableHead className="text-center">{t('status') || 'الحالة'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseStock.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {warehouse.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">{warehouse.quantity}</TableCell>
                      <TableCell className="text-center font-mono text-gray-500">{warehouse.minQty}</TableCell>
                      <TableCell className="text-center font-mono text-gray-500">{warehouse.maxQty}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${warehouse.status === 'good'
                          ? 'bg-green-100 text-green-700'
                          : warehouse.status === 'low'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                          {warehouse.status === 'good' ? (t('good') || 'جيد') : warehouse.status === 'low' ? (t('low') || 'منخفض') : (t('critical') || 'حرج')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-4 mt-0">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>{t('date') || 'التاريخ'}</TableHead>
                    <TableHead>{t('type') || 'النوع'}</TableHead>
                    <TableHead>{t('reference') || 'المرجع'}</TableHead>
                    <TableHead>{t('warehouse') || 'المستودع'}</TableHead>
                    <TableHead className="text-right">{t('quantity') || 'الكمية'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-mono text-sm">{movement.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {movement.type === 'in' ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                          <span className={movement.type === 'in' ? 'text-green-700' : 'text-red-700'}>
                            {movement.type === 'in' ? (t('stockIn') || 'إدخال') : (t('stockOut') || 'إخراج')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-erp-teal cursor-pointer hover:underline">{movement.reference}</TableCell>
                      <TableCell className="text-sm">{movement.warehouse}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        <span className={movement.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                          {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

// Account Quick View Component (embedded in drill-down)
function AccountQuickView({ account, onClose, onFullView }: { account: any; onClose: () => void; onFullView: () => void }) {
  const { t, language, direction } = useLanguage();
  const { currencyCode: companyCurrency } = useCompanyCurrency();

  // Mock ledger data
  const ledgerEntries = [
    { id: 'TRX-001', date: '2024-01-15', description: language === 'ar' ? 'قيد افتتاحي' : 'Opening Entry', debit: 50000, credit: 0, balance: 50000 },
    { id: 'TRX-002', date: '2024-01-16', description: language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice', debit: 0, credit: 15000, balance: 35000 },
    { id: 'TRX-003', date: '2024-01-17', description: language === 'ar' ? 'سداد نقدي' : 'Cash Payment', debit: 10000, credit: 0, balance: 45000 },
    { id: 'TRX-004', date: '2024-01-18', description: language === 'ar' ? 'مشتريات' : 'Purchases', debit: 0, credit: 8000, balance: 37000 },
  ];

  const currentBalance = ledgerEntries[ledgerEntries.length - 1]?.balance || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 bg-blue-100 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-erp-navy font-cairo">{account.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{account.code}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onFullView} className="gap-2">
          <Eye className="w-4 h-4" />
          {t('fullDetails') || 'التفاصيل الكاملة'}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 pt-4">
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="w-full justify-start bg-transparent p-0 border-b mb-4">
            <TabsTrigger value="ledger" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none">
              <FileText className="w-4 h-4" />
              {t('accountStatement') || 'كشف الحساب'}
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-erp-teal rounded-none">
              <CreditCard className="w-4 h-4" />
              {t('accountInfo') || 'معلومات الحساب'}
            </TabsTrigger>
          </TabsList>

          {/* Ledger Tab */}
          <TabsContent value="ledger" className="space-y-4 mt-0">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500">{t('totalDebit') || 'إجمالي المدين'}</p>
                  <p className="text-lg font-bold text-erp-navy font-mono">
                    {ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500">{t('totalCredit') || 'إجمالي الدائن'}</p>
                  <p className="text-lg font-bold text-erp-navy font-mono">
                    {ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-erp-navy text-white">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-300">{t('balance') || 'الرصيد'}</p>
                  <p className="text-lg font-bold font-mono">
                    {currentBalance.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>{t('date') || 'التاريخ'}</TableHead>
                    <TableHead>{t('description') || 'البيان'}</TableHead>
                    <TableHead className="text-right">{t('debit') || 'مدين'}</TableHead>
                    <TableHead className="text-right">{t('credit') || 'دائن'}</TableHead>
                    <TableHead className="text-right">{t('balance') || 'الرصيد'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">{entry.date}</TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">
                        {entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-0">
            <Card>
              <CardContent className="space-y-3 text-sm p-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('accountCode') || 'رمز الحساب'}</span>
                  <span className="font-mono font-medium">{account.code}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('accountName') || 'اسم الحساب'}</span>
                  <span className="font-medium">{account.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('accountType') || 'نوع الحساب'}</span>
                  <Badge variant="outline">{account.type || t('asset') || 'أصول'}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('currency') || 'العملة'}</span>
                  <span className="font-medium">{account?.currency || companyCurrency || ''}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('currentBalance') || 'الرصيد الحالي'}</span>
                  <span className="font-mono font-bold text-erp-navy">{currentBalance.toLocaleString()} {account?.currency || companyCurrency || ''}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

export default function JournalEntryDetailsView({ entry }: JournalEntryDetailsViewProps) {
  const { t, direction, language } = useLanguage();

  // State for nested views
  const [activeNestedView, setActiveNestedView] = useState<'none' | 'account' | 'product'>('none');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  if (!entry) return null;

  const handleAccountClick = (accountStr: string) => {
    // Parse account string "Code - Name"
    const [code, ...nameParts] = accountStr.split(' - ');
    const name = nameParts.join(' - ') || accountStr;

    const mockAccount = {
      code: code || '0000',
      name: name,
      balance: 0,
      type: 'general'
    };

    setSelectedAccount(mockAccount);
    setActiveNestedView('account');
  };

  const handleAccountFullView = () => {
    // TODO: Open AccountDetailsSheet instead
  };

  const handleProductClick = (productCode: string, productName: string) => {
    const mockProduct = {
      code: productCode,
      name: productName,
      price: 1500,
      cost: 1000,
      category: language === 'ar' ? 'إلكترونيات' : 'Electronics',
      unit: language === 'ar' ? 'قطعة' : 'Piece'
    };

    setSelectedProduct(mockProduct);
    setActiveNestedView('product');
  };

  const handleReferenceClick = (reference: string) => {
    if (!reference || reference === '-') return;
    // TODO: Open document details view
  };

  const closeNestedView = () => {
    setActiveNestedView('none');
    setSelectedAccount(null);
    setSelectedProduct(null);
  };

  // Use real entry lines with account information
  const lines = entry.lines?.map((line: any, index: number) => ({
    id: line.id || index + 1,
    account: line.account
      ? `${line.account.account_code} - ${language === 'ar' ? line.account.name_ar : line.account.name_en}`
      : (line.account_id || '-'),
    description: line.description || entry.description || '',
    debit: line.debit || 0,
    credit: line.credit || 0,
    product: null // Products will be added later when inventory integration is ready
  })) || [];

  const totalDebit = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

  // Show nested view if active
  if (activeNestedView === 'account' && selectedAccount) {
    return (
      <AccountQuickView
        account={selectedAccount}
        onClose={closeNestedView}
        onFullView={handleAccountFullView}
      />
    );
  }

  if (activeNestedView === 'product' && selectedProduct) {
    return (
      <ProductDetailsView
        product={selectedProduct}
        onClose={closeNestedView}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 py-6 space-y-8 overflow-y-auto px-1">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-erp-navy font-mono">{entry.id}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('journalEntryDetails') || 'Journal Entry Details'}</p>
            </div>
            <Badge variant="outline" className={`px-3 py-1 ${entry.status === 'posted'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
              {t(entry.status) || entry.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                {t('date')}
              </div>
              <p className="font-medium text-erp-navy">{entry.date}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider">
                <Hash className="w-3 h-3" />
                {t('reference')}
              </div>
              <p
                className={`font-medium font-mono ${entry.reference && entry.reference !== '-' ? 'text-erp-teal cursor-pointer hover:underline' : 'text-erp-navy'}`}
                onClick={() => handleReferenceClick(entry.reference)}
              >
                {entry.reference || '-'}
              </p>
            </div>
            <div className="space-y-1 col-span-2">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider">
                <FileText className="w-3 h-3" />
                {t('description')}
              </div>
              <p className="font-medium text-erp-navy">{entry.description}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider">
                <User className="w-3 h-3" />
                {t('createdBy')}
              </div>
              <p className="font-medium text-erp-navy">{entry.createdBy || 'System'}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Lines Table */}
        <div>
          <h3 className="font-bold text-erp-navy mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('entryLines') || 'Entry Lines'}
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>{t('account') || 'Account'}</TableHead>
                  <TableHead>{t('product') || 'المادة'}</TableHead>
                  <TableHead>{t('description') || 'Description'}</TableHead>
                  <TableHead className="text-right">{t('debit') || 'Debit'}</TableHead>
                  <TableHead className="text-right">{t('credit') || 'Credit'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell
                      className="font-medium font-mono text-xs cursor-pointer hover:text-erp-teal hover:underline transition-colors"
                      onClick={() => handleAccountClick(line.account)}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-gray-400" />
                        {line.account}
                      </div>
                    </TableCell>
                    <TableCell>
                      {line.product ? (
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:text-erp-teal transition-colors"
                          onClick={() => handleProductClick(line.product.code, line.product.name)}
                        >
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium hover:underline">{line.product.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{line.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3} className="text-right">{t('total') || 'Total'}</TableCell>
                  <TableCell className="text-right font-mono text-erp-navy">
                    {totalDebit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-erp-navy">
                    {totalCredit.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Quick Tip */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
            <Eye className="w-4 h-4 text-blue-500" />
            <span>{t('clickToViewDetails') || 'اضغط على الحساب أو المادة لعرض التفاصيل'}</span>
          </div>
        </div>

        {/* Additional Notes */}
        {entry.notes && (
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 border border-blue-100">
            <p className="font-bold mb-2">{t('notes') || 'Notes'}</p>
            <p>{entry.notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-auto border-t flex flex-col sm:flex-row gap-3 bg-white">
        <Button variant="outline" className="flex-1 gap-2">
          <Printer className="w-4 h-4" />
          {t('print')}
        </Button>
        <Button variant="outline" className="flex-1 gap-2">
          <Download className="w-4 h-4" />
          {t('download')}
        </Button>
        <Button className="flex-1 bg-erp-navy hover:bg-erp-navy/90 gap-2">
          <Share2 className="w-4 h-4" />
          {t('share') || 'Share'}
        </Button>
      </div>
    </div>
  );
}
