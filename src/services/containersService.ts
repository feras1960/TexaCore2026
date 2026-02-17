/**
 * Containers Service - خدمة الكونتينرات
 * 
 * يوفر هذا الملف جميع عمليات CRUD للكونتينرات وبنودها ومصاريفها
 * مع دعم نظام Landed Cost وإنشاء القيود المحاسبية التلقائية
 */

import { supabase } from '@/lib/supabase';

// ========================================
// الأنواع (Types)
// ========================================

export type ContainerStatus = 'ordered' | 'in_transit' | 'at_port' | 'customs' | 'received' | 'closed';
export type CostAllocationMethod = 'by_value' | 'by_quantity' | 'by_weight' | 'manual';
export type ExpenseStatus = 'expected' | 'invoiced' | 'paid' | 'cancelled';

export interface Container {
  id: string;
  tenant_id: string;
  company_id: string;
  container_number: string;
  container_name?: string;
  shipment_number?: string;
  supplier_id?: string;

  // مواصفات الحاوية
  container_size?: string; // 20ft, 40ft, 40hc, 45ft
  container_type?: string; // dry, reefer, open_top, flat_rack, tank

  // معلومات الشحن
  origin_country?: string;
  origin_port?: string;
  destination_port?: string;
  shipping_company?: string;
  vessel_name?: string;
  bill_of_lading?: string;

  // التواريخ
  order_date?: string;
  departure_date?: string;
  expected_arrival_date?: string;
  arrival_date?: string;
  customs_date?: string;
  received_date?: string;

  // الحالة
  status: ContainerStatus;

  // العملات والتكاليف
  goods_currency?: string; // max 3 chars
  goods_exchange_rate?: number;
  base_currency?: string;

  // التكاليف
  provisional_goods_cost?: number;
  final_goods_cost?: number;
  total_expected_costs?: number;
  total_actual_costs?: number;
  total_landed_cost?: number;

  // Landed Cost
  cost_allocation_method?: CostAllocationMethod;
  is_cost_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;

  // القيود المحاسبية
  provisional_journal_entry_id?: string;
  final_journal_entry_id?: string;

  // ملاحظات
  remarks?: string;
  notes?: string;

  // معلومات النظام
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ContainerItem {
  id: string;
  tenant_id: string;
  container_id: string;

  // المنتج/المادة
  material_id?: string;
  color_id?: string;
  product_id?: string;
  item_description?: string;

  // الكميات
  expected_quantity: number;
  received_quantity?: number;
  expected_rolls?: number;
  received_rolls?: number;
  unit?: string;

  // الحجوزات والمبيعات
  reserved_quantity?: number;
  sold_quantity?: number;
  available_quantity?: number;

  // الأسعار والتكاليف
  unit_cost: number;
  unit_price?: number;
  total_price?: number;

  // Landed Cost
  provisional_unit_cost?: number;
  final_unit_cost?: number;
  allocated_costs?: number;
  total_provisional_cost?: number;
  total_final_cost?: number;

  // ملاحظات
  notes?: string;

  // معلومات النظام
  created_at?: string;
  updated_at?: string;
}

export interface ContainerExpense {
  id: string;
  tenant_id: string;
  company_id: string;
  container_id: string;

  // نوع المصروف
  expense_type: string;

  // المورد
  vendor_id?: string;
  vendor_name?: string;

  // الوصف
  description?: string;

  // المبالغ المتوقعة
  expected_amount?: number;
  expected_currency?: string;
  expected_exchange_rate?: number;

  // المبالغ الفعلية
  amount: number;
  actual_amount?: number;
  actual_currency?: string;
  actual_exchange_rate?: number;
  currency_code?: string;
  exchange_rate?: number;

  // حالة الفاتورة
  invoice_status?: ExpenseStatus;
  invoice_number?: string;
  invoice_date?: string;

  // حالة الدفع
  payment_status?: string;
  paid_amount?: number;
  paid_date?: string;

  // القيد المحاسبي
  journal_entry_id?: string;

  // ملاحظات
  notes?: string;

  // معلومات النظام
  created_at?: string;
  updated_at?: string;
}

export interface ContainerReservation {
  id: string;
  tenant_id: string;
  company_id: string;

  reservation_number: string;
  reservation_date: string;

  customer_id?: string;
  customer_name?: string;

  container_id: string;
  container_item_id?: string;

  material_id?: string;
  color_id?: string;

  reserved_quantity: number;
  unit?: string;

  unit_price?: number;
  total_amount?: number;

  // الدفعة المقدمة
  advance_amount?: number;
  advance_received?: boolean;

  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';

  expected_delivery_date?: string;
  actual_delivery_date?: string;

  notes?: string;

  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface ContainerQuotation {
  id: string;
  tenant_id: string;
  company_id: string;

  quotation_number: string;
  quotation_date: string;
  valid_until?: string;

  customer_id?: string;
  customer_name?: string;

  container_id: string;
  container_item_id?: string;

  material_id?: string;
  color_id?: string;

  quantity: number;
  unit?: string;

  unit_price?: number;
  total_amount?: number;

  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

  notes?: string;

  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ========================================
// الدوال الأساسية (CRUD)
// ========================================

/**
 * جلب جميع الكونتينرات
 */
export async function getContainers(
  tenantId: string,
  companyId: string,
  options?: {
    status?: ContainerStatus;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('containers')
    .select(`
      *,
      supplier:suppliers(id, name_ar, name_en, code)
    `)
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.supplierId) {
    query = query.eq('supplier_id', options.supplierId);
  }

  if (options?.fromDate) {
    query = query.gte('order_date', options.fromDate);
  }

  if (options?.toDate) {
    query = query.lte('order_date', options.toDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, count };
}

/**
 * جلب كونتينر واحد مع جميع التفاصيل
 */
export async function getContainerById(containerId: string) {
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      items:container_items(
        *,
        material:fabric_materials(id, name_ar, name_en, code),
        color:fabric_colors(id, name, name_en, hex_code)
      ),
      expenses:container_expenses(*),
      reservations:container_reservations(
        *,
        customer:customers(id, name_ar, name_en, code)
      ),
      quotations:container_quotations(
        *,
        customer:customers(id, name_ar, name_en, code)
      )
    `)
    .eq('id', containerId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * توليد رقم مرجعي متسلسل للكونتينر
 * Format: CNT-XXXX (e.g. CNT-0001, CNT-0002)
 */
export async function getNextContainerNumber(companyId: string): Promise<string> {
  const { data, error } = await supabase
    .from('containers')
    .select('shipment_number')
    .eq('company_id', companyId)
    .not('shipment_number', 'is', null)
    .ilike('shipment_number', 'CNT-%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('Error fetching last container number:', error);
  }

  let nextNum = 1;
  if (data && data.length > 0 && data[0].shipment_number) {
    const match = data[0].shipment_number.match(/CNT-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `CNT-${String(nextNum).padStart(4, '0')}`;
}

/**
 * إنشاء كونتينر جديد
 * Auto-generates shipment_number if not provided
 */
export async function createContainer(
  container: Omit<Container, 'id' | 'created_at' | 'updated_at'>
) {
  // Auto-generate reference number if not provided
  if (!container.shipment_number && container.company_id) {
    container.shipment_number = await getNextContainerNumber(container.company_id);
  }

  const { data, error } = await supabase
    .from('containers')
    .insert(container)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * تحديث كونتينر
 */
export async function updateContainer(
  containerId: string,
  updates: Partial<Container>
) {
  const { data, error } = await supabase
    .from('containers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', containerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * حذف كونتينر (فقط إذا لم تكن هناك حركات)
 */
export async function deleteContainer(containerId: string) {
  // التحقق من وجود حركات
  const { count: itemsCount } = await supabase
    .from('container_items')
    .select('*', { count: 'exact', head: true })
    .eq('container_id', containerId);

  if (itemsCount && itemsCount > 0) {
    throw new Error('لا يمكن حذف الكونتينر لوجود بنود مرتبطة');
  }

  const { error } = await supabase
    .from('containers')
    .delete()
    .eq('id', containerId);

  if (error) throw error;
  return true;
}

// ========================================
// بنود الكونتينر
// ========================================

/**
 * جلب بنود كونتينر
 */
export async function getContainerItems(containerId: string) {
  const { data, error } = await supabase
    .from('container_items')
    .select(`
      *,
      material:fabric_materials(id, name_ar, name_en, code),
      color:fabric_colors(id, name, name_en, hex_code)
    `)
    .eq('container_id', containerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * إضافة بند للكونتينر
 */
export async function addContainerItem(
  item: Omit<ContainerItem, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('container_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;

  // تحديث إجمالي الكونتينر
  await updateContainerTotals(item.container_id);

  return data;
}

/**
 * تحديث بند
 */
export async function updateContainerItem(
  itemId: string,
  updates: Partial<ContainerItem>
) {
  const { data, error } = await supabase
    .from('container_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;

  // تحديث إجمالي الكونتينر
  if (data?.container_id) {
    await updateContainerTotals(data.container_id);
  }

  return data;
}

/**
 * حذف بند
 */
export async function deleteContainerItem(itemId: string) {
  // جلب معرف الكونتينر أولاً
  const { data: item } = await supabase
    .from('container_items')
    .select('container_id')
    .eq('id', itemId)
    .single();

  const { error } = await supabase
    .from('container_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;

  // تحديث إجمالي الكونتينر
  if (item?.container_id) {
    await updateContainerTotals(item.container_id);
  }

  return true;
}

// ========================================
// مصاريف الكونتينر
// ========================================

/**
 * جلب مصاريف كونتينر
 */
export async function getContainerExpenses(containerId: string) {
  const { data, error } = await supabase
    .from('container_expenses')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * إضافة مصروف للكونتينر
 */
export async function addContainerExpense(
  expense: Omit<ContainerExpense, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('container_expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;

  // تحديث إجمالي المصاريف
  await updateContainerTotals(expense.container_id);

  return data;
}

/**
 * تحديث مصروف
 */
export async function updateContainerExpense(
  expenseId: string,
  updates: Partial<ContainerExpense>
) {
  const { data, error } = await supabase
    .from('container_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;

  // تحديث إجمالي المصاريف
  if (data?.container_id) {
    await updateContainerTotals(data.container_id);
  }

  return data;
}

// ========================================
// الحجوزات
// ========================================

/**
 * جلب حجوزات كونتينر
 */
export async function getContainerReservations(containerId: string) {
  const { data, error } = await supabase
    .from('container_reservations')
    .select(`
      *,
      customer:customers(id, name_ar, name_en, code)
    `)
    .eq('container_id', containerId)
    .order('reservation_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * إنشاء حجز جديد
 */
export async function createReservation(
  reservation: Omit<ContainerReservation, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('container_reservations')
    .insert(reservation)
    .select()
    .single();

  if (error) throw error;

  // تحديث الكمية المحجوزة في البند
  if (reservation.container_item_id) {
    await updateItemReservedQuantity(reservation.container_item_id);
  }

  return data;
}

/**
 * تحديث الكمية المحجوزة في البند
 */
async function updateItemReservedQuantity(itemId: string) {
  // حساب إجمالي الحجوزات
  const { data: reservations } = await supabase
    .from('container_reservations')
    .select('reserved_quantity')
    .eq('container_item_id', itemId)
    .in('status', ['pending', 'confirmed']);

  const totalReserved = reservations?.reduce((sum, r) => sum + (r.reserved_quantity || 0), 0) || 0;

  // تحديث البند
  await supabase
    .from('container_items')
    .update({ reserved_quantity: totalReserved })
    .eq('id', itemId);
}

// ========================================
// عروض الأسعار
// ========================================

/**
 * جلب عروض أسعار كونتينر
 */
export async function getContainerQuotations(containerId: string) {
  const { data, error } = await supabase
    .from('container_quotations')
    .select(`
      *,
      customer:customers(id, name_ar, name_en, code)
    `)
    .eq('container_id', containerId)
    .order('quotation_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * إنشاء عرض سعر جديد
 */
export async function createQuotation(
  quotation: Omit<ContainerQuotation, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('container_quotations')
    .insert(quotation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ========================================
// Landed Cost
// ========================================

/**
 * حساب Landed Cost للكونتينر
 */
export async function calculateLandedCost(containerId: string) {
  // جلب إعدادات الكونتينر (طريقة التوزيع فقط)
  const { data: container, error: cErr } = await supabase
    .from('containers')
    .select('id, cost_allocation_method')
    .eq('id', containerId)
    .single();
  if (cErr || !container) throw new Error('الكونتينر غير موجود');

  // جلب البنود مباشرة
  const { data: items = [] } = await supabase
    .from('container_items')
    .select('*, material:fabric_materials(id, name_ar, name_en, code), color:fabric_colors(id, name, name_en, hex_code)')
    .eq('container_id', containerId);

  // جلب المصاريف مباشرة
  const { data: expenses = [] } = await supabase
    .from('container_expenses')
    .select('*')
    .eq('container_id', containerId);

  // حساب إجمالي قيمة البضاعة
  const totalGoodsValue = (items || []).reduce((sum: number, item: any) => {
    return sum + ((item.unit_cost || 0) * (item.expected_quantity || 0));
  }, 0);

  // حساب إجمالي المصاريف
  const totalExpenses = (expenses || []).reduce((sum: number, exp: any) => {
    return sum + (exp.actual_amount || exp.expected_amount || exp.amount || 0);
  }, 0);

  // توزيع المصاريف على البنود حسب الطريقة المحددة
  const allocationMethod = container.cost_allocation_method || 'by_value';
  const allocatedItems = allocateCostsToItems(items || [], totalExpenses, allocationMethod, totalGoodsValue);

  // حساب Landed Cost الإجمالي
  const totalLandedCost = totalGoodsValue + totalExpenses;

  return {
    totalGoodsValue,
    totalExpenses,
    totalLandedCost,
    allocatedItems,
    allocationMethod,
  };
}

/**
 * حفظ توزيع المصاريف التقديرية على البنود (provisional)
 * يحسب التوزيع ويحفظ في container_items:
 * - provisional_unit_cost
 * - allocated_costs
 * - total_provisional_cost
 */
export async function saveEstimatedDistribution(containerId: string) {
  const result = await calculateLandedCost(containerId);

  // حفظ التوزيع في كل بند
  for (const item of result.allocatedItems) {
    const totalProvisionalCost = item.finalUnitCost * (item.expected_quantity || 0);
    await updateContainerItem(item.id, {
      provisional_unit_cost: item.finalUnitCost,
      allocated_costs: item.allocatedCost,
      total_provisional_cost: totalProvisionalCost,
    });
  }

  // إجماليات الكونتينر تتحدث تلقائياً عبر updateContainerTotals

  return result;
}

/**
 * توزيع المصاريف على البنود
 */
function allocateCostsToItems(
  items: ContainerItem[],
  totalExpenses: number,
  method: CostAllocationMethod,
  totalGoodsValue: number
): Array<ContainerItem & { allocatedCost: number; finalUnitCost: number }> {
  if (items.length === 0) return [];

  switch (method) {
    case 'by_value': {
      // التوزيع حسب القيمة
      return items.map(item => {
        const itemValue = item.unit_cost * item.expected_quantity;
        const ratio = totalGoodsValue > 0 ? itemValue / totalGoodsValue : 1 / items.length;
        const allocatedCost = totalExpenses * ratio;
        const finalUnitCost = item.expected_quantity > 0
          ? (itemValue + allocatedCost) / item.expected_quantity
          : item.unit_cost;

        return { ...item, allocatedCost, finalUnitCost };
      });
    }

    case 'by_quantity': {
      // التوزيع حسب الكمية
      const totalQuantity = items.reduce((sum, item) => sum + item.expected_quantity, 0);
      return items.map(item => {
        const ratio = totalQuantity > 0 ? item.expected_quantity / totalQuantity : 1 / items.length;
        const allocatedCost = totalExpenses * ratio;
        const finalUnitCost = item.expected_quantity > 0
          ? item.unit_cost + (allocatedCost / item.expected_quantity)
          : item.unit_cost;

        return { ...item, allocatedCost, finalUnitCost };
      });
    }

    case 'manual':
    default: {
      // استخدام القيم المحفوظة مسبقاً
      return items.map(item => ({
        ...item,
        allocatedCost: item.allocated_costs || 0,
        finalUnitCost: item.final_unit_cost || item.unit_cost,
      }));
    }
  }
}

/**
 * تأكيد وتسكير Landed Cost
 */
export async function finalizeLandedCost(
  containerId: string,
  userId: string
) {
  const landedCost = await calculateLandedCost(containerId);

  // تحديث البنود بالتكلفة النهائية
  for (const item of landedCost.allocatedItems) {
    await updateContainerItem(item.id, {
      allocated_costs: item.allocatedCost,
      final_unit_cost: item.finalUnitCost,
      total_final_cost: item.finalUnitCost * item.expected_quantity,
    });
  }

  // تحديث الكونتينر
  await updateContainer(containerId, {
    final_goods_cost: landedCost.totalGoodsValue,
    total_actual_costs: landedCost.totalExpenses,
    total_landed_cost: landedCost.totalLandedCost,
    is_cost_finalized: true,
    finalized_at: new Date().toISOString(),
    finalized_by: userId,
  });

  // TODO: إنشاء القيد المحاسبي النهائي

  return landedCost;
}

// ========================================
// دوال مساعدة
// ========================================

/**
 * تحديث إجماليات الكونتينر
 */
async function updateContainerTotals(containerId: string) {
  // جلب البنود
  const { data: items } = await supabase
    .from('container_items')
    .select('expected_quantity, unit_cost')
    .eq('container_id', containerId);

  // جلب المصاريف
  const { data: expenses } = await supabase
    .from('container_expenses')
    .select('amount, expected_amount, actual_amount')
    .eq('container_id', containerId);

  // حساب الإجماليات
  const totalGoodsCost = items?.reduce((sum, item) => {
    return sum + ((item.unit_cost || 0) * (item.expected_quantity || 0));
  }, 0) || 0;

  const totalExpectedCosts = expenses?.reduce((sum, exp) => {
    return sum + (exp.expected_amount || exp.amount || 0);
  }, 0) || 0;

  const totalActualCosts = expenses?.reduce((sum, exp) => {
    return sum + (exp.actual_amount || exp.amount || 0);
  }, 0) || 0;

  // تحديث الكونتينر
  await supabase
    .from('containers')
    .update({
      provisional_goods_cost: totalGoodsCost,
      total_expected_costs: totalExpectedCosts,
      total_actual_costs: totalActualCosts,
      total_landed_cost: totalGoodsCost + totalActualCosts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', containerId);
}

/**
 * جلب إحصائيات الكونتينرات
 */
export async function getContainersStats(tenantId: string, companyId: string) {
  const { data, error } = await supabase
    .from('containers')
    .select('status, total_landed_cost')
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    ordered: 0,
    in_transit: 0,
    received: 0,
    closed: 0,
    totalValue: 0,
  };

  data?.forEach(container => {
    stats.totalValue += container.total_landed_cost || 0;
    switch (container.status) {
      case 'ordered':
        stats.ordered++;
        break;
      case 'in_transit':
      case 'at_port':
      case 'customs':
        stats.in_transit++;
        break;
      case 'received':
        stats.received++;
        break;
      case 'closed':
        stats.closed++;
        break;
    }
  });

  return stats;
}

/**
 * البحث في الكونتينرات
 */
export async function searchContainers(
  tenantId: string,
  companyId: string,
  searchTerm: string
) {
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      supplier:suppliers(id, name_ar, name_en)
    `)
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId)
    .or(`container_number.ilike.%${searchTerm}%,shipment_number.ilike.%${searchTerm}%,bill_of_lading.ilike.%${searchTerm}%`)
    .limit(20);

  if (error) throw error;
  return data;
}

// ========================================
// مصاريف محسّنة — طبقتين (تقديري + فعلي)
// ========================================

/**
 * جلب المصاريف التقديرية فقط
 * تُستخدم في مرحلة ما قبل الشحن لتقدير التكلفة
 */
export async function getEstimatedExpenses(containerId: string) {
  const { data, error } = await supabase
    .from('container_expenses')
    .select('*')
    .eq('container_id', containerId)
    .not('expected_amount', 'is', null)
    .order('expense_type', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * جلب المصاريف الفعلية فقط
 * تُستخدم بعد استلام الفواتير الحقيقية من الموردين
 */
export async function getActualExpenses(containerId: string) {
  const { data, error } = await supabase
    .from('container_expenses')
    .select('*')
    .eq('container_id', containerId)
    .not('actual_amount', 'is', null)
    .order('expense_type', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * حذف مصروف (فقط إذا لم يكن مرتبط بقيد محاسبي)
 */
export async function deleteContainerExpense(expenseId: string) {
  // تحقق أولاً: هل مرتبط بقيد؟
  const { data: expense, error: fetchError } = await supabase
    .from('container_expenses')
    .select('id, container_id, journal_entry_id, payment_status')
    .eq('id', expenseId)
    .single();

  if (fetchError) throw fetchError;

  if (expense?.journal_entry_id) {
    throw new Error('لا يمكن حذف مصروف مرتبط بقيد محاسبي. قم بإلغاء القيد أولاً.');
  }

  if (expense?.payment_status === 'paid') {
    throw new Error('لا يمكن حذف مصروف مدفوع.');
  }

  const { error } = await supabase
    .from('container_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;

  // تحديث إجماليات الكونتينر
  if (expense?.container_id) {
    await updateContainerTotals(expense.container_id);
  }

  return { success: true };
}

/**
 * إنشاء قيد محاسبي لمصروف كونتينر
 * 
 * القيد: مدين → حساب المصروف (مثل: مصاريف شحن)
 *        دائن → حساب المورد (ذمم دائنة)
 * 
 * @param expenseId — معرف المصروف
 * @param debitAccountId — حساب المصروف (مدين)
 * @param creditAccountId — حساب المورد (دائن)
 * @param userId — المستخدم الذي أنشأ القيد
 */
export async function createExpenseJournalEntry(
  expenseId: string,
  debitAccountId: string,
  creditAccountId: string,
  userId: string
) {
  // 1. جلب بيانات المصروف
  const { data: expense, error: expenseError } = await supabase
    .from('container_expenses')
    .select('*, containers!inner(container_number, company_id, tenant_id)')
    .eq('id', expenseId)
    .single();

  if (expenseError || !expense) throw expenseError || new Error('المصروف غير موجود');

  // القيمة الفعلية أو التقديرية
  const amount = expense.actual_amount || expense.expected_amount || expense.amount;
  if (!amount || amount <= 0) {
    throw new Error('لا يمكن إنشاء قيد لمبلغ صفر');
  }

  const container = (expense as any).containers;
  const today = new Date().toISOString().slice(0, 10);

  // 2. توليد رقم القيد
  const { data: lastEntry } = await supabase
    .from('journal_entries')
    .select('entry_number')
    .eq('company_id', container.company_id)
    .order('entry_number', { ascending: false })
    .limit(1);

  const nextNum = lastEntry?.[0]
    ? parseInt(lastEntry[0].entry_number.replace(/\D/g, '')) + 1
    : 1;
  const entryNumber = `JE-${String(nextNum).padStart(5, '0')}`;

  // 3. إنشاء القيد
  const description = expense.description
    || `${expense.expense_type} — كونتينر ${container.container_number}`;

  const { data: journalEntry, error: jeError } = await supabase
    .from('journal_entries')
    .insert({
      tenant_id: container.tenant_id,
      company_id: container.company_id,
      entry_number: entryNumber,
      entry_date: today,
      description: description,
      reference_type: 'container_expense',
      reference_id: expense.container_id,
      status: 'draft',
      total_debit: amount,
      total_credit: amount,
      created_by: userId,
    })
    .select()
    .single();

  if (jeError) throw jeError;

  // 4. إنشاء سطور القيد (مدين + دائن)
  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert([
      {
        tenant_id: container.tenant_id,
        journal_entry_id: journalEntry.id,
        account_id: debitAccountId,
        debit_amount: amount,
        credit_amount: 0,
        description: `${expense.expense_type} — ${container.container_number}`,
        line_number: 1,
      },
      {
        tenant_id: container.tenant_id,
        journal_entry_id: journalEntry.id,
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: amount,
        description: `${expense.vendor_name || 'مورد'} — ${container.container_number}`,
        line_number: 2,
      },
    ]);

  if (linesError) throw linesError;

  // 5. ربط القيد بالمصروف
  await supabase
    .from('container_expenses')
    .update({
      journal_entry_id: journalEntry.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  return journalEntry;
}

// ========================================
// الصادرات
// ========================================

export default {
  // Containers
  getContainers,
  getContainerById,
  createContainer,
  updateContainer,
  deleteContainer,
  searchContainers,
  getContainersStats,
  getNextContainerNumber,

  // Items
  getContainerItems,
  addContainerItem,
  updateContainerItem,
  deleteContainerItem,

  // Expenses
  getContainerExpenses,
  getEstimatedExpenses,
  getActualExpenses,
  addContainerExpense,
  updateContainerExpense,
  deleteContainerExpense,
  createExpenseJournalEntry,

  // Reservations
  getContainerReservations,
  createReservation,

  // Quotations
  getContainerQuotations,
  createQuotation,

  // Landed Cost
  calculateLandedCost,
  saveEstimatedDistribution,
  finalizeLandedCost,
  updateContainerTotals,
};
