/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 TransferDeliveryDialog — مكون تسليم المناقلات بين المستودعات
 * ════════════════════════════════════════════════════════════════
 *
 * نسخة مخصصة من SalesDeliveryDialog مع منطق المناقلات:
 * - المصدر: stock_transfers → stock_transfer_items
 * - الرولونات تنتقل من المستودع المصدر (available → in_transit)
 * - لا يوجد قيد محاسبي
 * - حالات: confirmed → loading → shipped → received → completed
 *
 * التدفق:
 * 1. عرض بنود المناقلة (المواد والكميات المطلوبة)
 * 2. اختيار الرولونات من المستودع المصدر
 * 3. تأكيد التحميل → تحديث المخزون + حالة المناقلة
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useWarehouses } from '@/features/warehouse/hooks/useWarehouseQueries';
import { supabase, cloudSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import SalesDeliveryItemsTab from '@/features/warehouse/tabs/SalesDeliveryItemsTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Warehouse, Loader2, PackageCheck, ArrowLeftRight,
    Wifi, WifiOff, MapPin, PackageOpen, Printer, QrCode,
    Truck, Car, Navigation, User, Phone,
    ChevronDown, ChevronUp, Star, Search,
    ExternalLink, Zap, RefreshCw, FileCheck,
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

// ─── Props ──────────────────────────────────────────────────
interface TransferDeliveryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    transfer: any;              // بيانات المناقلة من stock_transfers
    onComplete?: () => void;    // بعد التأكيد الناجح
}

export function TransferDeliveryDialog({
    isOpen,
    onOpenChange,
    transfer,
    onComplete,
}: TransferDeliveryDialogProps) {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const { hasAnyRole } = useRBAC();
    const { warehouses } = useWarehouses();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ═══ State ═══
    const [transferData, setTransferData] = useState<any>(null);
    const [sourceItems, setSourceItems] = useState<any[]>([]);
    const [selectedRolls, setSelectedRolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showReceiveConfirm, setShowReceiveConfirm] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const [isShipped, setIsShipped] = useState(false);

    // ═══ Shipping State ═══
    const [shippingOpen, setShippingOpen] = useState(false);
    const [shippingMethod, setShippingMethod] = useState<'company_driver' | 'external_truck' | 'shipping_company'>('company_driver');
    const [driverId, setDriverId] = useState<string>('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    const [estimatedDelivery, setEstimatedDelivery] = useState('');
    const [shippingNotes, setShippingNotes] = useState('');
    const [driversList, setDriversList] = useState<{ id: string; name_ar: string; name_en?: string; phone?: string; vehicle_number?: string; vehicle_type?: string; vehicle_model?: string }[]>([]);

    // ═══ Nova Poshta Integration State ═══
    const [npApiKey, setNpApiKey] = useState<string | null>(null);
    const [npConnected, setNpConnected] = useState(false);
    const [npLoading, setNpLoading] = useState(false);
    const [npCitySearch, setNpCitySearch] = useState('');
    const [npCities, setNpCities] = useState<any[]>([]);
    const [npSelectedCity, setNpSelectedCity] = useState<any>(null);
    const [npWarehouses, setNpWarehouses] = useState<any[]>([]);
    const [npSelectedWarehouse, setNpSelectedWarehouse] = useState<any>(null);
    const [npWeight, setNpWeight] = useState('1');
    const [npDescription, setNpDescription] = useState('Тканини / Fabrics');
    const [npSeatsAmount, setNpSeatsAmount] = useState('1');
    const [npCreatingTTN, setNpCreatingTTN] = useState(false);
    const [npTrackingStatus, setNpTrackingStatus] = useState<any>(null);
    const [npSearchingCities, setNpSearchingCities] = useState(false);
    const [npShowCityDropdown, setNpShowCityDropdown] = useState(false);
    const citySearchTimer = useRef<NodeJS.Timeout | null>(null);

    // Transfer ID
    const transferId = transfer?.id || transfer?.source_id;
    const fromWarehouseId = transfer?.from_warehouse_id;

    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedRolls([]);
            setDraftRestored(false);
            setIsShipped(false);
        }
    }, [isOpen]);

    // ═══ Draft key for localStorage ═══
    const draftKey = `transfer_delivery_draft_${transferId}`;

    // ═══ Fetch drivers list ═══
    useEffect(() => {
        if (!companyId) return;
        supabase
            .from('drivers')
            .select('id, name_ar, name_en, phone, vehicle_number, vehicle_type, vehicle_model')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .order('name_ar')
            .then(({ data: drv }) => setDriversList(drv || []));
    }, [companyId]);

    // ═══ Fetch NP API Key from company integrations ═══
    useEffect(() => {
        if (!companyId) return;
        supabase
            .from('companies')
            .select('integrations')
            .eq('id', companyId)
            .single()
            .then(({ data: company }) => {
                const npKey = company?.integrations?.nova_poshta?.api_key;
                if (npKey) {
                    setNpApiKey(npKey);
                    setNpConnected(true);
                }
            });
    }, [companyId]);

    // ═══ Warehouse names (needed by NP functions below) ═══
    const fromWarehouse = useMemo(() =>
        warehouses.find(w => w.id === transferData?.from_warehouse_id),
        [warehouses, transferData?.from_warehouse_id]
    );
    const toWarehouse = useMemo(() =>
        warehouses.find(w => w.id === transferData?.to_warehouse_id),
        [warehouses, transferData?.to_warehouse_id]
    );

    // ═══ NP: Debounced City Search ═══
    const handleNpCitySearch = useCallback((query: string) => {
        setNpCitySearch(query);
        if (citySearchTimer.current) clearTimeout(citySearchTimer.current);
        if (!npApiKey || query.length < 2) {
            setNpCities([]);
            setNpShowCityDropdown(false);
            return;
        }
        citySearchTimer.current = setTimeout(async () => {
            setNpSearchingCities(true);
            try {
                const { data: result, error } = await cloudSupabase.functions.invoke('nova-poshta', {
                    body: { action: 'searchCities', apiKey: npApiKey, params: { query } },
                });
                if (!error && result?.success && result?.data?.[0]?.Addresses) {
                    setNpCities(result.data[0].Addresses);
                    setNpShowCityDropdown(true);
                }
            } catch (err) {
                console.warn('NP city search failed:', err);
            } finally {
                setNpSearchingCities(false);
            }
        }, 400);
    }, [npApiKey]);

    // ═══ NP: Fetch Warehouses when city selected ═══
    const fetchNpWarehouses = useCallback(async (cityRef: string) => {
        if (!npApiKey) return;
        setNpLoading(true);
        try {
            const { data: result, error } = await cloudSupabase.functions.invoke('nova-poshta', {
                body: { action: 'getWarehouses', apiKey: npApiKey, params: { cityRef } },
            });
            if (!error && result?.success) {
                setNpWarehouses(result.data || []);
            }
        } catch (err) {
            console.warn('NP warehouse fetch failed:', err);
        } finally {
            setNpLoading(false);
        }
    }, [npApiKey]);

    // ═══ NP: Select City ═══
    const handleSelectNpCity = useCallback((city: any) => {
        setNpSelectedCity(city);
        setNpCitySearch(city.Present || city.MainDescription || '');
        setNpShowCityDropdown(false);
        setNpCities([]);
        setNpSelectedWarehouse(null);
        const cityRef = city.DeliveryCity || city.Ref;
        if (cityRef) fetchNpWarehouses(cityRef);
    }, [fetchNpWarehouses]);

    // ═══ NP: Create TTN (Internet Document) ═══
    const createNpDocument = useCallback(async () => {
        if (!npApiKey) return;
        if (!npSelectedCity) {
            toast.error(tl('اختر مدينة الاستلام أولاً', 'Select destination city first'));
            return;
        }
        if (!npSelectedWarehouse) {
            toast.error(tl('اختر فرع الاستلام', 'Select recipient warehouse'));
            return;
        }

        setNpCreatingTTN(true);
        try {
            const { data: company } = await supabase
                .from('companies')
                .select('integrations')
                .eq('id', companyId)
                .single();
            const nps = company?.integrations?.nova_poshta || {};

            if (!nps.sender_ref || !nps.sender_address_ref || !nps.sender_contact_ref) {
                toast.error(tl(
                    'يرجى إعداد بيانات المرسل في إعدادات الشركة أولاً',
                    'Please configure sender details in company settings first'
                ));
                setNpCreatingTTN(false);
                return;
            }

            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

            // For transfers: recipient is the destination warehouse contact
            const toWarehouseName = language === 'ar'
                ? (toWarehouse?.name_ar || 'المستودع الوجهة')
                : (toWarehouse?.name_en || 'Destination Warehouse');

            const documentParams: any = {
                PayerType: 'Sender',
                PaymentMethod: 'Cash',
                DateTime: dateStr,
                CargoType: 'Cargo',
                Weight: npWeight,
                ServiceType: 'WarehouseWarehouse',
                SeatsAmount: npSeatsAmount,
                Description: npDescription,
                Cost: '100',
                CitySender: nps.sender_city_ref,
                Sender: nps.sender_ref,
                SenderAddress: nps.sender_address_ref,
                ContactSender: nps.sender_contact_ref,
                SendersPhone: nps.sender_phone || '',
                CityRecipient: npSelectedCity.DeliveryCity || npSelectedCity.Ref,
                RecipientCityName: npSelectedCity.Present || npSelectedCity.MainDescription || '',
                RecipientAddress: npSelectedWarehouse.Ref,
                RecipientAddressName: npSelectedWarehouse.Description,
                RecipientName: toWarehouseName,
                RecipientType: 'Organization',
                RecipientsPhone: nps.sender_phone || '',
            };

            const { data: result, error } = await cloudSupabase.functions.invoke('nova-poshta', {
                body: { action: 'createDocument', apiKey: npApiKey, params: documentParams },
            });

            if (error) throw error;

            if (result?.success && result?.data?.[0]?.IntDocNumber) {
                const ttn = result.data[0].IntDocNumber;
                const estDel = result.data[0].EstimatedDeliveryDate;
                const costOnSite = result.data[0].CostOnSite;

                setTrackingNumber(ttn);
                setShippingCarrier('nova_poshta');
                if (costOnSite) setShippingCost(costOnSite);
                if (estDel) setEstimatedDelivery(estDel.split('.').reverse().join('-'));

                toast.success(tl(`✅ تم إنشاء البوليصة: ${ttn}`, `✅ TTN Created: ${ttn}`));
            } else {
                const errorMsg = result?.errors?.join(', ') || 'Unknown NP error';
                toast.error(`Nova Poshta: ${errorMsg}`);
            }
        } catch (err: any) {
            console.error('NP create document error:', err);
            toast.error(tl(`فشل إنشاء البوليصة: ${err.message}`, `TTN creation failed: ${err.message}`));
        } finally {
            setNpCreatingTTN(false);
        }
    }, [npApiKey, npSelectedCity, npSelectedWarehouse, npWeight, npSeatsAmount, npDescription, companyId, toWarehouse, language, tl]);

    // ═══ NP: Track Document ═══
    const trackNpDocument = useCallback(async () => {
        if (!npApiKey || !trackingNumber) return;
        try {
            const { data: result, error } = await cloudSupabase.functions.invoke('nova-poshta', {
                body: {
                    action: 'trackDocument',
                    apiKey: npApiKey,
                    params: { documents: [{ DocumentNumber: trackingNumber, Phone: '' }] },
                },
            });
            if (!error && result?.success && result?.data?.[0]) {
                setNpTrackingStatus(result.data[0]);
            }
        } catch (err) {
            console.warn('NP tracking failed:', err);
        }
    }, [npApiKey, trackingNumber]);

    // ═══ Auto-track when tracking number exists and carrier is NP ═══
    useEffect(() => {
        if (npApiKey && trackingNumber && shippingCarrier === 'nova_poshta') {
            trackNpDocument();
        }
    }, [npApiKey, trackingNumber, shippingCarrier]);

    // ═══ Restore shipping data from transferData ═══
    useEffect(() => {
        if (!transferData) return;
        if (transferData.shipping_method) setShippingMethod(transferData.shipping_method);
        if (transferData.driver_id) setDriverId(transferData.driver_id);
        if (transferData.driver_name) setDriverName(transferData.driver_name);
        if (transferData.driver_phone) setDriverPhone(transferData.driver_phone);
        if (transferData.vehicle_number) setVehicleNumber(transferData.vehicle_number);
        if (transferData.vehicle_type) setVehicleType(transferData.vehicle_type);
        if (transferData.vehicle_model) setVehicleModel(transferData.vehicle_model);
        if (transferData.shipping_carrier) setShippingCarrier(transferData.shipping_carrier);
        if (transferData.tracking_number) setTrackingNumber(transferData.tracking_number);
        if (transferData.shipping_cost) setShippingCost(String(transferData.shipping_cost));
        if (transferData.estimated_delivery) setEstimatedDelivery(transferData.estimated_delivery);
        if (transferData.shipping_notes) setShippingNotes(transferData.shipping_notes);
        // Auto-open if shipped and has data
        if (transferData.shipping_method && transferData.status === 'shipped') setShippingOpen(true);
    }, [transferData]);

    // ═══ Fetch transfer details + items ═══
    useEffect(() => {
        if (!transferId || !isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            setDraftRestored(false);
            setIsShipped(false);
            try {
                // 1. Fetch transfer header with warehouse relations
                const { data: trData, error: trErr } = await supabase
                    .from('stock_transfers')
                    .select(`
                        *,
                        from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, name_ar, name_en),
                        to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, name_ar, name_en)
                    `)
                    .eq('id', transferId)
                    .maybeSingle();

                if (trErr) console.warn('[TransferDelivery] transfer fetch error:', trErr.message);
                if (trData) {
                    setTransferData(trData);
                    // Check if already shipped
                    if (['shipped', 'received', 'completed'].includes(trData.status)) {
                        setIsShipped(true);
                    }
                }

                // 2. Fetch transfer items with material names
                const { data: items, error: itemsErr } = await supabase
                    .from('stock_transfer_items')
                    .select('*')
                    .eq('transfer_id', transferId)
                    .order('created_at', { ascending: true });

                if (itemsErr) console.warn('[TransferDelivery] items fetch error:', itemsErr.message);

                if (items && items.length > 0) {
                    // Enrich with material names
                    const materialIds = [...new Set(items.map((i: any) => i.material_id).filter(Boolean))];
                    let materialsMap: Record<string, { name_ar: string; name_en: string; code: string }> = {};

                    if (materialIds.length > 0) {
                        const { data: mats } = await supabase
                            .from('fabric_materials')
                            .select('id, name_ar, name_en, code')
                            .in('id', materialIds);
                        if (mats) {
                            materialsMap = mats.reduce((acc: any, m: any) => {
                                acc[m.id] = { name_ar: m.name_ar || '', name_en: m.name_en || '', code: m.code || '' };
                                return acc;
                            }, {});
                        }
                    }

                    setSourceItems(items.map((item: any) => {
                        const mat = materialsMap[item.material_id] || {};
                        return {
                            id: item.id,
                            material_id: item.material_id,
                            material_name_ar: (mat as any).name_ar || '',
                            material_name: (mat as any).name_en || '',
                            material_code: (mat as any).code || '',
                            roll_id: item.roll_id,
                            quantity: item.quantity || 0,
                            notes: item.notes || '',
                        };
                    }));
                } else {
                    setSourceItems([]);
                }

                // 3. Restore draft if applicable
                if (!draftRestored) {
                    let restoredRolls: any[] | null = null;

                    try {
                        const localDraft = localStorage.getItem(draftKey);
                        if (localDraft) {
                            const parsed = JSON.parse(localDraft);
                            if (parsed?.rolls?.length > 0) {
                                restoredRolls = parsed.rolls;
                                console.log(`[TransferDraft] 📂 Restored ${restoredRolls!.length} rolls from localStorage`);
                            }
                        }
                    } catch (e) { /* ignore */ }

                    if (!restoredRolls && trData?.delivery_draft?.rolls?.length > 0) {
                        restoredRolls = trData.delivery_draft.rolls;
                        console.log(`[TransferDraft] ☁️ Restored ${restoredRolls!.length} rolls from Supabase`);
                    }

                    if (restoredRolls && restoredRolls.length > 0) {
                        setSelectedRolls(restoredRolls);
                        setDraftRestored(true);
                        toast.info(tl(
                            `📂 تم استعادة مسودة التحميل (${restoredRolls.length} رولون)`,
                            `📂 Loading draft restored (${restoredRolls.length} rolls)`
                        ));
                    }
                }
            } catch (err) {
                console.error('TransferDeliveryDialog fetchData:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [transferId, isOpen]);

    // ═══ Shipped state: load dispatched rolls from inventory_movements ═══
    useEffect(() => {
        if (!isShipped || !transferId || !isOpen) return;
        if (selectedRolls.length > 0 && draftRestored) return;

        const fetchShippedRolls = async () => {
            const { data: movements } = await supabase
                .from('inventory_movements')
                .select('roll_id, quantity, material_id')
                .eq('reference_id', transferId)
                .eq('movement_type', 'transfer_out');

            if (movements && movements.length > 0) {
                const rollIds = movements.map(m => m.roll_id).filter(Boolean);
                if (rollIds.length > 0) {
                    const { data: rolls } = await supabase
                        .from('fabric_rolls')
                        .select('id, roll_number, material_id, current_length, color_id, color_name, status, warehouse_id')
                        .in('id', rollIds);

                    if (rolls && rolls.length > 0) {
                        const mapped = rolls.map((r: any) => {
                            const mv = movements.find(m => m.roll_id === r.id);
                            return {
                                ...r,
                                net_length: mv?.quantity || r.current_length || 0,
                                _delivered: true,
                                _viewOnly: true,
                            };
                        });
                        setSelectedRolls(mapped);
                        setDraftRestored(true);
                    }
                }
            }
        };
        fetchShippedRolls();
    }, [isShipped, transferId, isOpen]);

    // ═══ Enhanced data for UnifiedAccountingSheet ═══
    const enhancedData = useMemo(() => ({
        ...transferData,
        source_items: sourceItems,
        warehouse_id: fromWarehouseId || transferData?.from_warehouse_id,
        selected_rolls: selectedRolls,
        rolls_count: selectedRolls.length,
        total_length: selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0),
        view_mode: isShipped,
        // ── Transfer-specific flags for SalesDeliveryItemsTab ──
        _saveTarget: 'stock_transfers',   // Save draft to stock_transfers table
        invoice_no: transferData?.transfer_number, // Display compatibility
        onDeliveryDataChange: (updates: any) => {
            if (updates?.selected_rolls) {
                setSelectedRolls(updates.selected_rolls);
            }
        },
    }), [transferData, sourceItems, fromWarehouseId, selectedRolls, isShipped]);

    // ═══ Handle Save = "تحميل" ═══
    const handleSave = useCallback(async (data: any) => {
        if (data?.selected_rolls) {
            setSelectedRolls(data.selected_rolls);
        }
        if (selectedRolls.length > 0 || data?.selected_rolls?.length > 0) {
            setShowConfirm(true);
        } else {
            toast.warning(tl('⚠️ لم يتم اختيار أي رولون', '⚠️ No rolls selected'));
        }
    }, [selectedRolls, tl]);

    // ═══ Handle onChange from tabs ═══
    const handleDataChange = useCallback((updates: any) => {
        if (updates?.selected_rolls) {
            setSelectedRolls(updates.selected_rolls);
        }
    }, []);

    // ═══ Save Draft ═══
    const handleSaveDraft = useCallback(async () => {
        if (!transferId) return;
        setIsSavingDraft(true);
        try {
            const draft = {
                rolls: selectedRolls,
                warehouse_id: fromWarehouseId,
                saved_at: new Date().toISOString(),
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));

            await supabase
                .from('stock_transfers')
                .update({
                    delivery_draft: draft,
                    status: selectedRolls.length > 0 ? 'loading' : transferData?.status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', transferId);

            toast.success(tl(
                `✅ تم حفظ المسودة (${selectedRolls.length} رولون)`,
                `✅ Draft saved (${selectedRolls.length} rolls)`
            ));
        } catch (err) {
            console.error('Save draft error:', err);
            toast.error(tl('❌ فشل حفظ المسودة', '❌ Draft save failed'));
        } finally {
            setIsSavingDraft(false);
        }
    }, [transferId, selectedRolls, fromWarehouseId, draftKey, transferData, tl]);

    // ═══ Delivery Progress ═══
    const deliveryProgress = useMemo(() => {
        const expectedMeters = sourceItems.reduce((s, si) => s + (Number(si.quantity) || 0), 0);
        const selectedMeters = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
        const percent = expectedMeters > 0 ? Math.min(100, (selectedMeters / expectedMeters) * 100) : 0;
        return {
            percent: Math.round(percent * 10) / 10,
            selectedMeters,
            expectedMeters,
            rollCount: selectedRolls.length,
        };
    }, [sourceItems, selectedRolls]);

    const isPartialDelivery = useMemo(() => deliveryProgress.percent < 99, [deliveryProgress.percent]);

    // ═══ Confirm Delivery (Transfer Out) ═══
    const handleConfirmDelivery = useCallback(async () => {
        if (!transferId || !fromWarehouseId || selectedRolls.length === 0) return;

        setIsCompleting(true);
        try {
            const now = new Date().toISOString();
            const rollIds = selectedRolls.map(r => r.id);

            // ── 1. Update fabric_rolls: status → 'in_transit', clear warehouse ──
            const { error: rollError } = await supabase
                .from('fabric_rolls')
                .update({
                    status: 'in_transit',
                    warehouse_id: null,
                    updated_at: now,
                })
                .in('id', rollIds);

            if (rollError) throw new Error(`Roll update failed: ${rollError.message}`);

            // ── 2. Create inventory_movements (transfer_out) ──
            const movNumber = `MV-TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${transferData?.transfer_number?.slice(-6) || transferId?.slice(0, 6)}`;
            const movementRows = selectedRolls.map((roll: any, idx: number) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: 'transfer_out',
                material_id: roll.material_id || null,
                color_id: roll.color_id || null,
                roll_id: roll.id,
                from_warehouse_id: fromWarehouseId,
                to_warehouse_id: transferData?.to_warehouse_id || null,
                quantity: roll.net_length || roll.current_length || 0,
                reference_type: 'stock_transfer',
                reference_id: transferId,
                reference_number: transferData?.transfer_number || '',
                notes: tl(
                    `مناقلة — خروج رولون ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)} م)`,
                    `Transfer out — roll ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)}m)`
                ),
            }));

            const { error: movError } = await supabase
                .from('inventory_movements')
                .insert(movementRows);

            if (movError) console.warn('inventory_movements insert error:', movError.message);

            // ── 3. Update stock_transfers status → 'shipped' + shipping data ──
            const { error: transferError } = await supabase
                .from('stock_transfers')
                .update({
                    status: 'shipped',
                    shipped_at: now,
                    delivery_draft: null,
                    updated_at: now,
                    // Shipping data
                    shipping_method: shippingMethod,
                    driver_id: driverId || null,
                    driver_name: driverName || null,
                    driver_phone: driverPhone || null,
                    vehicle_number: vehicleNumber || null,
                    vehicle_type: vehicleType || null,
                    vehicle_model: vehicleModel || null,
                    shipping_carrier: shippingCarrier || null,
                    tracking_number: trackingNumber || null,
                    shipping_cost: shippingCost ? parseFloat(shippingCost) : 0,
                    estimated_delivery: estimatedDelivery || null,
                    shipping_notes: shippingNotes || null,
                })
                .eq('id', transferId);

            if (transferError) console.warn('Transfer status update error:', transferError.message);

            // ── 4. Clean up localStorage draft ──
            try { localStorage.removeItem(draftKey); } catch { /* ignore */ }

            // ── 5. Success ──
            const totalLength = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
            const fromName = language === 'ar'
                ? (fromWarehouse?.name_ar || 'المستودع المصدر')
                : (fromWarehouse?.name_en || 'Source');
            const toName = language === 'ar'
                ? (toWarehouse?.name_ar || 'المستودع الهدف')
                : (toWarehouse?.name_en || 'Destination');

            toast.success(tl(
                `✅ تم التحميل! ${selectedRolls.length} رولون (${totalLength.toFixed(1)} م) — من ${fromName} إلى ${toName}`,
                `✅ Shipped! ${selectedRolls.length} rolls (${totalLength.toFixed(1)}m) — from ${fromName} to ${toName}`
            ));

            setShowConfirm(false);
            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('Transfer delivery error:', err);
            toast.error(tl('❌ فشل في تحميل البضاعة', '❌ Dispatch failed'));
        } finally {
            setIsCompleting(false);
        }
    }, [transferId, fromWarehouseId, selectedRolls, transferData, companyId, tenantId, tl, onComplete, onOpenChange, draftKey, fromWarehouse, toWarehouse, language]);

    // ═══ Confirm Receipt (Transfer In) ═══
    const handleConfirmReceiptAction = useCallback(async () => {
        if (!transferId || selectedRolls.length === 0) return;
        const toWarehouseId = transferData?.to_warehouse_id;
        if (!toWarehouseId) {
            toast.error(tl('❌ المستودع المستهدف غير محدد', '❌ Destination warehouse not set'));
            return;
        }

        setIsCompleting(true);
        try {
            const now = new Date().toISOString();
            const rollIds = selectedRolls.map(r => r.id);

            // ── 1. Update fabric_rolls: status → 'available', warehouse → destination ──
            const { error: rollError } = await supabase
                .from('fabric_rolls')
                .update({
                    status: 'available',
                    warehouse_id: toWarehouseId,
                    updated_at: now,
                })
                .in('id', rollIds);

            if (rollError) throw new Error(`Roll update failed: ${rollError.message}`);

            // ── 2. Create inventory_movements (transfer_in) ──
            const movNumber = `MV-TRI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${transferData?.transfer_number?.slice(-6) || transferId?.slice(0, 6)}`;
            const movementRows = selectedRolls.map((roll: any, idx: number) => ({
                tenant_id: tenantId,
                company_id: companyId,
                movement_number: `${movNumber}-${idx + 1}`,
                movement_date: now.slice(0, 10),
                movement_type: 'transfer_in',
                material_id: roll.material_id || null,
                color_id: roll.color_id || null,
                roll_id: roll.id,
                from_warehouse_id: transferData?.from_warehouse_id || null,
                to_warehouse_id: toWarehouseId,
                quantity: roll.net_length || roll.current_length || 0,
                reference_type: 'stock_transfer',
                reference_id: transferId,
                reference_number: transferData?.transfer_number || '',
                notes: tl(
                    `مناقلة — استلام رولون ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)} م)`,
                    `Transfer in — roll ${roll.roll_number || roll.id?.slice(0, 8)} (${(roll.net_length || roll.current_length || 0).toFixed(1)}m)`
                ),
            }));

            const { error: movError } = await supabase
                .from('inventory_movements')
                .insert(movementRows);

            if (movError) console.warn('inventory_movements insert error:', movError.message);

            // ── 3. Update stock_transfers status → 'completed' ──
            const { error: transferError } = await supabase
                .from('stock_transfers')
                .update({
                    status: 'completed',
                    received_at: now,
                    updated_at: now,
                })
                .eq('id', transferId);

            if (transferError) console.warn('Transfer status update error:', transferError.message);

            // ── 4. Success ──
            const totalLength = selectedRolls.reduce((s: number, r: any) => s + (r.net_length || r.current_length || 0), 0);
            const destName = language === 'ar'
                ? (toWarehouse?.name_ar || 'المستودع الهدف')
                : (toWarehouse?.name_en || 'Destination');

            toast.success(tl(
                `✅ تم الاستلام! ${selectedRolls.length} رولون (${totalLength.toFixed(1)} م) — في ${destName}`,
                `✅ Received! ${selectedRolls.length} rolls (${totalLength.toFixed(1)}m) — at ${destName}`
            ));

            setShowReceiveConfirm(false);
            onOpenChange(false);
            onComplete?.();
        } catch (err: any) {
            console.error('Transfer receipt error:', err);
            toast.error(tl('❌ فشل في تأكيد الاستلام', '❌ Receipt confirmation failed'));
        } finally {
            setIsCompleting(false);
        }
    }, [transferId, selectedRolls, transferData, companyId, tenantId, tl, onComplete, onOpenChange, toWarehouse, language]);

    // ═══ Handle close ═══
    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // ═══ Status Label ═══
    const getStatusLabel = (status: string) => {
        const map: Record<string, { ar: string; en: string; color: string }> = {
            confirmed: { ar: 'مؤكدة', en: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            loading: { ar: 'قيد التحميل', en: 'Loading', color: 'bg-amber-100 text-amber-700 border-amber-200' },
            shipped: { ar: 'تم الشحن', en: 'Shipped', color: 'bg-purple-100 text-purple-700 border-purple-200' },
            received: { ar: 'تم الاستلام', en: 'Received', color: 'bg-green-100 text-green-700 border-green-200' },
            completed: { ar: 'مكتمل', en: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        };
        const s = map[status] || { ar: status, en: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
        return { label: language === 'ar' ? s.ar : s.en, color: s.color };
    };

    // ═══ Header Extra (same visual pattern as SalesDeliveryDialog) ═══
    const HeaderExtra = (
        <div className="flex flex-col gap-0 border-b">
            {/* Row 1: Transfer Info */}
            <div className={`px-4 py-2.5 border-b bg-gradient-to-r ${isShipped
                ? 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20'
                : 'from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Transfer Type Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${isShipped
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'}`}>
                        <div className={`p-1 rounded-md ${isShipped ? 'bg-purple-200' : 'bg-indigo-200 dark:bg-indigo-800'}`}>
                            {isShipped ? <PackageCheck className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                        </div>
                        {isShipped ? tl('تم الشحن ✅', 'Shipped ✅') : tl('تحميل مناقلة', 'Transfer Loading')}
                    </div>

                    {/* Warehouse Route — RTL: source on right ← destination on left */}
                    <div className="flex items-center gap-1.5">
                        <Warehouse className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            {language === 'ar'
                                ? (fromWarehouse?.name_ar || transferData?.from_warehouse?.name_ar || '—')
                                : (fromWarehouse?.name_en || transferData?.from_warehouse?.name_en || '—')
                            }
                        </span>
                        <span className="text-gray-400 mx-1">{isRTL ? '←' : '→'}</span>
                        <MapPin className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {language === 'ar'
                                ? (toWarehouse?.name_ar || transferData?.to_warehouse?.name_ar || '—')
                                : (toWarehouse?.name_en || transferData?.to_warehouse?.name_en || '—')
                            }
                        </span>
                    </div>

                    <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 ms-auto shrink-0">
                        {/* QR & Print — always visible */}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={tl('طباعة', 'Print')} onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={tl('QR كود', 'QR Code')}>
                            <QrCode className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

                        {isShipped ? (
                            <>
                                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                                    <PackageCheck className="w-3.5 h-3.5 text-purple-600" />
                                    <span className="text-xs font-bold text-purple-700">
                                        {selectedRolls.length} {tl('رولون في الطريق', 'rolls in transit')}
                                    </span>
                                </div>
                                {/* Receive Button */}
                                <Button
                                    size="sm"
                                    onClick={() => setShowReceiveConfirm(true)}
                                    disabled={isCompleting || selectedRolls.length === 0}
                                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/30 px-4"
                                >
                                    {isCompleting
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <PackageOpen className="h-4 w-4" />
                                    }
                                    {tl('تأكيد الاستلام', 'Confirm Receipt')}
                                    <span className="bg-emerald-800/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                                        {selectedRolls.length}
                                    </span>
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Online Badge */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${navigator.onLine
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {navigator.onLine ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                    {navigator.onLine ? tl('متصل', 'Online') : tl('غير متصل', 'Offline')}
                                </div>
                                {/* Dispatch Button */}
                                {selectedRolls.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowConfirm(true)}
                                        disabled={isCompleting}
                                        className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/30 px-4"
                                    >
                                        {isCompleting
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <ArrowLeftRight className="h-4 w-4" />
                                        }
                                        {tl('شحن', 'Ship')}
                                        <span className="bg-indigo-800/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                                            {selectedRolls.length}
                                        </span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Progress */}
            {sourceItems.length > 0 && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                    {language === 'ar'
                                        ? `المناقلة من ${fromWarehouse?.name_ar || transferData?.from_warehouse?.name_ar || '—'} إلى ${toWarehouse?.name_ar || transferData?.to_warehouse?.name_ar || '—'}`
                                        : `Transfer from ${fromWarehouse?.name_en || transferData?.from_warehouse?.name_en || '—'} to ${toWarehouse?.name_en || transferData?.to_warehouse?.name_en || '—'}`
                                    }
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                    {transferData?.transfer_number || ''}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ms-auto shrink-0">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{tl('البنود', 'Items')}</span>
                                <span className="text-sm font-bold text-blue-600">{sourceItems.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] text-gray-500">{tl('رولونات', 'Rolls')}</span>
                                <span className={`text-sm font-bold ${selectedRolls.length > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {selectedRolls.length}
                                </span>
                            </div>
                            {(() => {
                                const s = getStatusLabel(transferData?.status || 'confirmed');
                                return <Badge variant="outline" className={`text-[10px] capitalize ${s.color}`}>{s.label}</Badge>;
                            })()}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-medium shrink-0">
                            {tl('تقدم التحميل', 'Loading Progress')}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${deliveryProgress.percent >= 100
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : deliveryProgress.percent > 0
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                        : 'bg-gray-300'
                                    }`}
                                style={{ width: `${deliveryProgress.percent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold font-mono min-w-[40px] text-end ${deliveryProgress.percent >= 100 ? 'text-green-600' : 'text-indigo-600'
                            }`}>
                            {deliveryProgress.percent.toFixed(0)}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    // ═══ Shipping Methods Config ═══
    const SHIPPING_METHODS = [
        { id: 'company_driver' as const, label_ar: 'سائق الشركة', label_en: 'Company Driver', icon: Star, color: 'bg-green-100 text-green-600 border-green-200' },
        { id: 'external_truck' as const, label_ar: 'سيارة شحن خارجية', label_en: 'External Truck', icon: Car, color: 'bg-amber-100 text-amber-600 border-amber-200' },
        { id: 'shipping_company' as const, label_ar: 'شركة شحن', label_en: 'Shipping Company', icon: Navigation, color: 'bg-purple-100 text-purple-600 border-purple-200' },
    ];

    // ═══ Shipping Section Component ═══
    const ShippingSection = (
        <Collapsible open={shippingOpen} onOpenChange={setShippingOpen} className="border-b">
            <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-orange-50/80 to-amber-50/80 dark:from-orange-950/20 dark:to-amber-950/20 hover:from-orange-50 hover:to-amber-50 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-white">
                        {tl('بيانات الشحن والسائق', 'Shipping & Driver Info')}
                    </span>
                    {driverName && (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            {driverName}
                        </Badge>
                    )}
                    {trackingNumber && (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-mono">
                            # {trackingNumber}
                        </Badge>
                    )}
                </div>
                {shippingOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20" dir={isRTL ? 'rtl' : 'ltr'}>

                    {/* ═══ 1. Shipping Method Selection ═══ */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-orange-500" />
                            {tl('طريقة الشحن', 'Shipping Method')}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {SHIPPING_METHODS.map(method => {
                                const Icon = method.icon;
                                const isSelected = shippingMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => !isShipped && setShippingMethod(method.id)}
                                        disabled={isShipped}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${isSelected
                                            ? `${method.color} border-current shadow-sm`
                                            : isShipped
                                                ? 'border-gray-200 dark:border-gray-700 text-gray-400 opacity-50'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="text-[10px] font-medium text-center leading-tight">
                                            {tl(method.label_ar, method.label_en)}
                                        </span>
                                        {isSelected && (
                                            <Badge className="text-[8px] bg-white/50 dark:bg-black/20 border-none mt-0.5">
                                                {tl('المحدد', 'Selected')}
                                            </Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ═══ 2. Company Driver ═══ */}
                    {shippingMethod === 'company_driver' && (
                        <div className="space-y-3 bg-green-50/50 dark:bg-green-950/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
                            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                                <Star className="w-4 h-4 text-green-500" />
                                {tl('سائق الشركة', 'Company Driver')}
                            </h4>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">{tl('اختر السائق', 'Select Driver')}</Label>
                                <Select
                                    value={driverId}
                                    onValueChange={(val) => {
                                        const driver = driversList.find(d => d.id === val);
                                        if (driver) {
                                            setDriverId(driver.id);
                                            setDriverName(language === 'ar' ? driver.name_ar : (driver.name_en || driver.name_ar));
                                            setDriverPhone(driver.phone || '');
                                            setVehicleNumber(driver.vehicle_number || '');
                                            setVehicleType(driver.vehicle_type || '');
                                            setVehicleModel(driver.vehicle_model || '');
                                        }
                                    }}
                                    disabled={isShipped}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder={tl('اختر سائقاً...', 'Select a driver...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {driversList.map(drv => (
                                            <SelectItem key={drv.id} value={drv.id}>
                                                <span className="font-medium">{language === 'ar' ? drv.name_ar : (drv.name_en || drv.name_ar)}</span>
                                                {drv.vehicle_number && (
                                                    <span className="text-[10px] text-gray-400 font-mono ms-2">({drv.vehicle_number})</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Driver details (auto-filled) */}
                            {driverName && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{tl('الاسم', 'Name')}</div>
                                        <div className="text-sm font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border">{driverName}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{tl('الهاتف', 'Phone')}</div>
                                        <div className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border" dir="ltr">{driverPhone || '—'}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1"><Car className="w-3 h-3" />{tl('رقم السيارة', 'Vehicle #')}</div>
                                        <div className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border" dir="ltr">{vehicleNumber || '—'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ 3. External Truck ═══ */}
                    {shippingMethod === 'external_truck' && (
                        <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                                <Car className="w-4 h-4 text-amber-500" />
                                {tl('سيارة شحن خارجية', 'External Truck')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">{tl('اسم السائق', 'Driver Name')}</Label>
                                    <Input
                                        value={driverName}
                                        onChange={e => setDriverName(e.target.value)}
                                        disabled={isShipped}
                                        placeholder={tl('اسم السائق...', 'Driver name...')}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">{tl('هاتف السائق', 'Driver Phone')}</Label>
                                    <Input
                                        value={driverPhone}
                                        onChange={e => setDriverPhone(e.target.value)}
                                        disabled={isShipped}
                                        placeholder="+380..."
                                        className="h-9 text-sm font-mono" dir="ltr"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">{tl('رقم السيارة', 'Vehicle Number')}</Label>
                                    <Input
                                        value={vehicleNumber}
                                        onChange={e => setVehicleNumber(e.target.value)}
                                        disabled={isShipped}
                                        placeholder={tl('رقم اللوحة...', 'Plate number...')}
                                        className="h-9 text-sm font-mono" dir="ltr"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">{tl('نوع السيارة', 'Vehicle Type')}</Label>
                                    <Input
                                        value={vehicleType}
                                        onChange={e => setVehicleType(e.target.value)}
                                        disabled={isShipped}
                                        placeholder={tl('شاحنة، فان...', 'Truck, Van...')}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ 4. Shipping Company ═══ */}
                    {shippingMethod === 'shipping_company' && (
                        <div className="space-y-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-purple-500" />
                                {tl('شركة الشحن', 'Shipping Company')}
                                {npConnected && (
                                    <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200 gap-1">
                                        <Zap className="w-2.5 h-2.5" />{tl('متصل بنوفا بوشتا', 'NP Connected')}
                                    </Badge>
                                )}
                            </h4>

                            {/* Carrier Selection Cards */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {[
                                    { id: 'nova_poshta', label: 'Nova Poshta', label_ar: 'نوفايا بوشتا', emoji: '📦', tracking_url: 'https://novaposhta.ua/tracking/international/en?id={tracking}' },
                                    { id: 'ukrposhta', label: 'Ukrposhta', label_ar: 'أوكربوشتا', emoji: '🏤', tracking_url: 'https://track.ukrposhta.ua/tracking_EN.html?barcode={tracking}' },
                                    { id: 'dhl', label: 'DHL', label_ar: 'دي إتش إل', emoji: '✈️', tracking_url: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}' },
                                    { id: 'aramex', label: 'Aramex', label_ar: 'أرامكس', emoji: '🌐', tracking_url: 'https://www.aramex.com/track/results?ShipmentNumber={tracking}' },
                                    { id: 'other', label: 'Other', label_ar: 'أخرى', emoji: '📋' },
                                ].map(carrier => {
                                    const isSelected = shippingCarrier === carrier.id;
                                    return (
                                        <button
                                            key={carrier.id}
                                            type="button"
                                            onClick={() => !isShipped && setShippingCarrier(carrier.id)}
                                            disabled={isShipped}
                                            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${isSelected
                                                ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/30 shadow-sm'
                                                : isShipped
                                                    ? 'border-gray-200 opacity-50'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 cursor-pointer'
                                                }`}
                                        >
                                            <span className="text-lg">{carrier.emoji}</span>
                                            <span className="text-[10px] font-medium leading-tight">{tl(carrier.label_ar, carrier.label)}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ═══ Nova Poshta Integration Panel ═══ */}
                            {shippingCarrier === 'nova_poshta' && npConnected && !trackingNumber && !isShipped && (
                                <div className="space-y-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                                        <Zap className="w-3.5 h-3.5" />
                                        {tl('إنشاء بوليصة Nova Poshta', 'Create Nova Poshta TTN')}
                                    </div>

                                    {/* City Search */}
                                    <div className="space-y-1 relative">
                                        <Label className="text-[10px] text-gray-500">{tl('مدينة الاستلام', 'Destination City')}</Label>
                                        <div className="relative">
                                            <Input
                                                value={npCitySearch}
                                                onChange={e => handleNpCitySearch(e.target.value)}
                                                placeholder={tl('ابحث عن المدينة...', 'Search city...')}
                                                className="h-8 text-xs pe-8"
                                            />
                                            {npSearchingCities
                                                ? <Loader2 className="w-3.5 h-3.5 absolute end-2.5 top-2 animate-spin text-purple-500" />
                                                : <Search className="w-3.5 h-3.5 absolute end-2.5 top-2 text-gray-400" />
                                            }
                                        </div>
                                        {/* City Dropdown */}
                                        {npShowCityDropdown && npCities.length > 0 && (
                                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {npCities.map((city: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="w-full text-start px-3 py-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-b last:border-b-0"
                                                        onClick={() => handleSelectNpCity(city)}
                                                    >
                                                        <span className="font-medium">{city.Present || city.MainDescription}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Warehouse Selection */}
                                    {npSelectedCity && (
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-500">{tl('فرع الاستلام', 'Recipient Warehouse')}</Label>
                                            {npLoading ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />{tl('جارٍ تحميل الفروع...', 'Loading warehouses...')}
                                                </div>
                                            ) : (
                                                <Select
                                                    value={npSelectedWarehouse?.Ref || ''}
                                                    onValueChange={(val) => {
                                                        const wh = npWarehouses.find((w: any) => w.Ref === val);
                                                        setNpSelectedWarehouse(wh);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder={tl('اختر فرع الاستلام...', 'Select warehouse...')} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-48">
                                                        {npWarehouses.map((wh: any) => (
                                                            <SelectItem key={wh.Ref} value={wh.Ref} className="text-xs">
                                                                {wh.Description}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}

                                    {/* Cargo Details */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] text-gray-400">{tl('الوزن (كغ)', 'Weight (kg)')}</Label>
                                            <Input type="number" value={npWeight} onChange={e => setNpWeight(e.target.value)} className="h-7 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] text-gray-400">{tl('عدد الطرود', 'Seats')}</Label>
                                            <Input type="number" value={npSeatsAmount} onChange={e => setNpSeatsAmount(e.target.value)} className="h-7 text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] text-gray-400">{tl('الوصف', 'Description')}</Label>
                                            <Input value={npDescription} onChange={e => setNpDescription(e.target.value)} className="h-7 text-xs" />
                                        </div>
                                    </div>

                                    {/* Create TTN Button */}
                                    <Button
                                        onClick={createNpDocument}
                                        disabled={npCreatingTTN || !npSelectedCity || !npSelectedWarehouse}
                                        className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold"
                                        size="sm"
                                    >
                                        {npCreatingTTN ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                                        {tl('📋 إنشاء بوليصة TTN', '📋 Create TTN')}
                                    </Button>
                                </div>
                            )}

                            {/* NP Not Connected Warning */}
                            {shippingCarrier === 'nova_poshta' && !npConnected && (
                                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200">
                                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span className="text-xs text-amber-700 dark:text-amber-300">
                                        {tl('لم يتم إعداد تكامل Nova Poshta — يمكنك إدخال رقم التتبع يدوياً أو الإعداد من إعدادات الشركة', 'Nova Poshta integration not configured — enter tracking number manually or set up in company settings')}
                                    </span>
                                </div>
                            )}

                            {/* Tracking Number (manual or from TTN) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">{tl('رقم التتبع / TTN', 'Tracking # / TTN')}</Label>
                                    <Input
                                        value={trackingNumber}
                                        onChange={e => setTrackingNumber(e.target.value)}
                                        disabled={isShipped && !!trackingNumber}
                                        placeholder={tl('رقم البوليصة...', 'TTN / Tracking #...')}
                                        className="h-9 text-sm font-mono font-bold text-purple-600" dir="ltr"
                                    />
                                </div>
                                {trackingNumber && (
                                    <div className="flex items-end gap-2">
                                        {/* Track Button */}
                                        {shippingCarrier === 'nova_poshta' && npConnected && (
                                            <Button size="sm" variant="outline" onClick={trackNpDocument} className="h-9 gap-1.5 text-purple-600 border-purple-200">
                                                <RefreshCw className="w-3.5 h-3.5" />{tl('تتبع', 'Track')}
                                            </Button>
                                        )}
                                        {/* Open Tracking Link */}
                                        {shippingCarrier !== 'other' && (() => {
                                            const urls: Record<string, string> = {
                                                nova_poshta: `https://novaposhta.ua/tracking/international/en?id=${trackingNumber}`,
                                                ukrposhta: `https://track.ukrposhta.ua/tracking_EN.html?barcode=${trackingNumber}`,
                                                dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
                                                aramex: `https://www.aramex.com/track/results?ShipmentNumber=${trackingNumber}`,
                                            };
                                            const url = urls[shippingCarrier];
                                            if (!url) return null;
                                            return (
                                                <Button size="sm" variant="outline" asChild className="h-9 gap-1.5 text-blue-600 border-blue-200">
                                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5" />{tl('فتح التتبع', 'Open Tracking')}
                                                    </a>
                                                </Button>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Tracking Status */}
                            {npTrackingStatus && (
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">{npTrackingStatus.StatusCode}</Badge>
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{npTrackingStatus.Status}</span>
                                    </div>
                                    {npTrackingStatus.WarehouseRecipient && (
                                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />{npTrackingStatus.WarehouseRecipient}
                                        </div>
                                    )}
                                    {npTrackingStatus.ActualDeliveryDate && (
                                        <div className="text-[10px] text-green-600 font-medium">
                                            ✅ {tl('تم التسليم:', 'Delivered:')} {npTrackingStatus.ActualDeliveryDate}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ 5. Additional Info (common) ═══ */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('تكلفة الشحن', 'Shipping Cost')}</Label>
                            <Input
                                type="number"
                                value={shippingCost}
                                onChange={e => setShippingCost(e.target.value)}
                                disabled={isShipped}
                                placeholder="0.00"
                                className="h-9 text-sm font-mono" dir="ltr"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('التسليم المتوقع', 'Est. Delivery')}</Label>
                            <Input
                                type="date"
                                value={estimatedDelivery}
                                onChange={e => setEstimatedDelivery(e.target.value)}
                                disabled={isShipped}
                                className="h-9 text-sm font-mono" dir="ltr"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-500">{tl('ملاحظات الشحن', 'Shipping Notes')}</Label>
                            <Input
                                value={shippingNotes}
                                onChange={e => setShippingNotes(e.target.value)}
                                disabled={isShipped}
                                placeholder={tl('ملاحظات...', 'Notes...')}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );

    return (
        <>
            {/* Standalone Sheet for Transfer Delivery (Replacing UnifiedAccountingSheet to avoid 406 errors) */}
            <Sheet open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
            }}>
                <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl p-0 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
                    <VisuallyHidden><SheetTitle>Transfer Delivery</SheetTitle></VisuallyHidden>
                    {HeaderExtra}
                    {/* Shipping Section - Collapsible */}
                    {!loading && ShippingSection}
                    <div className="flex-1 overflow-hidden relative">
                        {/* We use the items tab which is built to handle transfer picking */}
                        <SalesDeliveryItemsTab
                            data={enhancedData}
                            onChange={(update) => enhancedData.onDeliveryDataChange(update)}
                            mode={isShipped ? 'view' : 'edit'}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700">
                            <ArrowLeftRight className="h-5 w-5" />
                            {tl('تأكيد شحن المناقلة', 'Confirm Transfer Dispatch')}
                        </DialogTitle>
                        <DialogDescription>
                            {tl(
                                `سيتم شحن ${selectedRolls.length} رولون بإجمالي ${deliveryProgress.selectedMeters.toFixed(1)} متر`,
                                `${selectedRolls.length} rolls will be dispatched, total ${deliveryProgress.selectedMeters.toFixed(1)} meters`
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Route */}
                        <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                            <div className="text-center">
                                <Warehouse className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                                <div className="text-xs font-bold text-indigo-700">
                                    {language === 'ar'
                                        ? (fromWarehouse?.name_ar || '—')
                                        : (fromWarehouse?.name_en || '—')
                                    }
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-lg">🚛</span>
                                <span className="text-[10px] text-gray-400">{tl('شحن', 'Ship')}</span>
                            </div>
                            <div className="text-center">
                                <MapPin className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                                <div className="text-xs font-bold text-purple-700">
                                    {language === 'ar'
                                        ? (toWarehouse?.name_ar || '—')
                                        : (toWarehouse?.name_en || '—')
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الرولونات', 'Rolls')}</div>
                                <div className="text-lg font-bold text-indigo-600">{selectedRolls.length}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الأمتار', 'Meters')}</div>
                                <div className="text-lg font-bold text-blue-600 font-mono">
                                    {deliveryProgress.selectedMeters.toFixed(1)}
                                </div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('المتبقي', 'Remaining')}</div>
                                <div className="text-lg font-bold text-amber-600 font-mono">
                                    {Math.max(0, deliveryProgress.expectedMeters - deliveryProgress.selectedMeters).toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Stage transition */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            {(() => {
                                const s = getStatusLabel(transferData?.status || 'confirmed');
                                return <Badge variant="outline" className={`text-[10px] capitalize ${s.color}`}>{s.label}</Badge>;
                            })()}
                            <span>→</span>
                            <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                {tl('تم الشحن', 'shipped')}
                            </Badge>
                        </div>

                        {/* What happens */}
                        <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                            <div>📦 {tl('الرولونات ستصبح "في الطريق"', 'Rolls will become "in transit"')}</div>
                            <div>🏭 {tl('ستخرج من المخزون المتاح في المستودع المصدر', 'Will be removed from source warehouse available stock')}</div>
                            <div>📥 {tl('ستظهر لأمين المستودع الهدف للاستلام', 'Will appear for destination warehouse keeper to receive')}</div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>
                            {tl('إلغاء', 'Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => { handleSaveDraft(); setShowConfirm(false); }}
                            disabled={isSavingDraft}
                            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                            {isSavingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('💾 حفظ مسودة', '💾 Save Draft')}
                        </Button>
                        <Button
                            onClick={handleConfirmDelivery}
                            disabled={isCompleting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('🚛 تأكيد الشحن', '🚛 Confirm Dispatch')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Confirmation Dialog */}
            <Dialog open={showReceiveConfirm} onOpenChange={setShowReceiveConfirm}>
                <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-700">
                            <PackageOpen className="h-5 w-5" />
                            {tl('تأكيد استلام المناقلة', 'Confirm Transfer Receipt')}
                        </DialogTitle>
                        <DialogDescription>
                            {tl(
                                `سيتم استلام ${selectedRolls.length} رولون بإجمالي ${deliveryProgress.selectedMeters.toFixed(1)} متر`,
                                `${selectedRolls.length} rolls will be received, total ${deliveryProgress.selectedMeters.toFixed(1)} meters`
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Route */}
                        <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                            <div className="text-center">
                                <Warehouse className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">
                                    {language === 'ar'
                                        ? (fromWarehouse?.name_ar || '—')
                                        : (fromWarehouse?.name_en || '—')
                                    }
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-lg">📦</span>
                                <span className="text-[10px] text-gray-400">{tl('استلام', 'Receive')}</span>
                            </div>
                            <div className="text-center">
                                <Warehouse className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                                <div className="text-xs font-bold text-emerald-700">
                                    {language === 'ar'
                                        ? (toWarehouse?.name_ar || '—')
                                        : (toWarehouse?.name_en || '—')
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الرولونات', 'Rolls')}</div>
                                <div className="text-lg font-bold text-emerald-600">{selectedRolls.length}</div>
                            </div>
                            <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-gray-500">{tl('الأمتار', 'Meters')}</div>
                                <div className="text-lg font-bold text-teal-600 font-mono">
                                    {deliveryProgress.selectedMeters.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        {/* Stage transition */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                {tl('مشحونة', 'Shipped')}
                            </Badge>
                            <span>→</span>
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                                {tl('مكتملة ✅', 'Completed ✅')}
                            </Badge>
                        </div>

                        {/* What happens */}
                        <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                            <div>📦 {tl('الرولونات ستصبح "متاحة" في المستودع الهدف', 'Rolls will become "available" in destination warehouse')}</div>
                            <div>🏭 {tl('ستُضاف إلى مخزون المستودع المستلم', 'Will be added to receiving warehouse inventory')}</div>
                            <div>📋 {tl('ستُسجّل حركة مخزون "استلام مناقلة"', 'A "transfer in" stock movement will be recorded')}</div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowReceiveConfirm(false)}>
                            {tl('إلغاء', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirmReceiptAction}
                            disabled={isCompleting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {isCompleting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {tl('📦 تأكيد الاستلام', '📦 Confirm Receipt')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default TransferDeliveryDialog;
