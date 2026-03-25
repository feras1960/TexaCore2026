/**
 * SaaS Services
 * Centralized exports for all SaaS-related services
 */

export { agentsService } from './agentsService';
export type { Agent, CreateAgentInput, UpdateAgentInput } from './agentsService';

export { tenantsService } from './tenantsService';
export type { Tenant, CreateTenantInput, UpdateTenantInput } from './tenantsService';

export { whiteLabelService } from './whiteLabelService';
export type {
  WhiteLabelDomain,
  WhiteLabelConfig,
  WhiteLabelPayment,
  RegisterWhiteLabelPaymentInput,
  AddWhiteLabelDomainInput,
} from './whiteLabelService';

export { plansService, defaultPlans } from './plansService';
export type { Plan, CreatePlanInput, UpdatePlanInput } from './plansService';

export { paymentsService } from './paymentsService';
export type { Payment, Invoice, CreatePaymentInput } from './paymentsService';

export { dashboardService } from './dashboardService';
export type { DashboardStats, RevenueData, TenantGrowthData } from './dashboardService';
