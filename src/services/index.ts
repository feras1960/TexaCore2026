/**
 * Services Index
 * Central export for all services
 */

// Accounting & Core Services
export { accountsService, type Account, type CreateAccountInput } from './accountsService';
export { productsService, type Product, type CreateProductInput } from './productsService';
export { warehousesService, type Warehouse, type CreateWarehouseInput } from './warehousesService';
export { companiesService, type Company } from './companiesService';

// Journal Entries
export { 
  journalEntriesService, 
  type JournalEntry, 
  type JournalEntryLine,
  type JournalEntryWithLines,
  type CreateJournalEntryInput 
} from './journalEntriesService';

// Recurring Entries
export { 
  recurringEntriesService, 
  type RecurringEntryTemplate,
  type RecurringEntryLine,
  type RecurringEntryExecution,
  type CreateRecurringTemplateInput,
  type CreateSimpleTemplateInput,
  type RecurringFrequency,
  type RecurringCategory,
  type ExecutionStatus
} from './recurringEntriesService';

// Incentives & Commissions
export {
  incentivesService,
  type IncentivePlan,
  type IncentivePlanTier,
  type EmployeeAssignment,
  type EmployeeCommission,
  type EmployeeTarget,
  type CreatePlanInput,
  type CreateAssignmentInput,
  type CreateTargetInput,
  type CommissionReportItem,
  type TargetReportItem,
  type PlanType,
  type TargetType,
  type CalculationMethod,
  type PeriodType,
  type CommissionStatus,
  type TargetStatus
} from './incentivesService';

// Account Invoices & Reservations Services
export { 
  accountInvoicesService, 
  type AccountInvoice, 
  type CreateAccountInvoiceInput,
  type AccountInvoiceFilters,
  type AccountInvoiceStats 
} from './accountInvoicesService';

export { 
  reservationsService, 
  type Reservation, 
  type CreateReservationInput,
  type ReservationFilters,
  type ReservationStats 
} from './reservationsService';

// Status Management
export { 
  statusService, 
  type StatusGroup, 
  type CustomStatus, 
  type StatusHistory, 
  type StatusTransition,
  type StatusColor,
  STATUS_COLORS 
} from './statusService';

// Print Service
export { 
  printService, 
  type PrintTemplate, 
  type PrintOptions 
} from './printService';

// Customization Service
export { 
  customizationService, 
  type SheetCustomization, 
  type FieldCustomization, 
  type SectionCustomization,
  type UserPreferences,
  type RecentDoc 
} from './customizationService';

// Document Service
export {
  documentService,
  formatFileSize,
  getFileType,
  type Document,
  type EntityType,
  type FileType,
  type DocumentCategory,
  type StorageQuota,
  type StorageStatus,
  type UploadOptions
} from './documentService';

// Subscription Service
export {
  subscriptionService,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionAlert,
  type SubscriptionStatus,
  type SubscriptionStatusInfo,
  type BillingInfo,
  type AlertType,
  type AccessLevel
} from './subscriptionService';

// System Service - Testing & Monitoring
export {
  systemService,
  type TenantInfo,
  type TenantStatistics,
  type SubscriptionAccess,
  type IsolationTestResult,
  type IsolationTestSummary,
  type IsolationTestReport,
  type AuditLog,
  type AuditLogFilters
} from './systemService';

// Import Service - Data Import from Excel/CSV
export {
  importService,
  type EntityType as ImportEntityType,
  type ImportStatus,
  type RowStatus,
  type FieldDefinition,
  type EntityDefinition,
  type ImportJob,
  type ImportRow,
  type ValidationError,
  type ValidationSummary,
  type AISuggestions,
  type AIAnalysisSummary,
  type ImportOptions,
  type ColumnMapping,
  type ParsedFile
} from './importService';

// Translation Service - Multi-language support
export {
  translateToAllLanguages,
  formatTranslationsForDB,
  extractTranslationsFromDB,
  hasAllTranslations,
  getTranslatedName,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
  type Translations,
  type DescriptionTranslations,
  type TranslationResult,
  type TranslationOptions
} from './translationService';

// Containers Service - Landed Cost & Shipments
export {
  default as containersService,
  getContainers,
  getContainerById,
  createContainer,
  updateContainer,
  deleteContainer,
  getContainerItems,
  addContainerItem,
  updateContainerItem,
  deleteContainerItem,
  getContainerExpenses,
  addContainerExpense,
  updateContainerExpense,
  getContainerReservations,
  createReservation,
  getContainerQuotations,
  createQuotation,
  calculateLandedCost,
  finalizeLandedCost,
  getContainersStats,
  searchContainers,
  type Container,
  type ContainerItem,
  type ContainerExpense,
  type ContainerReservation,
  type ContainerQuotation,
  type ContainerStatus,
  type CostAllocationMethod,
  type ExpenseStatus
} from './containersService';

// SaaS Management Services - Re-export from saas folder
export * from './saas';

// Modules Management
export {
  modulesService,
  type TenantModule,
  type SidebarStructure
} from './modulesService';

// Features Management
export {
  featuresService,
  type ModuleFeature
} from './featuresService';

// Languages Management
export {
  languagesService,
  type SystemLanguage,
  type TenantLanguage,
  type LanguageLimitInfo
} from './languagesService';