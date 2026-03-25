// Common types used across the application

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  companyId?: string;
}

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

export interface Company {
  id: string;
  name: string;
  nameEn?: string;
  logoUrl?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  isMain: boolean;
}

// Currency types
export type Currency = 'SAR' | 'USD' | 'EUR' | 'AED' | 'KWD' | 'EGP';

export interface CurrencyInfo {
  code: Currency;
  name: string;
  nameAr: string;
  symbol: string;
  rate: number;
}

// Common response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface BaseFilter {
  search?: string;
  dateRange?: DateRange;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
