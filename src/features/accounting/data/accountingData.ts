
export const currencies = [
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي' },
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي' },
  { code: 'EUR', name: 'Euro', nameAr: 'يورو' },
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي' },
];

export const costCenters = [
  { id: 'CC001', name: 'Headquarters', nameAr: 'المقر الرئيسي' },
  { id: 'CC002', name: 'Sales Department', nameAr: 'قسم المبيعات' },
  { id: 'CC003', name: 'Marketing', nameAr: 'التسويق' },
  { id: 'CC004', name: 'Operations', nameAr: 'العمليات' },
];

export const initialAccounts = [
  {
    id: '1',
    code: '1000',
    name: 'Assets',
    nameAr: 'الأصول',
    type: 'Asset',
    isGroup: true,
    children: [
      {
        id: '11',
        code: '1100',
        name: 'Current Assets',
        nameAr: 'الأصول المتداولة',
        type: 'Asset',
        isGroup: true,
        children: [
          { id: '111', code: '1110', name: 'Cash', nameAr: 'النقد', type: 'Asset', isGroup: false },
          { id: '112', code: '1120', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', type: 'Asset', isGroup: false },
          { 
            id: '113', 
            code: '1130', 
            name: 'Accounts Receivable', 
            nameAr: 'الذمم المدينة', 
            type: 'Asset', 
            isGroup: true,
            children: [
              { id: '1131', code: '1131', name: 'Customer A', nameAr: 'العميل أ', type: 'Asset', isGroup: false },
              { id: '1132', code: '1132', name: 'Customer B', nameAr: 'العميل ب', type: 'Asset', isGroup: false },
            ]
          },
        ]
      },
      {
        id: '12',
        code: '1200',
        name: 'Fixed Assets',
        nameAr: 'الأصول الثابتة',
        type: 'Asset',
        isGroup: true,
        children: [
          { id: '121', code: '1210', name: 'Furniture', nameAr: 'الأثاث', type: 'Asset', isGroup: false },
          { id: '122', code: '1220', name: 'Equipment', nameAr: 'المعدات', type: 'Asset', isGroup: false },
        ]
      }
    ]
  },
  {
    id: '2',
    code: '2000',
    name: 'Liabilities',
    nameAr: 'الخصوم',
    type: 'Liability',
    isGroup: true,
    children: [
      {
        id: '21',
        code: '2100',
        name: 'Current Liabilities',
        nameAr: 'الخصوم المتداولة',
        type: 'Liability',
        isGroup: true,
        children: [
          { 
            id: '211', 
            code: '2110', 
            name: 'Accounts Payable', 
            nameAr: 'الذمم الدائنة', 
            type: 'Liability', 
            isGroup: true,
            children: [
              { id: '2111', code: '2111', name: 'Supplier X', nameAr: 'المورد س', type: 'Liability', isGroup: false },
              { id: '2112', code: '2112', name: 'Supplier Y', nameAr: 'المورد ص', type: 'Liability', isGroup: false },
            ]
          },
        ]
      }
    ]
  },
  {
    id: '3',
    code: '3000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'Equity',
    isGroup: true,
    children: [
      { id: '31', code: '3100', name: 'Capital', nameAr: 'رأس المال', type: 'Equity', isGroup: false },
      { id: '32', code: '3200', name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', type: 'Equity', isGroup: false },
    ]
  },
  {
    id: '4',
    code: '4000',
    name: 'Income',
    nameAr: 'الإيرادات',
    type: 'Income',
    isGroup: true,
    children: [
      { id: '41', code: '4100', name: 'Operating & Trading Revenue', nameAr: 'إيرادات التشغيل والتجارة', type: 'Income', isGroup: true,
        children: [
          { id: '411', code: '4110', name: 'Sales', nameAr: 'المبيعات', type: 'Income', isGroup: false },
        ]
      },
    ]
  },
  {
    id: '5',
    code: '5000',
    name: 'Expenses',
    nameAr: 'المصروفات',
    type: 'Expense',
    isGroup: true,
    children: [
      { id: '51', code: '5100', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'Expense', isGroup: false },
      { id: '52', code: '5200', name: 'Operating Expenses', nameAr: 'المصاريف التشغيلية', type: 'Expense', isGroup: false },
    ]
  }
];

// Flatten accounts for combobox
export const flattenAccounts = (accounts: any[]): any[] => {
  let result: any[] = [];
  accounts.forEach(acc => {
    if (!acc.isGroup) {
      result.push(acc);
    }
    if (acc.children) {
      result = [...result, ...flattenAccounts(acc.children)];
    }
  });
  return result;
};

export const flatAccounts = flattenAccounts(initialAccounts);

export interface Customer {
  id: string;
  accountId: string;
  name: string;
  nameAr: string;
  type: 'Personal' | 'Company';
  group: 'VIP' | 'Wholesale' | 'Retail' | 'Corporate';
  balance: number;
  creditLimit: number;
  city: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  taxNumber?: string;
  address?: string;
  stats: {
    totalPurchases: number;
    orderCount: number;
    averageOrderValue: number;
    firstOrderDate: string;
    lastOrderDate: string;
    mostPurchasedProduct: string;
    preferredColor: string;
  };
}

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    accountId: '1131',
    name: 'Customer A',
    nameAr: 'العميل أ',
    type: 'Company',
    group: 'VIP',
    balance: 5000,
    creditLimit: 50000,
    city: 'Riyadh',
    phone: '+966 50 123 4567',
    email: 'contact@customera.com',
    status: 'Active',
    taxNumber: '300012345600003',
    address: 'King Fahd Road, Riyadh',
    stats: {
      totalPurchases: 150000,
      orderCount: 25,
      averageOrderValue: 6000,
      firstOrderDate: '2023-01-15',
      lastOrderDate: '2024-02-20',
      mostPurchasedProduct: 'Laptop Pro X',
      preferredColor: 'Silver'
    }
  },
  {
    id: 'cust-2',
    accountId: '1132',
    name: 'Customer B',
    nameAr: 'العميل ب',
    type: 'Personal',
    group: 'Retail',
    balance: 1500,
    creditLimit: 5000,
    city: 'Jeddah',
    phone: '+966 55 987 6543',
    email: 'customer.b@gmail.com',
    status: 'Active',
    address: 'Corniche Road, Jeddah',
    stats: {
      totalPurchases: 45000,
      orderCount: 12,
      averageOrderValue: 3750,
      firstOrderDate: '2023-03-10',
      lastOrderDate: '2024-01-05',
      mostPurchasedProduct: 'Wireless Headphones',
      preferredColor: 'Black'
    }
  }
];

export interface Supplier {
  id: string;
  accountId: string;
  name: string;
  nameAr: string;
  type: 'Company' | 'Individual';
  balance: number;
  city: string;
  phone: string;
  email: string;
  taxNumber?: string;
  address?: string;
  stats: {
    totalSupply: number;
    orderCount: number;
    averageOrderValue: number;
    firstOrderDate: string;
    lastOrderDate: string;
    mostSuppliedProduct: string;
  };
}

export const mockSuppliers: Supplier[] = [
  {
    id: 'supp-1',
    accountId: '2111',
    name: 'Supplier X',
    nameAr: 'المورد س',
    type: 'Company',
    balance: 12000,
    city: 'Dammam',
    phone: '+966 13 123 4567',
    email: 'sales@supplierx.com',
    taxNumber: '310098765400003',
    address: 'Industrial City, Dammam',
    stats: {
      totalSupply: 500000,
      orderCount: 40,
      averageOrderValue: 12500,
      firstOrderDate: '2022-11-01',
      lastOrderDate: '2024-02-15',
      mostSuppliedProduct: 'Raw Materials A'
    }
  },
  {
    id: 'supp-2',
    accountId: '2112',
    name: 'Supplier Y',
    nameAr: 'المورد ص',
    type: 'Company',
    balance: 3500,
    city: 'Riyadh',
    phone: '+966 11 987 6543',
    email: 'info@suppliery.com',
    taxNumber: '320012345600003',
    address: 'Olaya Street, Riyadh',
    stats: {
      totalSupply: 120000,
      orderCount: 15,
      averageOrderValue: 8000,
      firstOrderDate: '2023-05-20',
      lastOrderDate: '2024-01-30',
      mostSuppliedProduct: 'Office Supplies'
    }
  }
];
