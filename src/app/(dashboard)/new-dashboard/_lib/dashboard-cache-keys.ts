export const dashboardKeys = {
  all: ['dashboard-v11'] as const,
  byCompany: (companyId: string) => [...dashboardKeys.all, companyId] as const,
  kpi: (companyId: string, currency: string) =>
    [...dashboardKeys.byCompany(companyId), 'kpi', currency] as const,
  netPosition: (companyId: string, currency: string) =>
    [...dashboardKeys.byCompany(companyId), 'net-position', currency] as const,
  cashFlow: (companyId: string, currency: string, days: number) =>
    [...dashboardKeys.byCompany(companyId), 'cash-flow', currency, days] as const,
  attention: (companyId: string) =>
    [...dashboardKeys.byCompany(companyId), 'attention'] as const,
  topCustomers: (companyId: string) =>
    [...dashboardKeys.byCompany(companyId), 'top-customers'] as const,
  recentActivity: (companyId: string) =>
    [...dashboardKeys.byCompany(companyId), 'recent-activity'] as const,
  currencyExposure: (companyId: string) =>
    [...dashboardKeys.byCompany(companyId), 'currency-exposure'] as const,
};
